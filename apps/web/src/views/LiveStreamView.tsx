import React, { useState, useEffect } from 'react';
import {
  Radio,
  Pause,
  Play,
  Filter,
  Zap,
  Repeat,
  CreditCard,
  Landmark,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { Transaction } from '../types';
import { apiClient } from '../api/client';

interface LiveStreamViewProps {
  transactions: Transaction[];
  onSelectTransaction: (tx: Transaction) => void;
  onTransactionsReceived: (txs: Transaction[]) => void;
}

export const LiveStreamView: React.FC<LiveStreamViewProps> = ({
  transactions,
  onSelectTransaction,
  onTransactionsReceived,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState<number>(3000); // ms interval
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');

  const [streamError,setStreamError]=useState<string | null>(null);
  const [displayed,setDisplayed]=useState(transactions);
  useEffect(()=>{
    if(isPaused) return;
    let mounted=true;
    const poll=async()=>{
      try {
        const items=await apiClient.getTransactions();
        if(mounted){setDisplayed(items);onTransactionsReceived(items);setStreamError(null);}
      } catch(error) {if(mounted)setStreamError(String(error));}
    };
    void poll();
    const timer=setInterval(()=>void poll(),speed);
    return ()=>{mounted=false;clearInterval(timer);};
  },[isPaused,speed,onTransactionsReceived]);
  const filteredStream = displayed.filter(t => {
    if (selectedChannel === 'ALL') return true;
    return (t.type || t.method) === selectedChannel;
  });

  return (
    <div className="flex flex-col w-full text-[#d4e4fa] p-4 gap-4">
      {streamError && <div role="alert" className="text-[#ffb4ab]">{streamError}</div>}
      {/* Stream Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl">
        <div className="flex flex-wrap items-center gap-3 min-w-0">
          <div className="relative">
            <Radio className={`w-6 h-6 ${isPaused ? 'text-[#8c909f]' : 'text-[#4cd7f6] animate-pulse'}`} />
            {!isPaused && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4cd7f6] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4cd7f6]"></span>
              </span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[#d4e4fa]">
              Real-Time PaySim Ingestion & Stream Sniffer
            </h1>
            <p className="text-xs text-[#8c909f]">
              Polling persisted backend assessments. No transactions are generated automatically.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isPaused
                ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                : 'bg-[#93000a]/20 border-[#93000a] text-[#ffdad6]'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume Ingestion' : 'Pause Stream'}</span>
          </button>

          {/* Speed */}
          <div className="flex items-center bg-[#122131] border border-[#1c2b3c] rounded-lg p-1 font-mono text-xs">
            <button
              onClick={() => setSpeed(3000)}
              className={`px-2 py-0.5 rounded ${speed === 3000 ? 'bg-[#1c2b3c] text-[#adc6ff] font-bold' : 'text-[#8c909f]'}`}
            >
              1x
            </button>
            <button
              onClick={() => setSpeed(1500)}
              className={`px-2 py-0.5 rounded ${speed === 1500 ? 'bg-[#1c2b3c] text-[#adc6ff] font-bold' : 'text-[#8c909f]'}`}
            >
              2x
            </button>
            <button
              onClick={() => setSpeed(750)}
              className={`px-2 py-0.5 rounded ${speed === 750 ? 'bg-[#1c2b3c] text-[#adc6ff] font-bold' : 'text-[#8c909f]'}`}
            >
              Burst
            </button>
          </div>

          {/* PaySim Type selector */}
          <select
            value={selectedChannel}
            onChange={e => setSelectedChannel(e.target.value)}
            className="px-2.5 py-1.5 bg-[#122131] border border-[#1c2b3c] rounded-lg text-xs font-mono text-[#c2c6d6] focus:outline-none"
          >
            <option value="ALL">All PaySim Types</option>
            <option value="TRANSFER">TRANSFER</option>
            <option value="CASH_OUT">CASH_OUT</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="DEBIT">DEBIT</option>
            <option value="CASH_IN">CASH_IN</option>
          </select>
        </div>
      </div>

      {/* Backend Offline Banner */}
      {!apiClient.isBackendOnline() && (
        <div className="p-3 bg-[#341100] border border-[#ffb4ab]/40 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#ffb4ab]">
            <AlertTriangle className="w-4 h-4 text-[#ff5449] shrink-0" />
            <span className="font-mono font-bold">BACKEND OFFLINE • LIVE STREAM SCORING PAUSED</span>
            <span className="text-[#ffdcd0] hidden md:inline">— Live ML scoring requires the FastAPI backend at {apiClient.getBaseUrl()}. Previously loaded stream items remain visible below.</span>
          </div>
          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#122131] text-[#ffb4ab] border border-[#ffb4ab]/30">
            ML UNAVAILABLE
          </span>
        </div>
      )}

      {/* Stream List */}
      <div className="flex flex-col gap-2">
        {filteredStream.map((tx, idx) => {
          const riskLvl = tx.risk_level;
          const isHigh = riskLvl === 'HIGH';
          const isMedium = riskLvl === 'MEDIUM';
          const score = tx.risk_score ?? tx.fusedScore ?? 0;

          return (
            <div
              key={`${tx.id}-${tx.rawTimestamp}`}
              onClick={() => onSelectTransaction(tx)}
              className={`p-3 rounded-lg border transition-all cursor-pointer flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs ${
                idx === 0 ? 'animate-in slide-in-from-top-2 duration-300' : ''
              } ${
                isHigh
                  ? 'bg-[#93000a]/15 border-[#93000a]/50 hover:bg-[#93000a]/25'
                  : isMedium
                  ? 'bg-[#571bc1]/10 border-[#571bc1]/40 hover:bg-[#571bc1]/20'
                  : 'bg-[#0d1c2d] border-[#1c2b3c] hover:bg-[#122131]'
              }`}
            >
              <div className="flex flex-wrap items-center gap-3 min-w-0">
                <span className="font-mono text-[11px] text-[#8c909f] w-16">
                  {tx.timestamp}
                </span>

                <span className="font-mono font-bold text-[#adc6ff] w-24">
                  {tx.id}
                </span>

                <div className="flex items-center gap-1.5 w-36">
                  {tx.type === 'TRANSFER' && <Repeat className="w-3.5 h-3.5 text-[#ffb4ab]" />}
                  {tx.type === 'CASH_OUT' && <Zap className="w-3.5 h-3.5 text-[#d0bcff]" />}
                  {tx.type === 'PAYMENT' && <CreditCard className="w-3.5 h-3.5 text-[#4cd7f6]" />}
                  {tx.type === 'DEBIT' && <Landmark className="w-3.5 h-3.5 text-[#8c909f]" />}
                  {tx.type === 'CASH_IN' && <TrendingUp className="w-3.5 h-3.5 text-[#adc6ff]" />}
                  <span className="truncate font-mono">{tx.type || tx.method}</span>
                </div>

                <span className="font-mono font-semibold text-[#d4e4fa] w-32 text-right">
                  {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} units
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 min-w-0">
                <span className="font-mono text-[11px] text-[#8c909f] hidden md:inline">
                  Step {tx.step} • {tx.sender_id || tx.account?.id}
                </span>

                <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                  isHigh ? 'bg-[#93000a] text-[#ffdad6]' :
                  isMedium ? 'bg-[#571bc1] text-[#c4abff]' :
                  'bg-[#122131] text-[#4cd7f6]'
                }`}>
                  {score.toFixed(2)} {riskLvl}
                </span>

                <button
                  onClick={e => {
                    e.stopPropagation();
                    onSelectTransaction(tx);
                  }}
                  className="p-1 rounded hover:bg-[#1c2b3c] text-[#8c909f] hover:text-[#adc6ff]"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
