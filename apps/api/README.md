# RiskOps API

FastAPI + synchronous SQLAlchemy + SQLite backend for RiskOps AI.

Run from `apps/api` after installing `requirements.txt`:

```bash
python -m uvicorn app.main:app --reload --port 4000
python -m pytest tests
```

The API uses Adwaith's in-process interface:

```python
from app.ml import RiskEngine
engine = RiskEngine.load(model_dir)
assessment = engine.assess(transaction, context=None)
```

The scoring request is PaySim-compatible and contains only `transaction_id`,
`step`, `type`, `amount`, `sender_id`, and `recipient_id`. The complete ML
assessment is returned under `assessment` without renaming or recalculating ML
fields. Missing or invalid models return HTTP 503 from health and scoring.
The legacy `ML_FALLBACK_ENABLED` setting never enables fabricated assessments.

For the existing local synthetic bundle (software verification only), run in
PowerShell from `apps/api`:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:ML_MODEL_DIR = (Resolve-Path ../../artifacts/synthetic-smoke-v2/synthetic-bundle).Path
$env:DATABASE_URL = 'sqlite:///./data/riskops.db'
$env:CORS_ALLOWED_ORIGINS = 'http://localhost:5173'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 4000
```

Use Python 3.12 and the pinned ML packages for this bundle. Set environment
variables explicitly; the backend does not automatically read `.env` files.
Bundles are not committed. If the bundle is absent, obtain the complete trusted
bundle from Adwaith; do not substitute scores or silently generate a new model.

`POST /api/v1/transactions/score` returns 201 for new transactions and 200 for
identical replays, with `{transaction, assessment, decision, idempotent_replay}`.
Conflicting payloads return 409. Lists return `{items, total, limit, offset}`.
Decision PATCH accepts `{decision, note?, decided_by?}` and returns the decision
record; fetch transaction detail afterward to refresh the reviewed assessment.

Backend integration tests load this existing bundle, or `ML_TEST_MODEL_DIR`.
They explicitly skip model-dependent checks when no bundle is available.

Real HTTP checks start and stop Uvicorn on free loopback ports and use a temporary
SQLite database, including restart persistence and missing-model verification:

```powershell
$env:PYTHONPATH = '.'
.\.venv\Scripts\python.exe tests/http_smoke.py --model ../../artifacts/synthetic-smoke-v2/synthetic-bundle
```
