import hashlib
import json
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..integrations.risk_engine_adapter import AssessmentResult, RiskEngineAdapter
from ..models import Assessment, Decision, Transaction
from ..schemas import DecisionResponse, MlAssessment, ScoringResponse, TransactionRequest, TransactionResponse


def request_hash(transaction: TransactionRequest) -> str:
    encoded = json.dumps(transaction.model_dump(), sort_keys=True, separators=(",", ":")).encode()
    return hashlib.sha256(encoded).hexdigest()


def recommended_action(assessment: dict[str, Any], fallback_used: bool = False) -> str:
    if fallback_used:
        return "REVIEW"
    if assessment["risk_level"] == "HIGH" or assessment["suspicious"]:
        return "BLOCK"
    if assessment["risk_level"] == "MEDIUM":
        return "REVIEW"
    return "APPROVE"


def to_transaction_response(transaction: Transaction) -> TransactionResponse:
    return TransactionResponse.model_validate(transaction, from_attributes=True)


def to_scoring_response(transaction: Transaction, assessment: Assessment, decision: Decision | None, replay: bool) -> ScoringResponse:
    ml = assessment.raw_assessment_json.copy()
    ml.update({
        "assessment_id": assessment.id,
        "review_status": assessment.review_status,
        "recommended_action": assessment.recommended_action,
        "fallback_used": assessment.fallback_used,
        "created_at": assessment.created_at,
    })
    decision_response = None
    if decision:
        decision_response = DecisionResponse(
            transaction_id=decision.transaction_id,
            decision=decision.decision,
            note=decision.note,
            decided_by=decision.decided_by,
            timestamp=decision.created_at,
        )
    return ScoringResponse(
        transaction=to_transaction_response(transaction),
        assessment=ml,
        decision=decision_response,
        idempotent_replay=replay,
    )


def find_existing(db: Session, transaction_id: str) -> Transaction | None:
    return db.scalar(select(Transaction).where(Transaction.transaction_id == transaction_id))


def latest_assessment(db: Session, transaction_id: str) -> Assessment | None:
    return db.scalar(select(Assessment).where(Assessment.transaction_id == transaction_id).order_by(Assessment.id.desc()))


def latest_decision(db: Session, transaction_id: str) -> Decision | None:
    return db.scalar(select(Decision).where(Decision.transaction_id == transaction_id).order_by(Decision.id.desc()))


def create_scored_transaction(db: Session, transaction: TransactionRequest, result: AssessmentResult) -> ScoringResponse:
    stored = Transaction(**transaction.model_dump(), request_hash=request_hash(transaction))
    db.add(stored)
    db.flush()
    ml = MlAssessment.model_validate(result.data)
    assessment = Assessment(
        transaction_id=stored.transaction_id,
        schema_version=ml.schema_version,
        bundle_version=ml.bundle_version,
        feature_version=ml.feature_version,
        policy_version=ml.policy_version,
        fraud_probability=ml.fraud_probability,
        fraud_prediction=ml.fraud_prediction,
        anomaly_percentile=ml.anomaly_percentile,
        anomaly_score=ml.anomaly_score,
        risk_score=ml.risk_score,
        risk_level=ml.risk_level,
        suspicious=ml.suspicious,
        reasons_json=ml.reasons,
        explanation_json=ml.explanation if isinstance(ml.explanation, dict) else {"value": ml.explanation},
        raw_assessment_json=result.data,
        review_status="PENDING",
        recommended_action=recommended_action(result.data, result.fallback_used),
        fallback_used=result.fallback_used,
    )
    db.add(assessment)
    db.commit()
    db.refresh(stored)
    db.refresh(assessment)
    return to_scoring_response(stored, assessment, None, False)


def count_transactions(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Transaction)) or 0