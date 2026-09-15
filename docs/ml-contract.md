# RiskOps AI ML contract (schema 1.0)

Owner: Adwaith (ML). Pranai owns HTTP, SQLite, request idempotency and review
decisions. Madhu owns frontend rendering. This module implements no routes,
database operations, external requests, or automatic financial actions.

## Public interface

Run Python with apps/api as its working directory, or add apps/api to PYTHONPATH.

```python
from app.ml import RiskEngine

engine = RiskEngine.load(model_dir)
assessment = engine.assess({
    "transaction_id": "tx-001",
    "step": 51,
    "type": "TRANSFER",
    "amount": 1250.0,
    "sender_id": "C001",
    "recipient_id": "C002",
})
information = engine.info()
```

load(model_dir) loads and verifies all files once. It raises ArtifactError
(a ValueError subclass) for missing/corrupt/incompatible bundles.
assess(transaction, context=None) accepts a dictionary or TransactionInput and
returns a plain JSON-compatible dictionary validated as RiskAssessment.
info() returns a detached JSON-compatible dictionary, including versions,
feature order, thresholds, calibration support status, provenance and required_context.

Static-v1 requires no history. Any non-None context, including {}, is rejected.
No current, future, or past account activity is silently used or zero-filled.
The feature version and contract must be revised before history features are added.

## Input

All six fields are required. Additional fields are forbidden.
Strings are trimmed, nonempty and at most 200 characters. Numeric strings and
booleans are rejected by the public typed contract.

| Field | Type / validation |
| --- | --- |
| transaction_id | String, opaque backend identifier |
| step | Integer >= 0; PaySim hour, not a real calendar timestamp |
| type | CASH_IN, CASH_OUT, DEBIT, PAYMENT, TRANSFER |
| amount | Finite number > 0, original dataset local currency |
| sender_id | String identifier, not a numeric predictor |
| recipient_id | String identifier; only C/M prefix category is used |

Unknown prefixes produce both destination category indicators as zero.
The ML layer does not convert currency or infer timestamps.
isFraud, isFlaggedFraud and all four balance columns are forbidden scoring inputs.

## Output

| Field | Meaning |
| --- | --- |
| schema_version | 1.0 |
| transaction_id | Echo of validated input ID |
| bundle_version | Immutable bundle directory name |
| feature_version | static-v1 |
| policy_version | Policy algorithm/schema version, scoped to bundle_version |
| fraud_probability | Calibrated classifier estimate, 0..1 |
| fraud_prediction | FRAUD or LEGITIMATE at artifact fraud_threshold |
| anomaly_percentile | 0..1 rank against fixed legitimate calibration rows |
| anomaly_score | 0..1 tail severity; NOT a probability |
| risk_score | 0..100 hybrid prioritization score; NOT a probability |
| risk_level | LOW, MEDIUM, HIGH using unrounded risk |
| suspicious | risk_score >= review_threshold |
| reasons | List of {code, source, message} |
| explanation | {units, raw_margin, base_value, contributions} |

Reason source is CLASSIFIER, ANOMALY or POLICY.
Each contribution has {feature, label, value, contribution}; value is the
engineered/encoded feature value, not always the raw transaction field.
All contributions are returned in fixed feature order.
units is raw_log_odds. base_value + sum(contribution) approximately equals
raw_margin; it does NOT equal fraud_probability or risk_score.
Native TreeSHAP describes classifier behavior, not causation or proof of fraud.
Isolation Forest has a percentile explanation only; no fabricated feature SHAP.

Pranai adds assessment_id, stored timestamps, review status and human decisions.
APPROVE/BLOCK is distinct from fraud_prediction and is not a ground-truth label.
An anomaly-only alert may have fraud_prediction=LEGITIMATE; this is expected.

## Scores and policy

p = sigmoid(slope * raw_margin + intercept), fitted without class weights.
s = -IsolationForest.score_samples(features).
u = (number(reference < s) + number(reference <= s)) / (2 * reference_size).
This mid-rank convention prevents tied ordinary observations all receiving rank 1.
a = clip((u - 0.95) / 0.049, 0, 1).
risk = 100 * (p + 0.70 * a * (1 - p)).

Defaults: LOW below 30; MEDIUM from 30 up to but excluding 70; HIGH >= 70.
Suspicious means risk >= 30. These use full precision before display rounding.
fraud_threshold starts at 0.5 but training selects it by F1 on the policy split.
Fusion, tail and risk thresholds remain provisional defaults; policy metrics
compare weights 0, 0.35 and 0.70 so the team can review the tradeoff.
Changing defaults requires a NEW bundle and policy-partition review, never
test-set tuning. Do not modify a deployed policy file: checksums will fail.

## Setup and verification (Windows PowerShell)

Python 3.12 was used for verification. A bundle requires the same Python
major/minor and pinned numerical/ML dependencies as its training environment.
No GPU, model API key, cloud account or separate ML service is required.

From the repository root:

```powershell
cd apps/api
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-ml-dev.txt
.\.venv\Scripts\python.exe -m pytest tests/ml -q
.\.venv\Scripts\python.exe -m app.ml.smoke --out ../../artifacts/synthetic-smoke-v1
```

Use a NEW smoke output directory on each run. The smoke command writes a synthetic
CSV, prepared splits, a complete trained bundle, a separate test evaluation,
example-assessment.json and model-info.json. These are SOFTWARE TEST artifacts,
not evidence of PaySim or real-world fraud performance.
The exact runtime dependencies are pinned in requirements-ml.txt; development
adds pytest. The bundle records these versions and refuses mismatches.

## Real PaySim training

Download the original CSV manually from https://www.kaggle.com/datasets/ealaxi/paysim1.
Place it at data/raw/paysim.csv under the repository root. Keep it out of Git.
The source is hashed and never edited. Preparation requires the 11 original
headers but reads only the safe source fields plus the label.

From apps/api:

```powershell
.\.venv\Scripts\python.exe -m app.ml.prepare --csv ../../data/raw/paysim.csv --out ../../data/processed/paysim-v1 --config config/ml.json
.\.venv\Scripts\python.exe -m app.ml.train --data ../../data/processed/paysim-v1 --out ../../artifacts/riskops-v1 --config config/ml.json
.\.venv\Scripts\python.exe -m app.ml.evaluate --data ../../data/processed/paysim-v1 --model ../../artifacts/riskops-v1 --split test --out ../../artifacts/reports/riskops-v1-test.json
```

Preparation reports invalid row numbers and reasons, including zero amounts.
It fails on invalid rows by default. After inspecting the report, explicitly use
--allow-invalid with a NEW output directory to exclude invalid rows. Do not edit
the original CSV. A failed preparation output lacks the final split manifest
and cannot be trained. A missing CSV is an actionable error, never a fallback
to synthetic data.

Partitions use ordered distinct whole steps: 60/10/10/10/10 percent, with floor
rounding recorded explicitly. They are train, validation, calibration, policy,
test. At least ten distinct steps are required. Source row order is retained
within each partition because the static model has no history semantics.
Training rejects any of its four partitions that lacks either class.

Float32 feature arrays are memory-mapped. Preparation scans in configurable
chunks, reports row/class/type counts and writes source-row IDs.
Full training is capped at a reproducible uniform sample of one million rows.
Validation/calibration/policy/test remain naturally imbalanced and unsampled.
The sampled train class ratio is used for the three class-weight candidates.
Isolation Forest independently samples at most 150,000 legitimate training rows.
No SMOTE, account-ID encodings, balance features or absolute simulation day.

The three classifier candidates are selected by validation average precision
with early stopping on aucpr. Selected trees are saved, not the full overrun
model. Sigmoid calibration fits margins from the untouched calibration period.
Calibration with fewer than 100 positives is flagged fitted_low_support.
A nonpositive sigmoid slope fails training for review.

Training never opens test arrays. It records policy and calibration-fit
diagnostics; the latter are explicitly in-sample, not independent evidence.
The evaluate command writes a separate report and never modifies a bundle.
Reports contain average precision (not interpolated PR-AUC), classification
precision/recall/F1/confusion, calibration/Brier/log-loss and base-rate baselines,
false alerts per 1,000 ALL transactions, review volume, per-type support, and
recall at 0.5%, 1%, 2% budgets. Budgets floor N*fraction; ties use stable source
order. Metrics with no positive examples report AP/recall-at-budget as null.

## Artifact contract and integration

The loader expects exactly these required artifacts plus manifest.json:

- xgboost.ubj: selected classifier trees.
- isolation_forest.joblib: fitted anomaly detector (load team-trusted files only).
- calibration.json: slope, intercept, base rate and support status.
- anomaly_reference.npy: sorted legitimate calibration abnormality scores.
- features.json: allowlisted order, static version, no required history.
- policy.json: fraud/review/high thresholds, anomaly mapping and fusion.
- metrics.json: validation candidates and development diagnostics.
- manifest.json: versions, dataset hash/report, splits, Git revision/dirty flag, settings,
  dependency versions and checksums of required artifacts.

Checksums detect accidental corruption, not malicious provenance. The training
command writes to a temporary directory, reloads and verifies pre/post-save
scores, then publishes the complete bundle to a new destination. Never edit or
overwrite a published bundle. Share the whole bundle directory with Pranai.

No environment variable is read implicitly by the ML module. Pranai may use
MODEL_DIR in his backend configuration and pass that path to load(). Data paths
are explicit CLI arguments. Do not place thresholds in frontend environment
variables or duplicate feature transforms in backend code.

Pranai: load once during FastAPI startup; readiness fails if loading fails.
Use synchronous scoring or dispatch CPU work to a threadpool, not directly in an
async event loop. Handle HTTP validation, duplicate transaction IDs and storage
outside this module. Map input errors to 422 and ArtifactError to unavailable
readiness/503 as appropriate. Never translate failures into a LOW result.

Madhu: use assessment keys directly; show probability as percent, anomaly
severity separately, risk as /100, and classifier prediction separately from
review decisions. Render returned explanation labels and signed contributions;
do not recompute policy or present raw_log_odds as percentage points.

## Current limitations

Static features cannot support learned velocity or account-chain claims.
Synthetic mule/velocity demonstrations must be labelled and use separately
identified backend policy rules if implemented later. Real PaySim performance,
full-scale memory usage and final operational thresholds require the actual CSV.
No automatic human-decision feedback training is included.
