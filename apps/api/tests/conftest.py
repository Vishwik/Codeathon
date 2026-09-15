import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.integrations.risk_engine_adapter import RiskEngineAdapter
from app.ml import RiskEngine


@pytest.fixture(scope="session")
def real_engine():
    default = Path(__file__).resolve().parents[3] / "artifacts/synthetic-smoke-v2/synthetic-bundle"
    path = Path(os.environ.get("ML_TEST_MODEL_DIR", default))
    if not path.exists():
        pytest.skip(f"Existing synthetic bundle required: {path}")
    return RiskEngine.load(path)


@pytest.fixture
def client(tmp_path, monkeypatch):
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}", connect_args={"check_same_thread": False})
    session_local = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(app.state, "ml_adapter", RiskEngineAdapter(None, False))
    monkeypatch.setattr("app.routers.health.SessionLocal", session_local)
    with TestClient(app) as test_client:
        yield test_client
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture
def model_client(client, real_engine, monkeypatch):
    adapter = RiskEngineAdapter(real_engine, False)
    adapter.info_data = real_engine.info()
    monkeypatch.setattr(app.state, "ml_adapter", adapter)
    return client
