"""Native TreeSHAP for the classifier margin only."""
import numpy as np
import xgboost as xgb
from .contracts import Contribution, Explanation, Reason
from .features import FEATURES, LABELS


def explain(booster, matrix):
    data = xgb.DMatrix(matrix, feature_names=FEATURES)
    contributions = booster.predict(data, pred_contribs=True, approx_contribs=False)[0]
    margin = float(booster.predict(data, output_margin=True)[0])
    if not np.isclose(contributions.sum(), margin, rtol=1e-4, atol=1e-4):
        raise ValueError("TreeSHAP additivity check failed")
    explanation = Explanation(raw_margin=margin, base_value=float(contributions[-1]),
        contributions=[Contribution(feature=name, label=LABELS[name], value=float(matrix[0, i]),
                       contribution=float(contributions[i])) for i, name in enumerate(FEATURES)])
    reasons = []
    significant = sorted(explanation.contributions, key=lambda item: abs(item.contribution), reverse=True)
    for item in significant[:3]:
        if abs(item.contribution) > 1e-8:
            direction = "increased" if item.contribution > 0 else "decreased"
            reasons.append(Reason(code="SHAP_" + item.feature.upper(), source="CLASSIFIER",
                message=f"{item.label} (encoded value {item.value:.4g}) {direction} the classifier raw score relative to its baseline."))
    return explanation, reasons
