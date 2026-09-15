from dataclasses import dataclass
from typing import Any

from ..schemas import MlAssessment, TransactionRequest


@dataclass
class AssessmentResult:
    data: dict[str, Any]
    fallback_used: bool = False
    model_mode: str = "model"


class RiskEngineAdapter:
    def __init__(self, engine: Any | None, fallback_enabled: bool) -> None:
        self.engine = engine
        self.fallback_enabled = fallback_enabled
        self.info_data: dict[str, Any] | None = None

    @property
    def ready(self) -> bool:
        return self.engine is not None

    def load(self, model_dir: str) -> None:
        from app.ml import RiskEngine

        self.engine = RiskEngine.load(model_dir)
        self.info_data = self.engine.info()

    def assess(self, transaction: TransactionRequest) -> AssessmentResult:
        payload = transaction.model_dump()
        if self.engine is not None:
            result = self.engine.assess(payload, context=None)
            MlAssessment.model_validate(result)
            return AssessmentResult(result)
        if not self.fallback_enabled:
            raise RuntimeError("ML model is unavailable")
        fallback = {
            "schema_version": "fallback-v1",
            "transaction_id": transaction.transaction_id,
            "bundle_version": "fallback-rules-v1",
            "feature_version": "unavailable",
            "policy_version": "fallback-rules-v1",
            "fraud_probability": 0.0,
            "fraud_prediction": "LEGITIMATE",
            "anomaly_percentile": 0.0,
            "anomaly_score": 0.0,
            "risk_score": 50.0,
            "risk_level": "MEDIUM",
            "suspicious": True,
            "reasons": ["ML model unavailable; manual review required."],
            "explanation": "Fallback mode returned a conservative review result.",
        }
        return AssessmentResult(fallback, fallback_used=True, model_mode="fallback")
