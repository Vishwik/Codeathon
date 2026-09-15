"""Train on train/validation/calibration/policy only; never open the final test arrays."""
import argparse
import math
import platform
from pathlib import Path
import tempfile
from datetime import datetime, timezone
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, precision_recall_curve
import xgboost as xgb
from .artifacts import ARTIFACTS, checksum, git_commit, git_dirty, read_json, versions, write_json
from .contracts import SCHEMA_VERSION
from .evaluate import ranking, report_metrics
from .features import FEATURES, FEATURE_VERSION
from .policy import Policy, percentiles, scores, sigmoid
from .prepare import load_split


def train(data, out, config):
    data, out = Path(data), Path(out)
    if out.exists():
        raise FileExistsError("Bundles are immutable; select a new output directory")
    manifest = read_json(data / "split_manifest.json")
    partitions = {}
    for name in ("train", "validation", "calibration", "policy"):
        partitions[name] = load_split(data, name, manifest)
        if len(np.unique(partitions[name]["y"])) != 2:
            raise ValueError(name + " needs both classes; review temporal boundaries before modeling")
    seed = config["seed"]
    rng = np.random.default_rng(seed)
    training = partitions["train"]
    indices = np.arange(len(training["y"]))
    limit = config["max_training_rows"]
    if limit < 2:
        raise ValueError("max_training_rows must be at least 2")
    if len(indices) > limit:
        indices = np.sort(rng.choice(indices, size=limit, replace=False))
    x, y = training["x"][indices], training["y"][indices]
    positives = int(y.sum())
    if not 0 < positives < len(y):
        raise ValueError("Training sample lacks a class; increase max_training_rows")
    ratio = (len(y) - positives) / positives
    validation = partitions["validation"]
    candidates, best = [], None
    for weight in dict.fromkeys([1.0, math.sqrt(ratio), ratio]):
        model = xgb.XGBClassifier(**config["xgboost"], random_state=seed, scale_pos_weight=weight)
        model.fit(x, y, eval_set=[(validation["x"], validation["y"])], verbose=False)
        selected = model.get_booster()[:model.best_iteration + 1]
        predicted = selected.predict(xgb.DMatrix(validation["x"], feature_names=FEATURES))
        ap = float(average_precision_score(validation["y"], predicted))
        candidate = {"scale_pos_weight": weight, "validation_average_precision": ap,
                     "trees": selected.num_boosted_rounds()}
        candidates.append(candidate)
        if best is None or ap > best[0]:
            best = (ap, selected, candidate)
    booster = best[1]
    booster.feature_names = FEATURES
    calibration_rows = partitions["calibration"]
    margins = booster.predict(xgb.DMatrix(calibration_rows["x"], feature_names=FEATURES), output_margin=True)
    calibrator = LogisticRegression(C=1e6, max_iter=1000, class_weight=None, random_state=seed)
    calibrator.fit(margins.reshape(-1, 1), calibration_rows["y"])
    slope = float(calibrator.coef_[0, 0])
    if slope <= 0:
        raise ValueError("Calibration reverses classifier ranking; inspect temporal drift before exporting")
    calibration = {"method": "unweighted_sigmoid", "slope": slope,
                   "intercept": float(calibrator.intercept_[0]),
                   "base_rate": float(calibration_rows["y"].mean()),
                   "positive_count": int(calibration_rows["y"].sum()),
                   "status": "fitted_low_support" if calibration_rows["y"].sum() < 100 else "fitted"}
    normals = np.flatnonzero(training["y"] == 0)
    if_config = dict(config["isolation_forest"])
    sample_size = min(if_config.pop("sample_rows"), len(normals))
    normal_indices = rng.choice(normals, size=sample_size, replace=False)
    detector = IsolationForest(**if_config, random_state=seed)
    detector.fit(training["x"][normal_indices])
    normal_calibration = calibration_rows["x"][calibration_rows["y"] == 0]
    reference = np.sort(-detector.score_samples(normal_calibration))
    policy_rows = partitions["policy"]
    p = sigmoid(booster.predict(xgb.DMatrix(policy_rows["x"], feature_names=FEATURES),
                                output_margin=True), calibration)
    u = percentiles(-detector.score_samples(policy_rows["x"]), reference)
    policy = Policy.model_validate(config["policy"])
    precision, recall, thresholds = precision_recall_curve(policy_rows["y"], p)
    f1 = 2 * precision[:-1] * recall[:-1] / np.maximum(precision[:-1] + recall[:-1], 1e-12)
    policy = policy.model_copy(update={"fraud_threshold": float(thresholds[int(np.argmax(f1))])})
    _, risk = scores(p, u, policy)
    metrics = {"validation_candidates": candidates, "selected_candidate": best[2],
               "training_rows_total": len(training["y"]), "training_rows_fitted": len(y),
               "training_positive_fitted": positives, "isolation_normal_rows": sample_size,
               "test_evaluated": False,
               "policy_status": "Fraud threshold tuned for policy F1; risk thresholds and fusion remain provisional.",
               "policy": report_metrics(policy_rows["y"], p, risk, policy, calibration["base_rate"],
                                        policy_rows["type"]),
               "fusion_comparison": {}}
    for weight in (0.0, 0.35, 0.70):
        _, alternative = scores(p, u, policy.model_copy(update={"anomaly_weight": weight}))
        metrics["fusion_comparison"][str(weight)] = ranking(policy_rows["y"], alternative)
    p_cal = sigmoid(margins, calibration)
    _, risk_cal = scores(p_cal, percentiles(-detector.score_samples(calibration_rows["x"]), reference), policy)
    metrics["calibration_fit_diagnostics"] = report_metrics(
        calibration_rows["y"], p_cal, risk_cal, policy, calibration["base_rate"])
    metrics["calibration_note"] = "Calibration-fit diagnostics are in-sample; policy/test metrics are independent."
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="riskops-build-", dir=out.parent) as temp:
        bundle = Path(temp)
        booster.save_model(bundle / "xgboost.ubj")
        joblib.dump(detector, bundle / "isolation_forest.joblib")
        np.save(bundle / "anomaly_reference.npy", reference, allow_pickle=False)
        write_json(bundle / "calibration.json", calibration)
        write_json(bundle / "policy.json", policy.model_dump())
        write_json(bundle / "features.json", {"version": FEATURE_VERSION, "order": FEATURES,
                    "required_context": [], "history": "unsupported", "dtype": "float32"})
        write_json(bundle / "metrics.json", metrics)
        bundle_manifest = {"schema_version": SCHEMA_VERSION, "bundle_version": out.name,
            "feature_version": FEATURE_VERSION, "policy_version": policy.version,
            "created_at": datetime.now(timezone.utc).isoformat(), "git_commit": git_commit(),
            "git_dirty": git_dirty(),
            "dependencies": versions(), "python": ".".join(platform.python_version_tuple()[:2]),
            "dataset_sha256": manifest["dataset"]["dataset_sha256"],
            "dataset_report": manifest["dataset"],
            "splits": manifest["splits"], "feature_order": FEATURES, "training_settings": config,
            "checksums": {name: checksum(bundle / name) for name in ARTIFACTS}}
        write_json(bundle / "manifest.json", bundle_manifest)
        from .inference import RiskEngine
        reloaded = RiskEngine.load(bundle)
        check_p, _, _, check_risk = reloaded._score_matrix(policy_rows["x"][:100])
        np.testing.assert_allclose(check_p, p[:100], rtol=1e-6, atol=1e-7)
        np.testing.assert_allclose(check_risk, risk[:100], rtol=1e-6, atol=1e-7)
        # Publish only a complete bundle; a failed build is never loadable at the target.
        bundle.rename(out)
    return metrics


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--config", default="config/ml.json")
    args = parser.parse_args()
    result = train(args.data, args.out, read_json(args.config))
    print("Bundle created:", args.out, "Selected:", result["selected_candidate"])


if __name__ == "__main__":
    main()
