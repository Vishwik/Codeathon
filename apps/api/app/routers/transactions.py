from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..integrations.risk_engine_adapter import RiskEngineAdapter
from ..models import Assessment, Transaction
from ..schemas import ScoringResponse, TransactionDetailResponse, TransactionListResponse, TransactionRequest
from ..services.transaction_service import (create_scored_transaction, find_existing, latest_assessment,
                                             latest_decision, request_hash, to_scoring_response)

router = APIRouter(prefix="/api/v1/transactions", tags=["transactions"])


@router.post("/score", response_model=ScoringResponse, status_code=status.HTTP_201_CREATED)
def score(transaction: TransactionRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> ScoringResponse:
    existing = find_existing(db, transaction.transaction_id)
    if existing:
        if existing.request_hash != request_hash(transaction):
            raise HTTPException(status_code=409, detail="transaction_id already exists with different data")
        assessment = latest_assessment(db, transaction.transaction_id)
        if assessment is None:
            raise HTTPException(status_code=409, detail="transaction has no assessment")
        body = to_scoring_response(existing, assessment, latest_decision(db, transaction.transaction_id), True)
        response.status_code = status.HTTP_200_OK
        return body
    adapter: RiskEngineAdapter = request.app.state.ml_adapter
    try:
        result = adapter.assess(transaction)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return create_scored_transaction(db, transaction, result)


@router.get("", response_model=TransactionListResponse)
def list_transactions(limit: int = Query(default=50, ge=1, le=100), offset: int = Query(default=0, ge=0),
                      db: Session = Depends(get_db)) -> TransactionListResponse:
    items = db.scalars(select(Transaction).order_by(Transaction.id.desc()).offset(offset).limit(limit)).all()
    responses = []
    for item in items:
        assessment = latest_assessment(db, item.transaction_id)
        if assessment:
            responses.append(to_scoring_response(item, assessment, latest_decision(db, item.transaction_id), True))
    return TransactionListResponse(items=responses, total=db.query(Transaction).count(), limit=limit, offset=offset)


@router.get("/{transaction_id}", response_model=TransactionDetailResponse)
def get_transaction(transaction_id: str, db: Session = Depends(get_db)) -> ScoringResponse:
    transaction = find_existing(db, transaction_id)
    assessment = latest_assessment(db, transaction_id)
    if transaction is None or assessment is None:
        raise HTTPException(status_code=404, detail="transaction not found")
    return to_scoring_response(transaction, assessment, latest_decision(db, transaction_id), True)