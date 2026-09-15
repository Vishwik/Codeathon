import pytest
from sqlalchemy import select

from app.database import get_db
from app.main import app
from app.models import Assessment, Transaction


def payload(transaction_id="txn-test-1"):
    return {"transaction_id": transaction_id, "step": 120, "type": "TRANSFER",
            "amount": 48500, "sender_id": "C123", "recipient_id": "C456"}


def test_health_and_api(model_client):
    health = model_client.get("/health")
    assert health.status_code == 200
    assert health.json()["ml"]["status"] == "ready"
    assert model_client.get("/api").json()["message"] == "RiskOps AI API is ready."


@pytest.mark.parametrize("field,value", [
    ("type", "UNKNOWN"), ("amount", -1), ("amount", "48500"), ("amount", True),
    ("step", "120"), ("step", True), ("transaction_id", "   "),
    ("transaction_id", "x" * 201), ("sender_id", ""), ("isFraud", 1),
    ("newbalanceOrig", 0),
])
def test_validation_errors(client, field, value):
    invalid = {**payload(), field: value}
    assert client.post("/api/v1/transactions/score", json=invalid).status_code == 422


def test_missing_and_malformed_payload(client):
    invalid = payload()
    del invalid["sender_id"]
    assert client.post("/api/v1/transactions/score", json=invalid).status_code == 422
    assert client.post("/api/v1/transactions/score", content="{broken",
                       headers={"Content-Type": "application/json"}).status_code == 422


def test_real_assessment_persistence_and_idempotency(model_client, real_engine):
    expected = real_engine.assess(payload(), context=None)
    response = model_client.post("/api/v1/transactions/score", json=payload())
    assert response.status_code == 201
    body = response.json()
    assert {key: body["assessment"][key] for key in expected} == expected
    assert body["assessment"]["fallback_used"] is False
    assert body["idempotent_replay"] is False
    explanation = body["assessment"]["explanation"]
    assert explanation["base_value"] + sum(c["contribution"] for c in explanation["contributions"]) == pytest.approx(explanation["raw_margin"], abs=1e-5)

    replay = model_client.post("/api/v1/transactions/score", json=payload())
    assert replay.status_code == 200
    assert replay.json()["idempotent_replay"] is True
    assert replay.json()["assessment"] == body["assessment"]
    assert model_client.post("/api/v1/transactions/score", json={**payload(), "amount": 1}).status_code == 409
    session_generator = app.dependency_overrides[get_db]()
    db = next(session_generator)
    try:
        rows = db.scalars(select(Assessment)).all()
        assert len(rows) == 1
        assert rows[0].raw_assessment_json == expected
        assert rows[0].reasons_json == expected["reasons"]
        assert rows[0].explanation_json == expected["explanation"]
        assert len(db.scalars(select(Transaction)).all()) == 1
    finally:
        session_generator.close()


def test_detail_list_decision_and_summary(model_client):
    original = model_client.post("/api/v1/transactions/score", json=payload("txn-workflow")).json()
    url = "/api/v1/transactions/txn-workflow"
    assert model_client.get(url).status_code == 200
    for choice in ("APPROVE", "BLOCK", "BLOCK"):
        decision = model_client.patch(url + "/decision", json={"decision": choice, "decided_by": "pranai", "note": "reviewed"})
        assert decision.status_code == 200
        assert decision.json()["decision"] == choice
    detail = model_client.get(url).json()
    assert detail["assessment"]["review_status"] == "REVIEWED"
    assert detail["assessment"]["explanation"] == original["assessment"]["explanation"]
    assert detail["assessment"]["risk_score"] == original["assessment"]["risk_score"]
    assert detail["decision"]["decision"] == "BLOCK"
    assert model_client.get("/api/v1/transactions").json()["items"][0] == detail
    summary = model_client.get("/api/v1/summary").json()
    assert summary["total_transactions"] == 1
    assert summary["decision_counts"] == {"APPROVE": 0, "BLOCK": 1, "PENDING": 0}
    assert model_client.patch(url + "/decision", json={"decision": "ALLOW"}).status_code == 422


@pytest.mark.parametrize("legacy_fallback", [False, True])
def test_unavailable_model_never_fabricates_scores(client, legacy_fallback):
    app.state.ml_adapter.fallback_enabled = legacy_fallback
    assert client.get("/health").status_code == 503
    response = client.post("/api/v1/transactions/score", json=payload())
    assert response.status_code == 503
    assert set(response.json()) == {"detail"}
    assert client.get("/api/v1/transactions").json()["total"] == 0


def test_invalid_engine_result_is_not_persisted(model_client, real_engine, monkeypatch):
    invalid = real_engine.assess(payload())
    invalid["explanation"] = "invalid"
    monkeypatch.setattr(real_engine, "assess", lambda *args, **kwargs: invalid)
    assert model_client.post("/api/v1/transactions/score", json=payload()).status_code == 503
    assert model_client.get("/api/v1/transactions").json()["total"] == 0


def test_missing_transaction_returns_404(client):
    assert client.get("/api/v1/transactions/missing").status_code == 404
    assert client.patch("/api/v1/transactions/missing/decision", json={"decision": "BLOCK"}).status_code == 404


def test_cors(client):
    response = client.options("/api/v1/transactions/score", headers={
        "Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    denied = client.options("/api/v1/transactions/score", headers={
        "Origin": "http://untrusted.example", "Access-Control-Request-Method": "POST"})
    assert denied.status_code == 400
