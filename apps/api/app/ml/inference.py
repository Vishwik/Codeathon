"""Public in-process scoring interface. No network, database, or history access."""
from copy import deepcopy
from pathlib import Path
import joblib
import numpy as np
import xgboost as xgb
from .artifacts import read_json, verify_bundle
from .contracts import RiskAssessment, TransactionInput, Reason
from .explain import explain
from .features import FEATURES, FEATURE_VERSION, transform_one
from .policy import Policy, level, percentiles, scores, sigmoid


class ArtifactError(ValueError):
    """Bundle is missing, corrupt, or incompatible. Backend should fail readiness."""


class RiskEngine:
    @classmethod
    def load(cls, model_dir: str | Path) -> "RiskEngine":
        path = Path(model_dir)
        try:
            manifest = verify_bundle(path)
            features = read_json(path / "features.json")
            if (features["order"] != FEATURES or features["version"] != FEATURE_VERSION
                    or manifest["feature_order"] != FEATURES
                    or manifest["feature_version"] != FEATURE_VERSION
                    or features["required_context"] != [] or features["history"] != "unsupported"):
                raise ValueError("Unsupported feature/context contract")
            engine = cls()
            engine.manifest = manifest
            engine.policy = Policy.model_validate(read_json(path / "policy.json"))
            if engine.policy.version != manifest["policy_version"]:
                raise ValueError("Policy version mismatch")
            engine.calibration = read_json(path / "calibration.json")
            calibration = engine.calibration
            if (calibration["method"] != "unweighted_sigmoid"
                    or not np.isfinite([calibration["slope"], calibration["intercept"], calibration["base_rate"]]).all()
                    or calibration["slope"] <= 0 or not 0 < calibration["base_rate"] < 1):
                raise ValueError("Invalid calibration")
            engine.reference = np.load(path / "anomaly_reference.npy", allow_pickle=False)
            if (engine.reference.ndim != 1 or len(engine.reference) == 0
                    or not np.isfinite(engine.reference).all()
                    or not (np.diff(engine.reference) >= 0).all()):
                raise ValueError("Invalid anomaly reference")
            engine.booster = xgb.Booster()
            engine.booster.load_model(path / "xgboost.ubj")
            engine.detector = joblib.load(path / "isolation_forest.joblib")
            if (engine.booster.feature_names != FEATURES or engine.booster.num_features() != len(FEATURES)
                    or engine.detector.n_features_in_ != len(FEATURES)):
                raise ValueError("Model feature mismatch")
            return engine
        except (OSError, ValueError, KeyError, TypeError, AttributeError, xgb.core.XGBoostError) as error:
            raise ArtifactError(f"Cannot load ML bundle {path}: {error}") from error

    def _score_matrix(self, matrix):
        margin = self.booster.predict(xgb.DMatrix(matrix, feature_names=FEATURES), output_margin=True)
        probability = sigmoid(margin, self.calibration)
        percentile = percentiles(-self.detector.score_samples(matrix), self.reference)
        severity, risk = scores(probability, percentile, self.policy)
        return probability, percentile, severity, risk

    def assess(self, transaction: dict | TransactionInput, context=None) -> dict:
        """Return a JSON-compatible dict validated against RiskAssessment."""
        if context is not None:
            raise ValueError("Static-v1 accepts no history context; do not send current/future events")
        tx = TransactionInput.model_validate(transaction)
        matrix = transform_one(tx)
        p, u, a, risk = [float(value[0]) for value in self._score_matrix(matrix)]
        explanation, reasons = explain(self.booster, matrix)
        reasons.append(Reason(code="ANOMALY_PERCENTILE", source="ANOMALY",
            message=f"Abnormality is at percentile {100 * u:.2f} of the fixed legitimate calibration reference; this is not fraud probability."))
        reasons.append(Reason(code="RISK_POLICY", source="POLICY",
            message=f"Hybrid risk {risk:.2f}/100 combines fraud probability and anomaly severity; review threshold is {self.policy.review_threshold:g}."))
        return RiskAssessment(transaction_id=tx.transaction_id,
            bundle_version=self.manifest["bundle_version"], feature_version=FEATURE_VERSION,
            policy_version=self.policy.version, fraud_probability=p,
            fraud_prediction="FRAUD" if p >= self.policy.fraud_threshold else "LEGITIMATE",
            anomaly_percentile=u, anomaly_score=a, risk_score=risk,
            risk_level=level(risk, self.policy), suspicious=risk >= self.policy.review_threshold,
            reasons=reasons, explanation=explanation).model_dump(mode="json")

    def info(self) -> dict:
        return deepcopy({
            "schema_version": self.manifest["schema_version"],
            "bundle_version": self.manifest["bundle_version"],
            "feature_version": FEATURE_VERSION, "policy_version": self.policy.version,
            "feature_order": FEATURES, "required_context": [], "history": "unsupported",
            "thresholds": self.policy.model_dump(), "calibration_status": self.calibration["status"],
            "dataset_sha256": self.manifest["dataset_sha256"], "splits": self.manifest["splits"],
            "dataset_report": self.manifest.get("dataset_report"),
            "dependencies": self.manifest["dependencies"], "python": self.manifest["python"],
        })
