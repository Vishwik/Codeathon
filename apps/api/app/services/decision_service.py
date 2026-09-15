from sqlalchemy.orm import Session

from ..models import Decision
from ..schemas import DecisionRequest, DecisionResponse
from .transaction_service import latest_assessment


def create_decision(db: Session, transaction_id: str, request: DecisionRequest) -> DecisionResponse:
    decision = Decision(transaction_id=transaction_id, **request.model_dump())
    db.add(decision)
    assessment = latest_assessment(db, transaction_id)
    if assessment is not None:
        assessment.review_status = "REVIEWED"
    db.commit()
    db.refresh(decision)
    return DecisionResponse(transaction_id=transaction_id, decision=decision.decision, note=decision.note,
                            decided_by=decision.decided_by, timestamp=decision.created_at)
