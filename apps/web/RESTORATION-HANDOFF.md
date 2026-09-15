# RiskOps AI frontend restoration

## Source and scope

- UI source: the user-provided `ai-studio-temp/riskops-ai.zip`, superseding the earlier compact UI at `77c69ea`.
- Branch: `feature/madhu-frontend`.
- HEAD before and after work: `f32aca7adae9550cf0c288f927a2b2214b5643b7`.
- No commit or push. No branch switches. Backend, ML, artifacts, main, and the source ZIP were not edited.

## Restored UI

All six exported views, sidebar/header, investigation drawer, native TreeSHAP bars, command palette, keyboard controls, and JSON/CSV export are retained.
The ZIP's colors, typography, panel composition, tables and charts are used. Responsive wrapping and mobile navigation were added where the export overflowed.
The inaccessible external shield image was replaced with the existing Lucide shield icon.

## Integration retained

- POST score sends only transaction_id, step, type, amount, sender_id, recipient_id.
- Score/detail envelopes are adapted once in `src/api/client.ts`; raw `assessment` and `decision` remain available.
- Every probability, anomaly value, risk score/level, suspicious flag and SHAP contribution comes from the backend.
- List reads `items`; overview reads summary risk/decision counts and average risk.
- PATCH sends APPROVE or BLOCK, then GET refetches the saved detail before showing success.
- Same ID/payload replays correctly; changed payload surfaces HTTP 409.
- HTTP 503, unavailable network and failed decisions surface errors, never local scores or fake success.

## Files

Modified: `index.html`, `package.json`, `src/App.tsx`, `src/main.tsx`, `src/types.ts`, `src/api/client.ts`, root `package-lock.json`.
Added: `vite.config.ts`, `src/index.css`, `src/vite-env.d.ts`, this report.
Imported/adapted components: Header, Sidebar, CommandPalette, InvestigationDrawer, ExportModal.
Imported/adapted views: OverviewView, InvestigationsView, LiveStreamView, DemoConsoleView, ModelRulesView, AuditTrailView.
Added: `src/data/mockData.ts` (empty transaction/audit seeds and labeled preview configuration only).
Added: `tests/client.test.mjs`, `tests/fixtures/assessment.json` (a captured synthetic test assessment, not a model artifact).
Removed: unused compact UI stylesheet `src/styles.css`.

Only Tailwind CSS and its Vite plugin were added. No Gemini, Express, dotenv, animation package or backend infrastructure was imported from the ZIP.

## Verification

- `npm test`: TypeScript passed; 10 frontend regression tests and 2 existing Node tests passed.
- `npm run build`: production build passed.
- `git diff --check`: passed (Windows LF/CRLF informational warnings only).
- Browser: all six views, normal/transfer/cash-out payloads, authoritative assessment fields and ten TreeSHAP rows, APPROVE/BLOCK and detail refetch, JSON/CSV export, Ctrl+K/arrow/Enter/Escape navigation verified.
- Browser-injected 503/network/decision failures: errors shown, no fake success.
- Actual backend idempotent replay and conflicting payload: verified.
- Desktop and 390px embedded mobile viewport visually checked; all six mobile pages fit without page-level horizontal overflow.
- Browser smoke tests created synthetic demo records and decisions in the running demo database. Existing records were not deleted.

## Limits and intentional differences

The ZIP's fake transactions, local score generator, invented telemetry and optimistic decision success were removed.
Live Stream polls persisted records instead of manufacturing transactions.
Historical charts, time-range filters, velocity telemetry, notifications, device/IP intelligence, account chains, configurable fusion and automated guardrails remain unavailable or clearly marked previews.
Model/rule sliders do not alter assessments. Review/freeze cannot be persisted; only APPROVE/BLOCK are supported.
Audit Trail is a browser-session view of confirmed decisions, not an immutable backend audit ledger.
Lists show the latest 100 records; summary totals are all-time.
The running bundle is synthetic, not PaySim-trained. Scenario names describe input examples, not proof of mule-chain or velocity detection.

## Run and review

From the repository root:

```powershell
npm install
npm run dev:web
npm test
npm run build
```

Frontend: http://localhost:5173/
Verified FastAPI backend: http://localhost:4000/
`VITE_API_BASE_URL` optionally overrides that backend URL; no frontend secrets are required.
Use Pranai's existing FastAPI setup for backend startup; this frontend branch's legacy Node API is not the ML service.

Next: review the restored ZIP UI in the browser, then stage only frontend files plus the root lockfile when authorizing a commit.
Do not stage the pre-existing untracked `apps/api/.venv`, backend runtime directories or `artifacts`.
