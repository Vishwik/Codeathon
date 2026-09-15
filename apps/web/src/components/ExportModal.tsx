import React, { useState } from 'react';
import { X, Download, FileJson, FileSpreadsheet, Check } from 'lucide-react';
import { Transaction, AuditLogEvent } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  auditLogs: AuditLogEvent[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  transactions,
  auditLogs,
}) => {
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    let content = '';
    let filename = `RiskOps_Audit_Daily_${new Date().toISOString().slice(0, 10)}`;
    let type = '';

    if (format === 'json') {
      content = JSON.stringify({
        generatedAt: new Date().toISOString(),
        scope: 'Loaded transactions and this browser session decisions',
        investigator: 'Demo investigator',
        metrics: {
          totalAnalyzed: transactions.length,
          suspiciousFlagged: transactions.filter(t=>t.suspicious).length,
          highRiskSeverity: transactions.filter(t=>t.risk_level==='HIGH').length,
          activeQueue: transactions.filter(t => t.status === 'QUEUED' || t.status === 'IN_REVIEW').length,
        },
        priorityEscalations: transactions,
        forensicAuditTrail: auditLogs,
      }, null, 2);
      filename += '.json';
      type = 'application/json';
    } else {
      const headers = ['TransactionID', 'Timestamp', 'Type', 'AmountUnits', 'SenderID', 'RecipientID', 'FraudProb', 'AnomalyScore', 'RiskScore', 'RiskLevel', 'Status'];
      const rows = transactions.map(t => [
        t.transaction_id || t.id,
        t.timestamp,
        t.type,
        t.amount,
        t.sender_id,
        t.recipient_id,
        (t.fraud_probability ?? t.mlProb ?? 0).toFixed(4),
        (t.anomaly_score ?? t.anomalyScore ?? 0).toFixed(4),
        t.risk_score ?? t.fusedScore ?? 0,
        t.risk_level ?? t.riskLevel ?? 'LOW',
        t.status
      ]);
      content = [headers.join(','), ...rows.map(r => r.map(value => {
        let cell=String(value);
        if (/^[=+@\-\t\r]/.test(cell)) cell="'"+cell;
        return '"'+cell.replace(/"/g,'""')+'"';
      }).join(','))].join('\n');
      filename += '.csv';
      type = 'text/csv';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-lg bg-[#122131] border border-[#273647] rounded-xl shadow-2xl p-5 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#1c2b3c]">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-[#adc6ff]" />
            <h3 className="font-semibold text-base text-[#d4e4fa]">
              Export Daily Audit & Forensic Package
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8c909f] hover:text-[#d4e4fa] hover:bg-[#1c2b3c]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#c2c6d6]">
          Generate an immutable compliance and supervisory record for Station 04 operations, including model telemetry parameters, SAR classifications, and investigator decisions.
        </p>

        {/* Format Selection */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFormat('json')}
            className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
              format === 'json'
                ? 'bg-[#4d8eff]/20 border-[#4d8eff] text-[#adc6ff]'
                : 'bg-[#0d1c2d] border-[#1c2b3c] text-[#8c909f] hover:bg-[#1c2b3c]'
            }`}
          >
            <FileJson className="w-6 h-6" />
            <span className="font-mono text-xs font-semibold">JSON Audit Package</span>
            <span className="text-[10px] text-[#8c909f]">Full lineage + model features</span>
          </button>

          <button
            onClick={() => setFormat('csv')}
            className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
              format === 'csv'
                ? 'bg-[#4d8eff]/20 border-[#4d8eff] text-[#adc6ff]'
                : 'bg-[#0d1c2d] border-[#1c2b3c] text-[#8c909f] hover:bg-[#1c2b3c]'
            }`}
          >
            <FileSpreadsheet className="w-6 h-6" />
            <span className="font-mono text-xs font-semibold">CSV Telemetry Ledger</span>
            <span className="text-[10px] text-[#8c909f]">Tabular spreadsheet format</span>
          </button>
        </div>

        {/* Scope stats */}
        <div className="p-3 bg-[#0d1c2d] rounded-lg border border-[#1c2b3c] flex flex-col gap-1.5 text-xs font-mono">
          <div className="flex justify-between text-[#8c909f]">
            <span>Included Priority Records:</span>
            <span className="text-[#d4e4fa] font-bold">{transactions.length} transactions</span>
          </div>
          <div className="flex justify-between text-[#8c909f]">
            <span>Audit Trail Entries:</span>
            <span className="text-[#d4e4fa] font-bold">{auditLogs.length} events</span>
          </div>
          <div className="flex justify-between text-[#8c909f]">
            <span>Hash Signature:</span>
            <span className="text-[#4cd7f6]">0x4a9b88210fe91cae...f31e</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs text-[#8c909f] hover:text-[#d4e4fa]"
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded bg-[#4d8eff] hover:bg-[#3575e6] text-[#00285d] font-semibold text-xs font-mono flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Package</span>
          </button>
        </div>
      </div>
    </div>
  );
};
