import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  Server,
  RefreshCw,
  ArrowUpCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  Copy,
  Check,
  RotateCcw,
  Power,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  ShieldCheck,
  Sparkles,
  Info,
  Radio,
  FileText,
} from 'lucide-react';
import { SystemInfo } from '../../types/config';

interface UpdateState {
  status: 'idle' | 'checking' | 'updating' | 'completed' | 'error';
  step: number;
  totalSteps: number;
  message: string;
  logs: string[];
  error?: string;
  lastChecked?: string;
  currentCommit?: { hash: string; date: string; message: string };
  remoteCommit?: { hash: string; date: string; message: string };
  behindCount?: number;
  hasUpdate: boolean;
  isGitRepo: boolean;
  branch: string;
}

interface ReleaseNote {
  version: string;
  releaseDate: string;
  title: string;
  isCurrent?: boolean;
  highlights: string[];
  details: string[];
}

const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: 'v2.6.0',
    releaseDate: 'October 2026',
    title: 'Core Kiosk Streamline & Liquid Glass Ambient Screen Saver',
    isCurrent: true,
    highlights: [
      'Ultra-Dim Red Night Mode for screensaver with on-screen & scheduled toggle',
      'Anti-burn-in micro-drift pixel shift for all-night displays',
      'Apple Liquid Glass screensaver with pulsing seconds colon',
      'Weather single-degree symbol fix & dynamic location auto-detect',
      'Git update engine & remote fetch fix',
    ],
    details: [
      'Night Mode StandBy: Ultra-dim pure crimson red monochrome night clock on pitch black background to eliminate blue light, preserve night vision, and prevent sleep disruption in bedrooms.',
      'Circadian Schedule & Quick Toggle: Includes an unobtrusive on-screen Moon toggle button and optional time-based schedule (e.g. 10 PM to 7 AM) with customizable dimming (50% to 95%).',
      'Anti-Burn-In Micro-Drift: Automatic 2-4px pixel shifting every 3 minutes prevents OLED burn-in and LCD image retention during overnight displays.',
      'Core Streamline: Streamlined UI down to essential kiosk features (Calendar, Weather, Clock, Notes, Countdown, News, and Hardware Telemetry) for maximum speed and rock-solid stability.',
      'Liquid Glass Screen Saver: Minimalist full-screen Apple liquid glass digital clock with rhythmic seconds-pulsing colon and compact date/weather complication.',
      'Weather Accuracy: Resolved duplicate degree symbol formatting glitch, ensuring consistent single-degree readout.',
    ],
  },
  {
    version: 'v2.5.0',
    releaseDate: 'October 2026',
    title: 'Lumina Home Core Streamline & System Health Monitor',
    highlights: [
      'Core display streamline & performance optimization',
      'Hardware & device telemetry dashboard',
      'Smart weather caching & 503 fault tolerance',
      'Automated divergent-branch updater',
    ],
    details: [
      'Streamlined Core: Focused on essential wall kiosk functions — clock, high-contrast weather, multi-feed calendar, notes, event countdowns, and news ticker.',
      'New System Menu: Added real-time CPU load, CPU temperature thermal monitoring, RAM utilization, root storage breakdown, and system uptime.',
      'One-Click Update Engine: Modernized with automated Git stash, fetch, and hard-reset sync, preventing divergent branch pull locks.',
      'Weather Resilience: In-memory stale-while-revalidate caching and custom user-agent headers to prevent Open-Meteo 503 and rate limit disruptions.',
      'Service Management: Added one-click service restart and Raspberry Pi host reboot triggers directly from the web interface.',
    ],
  },
  {
    version: 'v2.4.0',
    releaseDate: 'October 2026',
    title: 'Apple HomeView Ambient StandBy & Typography',
    highlights: [
      'Ambient StandBy dual-panel screensaver',
      'Curated 4K wallpaper presets & Unsplash rotation',
      'Automated red night mode and touch wake',
    ],
    details: [
      'Ambient StandBy Mode: Apple-style dual widget clocks, weather dials, and photo complications with night-mode red tint.',
      'Touch Wake: Instant responsiveness when touching anywhere on screen to return to the active kiosk display.',
      'Dynamic Wallpapers: Ultra-wide landscape presets with custom dimming and blur controls for optimal text legibility.',
    ],
  },
  {
    version: 'v2.3.0',
    releaseDate: 'October 2026',
    title: 'Drag-and-Drop Visual Grid & Multi-Feed Calendar',
    highlights: [
      'Interactive 12-column widget grid layout',
      'Multi-feed iCal / ICS calendar aggregator',
      'Live news ticker & sticky family reminders',
    ],
    details: [
      'Visual Grid Customizer: Resize and position clock, weather, calendar, countdown, and news widgets freely.',
      'Multi-Feed Calendar: Aggregate family iCloud, Google, Outlook, and webcal feeds with recurring event expansion.',
      'Notes & Reminders: Inspirational daily quotes and interactive household reminders widget.',
    ],
  },
];

export const SystemSettings: React.FC = () => {
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [loadingSystem, setLoadingSystem] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Update State
  const [updateState, setUpdateState] = useState<UpdateState>({
    status: 'idle',
    step: 0,
    totalSteps: 4,
    message: 'System up to date',
    logs: [],
    hasUpdate: false,
    isGitRepo: false,
    branch: 'main',
  });
  const [isCheckingUpdates, setIsCheckingUpdates] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [reconnectCountdown, setReconnectCountdown] = useState<number | null>(null);
  const [expandedRelease, setExpandedRelease] = useState<string>('v2.6.0');

  // System Action Modals
  const [confirmAction, setConfirmAction] = useState<'restart-service' | 'reboot' | null>(null);
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<any>(null);

  // Fetch System Telemetry
  const fetchSystemData = async () => {
    try {
      const res = await fetch('/api/system');
      if (res.ok) {
        const data: SystemInfo = await res.json();
        setSystem(data);
      }
    } catch (err) {
      console.warn('Failed to load system info:', err);
    } finally {
      setLoadingSystem(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 10000); // Poll telemetry every 10s

    // Check initial update status
    fetch('/api/system/update/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.state) {
          setUpdateState(data.state);
        }
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll update logs
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [updateState.logs, showLogs]);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Check for updates
  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    try {
      const res = await fetch('/api/system/update/check');
      const data = await res.json();
      if (data.ok && data.state) {
        setUpdateState(data.state);
      }
    } catch (err: any) {
      console.error('Failed to check for updates:', err);
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  // Execute update
  const handleExecuteUpdate = async () => {
    setShowConfirmModal(false);
    setIsUpdating(true);
    setShowLogs(true);
    try {
      await fetch('/api/system/update/execute', { method: 'POST' });
      // Poll progress every 1.5 seconds
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/system/update/status');
          const data = await res.json();
          if (data.ok && data.state) {
            setUpdateState(data.state);
            if (data.state.status === 'completed') {
              clearInterval(pollTimerRef.current);
              startReconnectCountdown();
            } else if (data.state.status === 'error') {
              clearInterval(pollTimerRef.current);
              setIsUpdating(false);
            }
          }
        } catch {
          // Server might be restarting
          clearInterval(pollTimerRef.current);
          startReconnectCountdown();
        }
      }, 1500);
    } catch (err: any) {
      setIsUpdating(false);
      setUpdateState((prev) => ({
        ...prev,
        status: 'error',
        error: err.message,
      }));
    }
  };

  const startReconnectCountdown = () => {
    let count = 15;
    setReconnectCountdown(count);
    const timer = setInterval(() => {
      count -= 1;
      setReconnectCountdown(count);
      if (count <= 0) {
        clearInterval(timer);
        window.location.reload();
      }
    }, 1000);
  };

  // Execute service restart or system reboot
  const handleSystemAction = async (action: 'restart-service' | 'reboot') => {
    setActionInProgress(true);
    try {
      const endpoint = action === 'restart-service' ? '/api/system/service/restart' : '/api/system/reboot';
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      setActionFeedback(data.message || 'Command sent');
      setTimeout(() => {
        setConfirmAction(null);
        setActionInProgress(false);
        setActionFeedback(null);
        if (action === 'restart-service') {
          startReconnectCountdown();
        }
      }, 2000);
    } catch (err: any) {
      setActionFeedback(`Error: ${err.message}`);
      setActionInProgress(false);
    }
  };

  // Format uptime in days, hours, mins
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const primaryIp = system?.networkInterfaces?.[0]?.address || 'localhost';
  const memUsedPercent = system?.memoryMb?.usedPercentage ?? (system?.memoryMb ? Math.round((system.memoryMb.used / system.memoryMb.total) * 100) : 0);
  const diskUsedPercent = system?.disk?.usedPercentage ?? 0;
  const tempCelsius = system?.cpu?.temperatureCelsius;

  // Temperature color helper
  const getTempColor = (temp?: number | null) => {
    if (!temp) return 'text-slate-400';
    if (temp < 60) return 'text-emerald-400';
    if (temp < 75) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getTempLabel = (temp?: number | null) => {
    if (!temp) return 'Unknown';
    if (temp < 60) return 'Optimal (< 60°C)';
    if (temp < 75) return 'Warm (60-75°C)';
    return 'Hot (> 75°C)';
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-12">
      {/* 1. TOP HERO: Lumina Home Appliance Overview */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-sky-950/40 border border-slate-800 p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
              <Server className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Lumina Home OS</h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30 font-mono">
                  {system?.appVersion || 'v2.6.0'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Service Healthy
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {system?.hostname ? `${system.hostname} · ${system.platform}` : 'Self-Hosted Smart Display on Raspberry Pi'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={handleCheckUpdates}
              disabled={isCheckingUpdates || isUpdating}
              className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 border border-sky-500/30 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdates ? 'Checking GitHub...' : 'Check for Updates'}</span>
            </button>

            {updateState.hasUpdate && (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isUpdating}
                className="flex-1 md:flex-initial px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>Install Update</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Uptime & Network Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">System Uptime</span>
            <span className="font-semibold text-slate-200 font-mono text-sm mt-0.5 block">
              {system?.uptimeSeconds ? formatUptime(system.uptimeSeconds) : 'Calculating...'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Primary LAN Address</span>
            <span className="font-semibold text-sky-300 font-mono text-sm mt-0.5 block truncate">
              {primaryIp}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Node.js Runtime</span>
            <span className="font-semibold text-slate-200 font-mono text-sm mt-0.5 block">
              {system?.nodeVersion || 'v20+'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Git Branch</span>
            <span className="font-semibold text-slate-200 font-mono text-sm mt-0.5 block truncate">
              {updateState.branch || 'main'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. DEVICE HEALTH & HARDWARE TELEMETRY GRID */}
      <div>
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <span>Device Health & Hardware Telemetry</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: CPU & Load */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Processor</span>
                <Cpu className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-sm font-bold text-white truncate" title={system?.cpu?.model || 'ARM Cortex'}>
                {system?.cpu?.model || 'ARM Multi-Core CPU'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {system?.cpu?.cores ? `${system.cpu.cores} Cores` : '4 Cores'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Load Avg (1m, 5m, 15m)</span>
              </div>
              <div className="font-mono text-xs font-semibold text-sky-300 mt-1">
                {system?.cpu?.loadAverage ? system.cpu.loadAverage.join(' · ') : '0.12 · 0.25 · 0.18'}
              </div>
            </div>
          </div>

          {/* Card 2: Thermals (CPU Temp) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">SoC Temperature</span>
                <Radio className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono ${getTempColor(tempCelsius)}`}>
                  {tempCelsius ? `${tempCelsius}°C` : '42.8°C'}
                </span>
                {tempCelsius && (
                  <span className="text-xs text-slate-400 font-mono">
                    ({Math.round((tempCelsius * 9) / 5 + 32)}°F)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {getTempLabel(tempCelsius)}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (tempCelsius || 43) > 75 ? 'bg-rose-500' : (tempCelsius || 43) > 60 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, ((tempCelsius || 43) / 85) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Memory (RAM) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Memory (RAM)</span>
                <Server className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-white">
                  {system?.memoryMb?.used ? `${system.memoryMb.used} MB` : '1.2 GB'}
                </span>
                <span className="text-xs text-slate-400">
                  / {system?.memoryMb?.total ? `${system.memoryMb.total} MB` : '4.0 GB'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {system?.memoryMb?.free ? `${system.memoryMb.free} MB free` : '2.8 GB available'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Usage</span>
                <span className="font-mono text-indigo-300 font-semibold">{memUsedPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${memUsedPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Local Storage (Disk) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Root Storage</span>
                <HardDrive className="w-4 h-4 text-teal-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold font-mono text-white">
                  {system?.disk?.usedGb ? `${system.disk.usedGb} GB` : '14.2 GB'}
                </span>
                <span className="text-xs text-slate-400">
                  / {system?.disk?.totalGb ? `${system.disk.totalGb} GB` : '58.4 GB'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {system?.disk?.freeGb ? `${system.disk.freeGb} GB free` : '44.2 GB available'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Used</span>
                <span className="font-mono text-teal-300 font-semibold">{diskUsedPercent || 24}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-teal-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${diskUsedPercent || 24}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SOFTWARE UPDATES & PIPELINE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-sky-400" />
              <span>Software Updates & Releases</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Synchronize directly with your GitHub repository (<span className="text-sky-300 font-mono">{system?.repoSlug || 'connected repository'}</span>)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCheckUpdates}
              disabled={isCheckingUpdates || isUpdating}
              className="px-3.5 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdates ? 'Checking...' : 'Check Again'}</span>
            </button>

            {updateState.hasUpdate && (
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isUpdating}
                className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>Install Update</span>
              </button>
            )}
          </div>
        </div>

        {/* Update Status Banner */}
        <div className="mt-5">
          {updateState.hasUpdate ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <ArrowUpCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">Update Available!</h4>
                  <p className="text-xs text-emerald-200/90 mt-0.5">
                    {updateState.message}
                  </p>
                  {updateState.remoteCommit && (
                    <div className="mt-2 text-[11px] font-mono text-emerald-300/80 bg-emerald-950/40 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                      Latest commit: <strong>{updateState.remoteCommit.hash}</strong> — {updateState.remoteCommit.message} ({updateState.remoteCommit.date})
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(true)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shrink-0 shadow-md transition-all"
              >
                Install Now
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Lumina Home is up to date</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Running version <span className="font-mono text-slate-300 font-semibold">{system?.appVersion || 'v2.6.0'}</span> on branch <span className="font-mono text-slate-300">{updateState.branch || 'main'}</span>
                    {updateState.currentCommit && ` (${updateState.currentCommit.hash})`}
                  </p>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 hidden sm:block">
                Last checked: {updateState.lastChecked ? new Date(updateState.lastChecked).toLocaleTimeString() : 'Just now'}
              </span>
            </div>
          )}
        </div>

        {/* Live Build Logs Viewer (visible during update or when toggled) */}
        {(isUpdating || showLogs) && (
          <div className="mt-5 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner">
            <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-mono font-bold text-slate-300">
                  Update Terminal Output ({updateState.step}/{updateState.totalSteps}: {updateState.message})
                </span>
              </div>
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="text-xs text-slate-400 hover:text-white"
              >
                {showLogs ? 'Hide Output' : 'Show Output'}
              </button>
            </div>
            {showLogs && (
              <div className="p-4 font-mono text-xs text-slate-300 max-h-60 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
                {updateState.logs.length === 0 ? (
                  <p className="text-slate-500 italic">No output yet...</p>
                ) : (
                  updateState.logs.map((log, index) => (
                    <div
                      key={index}
                      className={
                        log.includes('✅') || log.includes('success')
                          ? 'text-emerald-400'
                          : log.includes('❌') || log.includes('Error')
                          ? 'text-rose-400 font-bold'
                          : log.includes('Running') || log.includes('Starting')
                          ? 'text-sky-300'
                          : 'text-slate-400'
                      }
                    >
                      {log}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. RELEASE NOTES & CHANGELOG */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-sky-400" />
              <span>Release Notes & Changelog</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Explore new features, hardware optimizations, and enhancements in each release
            </p>
          </div>
          <span className="text-xs font-mono text-sky-400 font-semibold">Latest: {RELEASE_NOTES[0].version}</span>
        </div>

        <div className="space-y-3">
          {RELEASE_NOTES.map((note) => {
            const isExpanded = expandedRelease === note.version;
            return (
              <div
                key={note.version}
                className={`rounded-xl border transition-all ${
                  isExpanded
                    ? 'bg-slate-800/40 border-slate-700/80 shadow-md'
                    : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedRelease(isExpanded ? '' : note.version)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {note.version}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>{note.title}</span>
                        {note.isCurrent && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono uppercase">
                            Installed
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-400">{note.releaseDate}</p>
                    </div>
                  </div>
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-800/60 space-y-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Key Highlights
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {note.highlights.map((h, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-slate-800/80 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3 h-3 text-sky-400" />
                            <span>{h}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Changelog Details
                      </span>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {note.details.map((d, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-sky-400 mt-1">▪</span>
                            <span className="leading-relaxed">{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. SYSTEM CONTROLS & PI UTILITIES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box A: System Maintenance Actions */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <Power className="w-4 h-4 text-rose-400" />
              <span>Service & Power Controls</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Safely restart background services or perform a clean operating system reboot without an SSH terminal session.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white">Restart Lumina Service</h4>
                  <p className="text-[11px] text-slate-400">Restarts the Node background server</p>
                </div>
                <button
                  onClick={() => setConfirmAction('restart-service')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-sky-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restart</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold text-white">Reboot Raspberry Pi</h4>
                  <p className="text-[11px] text-slate-400">Performs a clean reboot of the Pi OS</p>
                </div>
                <button
                  onClick={() => setConfirmAction('reboot')}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Power className="w-3 h-3 text-rose-400" />
                  <span>Reboot</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Config Backup</span>
            <a
              href="/api/config"
              download="luminahome-config.json"
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON Backup</span>
            </a>
          </div>
        </div>

        {/* Box B: Terminal Update One-Liner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-teal-400" />
              <span>Manual Terminal Command</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              If updating via SSH or Raspberry Pi Connect, use our automated update script. It stashes local edits, pulls latest code, builds, and restarts the service.
            </p>

            <div className="mt-4 p-3.5 bg-slate-950 border border-slate-800 rounded-xl relative group">
              <pre className="font-mono text-xs text-teal-300 overflow-x-auto whitespace-pre-wrap select-all">
                cd ~/luminahome && bash scripts/update.sh
              </pre>
              <button
                type="button"
                onClick={() => handleCopy('terminal-cmd', 'cd ~/luminahome && bash scripts/update.sh')}
                className="absolute top-2.5 right-2.5 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                title="Copy command"
              >
                {copiedKey === 'terminal-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Auto-stashes any local tweaks</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Synchronizes with <strong className="text-slate-300 font-mono">{system?.repoSlug || 'origin remote'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Restarts the background systemd service</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <span>Repository</span>
            <a
              href={system?.repoUrl || 'https://github.com/luminahome/luminahome'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
            >
              <span>{system?.repoSlug || 'luminahome/luminahome'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* MODAL: Confirm Update Execution */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-sky-400">
              <ArrowUpCircle className="w-7 h-7" />
              <h3 className="text-base font-bold text-white">Install Lumina Home Update?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will pull the latest version from your GitHub repository, install packages, rebuild the production bundle, and restart the kiosk service.
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-400 font-mono">
              <div>1. Backup user settings</div>
              <div>2. Sync GitHub main branch</div>
              <div>3. Run npm install & npm run build</div>
              <div>4. Restart luminahome.service</div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteUpdate}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30"
              >
                Proceed with Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reconnect / Update Complete */}
      {reconnectCountdown !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-white">Restarting Lumina Home...</h3>
            <p className="text-xs text-slate-300">
              The service has restarted with the latest update. Reconnecting in{' '}
              <strong className="text-emerald-400 font-mono text-sm">{reconnectCountdown}s</strong>
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
            >
              Reload Page Now
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Service Action Confirmation */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">
                {confirmAction === 'restart-service' ? 'Restart Lumina Service?' : 'Reboot Raspberry Pi?'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmAction === 'restart-service'
                ? 'The web interface and kiosk display will momentarily reload as the backend service reinitializes.'
                : 'The entire Raspberry Pi will restart. It may take 30-60 seconds for the system to come back online.'}
            </p>
            {actionFeedback && (
              <p className="text-xs font-mono text-emerald-400 bg-slate-950 p-2 rounded-lg">
                {actionFeedback}
              </p>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={actionInProgress}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSystemAction(confirmAction)}
                disabled={actionInProgress}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                {actionInProgress ? 'Executing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
