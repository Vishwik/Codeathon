"""Evaluate a frozen bundle without modifying it or selecting on final test data."""
import argparse
from pathlib import Path
import numpy as np
from sklearn.metrics import (average_precision_score, brier_score_loss, confusion_matrix,
                             f1_score, log_loss, precision_score, recall_score)
from .artifacts import read_json, write_json
from .contracts import TYPES
from .prepare import load_split


def classification(y, predicted):
    tn, fp, fn, tp = confusion_matrix(y, predicted, labels=[0, 1]).ravel()
    return {"precision": float(precision_score(y, predicted, zero_division=0)),
            "recall": float(recall_score(y, predicted, zero_division=0)),
            "f1": float(f1_score(y, predicted, zero_division=0)),
            "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
            "false_alerts_per_1000": float(1000 * fp / len(y)),
            "review_fraction": float(np.mean(predicted))}


def ranking(y, score):
    positives = int(np.sum(y))
    # Stable source-order tie breaking; ties are disclosed in the report.
    ordered = np.argsort(-np.asarray(score), kind="stable")
    budgets = {}
    for fraction in (0.005, 0.01, 0.02):
        count = int(np.floor(len(y) * fraction))
        budgets[str(fraction)] = {"reviewed": count,
            "recall": float(np.sum(y[ordered[:count]]) / positives) if positives else None}
    return {"average_precision": float(average_precision_score(y, score)) if positives else None,
            "recall_at_review_budget": budgets}


def report_metrics(y, p, risk, policy, base_rate, types=None):
    p = np.asarray(p, dtype=float)
    y = np.asarray(y)
    calibrated = {"brier": float(brier_score_loss(y, p)),
                  "log_loss": float(log_loss(y, p, labels=[0, 1])),
                  "base_rate": base_rate,
                  "base_rate_brier": float(brier_score_loss(y, np.full(len(y), base_rate))),
                  "base_rate_log_loss": float(log_loss(y, np.full(len(y), base_rate), labels=[0, 1])),
                  "reliability_bins": []}
    for lower, upper in zip(np.linspace(0, 1, 11)[:-1], np.linspace(0, 1, 11)[1:]):
        mask = (p >= lower) & ((p < upper) if upper < 1 else (p <= upper))
        calibrated["reliability_bins"].append({"lower": float(lower), "upper": float(upper),
            "count": int(mask.sum()), "mean_probability": float(p[mask].mean()) if mask.any() else None,
            "fraud_fraction": float(y[mask].mean()) if mask.any() else None})
    result = {"rows": len(y), "positive": int(y.sum()), "calibration": calibrated,
              "classifier": {**ranking(y, p), **classification(y, p >= policy.fraud_threshold)},
              "hybrid": {**ranking(y, risk), **classification(y, risk >= policy.review_threshold)},
              "ranking_note": "Average precision, not interpolated PR-AUC. Budget ties use stable source order; floor(N*budget) reviews."}
    if types is not None:
        result["per_type"] = {}
        for i, name in enumerate(TYPES):
            mask = np.asarray(types) == i
            if mask.any():
                result["per_type"][name] = {"rows": int(mask.sum()), "positive": int(y[mask].sum()),
                    "classifier": {**ranking(y[mask], p[mask]),
                                   **classification(y[mask], p[mask] >= policy.fraud_threshold)},
                    "hybrid": {**ranking(y[mask], np.asarray(risk)[mask]),
                               **classification(y[mask], np.asarray(risk)[mask] >= policy.review_threshold)}}
    return result


def evaluate(data, model, split="test"):
    from .inference import RiskEngine
    manifest = read_json(Path(data) / "split_manifest.json")
    engine = RiskEngine.load(model)
    if manifest["dataset"]["dataset_sha256"] != engine.info()["dataset_sha256"]:
        raise ValueError("Evaluation dataset differs from training provenance")
    if manifest["splits"] != engine.info()["splits"]:
        raise ValueError("Evaluation partitions differ from training provenance")
    values = load_split(data, split, manifest)
    probabilities, risks = [], []
    for start in range(0, len(values["y"]), 10000):
        p, _, _, risk = engine._score_matrix(values["x"][start:start + 10000])
        probabilities.append(p)
        risks.append(risk)
    result = report_metrics(values["y"], np.concatenate(probabilities), np.concatenate(risks),
                            engine.policy, engine.calibration["base_rate"], values["type"])
    return {"bundle_version": engine.info()["bundle_version"], "split": split,
            "dataset_sha256": engine.info()["dataset_sha256"], **result}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--split", choices=["validation", "calibration", "policy", "test"], default="test")
    parser.add_argument("--out", required=True, help="New report path outside the immutable model bundle")
    args = parser.parse_args()
    output, model = Path(args.out).resolve(), Path(args.model).resolve()
    if output == model or model in output.parents or output.exists():
        raise ValueError("Choose a new report path outside the bundle")
    result = evaluate(args.data, args.model, args.split)
    output.parent.mkdir(parents=True, exist_ok=True)
    write_json(output, result)
    print("Wrote evaluation:", output)


if __name__ == "__main__":
    main()
