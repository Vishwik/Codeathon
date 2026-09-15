"""Local artifact integrity and provenance helpers."""
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import subprocess

DEPENDENCIES = ("numpy", "pandas", "scikit-learn", "scipy", "xgboost", "joblib", "pydantic")
ARTIFACTS = ("xgboost.ubj", "isolation_forest.joblib", "calibration.json",
             "anomaly_reference.npy", "features.json", "policy.json", "metrics.json")


def checksum(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path):
    with Path(path).open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, value):
    with Path(path).open("w", encoding="utf-8") as handle:
        json.dump(value, handle, indent=2, allow_nan=False)
        handle.write("\n")


def versions():
    return {name: importlib.metadata.version(name) for name in DEPENDENCIES}


def git_commit():
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"],
                                       stderr=subprocess.DEVNULL, text=True).strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def git_dirty():
    try:
        return bool(subprocess.check_output(["git", "status", "--porcelain"],
                    stderr=subprocess.DEVNULL, text=True).strip())
    except (OSError, subprocess.CalledProcessError):
        return None


def verify_bundle(path):
    path = Path(path)
    manifest = read_json(path / "manifest.json")
    if manifest.get("schema_version") != "1.0":
        raise ValueError("Unsupported bundle schema")
    if manifest.get("dependencies") != versions():
        raise ValueError("ML dependency versions differ; install the bundle's pinned requirements")
    if manifest.get("python") != ".".join(platform.python_version_tuple()[:2]):
        raise ValueError("Python major/minor differs from the trained bundle")
    if set(manifest.get("checksums", {})) != set(ARTIFACTS):
        raise ValueError("Incomplete artifact manifest")
    for name in ARTIFACTS:
        if checksum(path / name) != manifest["checksums"][name]:
            raise ValueError("Artifact checksum mismatch: " + name)
    return manifest
