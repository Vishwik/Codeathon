"""Two-pass CSV validation and whole-step partitioning; never modifies the source."""
import argparse
from collections import Counter
from pathlib import Path
import numpy as np
import pandas as pd
from .artifacts import checksum, read_json, write_json
from .contracts import TYPES
from .features import FEATURES, FEATURE_VERSION, transform

SPLITS = ("train", "validation", "calibration", "policy", "test")
REQUIRED = {"step", "type", "amount", "nameOrig", "nameDest", "isFraud",
            "isFlaggedFraud", "oldbalanceOrg", "newbalanceOrig", "oldbalanceDest", "newbalanceDest"}
USED = ["step", "type", "amount", "nameOrig", "nameDest", "isFraud"]


def validated(chunk, offset):
    step = pd.to_numeric(chunk["step"], errors="coerce")
    amount = pd.to_numeric(chunk["amount"], errors="coerce")
    target = pd.to_numeric(chunk["isFraud"], errors="coerce")
    checks = {
        "invalid_step": np.isfinite(step) & (step >= 0) & (step <= np.iinfo(np.int64).max / 2) & (step % 1 == 0),
        "invalid_amount": np.isfinite(amount) & (amount > 0),
        "invalid_type": chunk["type"].isin(TYPES),
        "invalid_label": target.isin([0, 1]),
    }
    for name in ("nameOrig", "nameDest"):
        checks["invalid_" + name] = chunk[name].str.strip().str.len().between(1, 200)
    valid = np.logical_and.reduce([v.to_numpy() for v in checks.values()])
    rows = np.arange(offset + 1, offset + len(chunk) + 1, dtype=np.int64)
    invalid = pd.DataFrame({"source_row": rows[~valid]})
    invalid["reason"] = [";".join(k for k, mask in checks.items() if not mask.iloc[i])
                         for i in np.flatnonzero(~valid)]
    clean = pd.DataFrame({
        "transaction_id": ["row-" + str(i) for i in rows[valid]],
        "step": step[valid].to_numpy(dtype=np.int64),
        "type": chunk.loc[valid, "type"].to_numpy(),
        "amount": amount[valid].to_numpy(dtype=float),
        "sender_id": chunk.loc[valid, "nameOrig"].str.strip().to_numpy(),
        "recipient_id": chunk.loc[valid, "nameDest"].str.strip().to_numpy(),
    })
    return clean, target[valid].to_numpy(dtype=np.uint8), rows[valid], invalid


def partition_steps(steps):
    ordered = sorted(set(int(s) for s in steps))
    n = len(ordered)
    if n < 10:
        raise ValueError("At least 10 distinct valid steps are required for five temporal partitions")
    cuts = [0, n * 6 // 10, n * 7 // 10, n * 8 // 10, n * 9 // 10, n]
    return {name: ordered[cuts[i]:cuts[i + 1]] for i, name in enumerate(SPLITS)}


def prepare(csv, out, config, allow_invalid=False):
    csv, out = Path(csv), Path(out)
    if not csv.is_file():
        raise FileNotFoundError("PaySim CSV not found. Download it manually into ignored data/raw/")
    columns = set(pd.read_csv(csv, nrows=0).columns)
    if not REQUIRED.issubset(columns):
        raise ValueError("Missing PaySim columns: " + ", ".join(sorted(REQUIRED - columns)))
    digest = checksum(csv)
    out.mkdir(parents=True, exist_ok=False)
    chunk_size = config["chunk_size"]
    step_counts, fraud_counts, type_counts = Counter(), Counter(), Counter()
    total = invalid_count = 0
    for chunk in pd.read_csv(csv, usecols=USED, dtype=str, keep_default_na=False, chunksize=chunk_size):
        clean, y, _, invalid = validated(chunk, total)
        total += len(chunk)
        invalid_count += len(invalid)
        if len(invalid):
            invalid.to_csv(out / "invalid_rows.csv", mode="a", index=False,
                           header=not (out / "invalid_rows.csv").exists())
        step_counts.update(clean["step"].tolist())
        fraud_counts.update(clean.loc[y == 1, "step"].tolist())
        type_counts.update(clean["type"].tolist())
    valid_count = total - invalid_count
    report = {"source_file": csv.name, "dataset_sha256": digest, "source_rows": total,
              "valid_rows": valid_count, "invalid_rows": invalid_count,
              "fraud_count": sum(fraud_counts.values()),
              "fraud_prevalence": sum(fraud_counts.values()) / valid_count if valid_count else None,
              "type_distribution": dict(type_counts),
              "step_min": min(step_counts) if step_counts else None,
              "step_max": max(step_counts) if step_counts else None,
              "invalid_rows_accepted": bool(allow_invalid)}
    write_json(out / "validation_report.json", report)
    if invalid_count and not allow_invalid:
        raise ValueError("Invalid rows reported; inspect invalid_rows.csv. Use a NEW output directory with --allow-invalid to explicitly exclude them")
    partitions = partition_steps(step_counts)
    manifest = {"dataset": report, "feature_version": FEATURE_VERSION, "feature_order": FEATURES,
                "splits": {}, "history": "none; static features only"}
    arrays = {}
    for name, steps in partitions.items():
        count = sum(step_counts[s] for s in steps)
        positives = sum(fraud_counts[s] for s in steps)
        manifest["splits"][name] = {"step_min": steps[0], "step_max": steps[-1],
                                   "steps": steps, "rows": count, "positive": positives,
                                   "negative": count - positives}
        arrays[name] = {}
        for field, dtype, shape in (("x", np.float32, (count, len(FEATURES))),
                                    ("y", np.uint8, (count,)), ("step", np.int64, (count,)),
                                    ("source_row", np.int64, (count,)), ("type", np.uint8, (count,))):
            arrays[name][field] = np.lib.format.open_memmap(out / (name + "_" + field + ".npy"),
                                                           mode="w+", dtype=dtype, shape=shape)
    offsets = Counter()
    total = 0
    for chunk in pd.read_csv(csv, usecols=USED, dtype=str, keep_default_na=False, chunksize=chunk_size):
        clean, y, source_rows, _ = validated(chunk, total)
        total += len(chunk)
        for name, steps in partitions.items():
            mask = clean["step"].between(steps[0], steps[-1]).to_numpy()
            frame = clean.loc[mask]
            if frame.empty:
                continue
            start, end = offsets[name], offsets[name] + len(frame)
            for field, value in {"x": transform(frame), "y": y[mask],
                                 "step": frame["step"].to_numpy(), "source_row": source_rows[mask],
                                 "type": frame["type"].map({t: i for i, t in enumerate(TYPES)}).to_numpy()}.items():
                arrays[name][field][start:end] = value
            offsets[name] = end
    for name, values in arrays.items():
        if offsets[name] != manifest["splits"][name]["rows"]:
            raise ValueError("Source changed during preparation")
        for value in values.values():
            value.flush()
    if checksum(csv) != digest:
        raise ValueError("Source changed during preparation; discard this output")
    manifest["checksums"] = {p.name: checksum(p) for p in sorted(out.glob("*.npy"))}
    write_json(out / "split_manifest.json", manifest)
    return manifest


def load_split(data, name, manifest):
    if name not in SPLITS:
        raise ValueError("Unknown partition")
    if manifest["feature_order"] != FEATURES or manifest["feature_version"] != FEATURE_VERSION:
        raise ValueError("Prepared feature contract mismatch")
    values = {}
    for field in ("x", "y", "step", "source_row", "type"):
        path = Path(data) / (name + "_" + field + ".npy")
        if checksum(path) != manifest["checksums"].get(path.name):
            raise ValueError("Prepared data checksum mismatch")
        values[field] = np.load(path, mmap_mode="r", allow_pickle=False)
    return values


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--config", default="config/ml.json")
    parser.add_argument("--allow-invalid", action="store_true")
    args = parser.parse_args()
    result = prepare(args.csv, args.out, read_json(args.config), args.allow_invalid)
    print(result["dataset"])


if __name__ == "__main__":
    main()
