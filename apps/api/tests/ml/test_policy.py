import numpy as np
import pytest
from app.ml.policy import Policy, level, percentiles, scores, sigmoid


@pytest.mark.parametrize("risk,expected", [(0, "LOW"), (29.999, "LOW"), (30, "MEDIUM"),
                                         (69.999, "MEDIUM"), (70, "HIGH"), (100, "HIGH")])
def test_thresholds(risk, expected):
    assert level(risk, Policy()) == expected


def test_formula_and_monotonicity():
    policy = Policy()
    a, risk = scores(np.array([0.02, 0.02]), np.array([0.95, 0.999]), policy)
    np.testing.assert_allclose(a, [0, 1])
    np.testing.assert_allclose(risk, [2, 70.6])
    _, risk = scores(np.linspace(0, 1, 101), 0.99, policy)
    assert (np.diff(risk) >= 0).all()
    _, risk = scores(0.1, np.linspace(0, 1, 101), policy)
    assert (np.diff(risk) >= 0).all()


def test_percentile_ties_and_sigmoid():
    np.testing.assert_allclose(percentiles([0, 1, 2, 3, 4], [1, 2, 2, 3]), [0, .125, .5, .875, 1])
    p = sigmoid([-1e9, 0, 1e9], {"slope": 1, "intercept": 0})
    np.testing.assert_allclose(p, [0, .5, 1])


def test_invalid_policy_and_scores():
    with pytest.raises(ValueError):
        Policy(review_threshold=70, high_threshold=30)
    with pytest.raises(ValueError):
        scores(float("nan"), 0.5, Policy())
