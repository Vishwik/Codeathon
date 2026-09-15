def payload(transaction_id="txn-test-1"):
    return {
        "transaction_id": transaction_id,
        "step": 120,
        "type": "TRANSFER",
        "amount": 48500,
        "sender_id": "C123",
        "recipient_id": "C456",
    }


def test_health_and_api(client):
    assert client.get("/health").status_code == 200
    assert client.get("/api").json()["message"] == "RiskOps AI API is ready."


def test_validation_errors(client):
    invalid = payload()
    invalid["type"] = "UNKNOWN"
    assert client.post("/api/v1/transactions/score", json=invalid).status_code == 422
    invalid = payload("txn-negative")
    invalid["amount"] = -1
    assert client.post("/api/v1/transactions/score", json=invalid).status_code == 422
    invalid = payload("txn-missing")
    del invalid["sender_id"]
    assert client.post("/api/v1/transactions/score", json=invalid).status_code == 422


def test_fallback_score_is_persisted_and_idempotent(client):
    response = client.post("/api/v1/transactions/score", json=payload())
    assert response.status_code == 201
    body = response.json()
    assert body["assessment"]["fallback_used"] is True
    assert body["assessment"]["recommended_action"] == "REVIEW"
    assert body["assessment"]["risk_score"] == 50
    assert body["idempotent_replay"] is False

    replay = client.post("/api/v1/transactions/score", json=payload())
    assert replay.status_code == 201
    assert replay.json()["idempotent_replay"] is True

    conflict = payload()
    conflict["amount"] = 1
    assert client.post("/api/v1/transactions/score", json=conflict).status_code == 409


def test_detail_list_decision_and_summary(client):
    client.post("/api/v1/transactions/score", json=payload("txn-workflow"))
    detail = client.get("/api/v1/transactions/txn-workflow")
    assert detail.status_code == 200
    assert detail.json()["assessment"]["fraud_probability"] == 0
    decision = client.patch("/api/v1/transactions/txn-workflow/decision", json={"decision": "APPROVE", "decided_by": "pranai"})
    assert decision.status_code == 200
    assert client.get("/api/v1/transactions/txn-workflow").json()["assessment"]["risk_level"] == "MEDIUM"
    assert client.get("/api/v1/transactions").json()["total"] == 1
    assert client.get("/api/v1/summary").json()["decision_counts"]["APPROVE"] == 1


def test_missing_transaction_returns_404(client):
    assert client.get("/api/v1/transactions/missing").status_code == 404