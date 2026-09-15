import React, { useState } from 'react';
import {
  Terminal,
  Play,
  AlertOctagon,
  ShieldCheck,
  Flame,
  Cpu,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Transaction, TransactionType, ModelInferenceResult, PaySimScoringInput } from '../types';
import { apiClient } from '../api/client';

interface DemoConsoleViewProps {
  onInjectTransaction: (tx: Transaction) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

type MvpPresetKey = 'NORMAL' | 'MULE' | 'VELOCITY';

export const DemoConsoleView: React.FC<DemoConsoleViewProps> = ({
  onInjectTransaction,
  onSelectTransaction,
}) => {
  // PaySim approved live input fields (strictly 6 fields)
  const [transactionId, setTransactionId] = useState<string>(`txn_${crypto.randomUUID()}`);
  const [type, setType] = useState<TransactionType>('TRANSFER');
  const [step, setStep] = useState<number>(142);
  const [amount, setAmount] = useState<number>(48500);
  const [senderId, setSenderId] = useState<string>('C123894710');
  const [recipientId, setRecipientId] = useState<string>('C456910283');

  // Real backend scoring state
  const [isScoring, setIsScoring] = useState<boolean>(false);
  const [scoringError, setScoringError] = useState<string | null>(null);
  const [lastScoredResult, setLastScoredResult] = useState<Transaction | null>(null);
  const [lastInjectedId, setLastInjectedId] = useState<string | null>(null);

  // Active preset tracker
  const [activePreset, setActivePreset] = useState<MvpPresetKey>('MULE');

  // Three authoritative MVP scenarios
  const applyPreset = (preset: MvpPresetKey) => {
    setActivePreset(preset);
    setScoringError(null);
    setLastScoredResult(null);
    const newTxnId = `txn_${preset.toLowerCase()}_${Math.floor(1000 + Math.random() * 9000)}`;
    setTransactionId(newTxnId);

    if (preset === 'NORMAL') {
      // Scenario A: NORMAL TRANSACTION
      setType('PAYMENT');
      setStep(120);
      setAmount(125.50);
      setSenderId('C109283741');
      setRecipientId('M382910293');
    } else if (preset === 'MULE') {
      // Scenario B: MULE / TRANSFER → CASH_OUT
      setType('TRANSFER');
      setStep(142);
      setAmount(48500);
      setSenderId('C123894710');
      setRecipientId('C456910283');
    } else if (preset === 'VELOCITY') {
      // Scenario C: VELOCITY / ANOMALY SCENARIO
      setType('CASH_OUT');
      setStep(210);
      setAmount(95000);
      setSenderId('C391029481');
      setRecipientId('M782910294');
    }
  };

  const handleScoreAndInject = async () => {
    setIsScoring(true);
    setScoringError(null);
    setLastScoredResult(null);

    // Build strictly approved 6-field payload contract (NO oldbalance/newbalance fields)
    const payload: PaySimScoringInput = {
      transaction_id: transactionId,
      step,
      type,
      amount,
      sender_id: senderId,
      recipient_id: recipientId,
    };

    try {
      const result = await apiClient.scoreTransaction(payload);

      if (!result) {
        // Backend offline or error: DO NOT fabricate ML scores
        setScoringError(`BACKEND OFFLINE: ML scoring is unavailable at ${apiClient.getBaseUrl()}. The frontend does not synthesize fake ML predictions.`);
        setIsScoring(false);
        return;
      }

      setLastScoredResult(result);

      const scoredTx = result;

      onInjectTransaction(scoredTx);
      onSelectTransaction(scoredTx);
      setLastInjectedId(transactionId);
      // Auto-increment id for subsequent run
      setTransactionId(`txn_${crypto.randomUUID()}`);
    } catch (err) {
      setScoringError(err instanceof Error ? err.message : 'Unknown backend scoring error');
    } finally {
      setIsScoring(false);
    }
  };

  return (
    <div className="flex flex-col w-full text-[#d4e4fa] p-4 gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl">
        <div className="flex items-center gap-3">
          <Terminal className="w-6 h-6 text-[#adc6ff]" />
          <div>
            <h1 className="text-lg font-semibold text-[#d4e4fa]">
              Demo Console & MVP Scenario Evaluation
            </h1>
            <p className="text-xs text-[#8c909f]">
              Test real PaySim inputs against the live FastAPI RiskEngine. Zero local ML fabrication.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span
            className="px-2.5 py-1 rounded bg-[#122131] border border-[#424754]/40 text-[#4cd7f6] flex items-center gap-1.5"
            title="Backend Base URL configured via VITE_API_BASE_URL"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#4cd7f6] animate-pulse"></span>
            FASTAPI: {apiClient.getBaseUrl()}
          </span>
        </div>
      </div>

      {/* 3 Live MVP Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Scenario A: NORMAL */}
        <div
          onClick={() => applyPreset('NORMAL')}
          className={`p-3.5 bg-[#0d1c2d] border rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
            activePreset === 'NORMAL' ? 'border-[#4cd7f6] bg-[#0e2237]' : 'border-[#1c2b3c] hover:border-[#4cd7f6]/60'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#4cd7f6] uppercase font-bold">Scenario A</span>
              <ShieldCheck className="w-4 h-4 text-[#4cd7f6]" />
            </div>
            <h4 className="text-sm font-semibold text-[#d4e4fa] mt-1">Normal Transaction</h4>
            <p className="text-xs text-[#8c909f] mt-1">
              PAYMENT input (125.50 units). Classification is determined by the loaded synthetic model.
            </p>
          </div>
          <button className="mt-3 text-xs font-mono text-[#adc6ff] hover:underline flex items-center gap-1">
            <span>Load Payload</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Scenario B: MULE */}
        <div
          onClick={() => applyPreset('MULE')}
          className={`p-3.5 bg-[#0d1c2d] border rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
            activePreset === 'MULE' ? 'border-[#ffb4ab] bg-[#221318]' : 'border-[#1c2b3c] hover:border-[#ffb4ab]/60'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#ffb4ab] uppercase font-bold">Scenario B</span>
              <Flame className="w-4 h-4 text-[#ffb4ab]" />
            </div>
            <h4 className="text-sm font-semibold text-[#d4e4fa] mt-1">Mule / Transfer → Cash_Out</h4>
            <p className="text-xs text-[#8c909f] mt-1">
              High-value TRANSFER input (48,500 units). Account-chain detection is a future extension.
            </p>
          </div>
          <button className="mt-3 text-xs font-mono text-[#adc6ff] hover:underline flex items-center gap-1">
            <span>Load Payload</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Scenario C: VELOCITY */}
        <div
          onClick={() => applyPreset('VELOCITY')}
          className={`p-3.5 bg-[#0d1c2d] border rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
            activePreset === 'VELOCITY' ? 'border-[#d0bcff] bg-[#1c182d]' : 'border-[#1c2b3c] hover:border-[#d0bcff]/60'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#d0bcff] uppercase font-bold">Scenario C</span>
              <AlertOctagon className="w-4 h-4 text-[#d0bcff]" />
            </div>
            <h4 className="text-sm font-semibold text-[#d4e4fa] mt-1">Velocity / Anomaly Scenario</h4>
            <p className="text-xs text-[#8c909f] mt-1">
              Large CASH_OUT input (95,000 units). Static anomaly scoring only; velocity detection is not implemented.
            </p>
          </div>
          <button className="mt-3 text-xs font-mono text-[#adc6ff] hover:underline flex items-center gap-1">
            <span>Load Payload</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Interactive Payload Injection Forge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Controls Column (7) */}
        <div className="lg:col-span-7 p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-2">
            <h3 className="text-sm font-semibold text-[#d4e4fa] flex items-center gap-2">
              <span>PaySim Input Contract</span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-[#122131] text-[#adc6ff] border border-[#1c2b3c]">
                POST /api/v1/transactions/score
              </span>
            </h3>
            <span className="font-mono text-[11px] text-[#8c909f]">Approved 6-Field Whitelist</span>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-mono">
            {/* transaction_id */}
            <div className="flex flex-col gap-1">
              <label className="text-[#8c909f]">transaction_id</label>
              <input
                type="text"
                value={transactionId}
                onChange={e => setTransactionId(e.target.value)}
                className="p-2 bg-[#122131] border border-[#1c2b3c] rounded text-[#d4e4fa] focus:outline-none font-mono"
              />
            </div>

            {/* type */}
            <div className="flex flex-col gap-1">
              <label className="text-[#8c909f]">type (Allowed: CASH_IN, CASH_OUT, DEBIT, PAYMENT, TRANSFER)</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as TransactionType)}
                className="p-2 bg-[#122131] border border-[#1c2b3c] rounded text-[#d4e4fa] focus:outline-none font-mono"
              >
                <option value="TRANSFER">TRANSFER</option>
                <option value="CASH_OUT">CASH_OUT</option>
                <option value="PAYMENT">PAYMENT</option>
                <option value="DEBIT">DEBIT</option>
                <option value="CASH_IN">CASH_IN</option>
              </select>
            </div>

            {/* amount */}
            <div className="flex flex-col gap-1">
              <label className="text-[#8c909f]">amount (PaySim units): {amount.toLocaleString()}</label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={e => setAmount(Math.max(1, Number(e.target.value)))}
                className="p-2 bg-[#122131] border border-[#1c2b3c] rounded text-[#d4e4fa] focus:outline-none font-mono"
              />
            </div>

            {/* step */}
            <div className="flex flex-col gap-1">
              <label className="text-[#8c909f]">step (nonnegative integer): {step}</label>
              <input
                type="number"
                min="0"
                step="1"
                value={step}
                onChange={e => setStep(Math.max(1, Math.min(744, Number(e.target.value))))}
                className="p-2 bg-[#122131] border border-[#1c2b3c] rounded text-[#d4e4fa] focus:outline-none font-mono"
              />
            </div>

            {/* sender_id */}
            <div className="flex flex-col gap-1">
              <label className="text-[#8c909f]">sender_id</label>
              <input
                type="text"
                value={senderId}
                onChange={e => setSenderId(e.target.value)}
                className="p-2 bg-[#122131] border border-[#1c2b3c] rounded text-[#d4e4fa] focus:outline-none font-mono"
              />
            </div>

            {/* recipient_id */}
            <div className="flex flex-col gap-1">
              <label className="text-[#8c909f]">recipient_id</label>
              <input
                type="text"
                value={recipientId}
                onChange={e => setRecipientId(e.target.value)}
                className="p-2 bg-[#122131] border border-[#1c2b3c] rounded text-[#d4e4fa] focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Strict Leakage Exclusion Callout */}
          <div className="p-3 rounded-lg bg-[#122131] border border-[#1c2b3c] flex items-start gap-2.5 text-xs">
            <Lock className="w-4 h-4 text-[#adc6ff] shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-[#adc6ff]">Target Leakage Guardrail Active</span>
              <p className="text-[#8c909f] leading-relaxed">
                <code className="text-[#c2c6d6]">oldbalanceOrg</code>, <code className="text-[#c2c6d6]">newbalanceOrig</code>, <code className="text-[#c2c6d6]">oldbalanceDest</code>, and <code className="text-[#c2c6d6]">newbalanceDest</code> are excluded from the live scoring payload to prevent artificial synthetic leakage.
              </p>
            </div>
          </div>

          {/* Raw JSON Preview */}
          <div className="flex flex-col gap-1 font-mono text-[11px]">
            <span className="text-[#8c909f]">Payload Contract Preview:</span>
            <pre className="p-2.5 bg-[#08121e] border border-[#1c2b3c] rounded text-[#adc6ff] overflow-x-auto">
{JSON.stringify({
  transaction_id: transactionId,
  step,
  type,
  amount,
  sender_id: senderId,
  recipient_id: recipientId
}, null, 2)}
            </pre>
          </div>
        </div>

        {/* Live Inference Execution Column (5) */}
        <div className="lg:col-span-5 p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-2">
              <span className="text-xs font-mono uppercase text-[#8c909f] font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#4cd7f6]" />
                FastAPI RiskEngine Response
              </span>
              {lastScoredResult && (
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                  lastScoredResult.risk_level === 'HIGH' ? 'bg-[#93000a] text-[#ffdad6]' :
                  lastScoredResult.risk_level === 'MEDIUM' ? 'bg-[#571bc1] text-[#c4abff]' :
                  'bg-[#122131] text-[#4cd7f6]'
                }`}>
                  {lastScoredResult.risk_score} / 100 {lastScoredResult.risk_level}
                </span>
              )}
            </div>

            {/* Offline / Error State Notice */}
            {scoringError && (
              <div className="p-3 rounded-lg bg-[#341100] border border-[#ffb4ab]/40 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[#ffb4ab] font-mono text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-[#ff5449]" />
                  <span>SCORING REQUEST FAILED</span>
                </div>
                <p className="text-xs text-[#ffdad6] leading-relaxed">
                  {scoringError}
                </p>
                <span className="text-[11px] text-[#ffb4ab] font-mono">
                  The frontend will not synthesize or display fabricated ML risk scores.
                </span>
              </div>
            )}

            {/* Real Assessment Output */}
            {lastScoredResult && !scoringError ? (
              <div className="flex flex-col gap-3 font-mono text-xs">
                {lastScoredResult.fallback_used && (
                  <div className="px-2.5 py-1.5 rounded bg-[#341100] text-[#ffb690] border border-[#ffb690]/40 text-xs flex items-center gap-2">
                    <span className="font-bold uppercase tracking-wider">FALLBACK MODE</span>
                    <span className="text-[11px] text-[#ffdcd0]">• Conservative backend fallback; not a real ML prediction</span>
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#8c909f]">Supervised XGBoost Fraud Prob:</span>
                    <span className={`font-bold ${lastScoredResult.fraud_probability > 0.65 ? 'text-[#ffb4ab]' : 'text-[#4cd7f6]'}`}>
                      {(lastScoredResult.fraud_probability * 100).toFixed(1)}% ({lastScoredResult.fraud_probability.toFixed(3)})
                    </span>
                  </div>
                  <div className="w-full bg-[#1c2b3c] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#4d8eff] h-full" style={{ width: `${Math.min(100, lastScoredResult.fraud_probability * 100)}%` }}></div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#8c909f]">Isolation Forest Anomaly Score:</span>
                    <span className={`font-bold ${lastScoredResult.anomaly_score > 0.65 ? 'text-[#ffb4ab]' : 'text-[#4cd7f6]'}`}>
                      {lastScoredResult.anomaly_score.toFixed(3)}
                    </span>
                  </div>
                  <div className="w-full bg-[#1c2b3c] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#4cd7f6] h-full" style={{ width: `${Math.min(100, lastScoredResult.anomaly_score * 100)}%` }}></div>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-[#122131] border border-[#1c2b3c] flex flex-col gap-1 text-xs">
                  <span className="text-[#8c909f]">Flagged Risk Reasons:</span>
                  <span className="text-[#d4e4fa]">
                    {lastScoredResult.reasons?.join(' • ') || 'No reasons supplied'}
                  </span>
                </div>

                {lastInjectedId && (
                  <div className="flex items-center gap-1.5 text-xs text-[#10b981]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Injected into Live Grid as <strong className="font-mono">{lastInjectedId}</strong></span>
                  </div>
                )}
              </div>
            ) : !scoringError && (
              <div className="p-4 rounded-lg bg-[#122131] border border-[#1c2b3c] flex flex-col items-center justify-center text-center gap-2 py-8">
                <Cpu className="w-8 h-8 text-[#4cd7f6] opacity-60" />
                <span className="font-mono text-xs text-[#adc6ff] font-semibold">
                  Awaiting Live Backend Inference
                </span>
                <p className="text-xs text-[#8c909f] max-w-xs">
                  Submit this PaySim payload to test real XGBoost supervised fraud probability and Isolation Forest anomaly scores.
                </p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleScoreAndInject}
            disabled={isScoring}
            className="w-full py-2.5 rounded bg-[#4d8eff] hover:bg-[#3575e6] disabled:opacity-50 text-[#00285d] font-bold text-xs font-mono flex items-center justify-center gap-2 transition-colors shadow-lg"
          >
            {isScoring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Querying FastAPI /api/v1/transactions/score...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Score & Inject Payload via FastAPI</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
