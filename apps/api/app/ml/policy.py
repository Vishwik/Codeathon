"""Versioned policy and score transforms, with no model or I/O dependencies."""
import numpy as np
from pydantic import Field, model_validator
from .contracts import Contract, Unit


class Policy(Contract):
    version: str = "policy-v1"
    fraud_threshold: Unit = 0.5
    review_threshold: float = Field(default=30, ge=0, le=100)
    high_threshold: float = Field(default=70, ge=0, le=100)
    anomaly_start: Unit = 0.95
    anomaly_end: Unit = 0.999
    anomaly_weight: Unit = 0.70

    @model_validator(mode="after")
    def ordered(self):
        if self.high_threshold <= self.review_threshold or self.anomaly_end <= self.anomaly_start:
            raise ValueError("Thresholds must be strictly ordered")
        return self


def sigmoid(margin, calibration):
    z = calibration["slope"] * np.asarray(margin, dtype=float) + calibration["intercept"]
    # Equivalent sigmoid form without overflow for extreme margins.
    return np.exp(-np.logaddexp(0, -z))


def percentiles(abnormality, reference):
    values = np.asarray(abnormality)
    left = np.searchsorted(reference, values, side="left")
    right = np.searchsorted(reference, values, side="right")
    return (left + right) / (2.0 * len(reference))


def scores(probability, percentile, policy):
    p, u = np.asarray(probability, dtype=float), np.asarray(percentile, dtype=float)
    if not (np.isfinite(p).all() and np.isfinite(u).all()
            and ((p >= 0) & (p <= 1)).all() and ((u >= 0) & (u <= 1)).all()):
        raise ValueError("Probability and percentile must be finite unit values")
    severity = np.clip((u - policy.anomaly_start) / (policy.anomaly_end - policy.anomaly_start), 0, 1)
    risk = 100 * (p + policy.anomaly_weight * severity * (1 - p))
    return severity, risk


def level(risk, policy):
    return "HIGH" if risk >= policy.high_threshold else "MEDIUM" if risk >= policy.review_threshold else "LOW"
