from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


TransactionType = Literal["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]
FraudPrediction = Literal["FRAUD", "LEGITIMATE"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH"]
DecisionValue = Literal["APPROVE", "BLOCK"]


class TransactionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    transaction_id: str = Field(min_length=1, max_length=200)
    step: int = Field(ge=0)
    type: TransactionType
    amount: float = Field(gt=0, allow_inf_nan=False)
    sender_id: str = Field(min_length=1, max_length=200)
    recipient_id: str = Field(min_length=1, max_length=200)

    @field_validator("transaction_id", "sender_id", "recipient_id")
    @classmethod
    def non_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be blank")
        return value.strip()


class MlAssessment(BaseModel):
    model_config = ConfigDict(extra="allow")

    schema_version: str
    transaction_id: str
    bundle_version: str
    feature_version: str
    policy_version: str
    fraud_probability: float = Field(ge=0, le=1)
    fraud_prediction: FraudPrediction
    anomaly_percentile: float = Field(ge=0, le=1)
    anomaly_score: float = Field(ge=0, le=1)
    risk_score: float = Field(ge=0, le=100)
    risk_level: RiskLevel
    suspicious: bool
    reasons: list[Any]
    explanation: Any


class AssessmentResponse(MlAssessment):
    assessment_id: int
    review_status: Literal["PENDING", "REVIEWED"]
    recommended_action: Literal["APPROVE", "REVIEW", "BLOCK"]
    fallback_used: bool
    created_at: datetime


class DecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    decision: DecisionValue
    note: str | None = Field(default=None, max_length=2000)
    decided_by: str | None = Field(default=None, max_length=200)


class DecisionResponse(DecisionRequest):
    transaction_id: str
    timestamp: datetime


class TransactionResponse(BaseModel):
    transaction_id: str
    step: int
    type: TransactionType
    amount: float
    sender_id: str
    recipient_id: str


class ScoringResponse(BaseModel):
    transaction: TransactionResponse
    assessment: AssessmentResponse
    decision: DecisionResponse | None = None
    idempotent_replay: bool


class TransactionDetailResponse(ScoringResponse):
    pass


class TransactionListResponse(BaseModel):
    items: list[ScoringResponse]
    total: int
    limit: int
    offset: int


class SummaryResponse(BaseModel):
    total_transactions: int
    risk_counts: dict[str, int]
    fraud_prediction_counts: dict[str, int]
    decision_counts: dict[str, int]
    average_risk_score: float
    fallback_assessments: int