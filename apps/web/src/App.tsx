import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CommandPalette } from './components/CommandPalette';
import { InvestigationDrawer } from './components/InvestigationDrawer';
import { ExportModal } from './components/ExportModal';

import { OverviewView } from './views/OverviewView';
import { InvestigationsView } from './views/InvestigationsView';
import { LiveStreamView } from './views/LiveStreamView';
import { DemoConsoleView } from './views/DemoConsoleView';
import { ModelRulesView } from './views/ModelRulesView';
import { AuditTrailView } from './views/AuditTrailView';

import {
  INITIAL_TRANSACTIONS,
  CHANNEL_VELOCITIES,
  INITIAL_MODEL_CONFIG,
  INITIAL_RULES,
  INITIAL_AUDIT_LOGS
} from './data/mockData';
import { Transaction, CaseStatus, AuditLogEvent, BackendSummary } from './types';
import { apiClient, ApiHealthStatus } from './api/client';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<string>('overview');
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [channelVelocities, setChannelVelocities] = useState(CHANNEL_VELOCITIES);
  const [modelConfig, setModelConfig] = useState(INITIAL_MODEL_CONFIG);
  const [rules, setRules] = useState(INITIAL_RULES);
  const [auditLogs, setAuditLogs] = useState<AuditLogEvent[]>(INITIAL_AUDIT_LOGS);
  const [apiHealth, setApiHealth] = useState<ApiHealthStatus | null>(null);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [summary, setSummary] = useState<BackendSummary | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 5000);
  };
  const refresh = async () => {
    const health = await apiClient.checkHealth();
    setApiHealth(health);
    try {
      const remote = await apiClient.getTransactions({limit:100});
      setTransactions(remote);
      setSummary(await apiClient.getSummary());
      setSyncError(health.online ? null : health.errorMessage || 'ML unavailable');
    } catch(error) {
      setSyncError(error instanceof Error ? error.message : 'Data unavailable');
    }
  };
  useEffect(() => {
    void refresh();
    const interval = setInterval(()=>void refresh(),15000);
    return ()=>clearInterval(interval);
  }, []);
  const handleResolveCase = async (txId: string, status: CaseStatus, sarCode?: string, note?: string) => {
    const updated = await apiClient.recordDecision(txId,status,note,sarCode);
    setTransactions(prev=>prev.map(tx=>tx.id===txId?updated:tx));
    setSelectedTransaction(updated);
    setAuditLogs(prev=>[{
      id:crypto.randomUUID(),timestamp:updated.resolvedAt || '',rawTimestamp:Date.now(),
      authorType:'HUMAN',authorName:updated.resolvedBy || 'Investigator',
      action:'CASE_'+updated.status,txId,details:updated.notes?.join('; ') || 'Decision persisted by backend',
      severity:updated.status==='BLOCKED'?'WARNING':'SUCCESS'
    },...prev]);
    showToast('Decision saved: '+updated.status);
    void refresh();
  };
  const handleNewTransaction = (tx: Transaction) => {
    setTransactions(prev=>[tx,...prev.filter(t=>t.id!==tx.id)].slice(0,100));
    void apiClient.getSummary().then(setSummary).catch(error=>setSyncError(String(error)));
  };
  const handleUpdateWeights = () => showToast('Preview only. Risk fusion is controlled by the backend model policy.');
  const handleToggleRule = () => showToast('Preview only. Automated guardrails are not enabled.');

  const pendingCount = transactions.filter(t => t.status === 'QUEUED' || t.status === 'IN_REVIEW').length;

  return (
    <div className="min-h-screen bg-[#051424] text-[#d4e4fa] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onNavigate={setActiveScreen}
        activeScreen={activeScreen}
        apiHealth={apiHealth}
      />

      {/* Main Layout Container */}
      <div className="flex pt-16">
        {/* Sidebar */}
        <Sidebar
          activeScreen={activeScreen}
          onNavigate={setActiveScreen}
          investigationCount={pendingCount}
        />

        {/* Content Canvas */}
        <main className="md:pl-64 min-w-0 w-full min-h-[calc(100vh-64px)] bg-[#051424]">
          <nav className="md:hidden flex flex-wrap gap-2 p-3 border-b border-[#273647]">
 {['overview','investigations','live-stream','demo-console','model-rules-registry','audit-trail-logs'].map(screen=><button key={screen} className="text-xs p-2" onClick={()=>setActiveScreen(screen)}>{screen.replace(/-/g,' ')}</button>)}
 </nav>
 <div className="px-4 py-2 text-xs text-[#adc6ff] border-b border-[#273647]">Bundle: {apiHealth?.bundleVersion || 'Unavailable'} · Latest 100 records · Experimental scores, not a banking decision system</div>
 {syncError && <div role="alert" className="p-3 text-[#ffb4ab] bg-[#3b1018]">Backend error: {syncError}. Previously loaded records may be stale. No local scoring is available.</div>}
 {activeScreen === 'overview' && (
            <OverviewView
              transactions={transactions}
              channelVelocities={channelVelocities}
              summary={summary}
              onSelectTransaction={setSelectedTransaction}
              onNavigate={setActiveScreen}
              onOpenExport={() => setIsExportModalOpen(true)}
              apiHealth={apiHealth}
            />
          )}

          {activeScreen === 'investigations' && (
            <InvestigationsView
              transactions={transactions}
              onSelectTransaction={setSelectedTransaction}
              onResolveCase={handleResolveCase}
            />
          )}

          {activeScreen === 'live-stream' && (
            <LiveStreamView
              transactions={transactions}
              onSelectTransaction={setSelectedTransaction}
              onTransactionsReceived={setTransactions}
            />
          )}

          {activeScreen === 'demo-console' && (
            <DemoConsoleView
              onInjectTransaction={handleNewTransaction}
              onSelectTransaction={setSelectedTransaction}
            />
          )}

          {activeScreen === 'model-rules-registry' && (
            <ModelRulesView
              modelConfig={modelConfig}
              rules={rules}
              onUpdateWeights={handleUpdateWeights}
              onToggleRule={handleToggleRule}
            />
          )}

          {activeScreen === 'audit-trail-logs' && (
            <AuditTrailView
              auditLogs={auditLogs}
              onOpenExport={() => setIsExportModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Deep Investigation Workbench Drawer */}
      <InvestigationDrawer
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onResolveCase={handleResolveCase}
      />

      {/* Command Palette (⌘K) */}
      <CommandPalette
        onOpen={() => setIsCommandPaletteOpen(true)}
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        transactions={transactions}
        onSelectTransaction={setSelectedTransaction}
        onNavigate={setActiveScreen}
      />

      {/* Export Daily Audit Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        transactions={transactions}
        auditLogs={auditLogs}
      />

      {/* Global Status Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#122131] border border-[#4d8eff] text-[#d4e4fa] px-4 py-2.5 rounded-lg shadow-2xl font-mono text-xs flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <span className="h-2 w-2 rounded-full bg-[#4cd7f6] animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
