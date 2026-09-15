import React, { useState } from 'react';
import {
  BrainCircuit,
  Cpu,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Database,
  AlertTriangle,
  RotateCcw,
  Zap,
  Activity,
  Layers
} from 'lucide-react';
import { ModelPipelineConfig, AgenticRule } from '../types';

interface ModelRulesViewProps {
  modelConfig: ModelPipelineConfig;
  rules: AgenticRule[];
  onUpdateWeights: (alpha: number, beta: number) => void;
  onToggleRule: (ruleId: string) => void;
}

export const ModelRulesView: React.FC<ModelRulesViewProps> = ({
  modelConfig,
  rules,
  onUpdateWeights,
  onToggleRule,
}) => {
  const [alpha, setAlpha] = useState(modelConfig.supervisedWeightAlpha);
  const [beta, setBeta] = useState(modelConfig.anomalyWeightBeta);

  const handleAlphaChange = (newAlpha: number) => {
    const clampedAlpha = Math.max(0.1, Math.min(0.9, newAlpha));
    const newBeta = Number((1.0 - clampedAlpha).toFixed(2));
    setAlpha(clampedAlpha);
    setBeta(newBeta);
    onUpdateWeights(clampedAlpha, newBeta);
  };

  return (
    <div className="flex flex-col w-full text-[#d4e4fa] p-4 gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-6 h-6 text-[#4cd7f6]" />
          <div>
            <h1 className="text-lg font-semibold text-[#d4e4fa]">
              Inference Topology & Hybrid Risk Score Governance
            </h1>
            <p className="text-xs text-[#8c909f]">
              Supervised XGBoost Classifier, Isolation Forest anomaly isolation, and linear Hybrid Risk Fusion configuration.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-[#122131] border border-[#1c2b3c] font-mono text-xs text-[#4cd7f6] flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#4cd7f6] animate-pulse"></span>
            DESIGN PREVIEW · NOT APPLIED
          </span>
        </div>
      </div>

      {/* 2-Column: Model Engines & Hybrid Risk Fusion Tuning */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Engine Details (6) */}
        <div className="lg:col-span-6 flex flex-col gap-3">
          <div className="p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#adc6ff]" />
                <h3 className="text-sm font-semibold text-[#d4e4fa]">
                  Supervised Classification Engine
                </h3>
              </div>
              <span className="font-mono text-xs text-[#4cd7f6] font-bold">PREVIEW</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-[#122131] rounded border border-[#1c2b3c]">
                <span className="text-[#8c909f] text-[10px] block uppercase">Architecture</span>
                <span className="font-bold text-[#d4e4fa]">XGBoost Classifier</span>
                <span className="text-[10px] text-[#8c909f] block mt-0.5">Synthetic bundle only</span>
              </div>
              <div className="p-2.5 bg-[#122131] rounded border border-[#1c2b3c]">
                <span className="text-[#8c909f] text-[10px] block uppercase">Validation Metric</span>
                <span className="font-bold text-[#4cd7f6]">Metric unavailable</span>
                <span className="text-[10px] text-[#8c909f] block mt-0.5">Native TreeSHAP</span>
              </div>
            </div>

            <p className="text-xs text-[#c2c6d6] leading-relaxed">
              The current static feature pipeline uses step, type and amount. Balance fields are excluded. No PaySim-trained artifacts are available in this demo.
            </p>
          </div>

          <div className="p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#4cd7f6]" />
                <h3 className="text-sm font-semibold text-[#d4e4fa]">
                  Unsupervised Anomaly Detector
                </h3>
              </div>
              <span className="font-mono text-xs text-[#4cd7f6] font-bold">PREVIEW</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 bg-[#122131] rounded border border-[#1c2b3c]">
                <span className="text-[#8c909f] text-[10px] block uppercase">Algorithm</span>
                <span className="font-bold text-[#d4e4fa]">Isolation Forest</span>
                <span className="text-[10px] text-[#8c909f] block mt-0.5">Partition Depth Scoring</span>
              </div>
              <div className="p-2.5 bg-[#122131] rounded border border-[#1c2b3c]">
                <span className="text-[#8c909f] text-[10px] block uppercase">Output Range</span>
                <span className="font-bold text-[#4cd7f6]">[0.0, 1.0] Anomaly</span>
                <span className="text-[10px] text-[#8c909f] block mt-0.5">Higher = Outlier</span>
              </div>
            </div>

            <p className="text-xs text-[#c2c6d6] leading-relaxed">
              Isolates novel transaction deviations and atypical static feature values across feature space that have not been observed in labeled training splits.
            </p>
          </div>
        </div>

        {/* Right: Hybrid Risk Fusion Tuning (6) */}
        <div className="lg:col-span-6 p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#d0bcff]" />
                <h3 className="text-sm font-semibold text-[#d4e4fa]">
                  Hybrid Risk Fusion Weighting
                </h3>
              </div>
              <span className="font-mono text-xs text-[#d0bcff] font-bold">ALPHA / BETA</span>
            </div>

            <p className="text-xs text-[#c2c6d6]">
              Preview the linear weighting between supervised model conviction (α) and unsupervised anomaly sensitivity (β):
              <code className="block mt-1 p-1.5 rounded bg-[#122131] text-[#adc6ff] font-mono text-[11px]">
                Illustrative only. Actual risk policy is loaded by the backend.
              </code>
            </p>

            {/* Slider */}
            <div className="flex flex-col gap-3 p-3 bg-[#122131] rounded-lg border border-[#1c2b3c]">
              <div className="flex justify-between font-mono text-xs">
                <span className="text-[#adc6ff]">Supervised Weight (α): <strong>{alpha.toFixed(2)}</strong></span>
                <span className="text-[#4cd7f6]">Anomaly Weight (β): <strong>{beta.toFixed(2)}</strong></span>
              </div>

              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={alpha}
                onChange={e => handleAlphaChange(Number(e.target.value))}
                className="accent-[#adc6ff] cursor-pointer"
              />

              <div className="w-full bg-[#1c2b3c] h-2 rounded-full overflow-hidden flex">
                <div className="bg-[#4d8eff] h-full transition-all" style={{ width: `${alpha * 100}%` }}></div>
                <div className="bg-[#4cd7f6] h-full transition-all" style={{ width: `${beta * 100}%` }}></div>
              </div>
            </div>

            {/* SQLite Persistence & Feature Context */}
            <div className="p-3 bg-[#122131] rounded-lg border border-[#1c2b3c] flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#8c909f]" />
                <div className="flex flex-col">
                  <span className="font-semibold text-[#d4e4fa]">SQLite Case & Decisions Store</span>
                  <span className="text-[10px] text-[#8c909f]">Transactions and latest human decisions</span>
                </div>
              </div>
              <div className="text-right text-[#4cd7f6]">
                <div>Backend-owned persistence</div>
                <div className="text-[10px] text-[#8c909f]">Local / Persistent</div>
              </div>
            </div>
          </div>

          <button
            onClick={() => handleAlphaChange(0.65)}
            className="py-2 px-4 rounded bg-[#122131] hover:bg-[#1c2b3c] text-xs font-mono text-[#8c909f] hover:text-[#d4e4fa] border border-[#1c2b3c] flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Preview (α: 0.65, β: 0.35)</span>
          </button>
        </div>
      </div>

      {/* Bottom: Active Agentic Guardrails Rules Table */}
      <div className="p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-[#1c2b3c] pb-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#4cd7f6]" />
            <h3 className="text-sm font-semibold text-[#d4e4fa]">
              Future Guardrail Rules · Not Enforced
            </h3>
          </div>
          <span className="font-mono text-xs text-[#8c909f]">
            {rules.filter(r => r.status === 'ACTIVE').length} Active Policies
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-[#122131] text-[#8c909f] text-[11px] uppercase border-b border-[#1c2b3c]">
                <th className="py-2.5 px-3">Rule ID</th>
                <th className="py-2.5 px-3">Policy Name</th>
                <th className="py-2.5 px-3">Trigger Condition</th>
                <th className="py-2.5 px-3">Enforcement Action</th>
                <th className="py-2.5 px-3 text-center">24h Interceptions</th>
                <th className="py-2.5 px-3 text-center">Precision</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c2b3c]/40">
              {rules.map(rule => (
                <tr key={rule.id} className="hover:bg-[#122131]/60 transition-colors">
                  <td className="py-3 px-3 font-bold text-[#adc6ff]">{rule.id}</td>
                  <td className="py-3 px-3 font-sans font-medium text-[#d4e4fa]">{rule.name}</td>
                  <td className="py-3 px-3 text-[#c2c6d6] text-[11px]">{rule.condition}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      rule.action === 'AUTO_BLOCK' ? 'bg-[#93000a] text-[#ffdad6]' :
                      rule.action === 'STEP_UP_AUTH' ? 'bg-[#571bc1] text-[#c4abff]' :
                      'bg-[#1c2b3c] text-[#4cd7f6]'
                    }`}>
                      {rule.action}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center text-[#d4e4fa] font-bold">
                    —
                  </td>
                  <td className="py-3 px-3 text-center text-[#4cd7f6] font-bold">
                    —
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => onToggleRule(rule.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        rule.status === 'ACTIVE'
                          ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/50'
                          : 'bg-[#1c2b3c] text-[#8c909f]'
                      }`}
                    >
                      {rule.status}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
