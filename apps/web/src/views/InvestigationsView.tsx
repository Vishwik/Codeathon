import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Lock,
  ArrowRight,
  ExternalLink,
  Clock,
  User,
  Globe,
  DollarSign
} from 'lucide-react';
import { Transaction, CaseStatus } from '../types';

interface InvestigationsViewProps {
  transactions: Transaction[];
  onSelectTransaction: (tx: Transaction) => void;
  onResolveCase: (txId: string, status: CaseStatus) => Promise<void>;
}

export const InvestigationsView: React.FC<InvestigationsViewProps> = ({
  transactions,
  onSelectTransaction,
  onResolveCase,
}) => {
  const [savingId,setSavingId]=useState<string | null>(null);
  const [decisionError,setDecisionError]=useState<string | null>(null);
  const save=async(id:string,status:CaseStatus)=>{
    setSavingId(id);setDecisionError(null);
    try {await onResolveCase(id,status);} catch(error){setDecisionError(String(error));} finally {setSavingId(null);}
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');

  const filtered = transactions.filter(tx => {
    const riskLvl = tx.risk_level;
    const matchesSearch =
      tx.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.account?.holder || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.sender_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.recipient_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.device?.ip || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.primaryRiskSignature || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;
    const matchesChannel = channelFilter === 'ALL' || tx.type === channelFilter || tx.method === channelFilter;
    const matchesRisk = riskFilter === 'ALL' || riskLvl === riskFilter;

    return matchesSearch && matchesStatus && matchesChannel && matchesRisk;
  });

  const queuedCount = transactions.filter(t => t.status === 'QUEUED').length;
  const inReviewCount = transactions.filter(t => t.status === 'IN_REVIEW').length;
  const highRiskCount = transactions.filter(t => {
    const lvl = t.risk_level;
    return lvl === 'HIGH';
  }).length;

  return (
    <div className="flex flex-col w-full text-[#d4e4fa] p-4 gap-4">
      {decisionError && <div role="alert" className="text-[#ffb4ab]">{decisionError}</div>}
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1c2b3c]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-[#d4e4fa]">
              Investigative Operations & Case Triage
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#93000a] text-[#ffdad6] font-bold">
              {highRiskCount} High Risk
            </span>
          </div>
          <p className="text-xs text-[#8c909f] mt-1">
            Supervised XGBoost fraud classifications, Isolation Forest anomalies, and human decisions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1c2d] border border-[#1c2b3c] font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-[#4cd7f6]" />
            <span className="text-[#8c909f]">SLA (Preview):</span>
            <span className="text-[#4cd7f6] font-bold">&lt; 4m</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1c2d] border border-[#1c2b3c] font-mono text-xs">
            <span className="text-[#8c909f]">Active Queue:</span>
            <span className="text-[#adc6ff] font-bold">{queuedCount + inReviewCount} cases</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[#8c909f] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter by TX ID, Account, IP, Risk Signature..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#122131] border border-[#1c2b3c] rounded-lg text-xs text-[#d4e4fa] font-mono placeholder:text-[#8c909f] focus:outline-none focus:border-[#4d8eff]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#122131] border border-[#1c2b3c] rounded-lg text-xs text-[#c2c6d6] font-mono focus:outline-none"
          >
            <option value="ALL">All Statuses ({transactions.length})</option>
            <option value="QUEUED">Queued ({queuedCount})</option>
            <option value="IN_REVIEW">In Review ({inReviewCount})</option>
            <option value="APPROVED">Approved</option>
            <option value="BLOCKED">Blocked</option>
          </select>

          {/* PaySim Channel Filter */}
          <select
            value={channelFilter}
            onChange={e => setChannelFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#122131] border border-[#1c2b3c] rounded-lg text-xs text-[#c2c6d6] font-mono focus:outline-none"
          >
            <option value="ALL">All PaySim Types</option>
            <option value="TRANSFER">TRANSFER</option>
            <option value="CASH_OUT">CASH_OUT</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="DEBIT">DEBIT</option>
            <option value="CASH_IN">CASH_IN</option>
          </select>

          {/* Risk Filter strictly 3-tier */}
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#122131] border border-[#1c2b3c] rounded-lg text-xs text-[#c2c6d6] font-mono focus:outline-none"
          >
            <option value="ALL">All Risk Levels</option>
            <option value="HIGH">High (Score 75-100)</option>
            <option value="MEDIUM">Medium (Score 45-74)</option>
            <option value="LOW">Low (Score 0-44)</option>
          </select>
        </div>

        <div className="font-mono text-xs text-[#8c909f]">
          Showing {filtered.length} of {transactions.length} records
        </div>
      </div>

      {/* Cases List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl text-[#8c909f] font-mono text-xs">
            No transactions match the selected filters.
          </div>
        ) : (
          filtered.map(tx => {
            const riskLvl = tx.risk_level;
            const score = tx.risk_score ?? tx.fusedScore ?? 0;
            const fraudProb = tx.fraud_probability ?? tx.mlProb ?? 0;
            const anomScore = tx.anomaly_score ?? tx.anomalyScore ?? 0;
            const isHigh = riskLvl === 'HIGH';
            const isMedium = riskLvl === 'MEDIUM';

            return (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction(tx)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isHigh
                    ? 'bg-[#0d1c2d] border-[#ef4444]/40 hover:border-[#ef4444] shadow-sm'
                    : isMedium
                    ? 'bg-[#0d1c2d] border-[#d0bcff]/40 hover:border-[#d0bcff]'
                    : 'bg-[#0d1c2d] border-[#1c2b3c] hover:border-[#4cd7f6]/40'
                }`}
              >
                {/* Left Column: TX, Entity & Risk */}
                <div className="flex flex-col gap-1.5 max-w-lg">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-bold text-[#adc6ff]">
                      {tx.id}
                    </span>
                    {tx.fallback_used && (
                      <span
                        className="px-2 py-0.5 rounded font-mono text-[9px] bg-[#341100] text-[#ffb690] border border-[#ffb690]/40"
                        title="Conservative backend fallback applied; not a real ML prediction"
                      >
                        FALLBACK MODE
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                      isHigh ? 'bg-[#93000a] text-[#ffdad6]' :
                      isMedium ? 'bg-[#571bc1] text-[#c4abff]' :
                      'bg-[#122131] text-[#4cd7f6]'
                    }`}>
                      {score} {riskLvl}
                    </span>
                    <span className="font-mono text-xs text-[#8c909f]">
                      {tx.timestamp}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      tx.status === 'BLOCKED' ? 'bg-[#93000a]/40 text-[#ffb4ab]' :
                      tx.status === 'APPROVED' ? 'bg-[#10b981]/20 text-[#10b981]' :
                      'bg-[#1c2b3c] text-[#adc6ff]'
                    }`}>
                      {tx.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="text-xs font-medium text-[#d4e4fa] flex items-center gap-2">
                    <span className="text-[#ffb4ab] font-semibold">{tx.primaryRiskSignature}</span>
                    <span className="text-[#8c909f]">•</span>
                    <span className="font-mono text-[#adc6ff]">{tx.type || tx.method}</span>
                    <span className="text-[#8c909f]">•</span>
                    <span className="font-mono text-xs text-[#8c909f]">Step {tx.step}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[#8c909f] font-mono flex-wrap">
                    <span className="flex items-center gap-1 text-[#c2c6d6]">
                      <User className="w-3 h-3 text-[#adc6ff]" />
                      {tx.sender_id || tx.account?.id} → {tx.recipient_id || tx.destination?.beneficiaryName || '—'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3 text-[#4cd7f6]" />
                      {tx.device?.ip || 'Unavailable'} ({tx.device?.geo || 'No device metadata'})
                    </span>
                  </div>
                </div>

                {/* Middle Column: Model Scores */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div className="flex flex-col text-right">
                    <span className="text-[#8c909f] text-[10px] uppercase">Amount</span>
                    <span className="text-base font-bold text-[#d4e4fa]">
                      {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} units
                    </span>
                  </div>

                  <div className="h-8 w-px bg-[#1c2b3c]"></div>

                  <div className="flex flex-col text-center">
                    <span className="text-[#8c909f] text-[10px] uppercase">XGB Prob</span>
                    <span className={`font-bold ${fraudProb > 0.7 ? 'text-[#ffb4ab]' : 'text-[#d0bcff]'}`}>
                      {fraudProb.toFixed(3)}
                    </span>
                  </div>

                  <div className="flex flex-col text-center">
                    <span className="text-[#8c909f] text-[10px] uppercase">IF Anomaly</span>
                    <span className={`font-bold ${anomScore > 0.7 ? 'text-[#ffb4ab]' : 'text-[#4cd7f6]'}`}>
                      {anomScore.toFixed(3)}
                    </span>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    disabled={savingId !== null}
                    onClick={() => void save(tx.id, 'APPROVED')}
                    className="p-2 rounded-lg bg-[#122131] hover:bg-[#10b981]/20 hover:text-[#10b981] text-[#8c909f] border border-[#1c2b3c] transition-colors"
                    title="Quick Approve"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <button
                    disabled={savingId !== null}
                    onClick={() => void save(tx.id, 'BLOCKED')}
                    className="p-2 rounded-lg bg-[#122131] hover:bg-[#ef4444]/20 hover:text-[#ef4444] text-[#8c909f] border border-[#1c2b3c] transition-colors"
                    title="Quick Block"
                  >
                    <Ban className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onSelectTransaction(tx)}
                    className="px-3 py-1.5 rounded-lg bg-[#4d8eff] hover:bg-[#3575e6] text-[#00285d] font-semibold text-xs font-mono flex items-center gap-1.5 transition-colors"
                  >
                    <span>Investigate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
