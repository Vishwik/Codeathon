import React, { useState } from 'react';
import {
  TrendingUp,
  Download,
  PieChart,
  Activity,
  CheckCircle2,
  SlidersHorizontal,
  Database,
  AlertTriangle,
  ArrowRight,
  ArrowUp,
  Minus,
  Zap,
  Repeat,
  CreditCard,
  Bitcoin,
  Landmark,
  Gavel,
  Sliders,
  Sparkles,
  Shield,
  Layers,
  Cpu
} from 'lucide-react';
import { Transaction, ChannelVelocity, BackendSummary } from '../types';
import { ApiHealthStatus } from '../api/client';

interface OverviewViewProps {
  transactions: Transaction[];
  summary: BackendSummary | null;
  channelVelocities: ChannelVelocity[];
  onSelectTransaction: (tx: Transaction) => void;
  onNavigate: (screen: string) => void;
  onOpenExport: () => void;
  apiHealth?: ApiHealthStatus | null;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  transactions,
  channelVelocities,
  summary,
  onSelectTransaction,
  onNavigate,
  onOpenExport,
  apiHealth,
}) => {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');
  const [triageFilter, setTriageFilter] = useState<'all' | 'high' | 'velocity' | 'mule'>('all');
  const [isFeedActive, setIsFeedActive] = useState(true);
  const [hoveredScatterNode, setHoveredScatterNode] = useState<string | null>(null);

  const pct = (count: number | undefined) => summary?.total_transactions ? ((count ?? 0) / summary.total_transactions * 100).toFixed(1) + '%' : '0%';
  // Filter transactions for table
  const displayedTransactions = transactions.filter(tx => {
    const riskLvl = tx.risk_level;
    if (triageFilter === 'high') return riskLvl === 'HIGH';
    if (triageFilter === 'velocity') return tx.assessment.reasons.some(r=>r.source==='ANOMALY');
    if (triageFilter === 'mule') return tx.type==='TRANSFER';
    return true;
  });

  return (
    <div className="flex flex-col w-full text-[#d4e4fa]">
      {/* Fallback Mode Notification Banner */}
      {apiHealth && !apiHealth.online && (
        <div className="mx-4 mt-3 px-3.5 py-2 rounded-lg bg-[#0d1c2d] border border-[#4cd7f6]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#4cd7f6] animate-pulse shrink-0"></span>
            <span className="text-[#4cd7f6] font-bold">BACKEND UNAVAILABLE</span>
            <span className="text-[#8c909f] hidden md:inline">No local scoring. Previously loaded records may be stale.</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#1c2b3c] text-[#4cd7f6] text-[10px] w-fit">
            NO LOCAL FALLBACK
          </span>
        </div>
      )}

      {/* Top Operational Control Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-[#010f1f]/60 backdrop-blur-md border-b border-[#1c2b3c]/60">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-[#d4e4fa]">
              Fraud & Transaction Risk Operations Overview
            </h1>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#1c2b3c] text-[#4cd7f6] font-medium border border-[#424754]/40">
              STATION 04 // LIVE
            </span>
          </div>
          <p className="text-xs text-[#c2c6d6] max-w-3xl">
            Real-time supervised fraud classification, anomaly detection, and agentic queue monitoring.
          </p>
        </div>

        {/* Controls Cluster */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center bg-[#0d1c2d] p-1 rounded-lg border border-[#1c2b3c]">
            <button
              disabled title="Time-range filters are a preview; totals are all-time"
              className={`px-2.5 py-1 font-mono text-[11px] rounded transition-colors ${
                timeRange === '1h'
                  ? 'bg-[#1c2b3c] text-[#adc6ff] font-semibold shadow-sm'
                  : 'text-[#8c909f] hover:text-[#d4e4fa]'
              }`}
            >
              1h (Preview)
            </button>
            <button
              disabled title="Time-range filters are a preview; totals are all-time"
              className={`px-2.5 py-1 font-mono text-[11px] rounded transition-colors ${
                timeRange === '24h'
                  ? 'bg-[#1c2b3c] text-[#adc6ff] font-semibold shadow-sm'
                  : 'text-[#8c909f] hover:text-[#d4e4fa]'
              }`}
            >
              All Time
            </button>
            <button
              disabled title="Time-range filters are a preview; totals are all-time"
              className={`px-2.5 py-1 font-mono text-[11px] rounded transition-colors ${
                timeRange === '7d'
                  ? 'bg-[#1c2b3c] text-[#adc6ff] font-semibold shadow-sm'
                  : 'text-[#8c909f] hover:text-[#d4e4fa]'
              }`}
            >
              7d (Preview)
            </button>
          </div>

          {/* Live Stream Pill */}
          <button
            onClick={() => onNavigate('live-stream')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d1c2d] border border-[#1c2b3c] hover:border-[#4cd7f6]/50 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              {isFeedActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4cd7f6] opacity-80"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isFeedActive ? 'bg-[#4cd7f6]' : 'bg-[#8c909f]'}`}></span>
            </span>
            <span className={`font-mono text-[11px] font-semibold tracking-wider ${isFeedActive ? 'text-[#4cd7f6]' : 'text-[#8c909f]'}`}>
              FEED: {isFeedActive ? 'ACTIVE' : 'PAUSED'}
            </span>
          </button>

          {/* Export Action */}
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#122131] hover:bg-[#1c2b3c] text-[#d4e4fa] text-xs font-medium transition-colors border border-[#1c2b3c]"
          >
            <Download className="w-4 h-4 text-[#8c909f]" />
            <span>Export Daily Audit</span>
          </button>
        </div>
      </div>

      {/* Primary Workspace Content Canvas */}
      <div className="flex flex-col gap-4 p-4">
        {/* TOP KPI TELEMETRY STRIP (5 Cards Bento) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Total Volume */}
          <div className="relative overflow-hidden flex flex-col justify-between p-3.5 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl shadow-md">
            <div className="flex items-start justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#8c909f]">
                Total Tx Analyzed
              </span>
              <span className="flex items-center font-mono text-[11px] text-[#4cd7f6] font-semibold">
                <TrendingUp className="w-3.5 h-3.5 mr-0.5" />All time
              </span>
            </div>
            <div className="my-1.5">
              <div className="font-mono text-2xl font-bold tracking-tight text-[#d4e4fa]">
                {summary?.total_transactions.toLocaleString() ?? '—'}
              </div>
              {/* Sparkline */}
              <div className="h-6 w-full mt-1">
                <span className="text-[10px] text-[#8c909f]">Historical trend unavailable</span>
              </div>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-[#c2c6d6] pt-1 border-t border-[#1c2b3c]/60">
              <span>Rate: unavailable</span>
              <span className="text-[#4cd7f6]">P99: unavailable</span>
            </div>
          </div>

          {/* Card 2: Suspicious (Loaded) */}
          <div className="relative overflow-hidden flex flex-col justify-between p-3.5 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl shadow-md">
            <div className="flex items-start justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#8c909f]">
                Suspicious (Loaded)
              </span>
              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-[#571bc1] text-[#c4abff] font-semibold">
                Loaded
              </span>
            </div>
            <div className="my-1.5">
              <div className="font-mono text-2xl font-bold tracking-tight text-[#d0bcff]">
                {transactions.filter(t => t.suspicious).length}
              </div>
              {/* Sparkline */}
              <div className="h-6 w-full mt-1">
                <span className="text-[10px] text-[#8c909f]">Historical trend unavailable</span>
              </div>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-[#c2c6d6] pt-1 border-t border-[#1c2b3c]/60">
              <span>Baseline: unavailable</span>
              <span className="text-[#d0bcff]">Backend flags</span>
            </div>
          </div>

          {/* Card 3: High-Risk Severity */}
          <div className="relative overflow-hidden flex flex-col justify-between p-3.5 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl shadow-md">
            <div className="flex items-start justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#8c909f]">
                High-Risk Severity
              </span>
              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-[#93000a] text-[#ffdad6] font-semibold">
                All time
              </span>
            </div>
            <div className="my-1.5">
              <div className="font-mono text-2xl font-bold tracking-tight text-[#ffb4ab]">
                {summary?.risk_counts.HIGH ?? '—'}
              </div>
              {/* Sparkline */}
              <div className="h-6 w-full mt-1">
                <span className="text-[10px] text-[#8c909f]">Historical trend unavailable</span>
              </div>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-[#c2c6d6] pt-1 border-t border-[#1c2b3c]/60">
              <span>Human decisions only</span>
              <span className="text-[#ffb4ab] font-medium">No auto-block</span>
            </div>
          </div>

          {/* Card 4: Active Triage Queue */}
          <div className="relative overflow-hidden flex flex-col justify-between p-3.5 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl shadow-md">
            <div className="flex items-start justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#8c909f]">
                Active Triage Queue
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#1c2b3c] text-[#4cd7f6]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#4cd7f6] animate-pulse"></span>
                Pending
              </span>
            </div>
            <div className="my-1.5">
              <div className="font-mono text-2xl font-bold tracking-tight text-[#adc6ff]">
                {summary?.decision_counts.PENDING ?? '—'}
              </div>
              {/* Stack Progress */}
              <div className="w-full bg-[#273647] h-2 rounded-full mt-2 overflow-hidden flex">
                <div className="bg-[#ef4444] h-full" style={{ width: pct(summary?.risk_counts.HIGH) }}></div>
                <div className="bg-[#d0bcff] h-full" style={{ width: pct(summary?.risk_counts.MEDIUM) }}></div>
                <div className="bg-[#4d8eff] h-full" style={{ width: pct(summary?.risk_counts.LOW) }}></div>
              </div>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] text-[#c2c6d6] pt-1 border-t border-[#1c2b3c]/60">
              <span>TTR: unavailable</span>
              <span className="text-[#adc6ff] font-medium">No SLA telemetry</span>
            </div>
          </div>

          {/* Card 5: Decision Spread */}
          <div className="relative overflow-hidden flex flex-col justify-between p-3.5 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl shadow-md">
            <div className="flex items-start justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#8c909f]">
                Decision Spread
              </span>
              <PieChart className="w-4 h-4 text-[#8c909f]" />
            </div>
            <div className="my-1 flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] text-[#c2c6d6]">Approved</span>
                <span className="font-mono text-[11px] text-[#d4e4fa] font-semibold">{summary?.decision_counts.APPROVE ?? '—'}</span>
              </div>
              <div className="w-full bg-[#273647] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#4cd7f6] h-full rounded-full" style={{ width: pct(summary?.decision_counts.APPROVE) }}></div>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] text-[#c2c6d6]">Blocked</span>
                <span className="font-mono text-[11px] text-[#ffb4ab] font-semibold">{summary?.decision_counts.BLOCK ?? '—'}</span>
              </div>
              <div className="w-full bg-[#273647] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#ffb4ab] h-full rounded-full" style={{ width: pct(summary?.decision_counts.BLOCK) }}></div>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] text-[#c2c6d6]">In Review</span>
                <span className="font-mono text-[11px] text-[#d0bcff] font-semibold">{summary?.decision_counts.PENDING ?? '—'}</span>
              </div>
            </div>
            <div className="font-mono text-[10px] text-[#8c909f] text-right pt-1 border-t border-[#1c2b3c]/60">
              Average risk: {summary?.average_risk_score?.toFixed(2) ?? '—'}
            </div>
          </div>
        </div>

        {/* MID SECTION: 2-COLUMN GRID (7:5) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          {/* LEFT COLUMN: RISK DISTRIBUTION & MODEL FUSION (Col-span 7) */}
          <div className="xl:col-span-7 flex flex-col gap-4">
            {/* Risk Score Range Stratification */}
            <div className="p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl shadow-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#4cd7f6]" />
                  <span className="font-semibold text-sm text-[#d4e4fa]">
                    Dynamic Risk Stratification Spectrum
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#8c909f]">
                  Network Normalized [100 Band]
                </span>
              </div>

              {/* Stratification Multi-Segment Visual Bar (LOW, MEDIUM, HIGH) */}
              <div className="flex flex-col gap-2">
                <div className="h-5 w-full rounded flex overflow-hidden bg-[#273647]">
                  <div
                    className="bg-[#273647] hover:bg-[#2c3a4c] transition-colors flex items-center justify-center font-mono text-[10px] text-[#4cd7f6]"
                    style={{ width: pct(summary?.risk_counts.LOW) }}
                    title="LOW"
                  >
                    {pct(summary?.risk_counts.LOW)}
                  </div>
                  <div
                    className="bg-[#571bc1] hover:bg-[#d0bcff] hover:text-[#051424] transition-colors flex items-center justify-center font-mono text-[10px] text-[#c4abff] font-bold"
                    style={{ width: pct(summary?.risk_counts.MEDIUM) }}
                    title="MEDIUM"
                  >
                    {pct(summary?.risk_counts.MEDIUM)}
                  </div>
                  <div
                    className="bg-[#ef4444] hover:bg-[#ffb4ab] hover:text-[#690005] transition-colors flex items-center justify-center font-mono text-[9px] text-white font-bold"
                    style={{ width: pct(summary?.risk_counts.HIGH) }}
                    title="HIGH"
                  >
                    !
                  </div>
                </div>

                {/* Legend breakdown strictly 3-tier */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="flex flex-col p-2 bg-[#122131] rounded-lg border border-[#1c2b3c]">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#4cd7f6]">
                      <span className="h-2 w-2 rounded-full bg-[#4cd7f6]"></span>
                      <span>LOW</span>
                    </div>
                    <span className="font-mono text-sm text-[#d4e4fa] font-semibold mt-1">
                      {summary?.risk_counts.LOW ?? '—'}
                    </span>
                    <span className="text-[11px] text-[#8c909f]">{pct(summary?.risk_counts.LOW)} of all records</span>
                  </div>

                  <div className="flex flex-col p-2 bg-[#122131] rounded-lg border border-[#1c2b3c]">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#d0bcff]">
                      <span className="h-2 w-2 rounded-full bg-[#d0bcff]"></span>
                      <span>MEDIUM</span>
                    </div>
                    <span className="font-mono text-sm text-[#d0bcff] font-semibold mt-1">
                      {summary?.risk_counts.MEDIUM ?? '—'}
                    </span>
                    <span className="text-[11px] text-[#8c909f]">{pct(summary?.risk_counts.MEDIUM)} of all records</span>
                  </div>

                  <div className="flex flex-col p-2 bg-[#122131] rounded-lg border border-[#1c2b3c]">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#ffb4ab]">
                      <span className="h-2 w-2 rounded-full bg-[#ffb4ab]"></span>
                      <span>HIGH</span>
                    </div>
                    <span className="font-mono text-sm text-[#ffb4ab] font-semibold mt-1">
                      {summary?.risk_counts.HIGH ?? '—'}
                    </span>
                    <span className="text-[11px] text-[#8c909f]">{pct(summary?.risk_counts.HIGH)} of all records</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dual-Engine Scatter Matrix Visualization */}
            <div className="p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl shadow-md flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div>
                  <span className="font-semibold text-sm text-[#d4e4fa]">
                    Dual-Engine Fusion Map
                  </span>
                  <p className="text-[11px] text-[#8c909f]">
                    Supervised XGBoost Fraud Probability vs Isolation Forest Anomaly Severity
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-mono text-[10px] text-[#4cd7f6]">
                    <span className="h-2 w-2 rounded-full bg-[#4cd7f6]"></span>Bivariate Quads
                  </span>
                  <span className="flex items-center gap-1 font-mono text-[10px] text-[#ffb4ab]">
                    <span className="h-2 w-2 rounded-full bg-[#ffb4ab]"></span>High Fusion Threshold
                  </span>
                </div>
              </div>

              {/* Scatter Plot Canvas */}
              <div className="relative w-full h-64 bg-[#122131] border border-[#1c2b3c] rounded-xl p-3 flex flex-col justify-between overflow-hidden">
                {/* Background Grid & Quadrant markers */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none opacity-20">
                  <div className="bg-[#0d1c2d]"></div>
                  <div className="bg-[#1c2b3c]"></div>
                  <div className="bg-[#273647]"></div>
                  <div className="bg-[#93000a]/20"></div>
                </div>

                <div className="absolute top-2 right-3 font-mono text-[10px] text-[#ffb4ab] uppercase tracking-wider font-semibold pointer-events-none z-0">
                  Higher model signals
                </div>
                <div className="absolute bottom-10 left-3 font-mono text-[10px] text-[#8c909f] uppercase tracking-wider pointer-events-none z-0">
                  Lower model signals
                </div>

                {/* Interactive SVG Plot */}
                <svg className="w-full h-full relative z-10" viewBox="0 0 500 220">
                  {/* Grid cross lines */}
                  <line className="text-[#424754]/30" stroke="currentColor" strokeDasharray="4 4" x1="250" x2="250" y1="0" y2="220"></line>
                  <line className="text-[#424754]/30" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="500" y1="110" y2="110"></line>

                  {transactions.map(tx=><circle key={tx.id} role="button" tabIndex={0} aria-label={'Investigate '+tx.id}
                    cx={10+tx.fraud_probability*480} cy={210-tx.anomaly_score*200} r="5"
                    fill={tx.risk_level==='HIGH'?'#ffb4ab':tx.risk_level==='MEDIUM'?'#d0bcff':'#4cd7f6'}
                    className="cursor-pointer" onClick={()=>onSelectTransaction(tx)}
                    onKeyDown={event=>{if(event.key==='Enter')onSelectTransaction(tx);}}>
                    <title>{tx.id}: {tx.risk_score} {tx.risk_level}</title>
                  </circle>)}
                </svg>

                {/* Axis Labels */}
                <div className="relative z-10 flex justify-between items-center font-mono text-[10px] text-[#8c909f] pt-1.5 border-t border-[#1c2b3c]/60">
                  <span>← Isolation Forest Anomaly Score (0.0 to 1.0)</span>
                  <span>XGBoost Fraud Probability (0.0 to 1.0) →</span>
                </div>
              </div>
            </div>

            {/* Real-time Anomaly Flags by Channel */}
            <div className="p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl shadow-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[#d4e4fa]">
                  Payment Channel Velocity Pulse
                </span>
                <span className="font-mono text-[11px] text-[#4cd7f6] flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#4cd7f6] animate-ping"></span>
                  Unavailable telemetry
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                {channelVelocities.map((ch, idx) => (
                  <div key={idx} className="p-2.5 bg-[#122131] border border-[#1c2b3c] rounded-lg flex flex-col gap-1">
                    <span className="font-mono text-[11px] text-[#8c909f] truncate">
                      {ch.channel}
                    </span>
                    <span className={`font-mono text-sm font-semibold ${
                      ch.status === 'spike' ? 'text-[#ffb4ab]' :
                      ch.status === 'burst' ? 'text-[#d0bcff]' :
                      'text-[#d4e4fa]'
                    }`}>
                      — tx/m
                    </span>
                    <div className={`flex items-center gap-1 font-mono text-[10px] ${
                      ch.status === 'spike' ? 'text-[#ffb4ab]' :
                      ch.status === 'burst' ? 'text-[#d0bcff]' :
                      ch.status === 'nominal' ? 'text-[#4cd7f6]' :
                      'text-[#8c909f]'
                    }`}>
                      {ch.status === 'spike' && <AlertTriangle className="w-3 h-3" />}
                      {ch.status === 'nominal' && <ArrowUp className="w-3 h-3" />}
                      {ch.status === 'flat' && <Minus className="w-3 h-3" />}
                      {ch.status === 'burst' && <TrendingUp className="w-3 h-3" />}
                      <span>{ch.statusText}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: MODEL READY & TELEMETRY REGISTRY (Col-span 5) */}
          <div className="xl:col-span-5 flex flex-col gap-4">
            {/* Model Pipeline Topology */}
            <div className="p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl shadow-md flex flex-col gap-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#1c2b3c]/60">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#adc6ff]" />
                  <span className="font-semibold text-sm text-[#d4e4fa]">
                    Model Pipeline Topology
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#273647] text-[#adc6ff] font-bold">
                  BACKEND POLICY
                </span>
              </div>

              {/* Topology Rows */}
              <div className="flex flex-col gap-2.5">
                {/* Supervised Classifier */}
                <div className="p-3 bg-[#122131] border border-[#1c2b3c] rounded-lg flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#4cd7f6]" />
                      <span className="text-xs font-semibold text-[#d4e4fa]">
                        Supervised Classifier
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#4cd7f6] font-bold">
                      {apiHealth?.online ? 'READY' : 'UNAVAILABLE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#8c909f]">
                    <span>Model: <strong className="text-[#c2c6d6] font-medium">XGBoost Classifier</strong></span>
                    <span>AUC-ROC: <strong className="text-[#adc6ff] font-medium">Unavailable</strong></span>
                  </div>
                  <div className="w-full bg-[#273647] h-1 rounded-full overflow-hidden mt-0.5">
                    <div className="bg-[#4d8eff] h-full" style={{ width: apiHealth?.online ? '100%' : '0%' }}></div>
                  </div>
                </div>

                {/* Anomaly Engine */}
                <div className="p-3 bg-[#122131] border border-[#1c2b3c] rounded-lg flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#4cd7f6]" />
                      <span className="text-xs font-semibold text-[#d4e4fa]">
                        Unsupervised Anomaly Engine
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#4cd7f6] font-bold">
                      {apiHealth?.online ? 'READY' : 'UNAVAILABLE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#8c909f]">
                    <span>Model: <strong className="text-[#c2c6d6] font-medium">Isolation Forest</strong></span>
                    <span>Contamination: <strong className="text-[#4cd7f6] font-medium">Bundle-defined</strong></span>
                  </div>
                  <div className="w-full bg-[#273647] h-1 rounded-full overflow-hidden mt-0.5">
                    <div className="bg-[#4cd7f6] h-full" style={{ width: apiHealth?.online ? '100%' : '0%' }}></div>
                  </div>
                </div>

                {/* Risk Fusion Engine */}
                <div className="p-3 bg-[#122131] border border-[#1c2b3c] rounded-lg flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#d0bcff]" />
                      <span className="text-xs font-semibold text-[#d4e4fa]">
                        Risk Fusion Engine
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-[#d0bcff] font-bold">
                      HYBRID RISK FUSION
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-[#c2c6d6] flex items-center justify-between">
                    <span>Classifier policy: <strong className="text-[#adc6ff]">Backend</strong></span>
                    <span>Anomaly policy: <strong className="text-[#4cd7f6]">Backend</strong></span>
                  </div>
                  <div className="w-full bg-[#273647] h-1 rounded-full overflow-hidden flex mt-0.5">
                    <div className="bg-[#4d8eff] h-full" style={{ width: '100%' }}></div>

                  </div>
                </div>

                {/* Feature Pipeline */}
                <div className="p-3 bg-[#122131] border border-[#1c2b3c] rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#8c909f]" />
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-[#d4e4fa]">PaySim Feature Context</span>
                      <span className="font-mono text-[11px] text-[#8c909f]">10 Batch & Tabular Features</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[11px] text-[#4cd7f6]">
                    <div>In-Memory Pipeline</div>
                    <div className="text-[10px] text-[#8c909f]">Model-Ready</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Investigation Live Queue Fast Triage Filter Bar */}
            <div className="p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl shadow-md flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-[#d4e4fa]">
                  Live Queue Quick Triage
                </span>
                <span className="font-mono text-[10px] text-[#8c909f] uppercase tracking-wider">
                  Focus Toggles
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTriageFilter('all')}
                  className={`flex items-center justify-between p-2 rounded-lg text-left transition-colors border ${
                    triageFilter === 'all'
                      ? 'bg-[#1c2b3c] border-[#4d8eff] text-white'
                      : 'bg-[#122131] border-[#1c2b3c] hover:bg-[#1c2b3c] text-[#d4e4fa]'
                  }`}
                >
                  <span className="text-xs">All Loaded</span>
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-[#273647] text-[#8c909f] font-bold">
                    {transactions.length}
                  </span>
                </button>

                <button
                  onClick={() => setTriageFilter('high')}
                  className={`flex items-center justify-between p-2 rounded-lg text-left transition-colors border ${
                    triageFilter === 'high'
                      ? 'bg-[#93000a]/40 border-[#ffb4ab] text-white'
                      : 'bg-[#93000a]/20 border-[#93000a]/30 hover:bg-[#93000a]/30 text-[#ffb4ab]'
                  }`}
                >
                  <span className="text-xs font-medium">High Risk Only</span>
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-[#93000a] text-[#ffdad6] font-bold">
                    {transactions.filter(t=>t.risk_level==='HIGH').length}
                  </span>
                </button>

                <button
                  onClick={() => setTriageFilter('velocity')}
                  className={`flex items-center justify-between p-2 rounded-lg text-left transition-colors border ${
                    triageFilter === 'velocity'
                      ? 'bg-[#1c2b3c] border-[#d0bcff] text-white'
                      : 'bg-[#122131] border-[#1c2b3c] hover:bg-[#1c2b3c] text-[#d4e4fa]'
                  }`}
                >
                  <span className="text-xs">Anomaly Flags</span>
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-[#273647] text-[#d0bcff] font-bold">
                    {transactions.filter(t=>t.assessment.reasons.some(r=>r.source==='ANOMALY')).length}
                  </span>
                </button>

                <button
                  onClick={() => setTriageFilter('mule')}
                  className={`flex items-center justify-between p-2 rounded-lg text-left transition-colors border ${
                    triageFilter === 'mule'
                      ? 'bg-[#1c2b3c] border-[#4cd7f6] text-white'
                      : 'bg-[#122131] border-[#1c2b3c] hover:bg-[#1c2b3c] text-[#d4e4fa]'
                  }`}
                >
                  <span className="text-xs">Transfers</span>
                  <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-[#273647] text-[#4cd7f6] font-bold">
                    {transactions.filter(t=>t.type==='TRANSFER').length}
                  </span>
                </button>
              </div>

              {/* Ops Alert Banner */}
              <div className="p-2.5 rounded-lg bg-[#1c2b3c] border border-[#273647] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#d0bcff] mt-0.5 shrink-0" />
                <div className="flex flex-col text-xs">
                  <span className="font-semibold text-[#d4e4fa]">Future Guardrail Preview</span>
                  <span className="text-[#8c909f] text-[11px]">
                    No automatic blocking. Only explicit human APPROVE / BLOCK decisions are persisted.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: RECENT HIGH-PRIORITY SUSPICIOUS TRANSACTIONS TABLE */}
        <div className="flex flex-col gap-3 p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#1c2b3c]/60">
            <div className="flex items-center gap-2">
              <Gavel className="w-5 h-5 text-[#ffb4ab]" />
              <div>
                <span className="font-semibold text-sm text-[#d4e4fa]">
                  Recent High-Priority Suspicious Transactions
                </span>
                <span className="hidden sm:inline text-xs text-[#8c909f] ml-2">
                  — Immediate human or supervisor review required
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#8c909f]">
              <span className="h-2 w-2 rounded-full bg-[#ef4444] animate-ping"></span>
              <span>{displayedTransactions.filter(t => t.riskLevel === 'HIGH').length} Escalations Requiring Immediate Action</span>
            </div>
          </div>

          {/* Transaction Table Wrapper */}
          <div className="overflow-x-auto rounded-lg border border-[#1c2b3c]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#122131] text-[#8c909f] font-mono text-[11px] uppercase tracking-wider border-b border-[#1c2b3c]">
                  <th className="py-2.5 px-3">Transaction ID</th>
                  <th className="py-2.5 px-3">PaySim Type</th>
                  <th className="py-2.5 px-3 text-right">Value (Units)</th>
                  <th className="py-2.5 px-3 text-center">Fraud Prob</th>
                  <th className="py-2.5 px-3 text-center">Anomaly</th>
                  <th className="py-2.5 px-3 text-center">Risk Score</th>
                  <th className="py-2.5 px-3">Risk Signature</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2b3c]/40">
                {displayedTransactions.slice(0, 5).map((tx, idx) => {
                  const score = tx.risk_score ?? tx.fusedScore ?? 0;
                  const level = tx.risk_level;
                  const fraudProb = tx.fraud_probability ?? tx.mlProb ?? 0;
                  const anomScore = tx.anomaly_score ?? tx.anomalyScore ?? 0;

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => onSelectTransaction(tx)}
                      className="bg-[#122131]/40 hover:bg-[#1c2b3c] transition-colors group cursor-pointer"
                    >
                      <td className="py-3 px-3 font-mono font-semibold text-[#adc6ff]">
                        <div className="flex items-center gap-1.5">
                          <span>{tx.id}</span>
                          {tx.fallback_used && (
                            <span className="px-1 py-0.2 rounded font-mono text-[9px] bg-[#1c2b3c] text-[#4cd7f6] border border-[#4cd7f6]/40">
                              FB
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#d4e4fa]">
                          {tx.type === 'TRANSFER' && <Repeat className="w-3.5 h-3.5 text-[#ffb4ab]" />}
                          {tx.type === 'CASH_OUT' && <Zap className="w-3.5 h-3.5 text-[#d0bcff]" />}
                          {tx.type === 'PAYMENT' && <CreditCard className="w-3.5 h-3.5 text-[#4cd7f6]" />}
                          {tx.type === 'DEBIT' && <Landmark className="w-3.5 h-3.5 text-[#8c909f]" />}
                          {tx.type === 'CASH_IN' && <TrendingUp className="w-3.5 h-3.5 text-[#adc6ff]" />}
                          {tx.type || tx.method}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-[#d4e4fa]">
                        {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-3 text-center font-mono font-semibold ${fraudProb > 0.75 ? 'text-[#ffb4ab]' : fraudProb > 0.45 ? 'text-[#d0bcff]' : 'text-[#8c909f]'}`}>
                        {fraudProb.toFixed(3)}
                      </td>
                      <td className={`py-3 px-3 text-center font-mono font-semibold ${anomScore > 0.75 ? 'text-[#ffb4ab]' : anomScore > 0.45 ? 'text-[#d0bcff]' : 'text-[#8c909f]'}`}>
                        {anomScore.toFixed(3)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                          level === 'HIGH' ? 'bg-[#93000a] text-[#ffdad6]' :
                          level === 'MEDIUM' ? 'bg-[#571bc1] text-[#c4abff]' :
                          'bg-[#273647] text-[#4cd7f6]'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            level === 'HIGH' ? 'bg-[#ef4444]' : level === 'MEDIUM' ? 'bg-[#d0bcff]' : 'bg-[#4cd7f6]'
                          }`}></span>
                          {score} {level}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs text-[#c2c6d6]">
                        <span className={`px-2 py-0.5 rounded ${
                          level === 'HIGH' ? 'bg-[#1c2b3c] text-[#ffb4ab] font-medium' :
                          level === 'MEDIUM' ? 'bg-[#1c2b3c] text-[#d0bcff] font-medium' :
                          'bg-[#1c2b3c] text-[#c2c6d6]'
                        }`}>
                          {tx.primaryRiskSignature}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectTransaction(tx)}
                          className={`inline-flex items-center gap-1 px-3 py-1 font-semibold rounded text-xs transition-colors shadow-sm ${
                            idx === 0
                              ? 'bg-[#adc6ff] text-[#002e6a] hover:bg-[#d8e2ff]'
                              : 'bg-[#273647] text-[#d4e4fa] hover:bg-[#2c3a4c]'
                          }`}
                        >
                          <span>Investigate</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Lineage Telemetry */}
          <div className="flex flex-col sm:flex-row items-center justify-between pt-1 font-mono text-[11px] text-[#8c909f] gap-2">
            <div className="flex items-center gap-2">
              <span>Inference Hash: <strong className="text-[#c2c6d6]">0x4a9b...f31e</strong></span>
              <span>•</span>
              <span>Queue Refresh: <strong className="text-[#4cd7f6]">15s interval</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#c2c6d6]">Showing {Math.min(5, displayedTransactions.length)} of {transactions.length} priority queue cases</span>
              <button
                onClick={() => onNavigate('investigations')}
                className="text-[#adc6ff] hover:text-white transition-colors underline font-medium cursor-pointer"
              >
                View Full Queue →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
