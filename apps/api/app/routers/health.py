from datetime import datetime, timezone

from fastapi import APIRouter, Request, Response
from sqlalchemy import text

from ..database import SessionLocal

router = APIRouter()


@router.get("/health")
def health(request: Request, response: Response) -> dict:
    database = "ok"
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception:
        database = "unavailable"
    adapter = request.app.state.ml_adapter
    ml_status = "ready" if adapter.ready else "unavailable"
    ready = database == "ok" and adapter.ready
    if not ready:
        response.status_code = 503
    return {"status": "ok" if ready else "degraded", "service": "riskops-api",
            "database": database, "ml": {"status": ml_status, **(adapter.info_data or {})},
            "timestamp": datetime.now(timezone.utc)}
