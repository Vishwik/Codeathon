import importlib
import pandas as pd
import pytest
from app.ml.artifacts import read_json, checksum
from app.ml.prepare import prepare
from app.ml.smoke import synthetic_csv


def test_missing_csv_is_not_synthetic_fallback(tmp_path):
    with pytest.raises(FileNotFoundError, match="Download"):
        prepare(tmp_path / "absent.csv", tmp_path / "out", {"chunk_size": 20})
    assert not (tmp_path / "out").exists()


def test_bad_rows_require_explicit_consent_and_source_is_unchanged(tmp_path):
    csv = tmp_path / "input.csv"
    synthetic_csv(csv)
    frame = pd.read_csv(csv)
    frame.loc[0, "amount"] = 0
    frame.to_csv(csv, index=False)
    before = checksum(csv)
    with pytest.raises(ValueError, match="Invalid rows"):
        prepare(csv, tmp_path / "rejected", {"chunk_size": 137})
    report = read_json(tmp_path / "rejected/validation_report.json")
    assert report["invalid_rows"] == 1
    assert not (tmp_path / "rejected/split_manifest.json").exists()
    manifest = prepare(csv, tmp_path / "accepted", {"chunk_size": 137}, allow_invalid=True)
    assert manifest["dataset"]["valid_rows"] == 1999
    assert checksum(csv) == before


def test_missing_headers(tmp_path):
    csv = tmp_path / "input.csv"
    csv.write_text("amount,type\n1,TRANSFER\n", encoding="utf-8")
    with pytest.raises(ValueError, match="Missing PaySim"):
        prepare(csv, tmp_path / "out", {"chunk_size": 20})


def test_training_never_loads_test_partition(smoke_dir, tmp_path, monkeypatch):
    module = importlib.import_module("app.ml.train")
    original = module.load_split
    seen = []
    def checked(data, name, manifest):
        assert name != "test"
        seen.append(name)
        return original(data, name, manifest)
    monkeypatch.setattr(module, "load_split", checked)
    config = read_json(smoke_dir / "config.json")
    module.train(smoke_dir / "prepared", tmp_path / "another-bundle", config)
    assert seen == ["train", "validation", "calibration", "policy"]
