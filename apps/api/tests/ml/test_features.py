import numpy as np
import pandas as pd
import pytest
from pydantic import ValidationError
from app.ml.contracts import TransactionInput, TYPES
from app.ml.features import FEATURES, FORBIDDEN, transform, transform_one
from app.ml.prepare import partition_steps, validated


@pytest.mark.parametrize("field", sorted(FORBIDDEN))
def test_forbidden_rejected(transaction, field):
    transaction[field] = 1
    with pytest.raises(ValidationError):
        TransactionInput.model_validate(transaction)
    with pytest.raises(ValueError):
        transform(pd.DataFrame([transaction]))


@pytest.mark.parametrize("kind", TYPES)
def test_encoding_and_parity(transaction, kind):
    transaction["type"] = kind
    tx = TransactionInput.model_validate(transaction)
    online = transform_one(tx)
    offline = transform(pd.DataFrame([tx.model_dump()]))
    np.testing.assert_array_equal(online, offline)
    assert online.dtype == np.float32
    assert online.shape == (1, len(FEATURES))
    assert online[0, FEATURES.index("type_" + kind)] == 1
    assert online[0, 1:6].sum() == 1


@pytest.mark.parametrize("field,value", [
    ("amount", float("nan")), ("amount", float("inf")), ("amount", 0),
    ("amount", -1), ("amount", True), ("step", -1), ("step", 1.5), ("step", True),
    ("step", "1"), ("type", "UNKNOWN"), ("recipient_id", ""), ("sender_id", 123),
    ("transaction_id", " " * 3),
])
def test_invalid_input(transaction, field, value):
    transaction[field] = value
    with pytest.raises(ValidationError):
        TransactionInput.model_validate(transaction)


def test_ids_and_absolute_day_not_predictors(transaction):
    x = transform_one(TransactionInput.model_validate(transaction))
    transaction.update(step=34, sender_id="C99999", recipient_id="C928")
    np.testing.assert_array_equal(x, transform_one(TransactionInput.model_validate(transaction)))


def test_temporal_partition():
    result = partition_steps(list(range(50))[::-1] + [1, 2])
    assert [len(v) for v in result.values()] == [30, 5, 5, 5, 5]
    assert len(set().union(*[set(v) for v in result.values()])) == 50
    previous = -1
    for steps in result.values():
        assert min(steps) > previous
        previous = max(steps)
    with pytest.raises(ValueError):
        partition_steps(range(9))


def test_invalid_rows_report_source_ids():
    chunk = pd.DataFrame({"step": ["1", "2"], "amount": ["0", "10"], "type": ["TRANSFER"] * 2,
                          "nameOrig": ["C1"] * 2, "nameDest": ["C2"] * 2, "isFraud": ["0", "1"]})
    clean, y, rows, invalid = validated(chunk, 100)
    assert invalid.iloc[0].to_dict() == {"source_row": 101, "reason": "invalid_amount"}
    assert rows.tolist() == [102]
    assert y.tolist() == [1]
    assert clean["transaction_id"].tolist() == ["row-102"]
