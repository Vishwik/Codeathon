import React from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  Radio,
  Terminal,
  BrainCircuit,
  FileText,
  Moon,
  Sparkles,
  Server
} from 'lucide-react';

interface SidebarProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  investigationCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onNavigate,
  investigationCount
}) => {
  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
      activeDot: false,
    },
    {
      id: 'investigations',
      label: 'Investigations',
      icon: ShieldAlert,
      badge: investigationCount,
      activeDot: false,
    },
    {
      id: 'live-stream',
      label: 'Live Stream',
      icon: Radio,
      badge: null,
      activeDot: true,
    },
    {
      id: 'demo-console',
      label: 'Demo Console',
      icon: Terminal,
      badge: null,
      activeDot: false,
    },
    {
      id: 'model-rules-registry',
      label: 'Model & Rules',
      icon: BrainCircuit,
      badge: null,
      activeDot: false,
    },
    {
      id: 'audit-trail-logs',
      label: 'Audit Trail & Logs',
      icon: FileText,
      badge: null,
      activeDot: false,
    },
  ];

  return (
    <aside className="hidden md:flex fixed left-0 top-16 h-[calc(100vh-64px)] w-64 bg-[#010f1f] border-r border-[#424754]/40 z-40 flex flex-col justify-between p-3 select-none">
      <div className="flex flex-col gap-2">
        <div className="px-2 py-1 font-mono text-[11px] text-[#8c909f] tracking-wider uppercase">
          Investigative Operations
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center justify-between px-3 py-2 rounded text-left transition-all text-xs font-medium ${
                  isActive
                    ? 'bg-[#4d8eff] text-[#00285d] font-bold shadow-sm'
                    : 'text-[#c2c6d6] hover:bg-[#122131] hover:text-[#d4e4fa]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#00285d]' : 'text-[#8c909f]'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isActive ? 'bg-[#00285d] text-[#adc6ff]' : 'bg-[#93000a] text-[#ffdad6]'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {item.activeDot && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4cd7f6] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4cd7f6]"></span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Telemetry & Status */}
      <div className="flex flex-col gap-3 pt-3 border-t border-[#424754]/30">
        <div className="p-2 rounded bg-[#0d1c2d] border border-[#424754]/30 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase text-[#8c909f] tracking-wider">
              Inference Engine Topology
            </span>
            <Server className="w-3 h-3 text-[#4cd7f6]" />
          </div>
          <div className="flex flex-col font-mono text-[11px] text-[#c2c6d6]">
            <span className="truncate">
              <span className="text-[#8c909f]">Sup:</span> XGBoost Classifier
            </span>
            <span className="truncate">
              <span className="text-[#8c909f]">Anom:</span> Isolation Forest
            </span>
            <span className="truncate">
              <span className="text-[#8c909f]">Fusion:</span> Hybrid Risk Score
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#0d1c2d] border border-[#424754]/30 text-[#c2c6d6] font-mono text-xs">
          <div className="flex items-center gap-2">
            <Moon className="w-3.5 h-3.5 text-[#adc6ff]" />
            <span>Dark Mode</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-[#273647] text-[#adc6ff] font-bold text-[10px]">
            ACTIVE
          </span>
        </div>
      </div>
    </aside>
  );
};
