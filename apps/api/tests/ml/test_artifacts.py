import shutil
import numpy as np
import pytest
from app.ml.inference import RiskEngine, ArtifactError
from app.ml.artifacts import read_json, write_json, checksum
from app.ml.prepare import load_split
from app.ml.train import train


def test_load_roundtrip(engine, smoke_dir, transaction):
    again = RiskEngine.load(smoke_dir / "synthetic-bundle")
    assert engine.assess(transaction) == again.assess(transaction)


@pytest.mark.parametrize("name", ["xgboost.ubj", "calibration.json", "manifest.json"])
def test_missing_artifact(smoke_dir, tmp_path, name):
    bundle = tmp_path / "copy"
    shutil.copytree(smoke_dir / "synthetic-bundle", bundle)
    (bundle / name).unlink()
    with pytest.raises(ArtifactError):
        RiskEngine.load(bundle)


def test_corruption_and_versions(smoke_dir, tmp_path):
    bundle = tmp_path / "copy"
    shutil.copytree(smoke_dir / "synthetic-bundle", bundle)
    (bundle / "calibration.json").write_text("{}", encoding="utf-8")
    with pytest.raises(ArtifactError, match="checksum"):
        RiskEngine.load(bundle)


def test_temporal_data_and_source_rows(smoke_dir):
    data = smoke_dir / "prepared"
    manifest = read_json(data / "split_manifest.json")
    last = -1
    source_ids = set()
    for name in ("train", "validation", "calibration", "policy", "test"):
        split = load_split(data, name, manifest)
        assert split["step"].min() > last
        last = split["step"].max()
        assert not source_ids.intersection(split["source_row"])
        source_ids.update(split["source_row"])
    assert len(source_ids) == 2000


def test_immutable_bundle(smoke_dir):
    with pytest.raises(FileExistsError):
        train(smoke_dir / "prepared", smoke_dir / "synthetic-bundle", {})
