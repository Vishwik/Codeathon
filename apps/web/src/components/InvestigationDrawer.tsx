import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Ban,
  FileText,
  Network,
  Cpu,
  Globe,
  Smartphone,
  UserCheck,
  ArrowRight,
  Fingerprint,
  Activity,
  Zap,
  Lock,
  ExternalLink
} from 'lucide-react';
import { Transaction, CaseStatus, AuditLogEvent } from '../types';

interface InvestigationDrawerProps {
  transaction: Transaction | null;
  onClose: () => void;
  onResolveCase: (txId: string, status: CaseStatus, sarCode?: string, note?: string) => Promise<void>;
}

export const InvestigationDrawer: React.FC<InvestigationDrawerProps> = ({
  transaction,
  onClose,
  onResolveCase,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus>('BLOCKED');
  const [sarNote, setSarNote] = useState('');
  const [analystNote, setAnalystNote] = useState('');
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (transaction) {
      setSelectedStatus(transaction.status === 'APPROVED' || transaction.status === 'BLOCKED' ? transaction.status : transaction.aiAnalysis.recommendedAction === 'APPROVE' ? 'APPROVED' : 'BLOCKED');
      setDecisionError(null);
      setSarNote(transaction.aiAnalysis?.suggestedSarCode || '');
      setAnalystNote('');
    }
  }, [transaction]);

  // Keyboard hotkeys [A], [M], [D]
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!transaction) return;
      if (e.key === 'Escape') { onClose(); return; }
      // Don't trigger if user is typing in textarea/input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelectedStatus('APPROVED');
      } else if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setSelectedStatus('IN_REVIEW');
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setSelectedStatus('BLOCKED');
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSelectedStatus('ESCALATED');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transaction, onClose]);

  if (!transaction) return null;

  const handleSubmitDecision = async () => {
    setIsSubmitting(true); setDecisionError(null);
    try {
      await onResolveCase(transaction.id, selectedStatus, sarNote, analystNote);
      onClose();
    } catch(error) { setDecisionError(error instanceof Error ? error.message : 'Decision could not be saved'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-[#0d1c2d] border-l border-[#273647] h-full overflow-y-auto flex flex-col justify-between shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="sticky top-0 bg-[#0d1c2d]/95 backdrop-blur border-b border-[#1c2b3c] p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-[#adc6ff]">
                  {transaction.id}
                </span>
                <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                  (transaction.risk_level) === 'HIGH' ? 'bg-[#93000a] text-[#ffdad6]' :
                  (transaction.risk_level) === 'MEDIUM' ? 'bg-[#571bc1] text-[#c4abff]' :
                  'bg-[#122131] text-[#4cd7f6]'
                }`}>
                  {transaction.risk_score.toFixed(2)} {transaction.risk_level}
                </span>
                {transaction.fallback_used && (
                  <span
                    className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#341100] text-[#ffb690] border border-[#ffb690]/40"
                    title="Conservative backend fallback applied; not a real ML prediction"
                  >
                    FALLBACK MODE
                  </span>
                )}
                <span className="font-mono text-xs text-[#8c909f]">
                  {transaction.timestamp}
                </span>
              </div>
              <span className="text-xs text-[#c2c6d6] mt-0.5">
                {transaction.primaryRiskSignature} • {transaction.type || transaction.method} • Step {transaction.step}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              aria-label="Close investigation" title="Close investigation"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#122131] hover:bg-[#1c2b3c] text-[#8c909f] hover:text-[#d4e4fa] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="p-5 flex flex-col gap-5 flex-1">
          {decisionError && <div role="alert" className="p-3 bg-[#341100] text-[#ffb4ab]">{decisionError}</div>}
          <div className="text-xs font-mono break-all">Bundle: {transaction.assessment.bundle_version} · Review: {transaction.assessment.review_status} · Human decision: {transaction.decision?.decision || 'PENDING'}</div>
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-[#122131] rounded-lg border border-[#1c2b3c] flex flex-col">
              <span className="font-mono text-[10px] text-[#8c909f] uppercase">Transaction Value</span>
              <span className="font-mono text-xl font-bold text-[#d4e4fa] mt-1">
                {transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} units
              </span>
              <span className="text-[11px] text-[#4cd7f6] mt-0.5">{transaction.type || transaction.method}</span>
            </div>

            <div className="p-3 bg-[#122131] rounded-lg border border-[#1c2b3c] flex flex-col">
              <span className="font-mono text-[10px] text-[#8c909f] uppercase">Supervised Fraud Prob</span>
              <span className="font-mono text-xl font-bold text-[#d0bcff] mt-1">
                {(transaction.fraud_probability ?? transaction.mlProb ?? 0).toFixed(3)}
              </span>
              <span className="text-[11px] text-[#8c909f] mt-0.5">XGBoost Classifier</span>
            </div>

            <div className="p-3 bg-[#122131] rounded-lg border border-[#1c2b3c] flex flex-col">
              <span className="font-mono text-[10px] text-[#8c909f] uppercase">Anomaly Severity</span>
              <span className="font-mono text-xl font-bold text-[#ffb4ab] mt-1">
                {(transaction.anomaly_score ?? transaction.anomalyScore ?? 0).toFixed(3)}
              </span>
              <span className="text-[11px] text-[#8c909f] mt-0.5">Isolation Forest</span>
            </div>

            <div className="p-3 bg-[#122131] rounded-lg border border-[#1c2b3c] flex flex-col">
              <span className="font-mono text-[10px] text-[#8c909f] uppercase">Hybrid Risk Score</span>
              <span className="font-mono text-xl font-bold text-[#adc6ff] mt-1">
                {transaction.risk_score.toFixed(2)} / 100
              </span>
              <span className="text-[10px] text-[#8c909f] mt-0.5">
                Severity: {transaction.risk_level}
              </span>
            </div>
          </div>

          {/* AI Autonomous Synthesis Banner */}
          <div className="p-4 rounded-xl bg-[#122131] border border-[#273647] flex flex-col gap-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#4cd7f6]" />
                <span className="font-semibold text-xs text-[#d4e4fa]">
                  Backend Assessment & Explainable Reasons
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#4cd7f6] bg-[#051424] px-2 py-0.5 rounded border border-[#1c2b3c]">
                {transaction.fraud_prediction}
              </span>
            </div>
            <p className="text-xs text-[#c2c6d6] leading-relaxed">
              {transaction.aiAnalysis.summary}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-[#8c909f] font-mono">Recommended Action:</span>
              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                transaction.aiAnalysis.recommendedAction === 'BLOCK' ? 'bg-[#93000a] text-[#ffdad6]' :
                transaction.aiAnalysis.recommendedAction === 'REVIEW' ? 'bg-[#571bc1] text-[#c4abff]' :
                'bg-[#122131] text-[#4cd7f6]'
              }`}>
                {transaction.aiAnalysis.recommendedAction}
              </span>
            </div>
          </div>

          {/* Algorithmic Explainability: Native TreeSHAP */}
          <div className="p-4 bg-[#122131] rounded-xl border border-[#1c2b3c] flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#adc6ff]" />
                <span className="font-semibold text-xs text-[#d4e4fa]">
                  Classifier Explanation (Native TreeSHAP)
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="text-[#4cd7f6]">← Reduces Fraud Margin</span>
                <span className="text-[#ffb4ab]">Increases Fraud Margin →</span>
              </div>
            </div>
            <p className="text-[11px] text-[#8c909f]">
              TreeSHAP decomposes the XGBoost margin into additive log-odds feature contributions. Note: SHAP applies to the supervised XGBoost model only.
            </p>

            <div className="text-xs font-mono">Raw margin: {transaction.assessment.explanation.raw_margin} · Base: {transaction.assessment.explanation.base_value} · Anomaly percentile: {transaction.anomaly_percentile}</div>
            {/* ContributionBar list */}
            <div className="flex flex-col gap-2.5 pt-1">
              {(transaction.shapContributions || []).map((item, idx) => {
                const isPositive = item.contribution > 0;
                const widthPercent = Math.min(Math.abs(item.contribution) * 120, 100);

                return (
                  <div key={idx} className="flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#d4e4fa] font-medium truncate max-w-sm">
                        {item.label || item.feature}
                      </span>
                      <span className={`font-mono font-semibold ${isPositive ? 'text-[#ffb4ab]' : 'text-[#4cd7f6]'}`}>
                        {isPositive ? `+${item.contribution.toFixed(2)} log-odds` : `${item.contribution.toFixed(2)} log-odds`}
                      </span>
                    </div>

                    {/* Dual-directional horizontal bar where base center is neutral 0 */}
                    <div className="w-full bg-[#051424] h-2 rounded flex relative overflow-hidden">
                      {/* Center Divider */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#424754] z-10"></div>
                      {isPositive ? (
                        <div
                          className="h-full bg-[#ffb4ab] ml-auto rounded-r transition-all"
                          style={{
                            width: `${widthPercent / 2}%`,

                            marginLeft: '50%'
                          }}
                        />
                      ) : (
                        <div
                          className="h-full bg-[#4cd7f6] rounded-l transition-all"
                          style={{
                            width: `${widthPercent / 2}%`,
                            marginLeft: `${50 - (widthPercent / 2)}%`
                          }}
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-[#8c909f]">{item.description}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telemetry & Lineage Details (2 Columns) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account & PaySim Balance Lineage */}
            <div className="p-4 bg-[#122131] rounded-xl border border-[#1c2b3c] flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-[#1c2b3c]">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#adc6ff]" />
                  <span className="font-semibold text-[#d4e4fa]">PaySim Account & Balance Lineage</span>
                </div>
                <span className="font-mono text-[10px] text-[#4cd7f6]">TABULAR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8c909f]">Sender Account (nameOrig):</span>
                <span className="text-[#adc6ff] font-mono font-medium">{transaction.sender_id || transaction.account?.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8c909f]">Recipient Account (nameDest):</span>
                <span className="text-[#adc6ff] font-mono font-medium">{transaction.recipient_id || transaction.destination?.beneficiaryName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8c909f]">PaySim Temporal Step:</span>
                <span className="text-[#d4e4fa] font-mono">Step {transaction.step} (Hour {(transaction.step % 24).toString().padStart(2, '0')}:00)</span>
              </div>
              <div className="pt-2 border-t border-[#1c2b3c] flex flex-col gap-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#8c909f]">Sender Balances:</span>
                  <span className="text-[#d4e4fa]">
                    {transaction.oldbalanceOrg !== undefined ? transaction.oldbalanceOrg.toLocaleString() : '—'} → {transaction.newbalanceOrig !== undefined ? transaction.newbalanceOrig.toLocaleString() : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8c909f]">Recipient Balances:</span>
                  <span className="text-[#d4e4fa]">
                    {transaction.oldbalanceDest !== undefined ? transaction.oldbalanceDest.toLocaleString() : '—'} → {transaction.newbalanceDest !== undefined ? transaction.newbalanceDest.toLocaleString() : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Device & Geolocation Lineage (NOT AVAILABLE) */}
            <div className="p-4 bg-[#122131] rounded-xl border border-[#1c2b3c] flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-[#1c2b3c]">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#4cd7f6]" />
                  <span className="font-semibold text-[#d4e4fa]">Client Metadata & Network</span>
                </div>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#1c2b3c] text-[#8c909f] border border-[#273647]">
                  DEMO EXTENSION
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8c909f]">IP Address:</span>
                <span className="text-[#adc6ff] font-mono">{transaction.device?.ip ?? 'Unavailable'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8c909f]">Location:</span>
                <span className="text-[#d4e4fa]">{transaction.device?.geo ?? 'Unavailable'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8c909f]">VPN / Proxy / Tor:</span>
                <span className={`font-mono text-[11px] font-bold ${transaction.device?.vpnOrProxy || transaction.device?.torDetected ? 'text-[#ffb4ab]' : 'text-[#4cd7f6]'}`}>
                  {!transaction.device ? 'Unavailable' : transaction.device.torDetected ? 'TOR EXIT NODE' : transaction.device?.vpnOrProxy ? 'PROXY DETECTED' : 'RESIDENTIAL'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8c909f]">Device Trust Score:</span>
                <span className={`font-mono font-bold ${(transaction.device?.deviceTrustScore ?? 100) < 30 ? 'text-[#ffb4ab]' : 'text-[#4cd7f6]'}`}>
                  {transaction.device?.deviceTrustScore ?? 'Unavailable'} / 100
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8c909f]">ASN & ISP:</span>
                <span className="text-[#c2c6d6] truncate max-w-[200px]">{transaction.network?.asn ?? 'Unavailable'}</span>
              </div>
              {transaction.network?.travelVelocityMph && (
                <div className="flex justify-between">
                  <span className="text-[#8c909f]">Simulated Travel Velocity:</span>
                  <span className="text-[#ffb4ab] font-mono font-bold">{transaction.network?.travelVelocityMph} mph</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Bottom DecisionPanel with technical selection tiles & hotkey shortcuts */}
        <div className="sticky bottom-0 bg-[#010f1f] border-t border-[#1c2b3c] p-4 flex flex-col gap-3 z-10 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase text-[#8c909f] tracking-wider font-semibold">
              Investigative Decision Console
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#8c909f]">
              <span>Hotkeys:</span>
              <span className="px-1 bg-[#1c2b3c] rounded text-[#d4e4fa]">[A] Approve</span>
              <span className="px-1 bg-[#1c2b3c] rounded text-[#d4e4fa]">[M] Review</span>
              <span className="px-1 bg-[#1c2b3c] rounded text-[#d4e4fa]">[D] Decline</span>
              <span className="px-1 bg-[#1c2b3c] rounded text-[#d4e4fa]">[F] Freeze (Preview)</span>
            </div>
          </div>

          {/* Decision Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setSelectedStatus('APPROVED')}
              className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${
                selectedStatus === 'APPROVED'
                  ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                  : 'bg-[#0d1c2d] border-[#1c2b3c] text-[#8c909f] hover:bg-[#122131]'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-semibold text-xs">Approve</span>
              </div>
              <span className="font-mono text-[10px] px-1 py-0.5 bg-[#051424] rounded border border-[#1c2b3c]">
                [A]
              </span>
            </button>

            <button
              onClick={() => setSelectedStatus('IN_REVIEW')}
              className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${
                selectedStatus === 'IN_REVIEW'
                  ? 'bg-[#d0bcff]/20 border-[#d0bcff] text-[#d0bcff]'
                  : 'bg-[#0d1c2d] border-[#1c2b3c] text-[#8c909f] hover:bg-[#122131]'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-semibold text-xs">Manual Review (Preview)</span>
              </div>
              <span className="font-mono text-[10px] px-1 py-0.5 bg-[#051424] rounded border border-[#1c2b3c]">
                [M]
              </span>
            </button>

            <button
              onClick={() => setSelectedStatus('BLOCKED')}
              className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${
                selectedStatus === 'BLOCKED'
                  ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                  : 'bg-[#0d1c2d] border-[#1c2b3c] text-[#8c909f] hover:bg-[#122131]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4" />
                <span className="font-semibold text-xs">Decline & Block</span>
              </div>
              <span className="font-mono text-[10px] px-1 py-0.5 bg-[#051424] rounded border border-[#1c2b3c]">
                [D]
              </span>
            </button>

            <button
              onClick={() => setSelectedStatus('ESCALATED')}
              className={`p-2.5 rounded-lg border flex items-center justify-between transition-all ${
                selectedStatus === 'ESCALATED'
                  ? 'bg-[#93000a] border-[#ffb4ab] text-[#ffdad6]'
                  : 'bg-[#0d1c2d] border-[#1c2b3c] text-[#8c909f] hover:bg-[#122131]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span className="font-semibold text-xs">Freeze Entity (Preview)</span>
              </div>
              <span className="font-mono text-[10px] px-1 py-0.5 bg-[#051424] rounded border border-[#1c2b3c]">
                [F]
              </span>
            </button>
          </div>

          {/* SAR Narrative code & Analyst input */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={sarNote}
                onChange={e => setSarNote(e.target.value)}
                placeholder="SAR Regulatory Narrative Reference (e.g. SAR-04: Instant Outbound Drain)"
                className="w-full px-3 py-1.5 bg-[#051424] border border-[#1c2b3c] rounded text-xs text-[#d4e4fa] font-mono placeholder:text-[#8c909f] focus:outline-none focus:border-[#4d8eff]"
              />
            </div>
            <button
              onClick={handleSubmitDecision}
              disabled={isSubmitting}
              className={`px-5 py-2 rounded text-xs font-semibold font-mono flex items-center justify-center gap-2 transition-colors ${
                selectedStatus === 'BLOCKED' || selectedStatus === 'ESCALATED'
                  ? 'bg-[#93000a] hover:bg-[#ba1a1a] text-white'
                  : selectedStatus === 'APPROVED'
                  ? 'bg-[#005ac2] hover:bg-[#2170e4] text-white'
                  : 'bg-[#4d8eff] hover:bg-[#3575e6] text-[#00285d]'
              }`}
            >
              <span>{isSubmitting ? 'Recording Decision...' : 'Commit Investigative Decision'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
