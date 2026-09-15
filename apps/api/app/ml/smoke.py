"""Generate synthetic SOFTWARE TEST data and exercise the complete local pipeline."""
import argparse
from pathlib import Path
import json
import numpy as np
import pandas as pd
from .artifacts import read_json, write_json
from .contracts import TYPES
from .prepare import prepare
from .train import train
from .evaluate import evaluate
from .inference import RiskEngine


def synthetic_csv(path):
    rng = np.random.default_rng(42)
    rows = []
    for step in range(50):
        for i in range(40):
            fraud = int(i % 8 == 0)
            rows.append({"step": step, "type": TYPES[i % len(TYPES)],
                "amount": float(rng.uniform(10000, 20000) if fraud else rng.uniform(1, 500)),
                "nameOrig": "C" + str(step * 40 + i),
                "nameDest": ("M" if i % 5 == 0 else "C") + str(i),
                "oldbalanceOrg": 0, "newbalanceOrig": 0, "oldbalanceDest": 0,
                "newbalanceDest": 0, "isFlaggedFraud": 0, "isFraud": fraud})
    pd.DataFrame(rows).to_csv(path, index=False)


def run_smoke(out):
    out = Path(out)
    out.mkdir(parents=True, exist_ok=False)
    synthetic_csv(out / "synthetic.csv")
    config = read_json(Path(__file__).resolve().parents[2] / "config/ml.json")
    config["chunk_size"] = 113
    config["xgboost"].update(n_estimators=20, early_stopping_rounds=5, n_jobs=1)
    config["isolation_forest"].update(n_estimators=20, max_samples=64, sample_rows=500, n_jobs=1)
    write_json(out / "config.json", config)
    prepare(out / "synthetic.csv", out / "prepared", config)
    train(out / "prepared", out / "synthetic-bundle", config)
    evaluation = evaluate(out / "prepared", out / "synthetic-bundle")
    write_json(out / "synthetic-evaluation.json", evaluation)
    engine = RiskEngine.load(out / "synthetic-bundle")
    assessment = engine.assess({"transaction_id": "synthetic-smoke", "step": 51,
        "type": "TRANSFER", "amount": 12000.0, "sender_id": "C-example", "recipient_id": "C-demo"})
    write_json(out / "example-assessment.json", assessment)
    write_json(out / "model-info.json", engine.info())
    return assessment


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", required=True, help="New ignored directory for synthetic artifacts")
    args = parser.parse_args()
    assessment = run_smoke(args.out)
    print("SYNTHETIC SOFTWARE TEST ONLY - not PaySim performance")
    print(json.dumps(assessment, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
