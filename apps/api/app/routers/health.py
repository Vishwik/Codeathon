from datetime import datetime, timezone

from fastapi import APIRouter, Request
from sqlalchemy import text

from ..database import SessionLocal

router = APIRouter()


@router.get("/health")
def health(request: Request) -> dict:
    database = "ok"
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception:
        database = "unavailable"
    adapter = request.app.state.ml_adapter
    ml_status = "ready" if adapter.ready else ("fallback" if adapter.fallback_enabled else "unavailable")
    return {"status": "ok" if database == "ok" else "degraded", "service": "riskops-api",
            "database": database, "ml": {"status": ml_status, **(adapter.info_data or {})},
            "timestamp": datetime.now(timezone.utc)}