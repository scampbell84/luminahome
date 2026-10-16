import React, { useState, useEffect } from 'react';
import { AppConfig, SystemInfo } from '../../types/config';
import { Wifi, Server, Activity, ShieldCheck, AlertCircle } from 'lucide-react';

interface SystemWidgetProps {
  config: AppConfig['system'];
  isOnline: boolean;
  lastHeartbeat: Date | null;
}

export const SystemWidget: React.FC<SystemWidgetProps> = ({ config, isOnline, lastHeartbeat }) => {
  const [system, setSystem] = useState<SystemInfo | null>(null);

  useEffect(() => {
    fetch('/api/system')
      .then((res) => res.json())
      .then((data: SystemInfo) => setSystem(data))
      .catch((err) => console.warn('System info query failed:', err));
  }, []);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const primaryIp = system?.networkInterfaces?.[0]?.address || '127.0.0.1';

  return (
    <div className="flex items-center gap-3 text-[11px] text-white/60 select-none text-kiosk-shadow">
      {/* Heartbeat connection status */}
      <div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-full border border-white/10">
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500 animate-ping'}`} />
        <span className={isOnline ? 'text-emerald-300 font-medium' : 'text-rose-400 font-medium'}>
          {isOnline ? 'ONLINE' : 'RECONNECTING'}
        </span>
      </div>

      {config.showIp && (
        <div className="flex items-center gap-1">
          <Wifi className="w-3 h-3 text-sky-400" />
          <span className="font-mono text-white/80">{primaryIp}</span>
        </div>
      )}

      {config.showUptime && system && (
        <div className="flex items-center gap-1 hidden sm:flex">
          <Activity className="w-3 h-3 text-teal-400" />
          <span>Up {formatUptime(system.uptimeSeconds)}</span>
        </div>
      )}
    </div>
  );
};
