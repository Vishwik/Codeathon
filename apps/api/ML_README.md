# Adwaith's ML subsystem

See [the complete ML contract and runbook](../../docs/ml-contract.md).

Public import: from app.ml import RiskEngine (working directory: apps/api).

The Node starter is unchanged. Pranai will integrate this package into FastAPI;
Madhu will consume its JSON assessment in the frontend. Install requirements
from requirements-ml-dev.txt in a local .venv for development.

Do not commit data/, artifacts/, .venv/, or SQLite files.
The synthetic smoke command is a software verification, not PaySim training.
