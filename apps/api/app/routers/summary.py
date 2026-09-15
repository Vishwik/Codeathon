from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import SummaryResponse
from ..services.summary_service import summary

router = APIRouter(tags=["summary"])


@router.get("/api/v1/summary", response_model=SummaryResponse)
def get_summary(db: Session = Depends(get_db)) -> SummaryResponse:
    return summary(db)