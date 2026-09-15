from dataclasses import dataclass
import logging
from typing import Any

from ..ml.contracts import RiskAssessment
from ..schemas import TransactionRequest


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

        self.engine = None
        self.info_data = None
        self.engine = RiskEngine.load(model_dir)
        self.info_data = self.engine.info()

    def assess(self, transaction: TransactionRequest) -> AssessmentResult:
        payload = transaction.model_dump()
        if self.engine is None:
            raise RuntimeError("ML model is unavailable")
        try:
            result = self.engine.assess(payload, context=None)
            validated = RiskAssessment.model_validate(result)
            if validated.transaction_id != transaction.transaction_id:
                raise ValueError("ML assessment transaction_id mismatch")
            return AssessmentResult(result)
        except Exception as error:
            logging.getLogger(__name__).exception("ML assessment failed")
            raise RuntimeError("ML assessment is unavailable") from error
