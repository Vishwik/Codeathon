"""Real HTTP verification against an existing bundle; no model training."""
import argparse
from contextlib import closing, contextmanager
import json
import os
from pathlib import Path
import socket
import sqlite3
import subprocess
import sys
import tempfile
import time

import httpx


@contextmanager
def server(model, database):
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
    env = {**os.environ, "ML_MODEL_DIR": str(model),
           "DATABASE_URL": f"sqlite:///{database.as_posix()}",
           "ML_FALLBACK_ENABLED": "true", "CORS_ALLOWED_ORIGINS": "http://localhost:5173"}
    with tempfile.TemporaryFile(mode="w+t") as log:
        process = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(port)],
            env=env, stdout=log, stderr=log,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        try:
            with httpx.Client(base_url=f"http://127.0.0.1:{port}", timeout=10, trust_env=False) as client:
                for _ in range(100):
                    if process.poll() is not None:
                        log.seek(0)
                        raise RuntimeError(log.read())
                    try:
                        if client.get("/api").status_code == 200:
                            break
                    except httpx.TransportError:
                        pass
                    time.sleep(0.1)
                else:
                    raise RuntimeError("Uvicorn did not become reachable")
                yield client
        finally:
            # Windows virtualenv launchers can own a separate interpreter process.
            if os.name == "nt" and process.poll() is None:
                subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                               check=True, capture_output=True)
            elif process.poll() is None:
                process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=10)


def run(model):
    from app.ml import RiskEngine

    engine = RiskEngine.load(model)
    transaction = {"transaction_id": "txn_demo_001", "step": 120, "type": "TRANSFER",
                   "amount": 48500, "sender_id": "C123", "recipient_id": "C456"}
    expected = engine.assess(transaction, context=None)
    root = "/api/v1/transactions"
    detail_url = root + "/txn_demo_001"
    with tempfile.TemporaryDirectory(prefix="riskops-http-") as directory:
        db_path = Path(directory) / "verification.db"
        with server(model, db_path) as client:
            health = client.get("/health")
            assert health.status_code == 200 and health.json()["ml"]["status"] == "ready"
            assert client.get("/api").status_code == 200
            response = client.post(root + "/score", json=transaction, headers={"Origin": "http://localhost:5173"})
            assert response.status_code == 201, response.text
            assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
            original = response.json()
            assert {k: original["assessment"][k] for k in expected} == expected
            assert original["transaction"] == transaction
            replay = client.post(root + "/score", json=transaction)
            assert replay.status_code == 200 and replay.json()["idempotent_replay"] is True
            assert replay.json()["assessment"] == original["assessment"]
            assert client.post(root + "/score", json={**transaction, "amount": 1}).status_code == 409
            assert client.get(detail_url).json()["assessment"] == original["assessment"]
            assert client.get(root).json()["total"] == 1
            assert client.get(root).json()["items"][0]["assessment"] == original["assessment"]
            for choice in ("APPROVE", "BLOCK"):
                decision = client.patch(detail_url + "/decision", json={"decision": choice, "note": "HTTP smoke"})
                assert decision.status_code == 200 and decision.json()["decision"] == choice
            assert client.get(detail_url).json()["assessment"]["review_status"] == "REVIEWED"
            assert client.get("/api/v1/summary").json()["decision_counts"] == {"APPROVE": 0, "BLOCK": 1, "PENDING": 0}
            assert client.get(root + "/missing").status_code == 404
            assert client.patch(root + "/missing/decision", json={"decision": "BLOCK"}).status_code == 404
            assert client.post(root + "/score", content="{bad", headers={"Content-Type": "application/json"}).status_code == 422
            for invalid in ({**transaction, "type": "BAD"}, {**transaction, "transaction_id": " "},
                            {**transaction, "isFraud": 0}, {**transaction, "step": "120"}):
                assert client.post(root + "/score", json=invalid).status_code == 422
            for method in ("POST", "PATCH"):
                preflight = client.options(root + "/score", headers={"Origin": "http://localhost:5173",
                    "Access-Control-Request-Method": method, "Access-Control-Request-Headers": "content-type"})
                assert preflight.status_code == 200
                assert preflight.headers["access-control-allow-origin"] == "http://localhost:5173"
        with closing(sqlite3.connect(db_path)) as db:
            db.row_factory = sqlite3.Row
            rows = db.execute("SELECT * FROM assessments").fetchall()
            assert len(rows) == 1
            row = rows[0]
            assert json.loads(row["raw_assessment_json"]) == expected
            assert json.loads(row["reasons_json"]) == expected["reasons"]
            assert json.loads(row["explanation_json"]) == expected["explanation"]
            for key in ("fraud_probability", "fraud_prediction", "anomaly_percentile", "anomaly_score",
                        "risk_score", "risk_level", "suspicious"):
                assert row[key] == expected[key]
            assert db.execute("SELECT COUNT(*) FROM transactions").fetchone()[0] == 1
            assert db.execute("SELECT COUNT(*) FROM decisions").fetchone()[0] == 2
        with server(model, db_path) as client:
            detail = client.get(detail_url).json()
            assert {k: detail["assessment"][k] for k in expected} == expected
            assert detail["decision"]["decision"] == "BLOCK"
            assert detail["assessment"]["review_status"] == "REVIEWED"
            assert client.post(root + "/score", json=transaction).status_code == 200
        with server(Path(directory) / "missing-bundle", db_path) as client:
            assert client.get("/health").status_code == 503
            failed = client.post(root + "/score", json={**transaction, "transaction_id": "unavailable"})
            assert failed.status_code == 503 and set(failed.json()) == {"detail"}
            assert client.get(root).json()["total"] == 1
            assert client.post(root + "/score", json=transaction).status_code == 200
    print(json.dumps({"result": "PASS", "bundle": str(model), "assessment": expected,
                      "verified": ["all endpoints", "SQLite columns and raw JSON", "restart persistence",
                                   "idempotency 200/409", "validation 422", "missing ID 404",
                                   "missing bundle 503 even with legacy fallback enabled", "CORS POST/PATCH"]}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, type=Path)
    args = parser.parse_args()
    run(args.model.resolve())
