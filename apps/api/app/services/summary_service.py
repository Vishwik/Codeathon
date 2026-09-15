from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Assessment, Decision, Transaction
from ..schemas import SummaryResponse


def summary(db: Session) -> SummaryResponse:
    assessments = db.scalars(select(Assessment)).all()
    latest_ids = select(func.max(Decision.id)).group_by(Decision.transaction_id)
    decisions = db.scalars(select(Decision).where(Decision.id.in_(latest_ids))).all()
    risk_counts = {key: sum(item.risk_level == key for item in assessments) for key in ("LOW", "MEDIUM", "HIGH")}
    fraud_counts = {key: sum(item.fraud_prediction == key for item in assessments) for key in ("FRAUD", "LEGITIMATE")}
    decision_counts = {key: sum(item.decision == key for item in decisions) for key in ("APPROVE", "BLOCK")}
    decision_counts["PENDING"] = len(assessments) - len(decisions)
    average = sum(item.risk_score for item in assessments) / len(assessments) if assessments else 0.0
    return SummaryResponse(total_transactions=db.scalar(select(func.count()).select_from(Transaction)) or 0,
                           risk_counts=risk_counts, fraud_prediction_counts=fraud_counts,
                           decision_counts=decision_counts, average_risk_score=average,
                           fallback_assessments=sum(item.fallback_used for item in assessments))
