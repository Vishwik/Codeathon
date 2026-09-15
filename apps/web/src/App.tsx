import { Activity, CheckCircle2, Command, Download, FileText, LayoutDashboard, Radio, Scale, Search, ShieldAlert, ShieldCheck, Terminal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, apiClient } from "./api/client";
import type { AuditEvent, Decision, Health, ScoreInput, Summary, TransactionRecord, TransactionType } from "./types";

const nav = [["overview", "Overview", LayoutDashboard], ["investigations", "Investigations", ShieldAlert], ["live", "Live Stream", Radio], ["demo", "Demo Console", Terminal], ["model", "Model & Rules", Scale], ["audit", "Audit Trail", FileText]] as const;

export default function App() {
  const [screen, setScreen] = useState("overview");
  const [health, setHealth] = useState<Health | null>(null);
  const [records, setRecords] = useState<TransactionRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<TransactionRecord | null>(null);
  const [palette, setPalette] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [audits, setAudits] = useState<AuditEvent[]>([]);

  const refresh = async () => {
    const nextHealth = await apiClient.health();
    setHealth(nextHealth);
    if (!nextHealth.online) {
      setRecords([]);
      setSummary(null);
      return;
    }
    try {
      const [transactions, nextSummary] = await Promise.all([apiClient.transactions(), apiClient.summary()]);
      setRecords(transactions.items);
      setSummary(nextSummary);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load backend records");
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette(true);
      }
      if (event.key === "Escape") setPalette(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const decide = async (decision: Decision, note: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await apiClient.decision(selected.transaction.transaction_id, decision, note);
      setSelected(updated);
      setRecords((current) => current.map((record) => record.transaction.transaction_id === updated.transaction.transaction_id ? updated : record));
      setAudits((current) => [{ id: crypto.randomUUID(), timestamp: updated.decision?.timestamp ?? new Date().toISOString(), transactionId: updated.transaction.transaction_id, decision, note: updated.decision?.note }, ...current]);
      await refresh();
      setNotice("Decision recorded and investigation refreshed from the backend.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Backend decision failed");
    } finally {
      setBusy(false);
    }
  };

  const score = async (input: ScoreInput) => {
    setBusy(true);
    try {
      const result = await apiClient.score(input);
      setRecords((current) => [result, ...current.filter((record) => record.transaction.transaction_id !== result.transaction.transaction_id)]);
      setSelected(result);
      setScreen("investigations");
      setNotice("Backend assessment received.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "BACKEND OFFLINE • ML UNAVAILABLE");
    } finally {
      setBusy(false);
    }
  };

  const pendingSuspicious = records.filter((record) => record.assessment.suspicious && record.assessment.review_status === "PENDING").length;
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span><ShieldCheck size={23} /></span><div><strong>RiskOps AI</strong><small>Transaction Risk & Investigation</small></div></div><button className="search-launch" onClick={() => setPalette(true)}><Command size={15} /> Search transactions <kbd>Ctrl K</kbd></button><div className={"health " + (health?.online ? "online" : "offline")}><Activity size={14} />{health?.online ? "BACKEND ONLINE" : "BACKEND OFFLINE • ML UNAVAILABLE"}{health?.online && health.latencyMs !== null && <small>{health.latencyMs} ms</small>}</div></header>
    <aside className="sidebar"><nav><p>Investigative Operations</p>{nav.map(([id, label, Icon]) => <button className={screen === id ? "active" : ""} onClick={() => setScreen(id)} key={id}><Icon size={17} /><span>{label}</span>{id === "investigations" && pendingSuspicious > 0 && <b>{pendingSuspicious}</b>}</button>)}</nav><div className="engine-card"><p>Active ML Components</p><span>XGBoost Classifier</span><span>Isolation Forest</span><span>Hybrid Risk Fusion</span><span>Native TreeSHAP</span></div></aside>
    <main>{screen === "overview" && <Overview summary={summary} records={records} health={health} onSelect={setSelected} onExport={() => setExportOpen(true)} />}{screen === "investigations" && <Investigations records={records} onSelect={setSelected} />}{screen === "live" && <Live health={health} records={records} onRefresh={refresh} onSelect={setSelected} />}{screen === "demo" && <Demo busy={busy} onScore={score} />}{screen === "model" && <Model />}{screen === "audit" && <Audit events={audits} />}</main>
    {selected && <Drawer record={selected} busy={busy} onClose={() => setSelected(null)} onDecision={decide} />}{palette && <Palette records={records} onClose={() => setPalette(false)} onSelect={(record) => { setSelected(record); setPalette(false); }} onNavigate={(target) => { setScreen(target); setPalette(false); }} />}{exportOpen && <Export records={records} onClose={() => setExportOpen(false)} />}{notice && <button className="notice" onClick={() => setNotice(null)}>{notice}<X size={15} /></button>}
  </div>;
}

function Overview({ summary, records, health, onSelect, onExport }: { summary: Summary | null; records: TransactionRecord[]; health: Health | null; onSelect: (record: TransactionRecord) => void; onExport: () => void }) {
  return <section className="view"><div className="view-head"><div><p>Risk command center</p><h1>Overview</h1></div><button className="primary" onClick={onExport}><Download size={16} /> Export records</button></div>{!health?.online ? <Offline /> : <><div className="stat-grid">{[["Transactions", summary?.total_transactions], ["Suspicious", summary?.risk_counts ? summary.risk_counts.MEDIUM + summary.risk_counts.HIGH : undefined], ["High risk", summary?.risk_counts?.HIGH], ["Average risk", summary?.average_risk_score?.toFixed(1)]].map(([label, value]) => <article key={String(label)}><small>{label}</small><strong>{value ?? "—"}</strong></article>)}</div><section className="panel"><div className="panel-head"><h2>Recent backend assessments</h2><span>{records.length} loaded</span></div><RecordTable records={records} onSelect={onSelect} /></section></>}</section>;
}

function Investigations({ records, onSelect }: { records: TransactionRecord[]; onSelect: (record: TransactionRecord) => void }) {
  const queue = records.filter((record) => record.assessment.suspicious);
  return <section className="view"><div className="view-head"><div><p>Human-in-the-loop queue</p><h1>Investigations</h1></div></div><section className="panel"><div className="panel-head"><h2>Suspicious transactions</h2><span>{queue.length} records</span></div><RecordTable records={queue} onSelect={onSelect} /></section></section>;
}

function Live({ health, records, onRefresh, onSelect }: { health: Health | null; records: TransactionRecord[]; onRefresh: () => Promise<void>; onSelect: (record: TransactionRecord) => void }) {
  return <section className="view"><div className="view-head"><div><p>Backend transaction feed</p><h1>Live Stream</h1></div><button className="secondary" onClick={() => void onRefresh()}>Refresh</button></div>{!health?.online ? <Offline /> : <section className="panel"><p className="muted">Polls the backend every 15 seconds. This client does not generate transactions or scores.</p><RecordTable records={records} onSelect={onSelect} /></section>}</section>;
}

function Demo({ busy, onScore }: { busy: boolean; onScore: (input: ScoreInput) => Promise<void> }) {
  const [input, setInput] = useState<ScoreInput>({ transaction_id: "txn_demo_001", step: 120, type: "TRANSFER", amount: 48500, sender_id: "C123", recipient_id: "C456" });
  const change = (key: keyof ScoreInput, value: string) => setInput((current) => ({ ...current, [key]: key === "amount" || key === "step" ? Number(value) : value } as ScoreInput));
  const preset = (kind: "normal" | "mule" | "velocity") => {
    const scenarios = { normal: { type: "PAYMENT" as TransactionType, step: 120, amount: 125.5, sender_id: "C109", recipient_id: "M382" }, mule: { type: "TRANSFER" as TransactionType, step: 142, amount: 48500, sender_id: "C123", recipient_id: "C456" }, velocity: { type: "CASH_OUT" as TransactionType, step: 210, amount: 95000, sender_id: "C391", recipient_id: "M782" } };
    setInput({ transaction_id: "txn_" + kind + "_" + Date.now(), ...scenarios[kind] });
  };
  return <section className="view"><div className="view-head"><div><p>Real API scoring only</p><h1>Demo Console</h1></div></div><section className="panel demo"><p>Select a scenario, then send only the approved six-field payload to <code>POST /api/v1/transactions/score</code>. No balance fields, local scoring, or generated fallback scores are used.</p><div className="preset-row"><button onClick={() => preset("normal")}>Normal transaction</button><button onClick={() => preset("mule")}>Mule transfer</button><button onClick={() => preset("velocity")}>Novel anomaly</button></div><p className="extension-note">The novel-anomaly preset is a demonstration input. Static-v1 does not claim velocity or account-chain detection.</p><div className="form-grid"><label>Transaction ID<input value={input.transaction_id} onChange={(event) => change("transaction_id", event.target.value)} /></label><label>Step<input type="number" value={input.step} onChange={(event) => change("step", event.target.value)} /></label><label>Type<select value={input.type} onChange={(event) => change("type", event.target.value)}>{["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"].map((type) => <option key={type}>{type}</option>)}</select></label><label>Amount<input type="number" min="0.01" value={input.amount} onChange={(event) => change("amount", event.target.value)} /></label><label>Sender ID<input value={input.sender_id} onChange={(event) => change("sender_id", event.target.value)} /></label><label>Recipient ID<input value={input.recipient_id} onChange={(event) => change("recipient_id", event.target.value)} /></label></div><button className="primary" disabled={busy} onClick={() => void onScore(input)}>{busy ? "Requesting backend…" : "Score with RiskEngine API"}</button></section></section>;
}

function Model() { return <section className="view"><div className="view-head"><div><p>Backend-owned model configuration</p><h1>Model & Rules</h1></div></div><section className="panel model"><article><h2>XGBoost Classifier</h2><p>Produces calibrated fraud probability and native TreeSHAP classifier explanations.</p></article><article><h2>Isolation Forest</h2><p>Produces anomaly percentile and severity against a fixed legitimate calibration reference.</p></article><article><h2>Hybrid Risk Fusion</h2><p>Combines backend probability and anomaly severity into a 0–100 review-priority score.</p></article><article><h2>Policy</h2><p>LOW below 30, MEDIUM from 30 to below 70, HIGH from 70. Rules and thresholds are versioned with the backend artifact bundle.</p></article></section><p className="extension-note">No Redis, autoencoder, Bayesian fusion, device intelligence, IP intelligence, account graph, or automated blocking is presented as active capability.</p></section>; }
function Audit({ events }: { events: AuditEvent[] }) { return <section className="view"><div className="view-head"><div><p>Local session view of successful backend decisions</p><h1>Audit Trail</h1></div></div><section className="panel">{events.length ? events.map((event) => <article className="audit" key={event.id}><b>{event.decision}</b><span>{event.transactionId}</span><small>{event.timestamp}{event.note ? " • " + event.note : ""}</small></article>) : <p className="empty-copy">No decisions have been recorded in this session. The permanent audit trail is backend-owned.</p>}</section></section>; }
function RecordTable({ records, onSelect }: { records: TransactionRecord[]; onSelect: (record: TransactionRecord) => void }) { return records.length ? <div className="table">{records.map((record) => { const { transaction, assessment } = record; return <button className="record" key={transaction.transaction_id} onClick={() => onSelect(record)}><span><b>{transaction.transaction_id}</b><small>{transaction.type} • {transaction.sender_id} → {transaction.recipient_id}</small></span><span>{transaction.amount.toLocaleString()} units</span><span>{(assessment.fraud_probability * 100).toFixed(1)}%</span><strong className={"risk-" + assessment.risk_level.toLowerCase()}>{assessment.risk_score.toFixed(1)} {assessment.risk_level}</strong></button>; })}</div> : <p className="empty-copy">No backend transactions are available.</p>; }
function Drawer({ record, busy, onClose, onDecision }: { record: TransactionRecord; busy: boolean; onClose: () => void; onDecision: (decision: Decision, note: string) => void }) { const [note, setNote] = useState(""); const { transaction, assessment, decision } = record; const rows = [...assessment.explanation.contributions].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)); return <div className="drawer-backdrop" onMouseDown={onClose}><aside className="drawer" onMouseDown={(event) => event.stopPropagation()}><header><div><p>Investigation</p><h2>{transaction.transaction_id}</h2></div><button onClick={onClose}><X /></button></header><div className="metric-grid">{[["Fraud probability", (assessment.fraud_probability * 100).toFixed(1) + "%"], ["Anomaly severity", assessment.anomaly_score.toFixed(3)], ["Hybrid risk", assessment.risk_score.toFixed(1) + " / 100"], ["Risk level", assessment.risk_level]].map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong></article>)}</div><section><h3>Assessment evidence</h3><ul>{assessment.reasons.map((reason) => <li key={reason.code}><b>{reason.source}</b>{reason.message}</li>)}</ul></section><section><h3>Classifier explanation • Native TreeSHAP</h3><p className="muted">Signed raw log-odds contributions from the backend; they are not probability or hybrid-risk points.</p>{rows.length ? rows.map((row) => <div className="shap" key={row.feature}><span>{row.label}<small>{row.value.toFixed(4)}</small></span><i className={row.contribution >= 0 ? "plus" : "minus"} style={{ width: Math.min(Math.abs(row.contribution) * 35, 50) + "%" }} /><b>{row.contribution >= 0 ? "+" : ""}{row.contribution.toFixed(3)}</b></div>) : <p className="empty-copy">No TreeSHAP values were returned.</p>}</section><section className="context"><h3>Transaction context</h3><p>{transaction.type} • {transaction.amount.toLocaleString()} units • Step {transaction.step}</p><p>{transaction.sender_id} → {transaction.recipient_id}</p><p>Investigation state: {assessment.review_status}{decision ? " • " + decision.decision : ""}</p></section><footer><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Investigator note (stored by backend)" /><button disabled={busy} onClick={() => onDecision("APPROVE", note)}><CheckCircle2 size={16} /> Approve</button><button className="block" disabled={busy} onClick={() => onDecision("BLOCK", note)}><ShieldAlert size={16} /> Block</button></footer></aside></div>; }
function Palette({ records, onClose, onSelect, onNavigate }: { records: TransactionRecord[]; onClose: () => void; onSelect: (record: TransactionRecord) => void; onNavigate: (target: string) => void }) { const [query, setQuery] = useState(""); const results = useMemo(() => records.filter((record) => [record.transaction.transaction_id, record.transaction.sender_id, record.transaction.recipient_id, record.transaction.type].join(" ").toLowerCase().includes(query.toLowerCase())).slice(0, 8), [query, records]); return <div className="modal-backdrop" onMouseDown={onClose}><section className="palette" onMouseDown={(event) => event.stopPropagation()}><div><Search size={18} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search backend transactions" /><button onClick={onClose}><X /></button></div><p>Views</p>{[["overview", "Overview"], ["investigations", "Investigations"], ["demo", "Demo Console"]].map(([id, label]) => <button key={id} onClick={() => onNavigate(id)}>{label}</button>)}<p>Transactions</p>{results.length ? results.map((record) => <button key={record.transaction.transaction_id} onClick={() => onSelect(record)}>{record.transaction.transaction_id}<small>{record.transaction.type} • {record.assessment.risk_score.toFixed(1)} {record.assessment.risk_level}</small></button>) : <em>No matching backend records.</em>}</section></div>; }
function Export({ records, onClose }: { records: TransactionRecord[]; onClose: () => void }) { const download = () => { const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), transactions: records }, null, 2)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "riskops-transactions.json"; anchor.click(); URL.revokeObjectURL(url); }; return <div className="modal-backdrop"><section className="export"><button onClick={onClose}><X /></button><Download size={23} /><h2>Export backend transaction records</h2><p>Exports exactly the records returned by the backend, without client-generated scores.</p><button className="primary" onClick={download}>Download JSON ({records.length})</button></section></div>; }
function Offline() { return <section className="offline"><ShieldAlert size={24} /><h2>BACKEND OFFLINE • ML UNAVAILABLE</h2><p>RiskOps does not generate replacement fraud, anomaly, or risk scores in the browser. Start FastAPI at {API_BASE_URL} to load live assessments.</p></section>; }
