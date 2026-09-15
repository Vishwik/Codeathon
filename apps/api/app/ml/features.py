"""Single allowlisted transform used by offline preparation and online inference."""
import numpy as np
import pandas as pd
from .contracts import TYPES, TransactionInput

FEATURE_VERSION = "static-v1"
FEATURES = ["log_amount"] + ["type_" + t for t in TYPES] + [
    "hour_sin", "hour_cos", "destination_merchant", "destination_customer"]
FORBIDDEN = {"isFraud", "isFlaggedFraud", "oldbalanceOrg", "newbalanceOrig",
             "oldbalanceDest", "newbalanceDest"}
INPUT_COLUMNS = set(TransactionInput.model_fields)
LABELS = {
    "log_amount": "Log transaction amount",
    "hour_sin": "Hour of day (sine)", "hour_cos": "Hour of day (cosine)",
    "destination_merchant": "Merchant destination",
    "destination_customer": "Customer destination",
    **{"type_" + t: "Transaction type: " + t for t in TYPES},
}


def transform(frame: pd.DataFrame) -> np.ndarray:
    if set(frame.columns) != INPUT_COLUMNS:
        raise ValueError("Feature input must contain exactly TransactionInput fields; labels/balances are forbidden")
    if not frame["type"].isin(TYPES).all():
        raise ValueError("Unknown transaction type")
    amount = pd.to_numeric(frame["amount"], errors="raise").to_numpy(dtype=float)
    steps = pd.to_numeric(frame["step"], errors="raise").to_numpy(dtype=float)
    if not (np.isfinite(amount).all() and (amount > 0).all()
            and np.isfinite(steps).all() and (steps >= 0).all()
            and (steps == np.floor(steps)).all()):
        raise ValueError("Invalid amount or step")
    for field in ("transaction_id", "sender_id", "recipient_id"):
        if not frame[field].map(lambda v: isinstance(v, str) and 0 < len(v.strip()) <= 200).all():
            raise ValueError("Invalid identifier")
    angle = 2 * np.pi * (steps % 24) / 24
    destinations = frame["recipient_id"].str.strip()
    columns = [np.log1p(amount)]
    columns += [(frame["type"] == t).to_numpy() for t in TYPES]
    columns += [np.sin(angle), np.cos(angle), destinations.str.startswith("M").to_numpy(),
                destinations.str.startswith("C").to_numpy()]
    result = np.column_stack(columns).astype(np.float32)
    if not np.isfinite(result).all():
        raise ValueError("Nonfinite engineered feature")
    return result


def transform_one(tx: TransactionInput) -> np.ndarray:
    return transform(pd.DataFrame([tx.model_dump()]))
