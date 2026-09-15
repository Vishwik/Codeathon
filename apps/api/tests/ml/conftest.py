from pathlib import Path
import pytest
from app.ml.smoke import run_smoke
from app.ml.inference import RiskEngine


@pytest.fixture(scope="session")
def smoke_dir(tmp_path_factory):
    path = tmp_path_factory.mktemp("ml") / "synthetic"
    run_smoke(path)
    return path


@pytest.fixture
def engine(smoke_dir):
    return RiskEngine.load(smoke_dir / "synthetic-bundle")


@pytest.fixture
def transaction():
    return {"transaction_id": "example", "step": 10, "type": "TRANSFER", "amount": 1234.0,
            "sender_id": "C1", "recipient_id": "C2"}
