import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import init_db
from .integrations.risk_engine_adapter import RiskEngineAdapter
from .routers import decisions, health, summary, transactions


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="RiskOps AI API", version="1.0.0")
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_credentials=False, allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
                       allow_headers=["Content-Type", "X-Request-ID"])
    adapter = RiskEngineAdapter(None, settings.ml_fallback_enabled)
    app.state.ml_adapter = adapter
    try:
        adapter.load(settings.ml_model_dir)
    except Exception as error:
        logging.getLogger(__name__).warning("ML model unavailable: %s", error)
    init_db()
    app.include_router(health.router)
    app.include_router(transactions.router)
    app.include_router(decisions.router)
    app.include_router(summary.router)

    @app.get("/api")
    def api_ready() -> dict[str, str]:
        return {"message": "RiskOps AI API is ready."}

    return app


app = create_app()