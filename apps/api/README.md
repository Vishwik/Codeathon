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
fields. If the model cannot load and `ML_FALLBACK_ENABLED=true`, scoring uses a
conservative review result marked with `fallback_used=true`.