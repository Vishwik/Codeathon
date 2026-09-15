import React, { useState } from 'react';
import {
  Search,
  Bell,
  Settings,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ExternalLink,
  ChevronDown,
  Activity
} from 'lucide-react';
import { ApiHealthStatus, API_BASE_URL } from '../api/client';

interface HeaderProps {
  onOpenCommandPalette: () => void;
  onNavigate: (path: string) => void;
  activeScreen: string;
  apiHealth?: ApiHealthStatus | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenCommandPalette,
  onNavigate,
  apiHealth
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifications: {id:number;title:string;desc:string;time:string;urgent:boolean;path:string}[] = [];

  return (
    <header className="fixed top-0 left-0 w-full h-16 bg-[#010f1f]/95 backdrop-blur-md border-b border-[#424754]/40 z-50 flex items-center justify-between px-4">
      {/* Brand & Live status */}
      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => onNavigate('overview')}
        >
          <ShieldAlert aria-label="RiskOps AI" className="h-8 w-8 shrink-0 text-[#4cd7f6]" />
          <div className="flex flex-col">
            <span className="font-semibold text-base text-[#d4e4fa] tracking-tight leading-none">
              RiskOps AI
            </span>
            <span className="font-mono text-[11px] text-[#8c909f] tracking-tight leading-none mt-1">
              Transaction Risk & Investigation
            </span>
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-[#122131] rounded-lg border border-[#424754]/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4cd7f6] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4cd7f6]"></span>
          </span>
          <span className="font-mono text-[11px] text-[#c2c6d6] uppercase tracking-wider font-medium">
            PRODUCTION MONITORING (SIMULATED)
          </span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="flex-1 max-w-md mx-4 hidden md:block">
        <div
          onClick={onOpenCommandPalette}
          className="relative flex items-center cursor-pointer group"
        >
          <Search className="absolute left-3 text-[#8c909f] w-4 h-4 pointer-events-none group-hover:text-[#adc6ff] transition-colors" />
          <div className="w-full pl-9 pr-14 py-1.5 bg-[#0d1c2d] border border-[#424754]/50 rounded text-[#d4e4fa] placeholder:text-[#8c909f]/70 font-mono text-[11px] group-hover:border-[#adc6ff]/60 transition-colors flex items-center">
            <span className="text-[#8c909f]">Search TX_ID, Account, IP, Entity Hash...</span>
          </div>
          <div className="absolute right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#1c2b3c] border border-[#424754]/40 text-[#8c909f] font-mono text-[10px]">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Right Telemetry Controls */}
      <div className="flex items-center gap-3">
        {/* Truthful ML & Backend Status Pill */}
        <div
          className="hidden lg:flex items-center gap-2 px-3 py-1 rounded bg-[#122131] border border-[#424754]/30 font-mono text-[11px] text-[#c2c6d6]"
          title={`Backend Base URL: ${apiHealth?.endpoint || API_BASE_URL} (Configurable via VITE_API_BASE_URL)`}
        >
          <Cpu className="w-3.5 h-3.5 text-[#4cd7f6]" />
          <span>Topology: <span className="text-[#adc6ff] font-medium">XGBoost + IF</span></span>
          <span className="text-[#8c909f]">•</span>
          {apiHealth?.online ? (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]"></span>
              <span>FastAPI: <span className="text-[#10b981] font-medium">{apiHealth.observedLatencyMs !== null ? `${apiHealth.observedLatencyMs}ms` : 'Connected'}</span></span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[#ff897d]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff5449]"></span>
              <span className="text-[10px] uppercase font-bold tracking-wider">BACKEND OFFLINE • ML UNAVAILABLE</span>
            </span>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 text-[#c2c6d6] hover:text-[#d4e4fa] hover:bg-[#1c2b3c] rounded transition-colors relative"
            title="Operational Alerts"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#93000a] text-[#ffdad6] font-mono text-[10px] font-bold border border-[#010f1f]">
              {notifications.length}
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-[#122131] border border-[#273647] rounded-lg shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#1c2b3c]">
                <span className="font-semibold text-xs text-[#d4e4fa] uppercase tracking-wider font-mono">
                  Alerts ({notifications.length})
                </span>
                <span className="text-[10px] text-[#4cd7f6] font-mono">Not connected</span>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {notifications.length === 0 && <p className="text-xs text-[#8c909f]">Notification feed not available.</p>}
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      onNavigate(n.path);
                      setShowNotifications(false);
                    }}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      n.urgent ? 'bg-[#93000a]/20 border border-[#93000a]/40 hover:bg-[#93000a]/30' : 'bg-[#0d1c2d] hover:bg-[#1c2b3c]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${n.urgent ? 'text-[#ffb4ab]' : 'text-[#adc6ff]'}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-[#8c909f] font-mono">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-[#c2c6d6] mt-1">{n.desc}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  onNavigate('investigations');
                  setShowNotifications(false);
                }}
                className="w-full mt-2 pt-2 border-t border-[#1c2b3c] text-center text-xs font-mono text-[#adc6ff] hover:underline"
              >
                View All Queued Alerts →
              </button>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-[#424754]/40 mx-1 hidden sm:block"></div>

        {/* Profile */}
        <div className="flex items-center gap-3 pl-1 relative">
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="relative">
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border border-[#424754]/60"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-uXtwtZDH6Bmhj7u0Q9PN3L-94AS4x4vA6QHvxFPL0GS9c5fQ1l-9sBLhk8t6zHzRTirTgSbrJ8vpI_jvK341vr3eGfulPDinNBiorWJRkofGny5osmuRWUhskXt9G7ODOViaWuYsiAd2T02o4zD4IYaQDKw8sS_2MkZYqCfvivrhB9Qw_v7PjSAbJ0awTqchvPDyiLjvCvlqZCf17trITkehOPI8yX3ceydbF1LNB4YYZbLqa7cJuw"
              />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-[#4cd7f6] ring-2 ring-[#010f1f]"></span>
            </div>
            <div className="hidden 2xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#d4e4fa] leading-none group-hover:text-white">
                Demo Investigator
              </span>
              <span className="font-mono text-[10px] text-[#8c909f] leading-none mt-1">
                Local demo session
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#8c909f] group-hover:text-[#d4e4fa] transition-colors" />
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 top-12 w-56 bg-[#122131] border border-[#273647] rounded-lg shadow-2xl p-2 z-50 text-xs">
              <div className="px-2 py-1.5 border-b border-[#1c2b3c] mb-1">
                <div className="font-semibold text-[#d4e4fa]">Demo Investigator</div>
                <div className="text-[10px] font-mono text-[#8c909f]">adwaithgudipati0007@gmail.com</div>
                <div className="text-[10px] font-mono text-[#4cd7f6] mt-0.5">Role: Ops Commander (Level 3)</div>
              </div>
              <button
                onClick={() => {
                  onNavigate('model-rules-registry');
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-[#1c2b3c] rounded text-[#c2c6d6] hover:text-[#d4e4fa] flex items-center justify-between"
              >
                <span>Defense Grid Settings</span>
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  onNavigate('audit-trail-logs');
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-2 py-1.5 hover:bg-[#1c2b3c] rounded text-[#c2c6d6] hover:text-[#d4e4fa] flex items-center justify-between"
              >
                <span>Investigator Session Log</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
