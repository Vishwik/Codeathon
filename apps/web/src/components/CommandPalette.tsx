import React, { useState, useEffect } from 'react';
import { Search, X, ShieldAlert, ArrowRight, Zap, Database, Terminal } from 'lucide-react';
import { Transaction } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  transactions: Transaction[];
  onSelectTransaction: (tx: Transaction) => void;
  onNavigate: (screen: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpen,
  transactions,
  onSelectTransaction,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          onOpen();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onOpen]);

  if (!isOpen) return null;

  const filteredTx = transactions.filter(tx =>
    tx.id.toLowerCase().includes(query.toLowerCase()) ||
    tx.account.holder.toLowerCase().includes(query.toLowerCase()) ||
    (tx.device?.ip || '').toLowerCase().includes(query.toLowerCase()) ||
    tx.primaryRiskSignature.toLowerCase().includes(query.toLowerCase()) ||
    tx.method.toLowerCase().includes(query.toLowerCase())
  );

  const quickNav = [
    { name: 'Overview Dashboard', path: 'overview', icon: Zap },
    { name: 'Investigation Triage Queue', path: 'investigations', icon: ShieldAlert },
    { name: 'Real-Time Ingestion Stream', path: 'live-stream', icon: Zap },
    { name: 'Attack Simulation Console', path: 'demo-console', icon: Terminal },
    { name: 'Model & Rules Topology', path: 'model-rules-registry', icon: Database },
  ].filter(item => item.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#122131] border border-[#273647] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => {
          const items=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-command-result]'));
          if(e.key==='ArrowDown'||e.key==='ArrowUp'){
            e.preventDefault();
            const index=items.indexOf(document.activeElement as HTMLElement);
            items[(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length]?.focus();
          } else if(e.key==='Enter'){
            e.preventDefault();
            const target=document.activeElement as HTMLElement;
            (target.matches('[data-command-result]') ? target : items[0])?.click();
          }
        }}
      >
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#1c2b3c] bg-[#0d1c2d]">
          <Search className="w-5 h-5 text-[#adc6ff] mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type transaction ID, account holder, IP address, or command..."
            className="w-full bg-transparent text-sm text-[#d4e4fa] placeholder:text-[#8c909f] focus:outline-none font-mono"
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#1c2b3c] text-[#8c909f] hover:text-[#d4e4fa]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-[#1c2b3c]">
          {/* Quick Nav */}
          {quickNav.length > 0 && (
            <div className="py-2">
              <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#8c909f]">
                System Views
              </div>
              {quickNav.map(nav => {
                const Icon = nav.icon;
                return (
                  <div
                    key={nav.path}
                    data-command-result role="button" tabIndex={0}
                    onClick={() => {
                      onNavigate(nav.path);
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded hover:bg-[#1c2b3c] cursor-pointer text-xs group"
                  >
                    <div className="flex items-center gap-2.5 text-[#d4e4fa]">
                      <Icon className="w-4 h-4 text-[#4cd7f6]" />
                      <span>{nav.name}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8c909f] group-hover:text-[#adc6ff] transition-transform group-hover:translate-x-0.5" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Transactions */}
          <div className="py-2">
            <div className="px-3 pb-1 text-[10px] font-mono uppercase tracking-wider text-[#8c909f] flex justify-between">
              <span>Matching Transactions ({filteredTx.length})</span>
              <span>Score / Status</span>
            </div>
            {filteredTx.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[#8c909f] font-mono">
                No matching transactions found for "{query}"
              </div>
            ) : (
              filteredTx.slice(0, 6).map(tx => (
                <div
                  key={tx.id}
                  data-command-result role="button" tabIndex={0}
                  onClick={() => {
                    onSelectTransaction(tx);
                    onClose();
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded hover:bg-[#1c2b3c] cursor-pointer text-xs group"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-[#adc6ff]">{tx.id}</span>
                      <span className="text-[#8c909f]">•</span>
                      <span className="text-[#d4e4fa] font-medium">{tx.account.holder}</span>
                      <span className="text-[#8c909f] font-mono text-[10px]">({(tx.device?.ip || '')})</span>
                    </div>
                    <span className="text-[11px] text-[#8c909f] truncate max-w-md mt-0.5">
                      {tx.method} • ${tx.amount.toLocaleString()} • {tx.primaryRiskSignature}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                      tx.riskLevel === 'HIGH' ? 'bg-[#93000a] text-[#ffdad6]' :
                      tx.riskLevel === 'MEDIUM' ? 'bg-[#571bc1] text-[#c4abff]' :
                      'bg-[#1c2b3c] text-[#4cd7f6]'
                    }`}>
                      {tx.fusedScore.toFixed(2)} {tx.riskLevel}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8c909f] group-hover:text-[#adc6ff]" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-[#0d1c2d] border-t border-[#1c2b3c] flex items-center justify-between text-[11px] text-[#8c909f] font-mono">
          <div className="flex items-center gap-3">
            <span>[↑↓] Navigate</span>
            <span>[Enter] Select</span>
            <span>[Esc] Close</span>
          </div>
          <span>RiskOps AI Live Indexer</span>
        </div>
      </div>
    </div>
  );
};
