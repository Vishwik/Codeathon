import json
import numpy as np
import pytest
from app.ml.contracts import RiskAssessment
from app.ml.features import transform_one
from app.ml.contracts import TransactionInput
from app.ml.policy import sigmoid
from app.ml.artifacts import read_json


def test_public_interface_and_additivity(engine, transaction):
    result = engine.assess(transaction)
    RiskAssessment.model_validate(result)
    json.dumps(result, allow_nan=False)
    for key in ("fraud_probability", "anomaly_percentile", "anomaly_score"):
        assert 0 <= result[key] <= 1
    assert 0 <= result["risk_score"] <= 100
    assert result["suspicious"] == (result["risk_score"] >= 30)
    shap = result["explanation"]
    assert shap["units"] == "raw_log_odds"
    assert sum(v["contribution"] for v in shap["contributions"]) + shap["base_value"] == pytest.approx(
        shap["raw_margin"], abs=1e-4)
    assert engine.info()["required_context"] == []
    assert result == engine.assess(transaction)


@pytest.mark.parametrize("context", [{}, {"step": 10}, {"step": 11}, {"past_count": 1}])
def test_no_unsupported_current_future_or_past_history(engine, transaction, context):
    with pytest.raises(ValueError, match="no history"):
        engine.assess(transaction, context=context)


def test_saved_calibration_and_score_parity(engine, smoke_dir, transaction):
    result = engine.assess(transaction)
    cal = read_json(smoke_dir / "synthetic-bundle/calibration.json")
    p = sigmoid(result["explanation"]["raw_margin"], cal)
    assert float(p) == pytest.approx(result["fraud_probability"], abs=1e-6)


def test_smoke_reports_are_not_training_test_metrics(smoke_dir):
    metrics = read_json(smoke_dir / "synthetic-bundle/metrics.json")
    assert metrics["test_evaluated"] is False
    evaluation = read_json(smoke_dir / "synthetic-evaluation.json")
    assert evaluation["split"] == "test"
    assert evaluation["rows"] == 200
    assert "per_type" in evaluation
    assert "base_rate_brier" in evaluation["calibration"]
