from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import DecisionRequest, DecisionResponse
from ..services.decision_service import create_decision
from ..services.transaction_service import find_existing

router = APIRouter(prefix="/api/v1/transactions", tags=["decisions"])


@router.patch("/{transaction_id}/decision", response_model=DecisionResponse)
def decide(transaction_id: str, request: DecisionRequest, db: Session = Depends(get_db)) -> DecisionResponse:
    if find_existing(db, transaction_id) is None:
        raise HTTPException(status_code=404, detail="transaction not found")
    return create_decision(db, transaction_id, request)