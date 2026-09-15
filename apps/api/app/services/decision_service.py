from sqlalchemy.orm import Session

from ..models import Decision
from ..schemas import DecisionRequest, DecisionResponse
from ..models import utc_now


def create_decision(db: Session, transaction_id: str, request: DecisionRequest) -> DecisionResponse:
    decision = Decision(transaction_id=transaction_id, **request.model_dump())
    db.add(decision)
    db.commit()
    db.refresh(decision)
    return DecisionResponse(transaction_id=transaction_id, decision=decision.decision, note=decision.note,
                            decided_by=decision.decided_by, timestamp=decision.created_at)