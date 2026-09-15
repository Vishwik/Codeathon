"""Version 1 JSON contracts; deliberately independent of HTTP and storage."""
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

SCHEMA_VERSION = "1.0"
Text = Annotated[str, StringConstraints(strict=True, strip_whitespace=True, min_length=1, max_length=200)]
Unit = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]
TransactionType = Literal["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]
TYPES = ("CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER")


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True, allow_inf_nan=False)


class TransactionInput(Contract):
    transaction_id: Text
    step: Annotated[int, Field(ge=0)]
    type: TransactionType
    amount: Annotated[float, Field(gt=0)]
    sender_id: Text
    recipient_id: Text


class Reason(Contract):
    code: str
    source: Literal["CLASSIFIER", "ANOMALY", "POLICY"]
    message: str


class Contribution(Contract):
    feature: str
    label: str
    value: float
    contribution: float


class Explanation(Contract):
    units: Literal["raw_log_odds"] = "raw_log_odds"
    raw_margin: float
    base_value: float
    contributions: list[Contribution]


class RiskAssessment(Contract):
    schema_version: str = SCHEMA_VERSION
    transaction_id: str
    bundle_version: str
    feature_version: str
    policy_version: str
    fraud_probability: Unit
    fraud_prediction: Literal["FRAUD", "LEGITIMATE"]
    anomaly_percentile: Unit
    anomaly_score: Unit
    risk_score: Annotated[float, Field(ge=0, le=100)]
    risk_level: Literal["LOW", "MEDIUM", "HIGH"]
    suspicious: bool
    reasons: list[Reason]
    explanation: Explanation
