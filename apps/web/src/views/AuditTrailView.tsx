import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  User,
  Cpu,
  ShieldAlert,
  Download,
  CheckCircle2,
  AlertTriangle,
  Code
} from 'lucide-react';
import { AuditLogEvent } from '../types';

interface AuditTrailViewProps {
  auditLogs: AuditLogEvent[];
  onOpenExport: () => void;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({
  auditLogs,
  onOpenExport,
}) => {
  const [filterAuthor, setFilterAuthor] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectedEvent, setInspectedEvent] = useState<AuditLogEvent | null>(null);

  const filtered = auditLogs.filter(log => {
    const matchesAuthor = filterAuthor === 'ALL' || log.authorType === filterAuthor;
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.txId && log.txId.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesAuthor && matchesSearch;
  });

  return (
    <div className="flex flex-col w-full text-[#d4e4fa] p-4 gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-[#adc6ff]" />
          <div>
            <h1 className="text-lg font-semibold text-[#d4e4fa]">
              Forensic Audit Trail & Session Lineage
            </h1>
            <p className="text-xs text-[#8c909f]">
              Confirmed decisions from this browser session. The backend stores the latest decision, not a full immutable audit history.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenExport}
          className="px-3 py-1.5 rounded-lg bg-[#122131] hover:bg-[#1c2b3c] border border-[#1c2b3c] text-xs font-mono text-[#d4e4fa] flex items-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4 text-[#8c909f]" />
          <span>Export Ledger</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#8c909f] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search action, TX_ID, analyst, details..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#122131] border border-[#1c2b3c] rounded-lg text-xs text-[#d4e4fa] font-mono placeholder:text-[#8c909f] focus:outline-none focus:border-[#4d8eff]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[#8c909f]">Author Filter:</span>
          <select
            value={filterAuthor}
            onChange={e => setFilterAuthor(e.target.value)}
            className="px-2.5 py-1.5 bg-[#122131] border border-[#1c2b3c] rounded-lg text-xs font-mono text-[#c2c6d6] focus:outline-none"
          >
            <option value="ALL">All Authors ({auditLogs.length})</option>
            <option value="HUMAN">Human Investigators</option>
            <option value="AI_AGENT">RiskEngine (XGB/IF)</option>
            <option value="RULE_ENGINE">Guardrail Policies</option>
          </select>
        </div>
      </div>

      {/* Chronological Vertical Telemetry Stream */}
      <div className="p-4 bg-[#0d1c2d] border border-[#1c2b3c] rounded-xl relative">
        {/* Continuous vertical dashed line */}
        <div className="absolute left-7 sm:left-9 top-8 bottom-8 w-px border-l border-dashed border-[#1c2b3c] z-0"></div>

        <div className="flex flex-col gap-4 relative z-10">
          {filtered.map((event) => {
            const isHuman = event.authorType === 'HUMAN';
            const isAI = event.authorType === 'AI_AGENT';
            const isRule = event.authorType === 'RULE_ENGINE';

            const dotColor = isHuman ? 'bg-[#3b82f6]' : isAI ? 'bg-[#8b5cf6]' : 'bg-[#06b6d4]';

            return (
              <div
                key={event.id}
                className="flex items-start gap-3 sm:gap-4 group"
              >
                {/* 8px geometric node point */}
                <div className="pt-2 flex justify-center items-center w-6 shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor} ring-4 ring-[#0d1c2d] transition-transform group-hover:scale-125`}></div>
                </div>

                {/* Event Card Payload */}
                <div className="flex-1 p-3.5 bg-[#122131] border border-[#1c2b3c] hover:border-[#273647] rounded-lg transition-colors flex flex-col gap-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#adc6ff]">
                        {event.action}
                      </span>
                      {event.txId && (
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#0d1c2d] text-[#4cd7f6] border border-[#1c2b3c]">
                          {event.txId}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-[#8c909f]">
                      {event.timestamp}
                    </span>
                  </div>

                  <p className="text-xs text-[#c2c6d6] leading-relaxed">
                    {event.details}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#1c2b3c]/60 text-[11px] font-mono text-[#8c909f]">
                    <div className="flex items-center gap-1.5">
                      {isHuman && <User className="w-3.5 h-3.5 text-[#3b82f6]" />}
                      {isAI && <Cpu className="w-3.5 h-3.5 text-[#8b5cf6]" />}
                      {isRule && <ShieldAlert className="w-3.5 h-3.5 text-[#06b6d4]" />}
                      <span className="text-[#d4e4fa] font-medium">{event.authorName}</span>
                    </div>

                    <button
                      onClick={() => setInspectedEvent(event)}
                      className="hover:text-[#adc6ff] flex items-center gap-1 cursor-pointer"
                    >
                      <Code className="w-3 h-3" />
                      <span>View Payload</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* JSON Payload Inspector Modal */}
      {inspectedEvent && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg bg-[#122131] border border-[#273647] rounded-xl shadow-2xl p-4 flex flex-col gap-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#1c2b3c]">
              <span className="font-mono text-xs font-bold text-[#adc6ff]">
                Audit Event Payload: {inspectedEvent.id}
              </span>
              <button
                onClick={() => setInspectedEvent(null)}
                className="text-xs text-[#8c909f] hover:text-[#d4e4fa]"
              >
                Close [Esc]
              </button>
            </div>
            <pre className="p-3 bg-[#0d1c2d] rounded-lg border border-[#1c2b3c] font-mono text-[11px] text-[#4cd7f6] overflow-x-auto max-h-80">
              {JSON.stringify(inspectedEvent, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
