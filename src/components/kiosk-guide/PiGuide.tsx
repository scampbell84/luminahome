import React, { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Check,
  Terminal,
  Cpu,
  Download,
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw,
  GitBranch,
  ArrowUpCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Github,
  HelpCircle,
  FolderDown,
  UploadCloud,
  Upload,
  Key,
  Lock,
  FileCode,
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

export const PiGuide: React.FC = () => {
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedDesktop, setSelectedDesktop] = useState<'bookworm' | 'bullseye'>('bookworm');
  const [setupMethod, setSetupMethod] = useState<'direct' | 'github'>('github');
  const [gitRepoInput, setGitRepoInput] = useState<string>('https://github.com/scampbell84/kiosk-board.git');
  const [githubToken, setGithubToken] = useState<string>('');
  const [githubPushing, setGithubPushing] = useState<boolean>(false);
  const [githubPushResult, setGithubPushResult] = useState<{ ok: boolean; message?: string; error?: string } | null>(null);
  const [uploadMethodTab, setUploadMethodTab] = useState<'inapp' | 'browser' | 'terminal'>('inapp');

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

  const logsEndRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/system')
      .then((res) => res.json())
      .then((data: SystemInfo) => setSystem(data))
      .catch((err) => console.warn('Failed to load system info:', err));

    // Initial check for updates
    fetch('/api/system/update/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.state) {
          setUpdateState(data.state);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [updateState.logs, showLogs]);

  // Handle checking updates
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

  // Trigger one-click update
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
    let count = 8;
    setReconnectCountdown(count);
    const interval = setInterval(async () => {
      count -= 1;
      setReconnectCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        window.location.reload();
      }
    }, 1000);
  };

  const primaryIp = system?.networkInterfaces?.[0]?.address || '192.168.1.100';
  const serverOrigin = typeof window !== 'undefined' ? window.location.origin : `http://${primaryIp}:3000`;
  const displayUrl = `http://${primaryIp}:3000/display`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const oneLinerInstall = `curl -fsSL ${serverOrigin}/api/scripts/install-kiosk.sh | bash`;
  const downloadArchiveUrl = `${serverOrigin}/api/system/download-app.tar.gz`;
  const downloadZipUrl = `${serverOrigin}/api/system/download-app.zip`;
  const directTarballInstall = `mkdir -p ~/kioskboard && cd ~/kioskboard && curl -fsSL ${serverOrigin}/api/system/download-app.tar.gz | tar -xz && bash scripts/install-kiosk.sh`;

  const handlePushToGithub = async () => {
    if (!githubToken.trim()) {
      setGithubPushResult({ ok: false, error: 'Please enter a GitHub Personal Access Token' });
      return;
    }
    setGithubPushing(true);
    setGithubPushResult(null);
    try {
      const res = await fetch('/api/system/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoUrl: gitRepoInput.trim(),
          token: githubToken.trim(),
          branch: 'main',
          commitMessage: 'Initial commit of KioskBoard application',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGithubPushResult({ ok: false, error: data.error || 'Failed to push to GitHub' });
      } else {
        setGithubPushResult({ ok: true, message: data.message });
      }
    } catch (err: any) {
      setGithubPushResult({ ok: false, error: err.message || 'Network error while connecting to server' });
    } finally {
      setGithubPushing(false);
    }
  };

  const wayfireConfig = `# Add to ~/.config/wayfire.ini (Raspberry Pi OS Bookworm / Wayland):
[autostart]
kiosk = chromium-browser --noerrdialogs --disable-infobars --kiosk --window-size=1920,1200 --window-position=0,0 --check-for-update-interval=31536000 --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required "${displayUrl}"
screensaver = false
dpms = false`;

  const bullseyeConfig = `# Add to ~/.config/lxsession/LXDE-pi/autostart (Raspberry Pi OS Bullseye / X11):
@xset s noblank
@xset s off
@xset -dpms
@unclutter -idle 0.5 -root
@sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences
@sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences
@chromium-browser --noerrdialogs --disable-infobars --kiosk --window-size=1920,1200 --window-position=0,0 --check-for-update-interval=31536000 --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required "${displayUrl}"`;

  const sudoersRule = `# Add to /etc/sudoers.d/kioskboard to allow passwordless in-app restarts:
pi ALL=(ALL) NOPASSWD: /bin/systemctl restart kioskboard, /bin/systemctl stop kioskboard, /bin/systemctl start kioskboard`;

  return (
    <div className="space-y-6 text-slate-200">
      {/* 1. In-App One-Click Update Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <ArrowUpCircle className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight">
                In-App One-Click Update System
              </h3>
              {updateState.hasUpdate ? (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  Update Available ({updateState.behindCount || 1} new)
                </span>
              ) : (
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {updateState.isGitRepo ? 'Up to Date' : 'Active Build'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Upgrades the kiosk with zero SSH needed. Pulls the latest changes, updates packages, rebuilds client assets, and seamlessly restarts the background service.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={handleCheckUpdates}
              disabled={isCheckingUpdates || isUpdating}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isCheckingUpdates ? 'Checking...' : 'Check for Updates'}</span>
            </button>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={isUpdating}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95 border border-emerald-400/30"
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>{isUpdating ? 'Updating Kiosk...' : 'Update Kiosk Now'}</span>
            </button>
          </div>
        </div>

        {/* Commit Details Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">Current Version</span>
            <span className="font-mono text-cyan-300 font-bold block mt-0.5">
              {updateState.currentCommit?.hash || 'v2.4-main'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">Git Branch</span>
            <span className="font-mono text-white font-bold block mt-0.5 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
              <span>{updateState.branch || 'main'}</span>
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">Release Timestamp</span>
            <span className="font-mono text-slate-300 font-bold block mt-0.5 truncate">
              {updateState.currentCommit?.date || 'Latest Release'}
            </span>
          </div>

          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase font-mono block">Environment Scope</span>
            <span className="font-mono text-emerald-300 font-bold block mt-0.5">
              {updateState.isGitRepo ? 'Raspberry Pi Git Repo' : 'Direct Production Build'}
            </span>
          </div>
        </div>

        {/* Live Update Progress Drawer */}
        {(isUpdating || updateState.status === 'completed' || updateState.status === 'error' || showLogs) && (
          <div className="mt-5 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  {updateState.status === 'updating' && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
                  {updateState.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {updateState.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                  <span>{updateState.message}</span>
                </span>
                {reconnectCountdown !== null && (
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    Reconnecting in {reconnectCountdown}s...
                  </span>
                )}
              </div>

              <button
                onClick={() => setShowLogs(!showLogs)}
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
              >
                <span>{showLogs ? 'Hide Console' : 'View Terminal Output'}</span>
                {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* 4-Step Progress Bar */}
            <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-center">
              {[
                { title: '1. Backup & Pull', step: 1 },
                { title: '2. Dependencies', step: 2 },
                { title: '3. Rebuild Assets', step: 3 },
                { title: '4. Restart Service', step: 4 },
              ].map((s) => {
                const isPassed = updateState.step > s.step || updateState.status === 'completed';
                const isCurrent = updateState.step === s.step && updateState.status === 'updating';
                return (
                  <div
                    key={s.step}
                    className={`p-2 rounded-lg border transition-all ${
                      isPassed
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : isCurrent
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 animate-pulse'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span>{s.title}</span>
                  </div>
                );
              })}
            </div>

            {/* Terminal Logs Window */}
            {showLogs && (
              <div className="mt-3 bg-black/90 rounded-lg p-3 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto border border-slate-800 space-y-1">
                {updateState.logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-500/30">
                <ArrowUpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Update KioskBoard?</h3>
                <p className="text-xs text-slate-400">Pulls the latest code and rebuilds production assets</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <p>
                ✅ <strong>Configuration Safe:</strong> Your custom settings, widgets, and Home Assistant tokens in <code className="text-cyan-300 font-mono">data/config.json</code> will be preserved automatically.
              </p>
              <p>
                🔄 <strong>Automatic Restart:</strong> The background service will restart immediately once the build finishes.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteUpdate}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all"
              >
                Confirm & Update Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Repository & Installation Options Card */}
      <div className="bg-slate-900/90 border border-slate-700/70 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
                <HelpCircle className="w-5 h-5" />
              </span>
              <h4 className="text-base font-bold text-white tracking-tight">
                Do I Need a GitHub Account or Repository?
              </h4>
            </div>
            <p className="text-xs text-slate-300">
              Choose the method that works best for you. No GitHub account is required to deploy and run your kiosk!
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setSetupMethod('direct')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                setupMethod === 'direct'
                  ? 'bg-emerald-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Direct Install (No GitHub)</span>
            </button>
            <button
              onClick={() => setSetupMethod('github')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                setupMethod === 'github'
                  ? 'bg-indigo-600 text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Github className="w-3.5 h-3.5" />
              <span>With GitHub (For 1-Click Updates)</span>
            </button>
          </div>
        </div>

        {setupMethod === 'direct' ? (
          /* Option 1: Direct Install (Zero GitHub required) */
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300/90 leading-relaxed flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-semibold mb-0.5">Zero Setup Needed:</strong>
                Your Raspberry Pi will download this exact project bundle directly from this server. You don't need a Git repository, SSH keys, or a GitHub account.
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Run This Single Command on Your Raspberry Pi:</span>
                </span>
                <button
                  onClick={() => copyToClipboard(oneLinerInstall, 'oneLinerInstall')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-md transition-all active:scale-95"
                >
                  {copiedKey === 'oneLinerInstall' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'oneLinerInstall' ? 'Copied Command!' : 'Copy Command'}</span>
                </button>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl font-mono text-xs text-emerald-300 border border-slate-800 break-all select-all leading-relaxed shadow-inner">
                {oneLinerInstall}
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                This one command downloads the app package, installs Node.js 20 LTS, builds the production kiosk, configures 24/7 background autostart, and boots Chromium in fullscreen mode.
              </p>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex-wrap gap-2 text-xs">
              <span className="text-slate-300 flex items-center gap-1.5">
                <FolderDown className="w-4 h-4 text-cyan-400" />
                <span>Want to inspect or copy files manually via USB or SCP?</span>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={downloadZipUrl}
                  download="kioskboard.zip"
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .ZIP</span>
                </a>
                <a
                  href={downloadArchiveUrl}
                  download="kioskboard.tar.gz"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .tar.gz</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* Option 2: GitHub Setup (Unlocks continuous 1-Click updates) */
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-200/90 leading-relaxed space-y-1">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Github className="w-4 h-4 text-indigo-400" />
                <span>Your GitHub Repository is Connected</span>
              </div>
              <p className="text-slate-300">
                You have created your repository at <a href="https://github.com/scampbell84/kiosk-board" target="_blank" rel="noreferrer" className="text-indigo-400 font-semibold underline hover:text-indigo-300">github.com/scampbell84/kiosk-board</a>. Follow the 3 steps below to push this code, clone it onto your Pi, and enable continuous 1-click updates.
              </p>
            </div>

            <div className="space-y-3">
              {/* Step 1: Repo Configuration */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-mono">1</span>
                    <span>Target GitHub Repository</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Ready
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs shrink-0 font-mono">Repo URL:</span>
                  <input
                    type="text"
                    value={gitRepoInput}
                    onChange={(e) => setGitRepoInput(e.target.value)}
                    placeholder="https://github.com/your-username/kiosk-board.git"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Step 2: How to Get Current Version Onto GitHub */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-xs font-mono">2</span>
                    <span>Get Current Application Code onto GitHub</span>
                  </div>

                  {/* Upload Method Subtabs */}
                  <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-semibold self-start sm:self-auto">
                    <button
                      onClick={() => setUploadMethodTab('inapp')}
                      className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                        uploadMethodTab === 'inapp' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>1-Click Push (In-App)</span>
                    </button>
                    <button
                      onClick={() => setUploadMethodTab('browser')}
                      className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                        uploadMethodTab === 'browser' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Web Browser Upload</span>
                    </button>
                    <button
                      onClick={() => setUploadMethodTab('terminal')}
                      className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                        uploadMethodTab === 'terminal' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Terminal className="w-3 h-3" />
                      <span>Terminal / Git</span>
                    </button>
                  </div>
                </div>

                {/* Subtab A: 1-Click Push via Personal Access Token */}
                {uploadMethodTab === 'inapp' && (
                  <div className="space-y-3 pt-1">
                    <p className="text-slate-300 text-xs leading-relaxed">
                      Push all application files directly from this server to your GitHub repo in one click. To allow this, GitHub requires a temporary Personal Access Token with repository permissions.
                    </p>

                    <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-amber-400" />
                          <span>GitHub Personal Access Token:</span>
                        </span>
                        <a
                          href="https://github.com/settings/tokens/new?scopes=repo&description=KioskBoard-App-Sync"
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 underline text-[11px] font-semibold flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Generate Token on GitHub (repo scope pre-selected)</span>
                        </a>
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="password"
                            value={githubToken}
                            onChange={(e) => setGithubToken(e.target.value)}
                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx (Personal Access Token)"
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-3 pr-8 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                          />
                          <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>

                        <button
                          onClick={handlePushToGithub}
                          disabled={githubPushing || !githubToken.trim()}
                          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow transition-all active:scale-95 shrink-0"
                        >
                          {githubPushing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Pushing to GitHub...</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Push Code to GitHub</span>
                            </>
                          )}
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Tokens are used strictly once for the push transaction and are never permanently saved or exposed.
                      </p>
                    </div>

                    {/* Result alert */}
                    {githubPushResult && (
                      <div
                        className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
                          githubPushResult.ok
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        {githubPushResult.ok ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <div className="font-semibold">{githubPushResult.ok ? 'Success!' : 'Push Error'}</div>
                          <div>{githubPushResult.message || githubPushResult.error}</div>
                          {githubPushResult.ok && (
                            <a
                              href="https://github.com/scampbell84/kiosk-board"
                              target="_blank"
                              rel="noreferrer"
                              className="text-white underline font-semibold flex items-center gap-1 mt-1 hover:text-emerald-200"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>View Your Updated Code on GitHub</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Subtab B: Web Browser Upload (Zero Terminal Required) */}
                {uploadMethodTab === 'browser' && (
                  <div className="space-y-3 pt-1">
                    <p className="text-slate-300 text-xs">
                      No Git or terminal knowledge needed! You can download the project zip and upload it directly inside GitHub's website in 4 quick steps:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">1</span>
                          <span>Download Application ZIP</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Click below to save the complete, production-ready codebase to your computer:
                        </p>
                        <a
                          href={downloadZipUrl}
                          download="kioskboard.zip"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow transition-all active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download kioskboard.zip</span>
                        </a>
                      </div>

                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">2</span>
                          <span>Unzip on Your Computer</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Double-click <code className="bg-slate-950 px-1 py-0.5 rounded text-cyan-300 font-mono">kioskboard.zip</code> on your Mac or PC to extract its contents into a folder.
                        </p>
                      </div>

                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">3</span>
                          <span>Upload Files on GitHub.com</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Go to <a href="https://github.com/scampbell84/kiosk-board" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold">scampbell84/kiosk-board</a>. If the repo is empty, click the link <span className="text-white font-semibold">"uploading an existing file"</span>, or click <span className="text-white font-semibold">"Add file" &gt; "Upload files"</span>.
                        </p>
                      </div>

                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px]">4</span>
                          <span>Drag, Drop & Commit</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Drag all the extracted files from your folder into the GitHub browser window, type <em>"Initial commit"</em>, and click the green <span className="text-emerald-400 font-semibold">"Commit changes"</span> button!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subtab C: Terminal / Git CLI */}
                {uploadMethodTab === 'terminal' && (
                  <div className="space-y-3 pt-1">
                    <p className="text-slate-300 text-xs">
                      If you have Git installed on your Mac, Windows PC, or Linux machine:
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-400 text-[11px]">Run in your unzipped kioskboard folder:</span>
                        <button
                          onClick={() => {
                            const termCmd = `git init -b main\ngit remote add origin ${gitRepoInput}\ngit add .\ngit commit -m "Initial commit of KioskBoard"\ngit push -u origin main --force`;
                            copyToClipboard(termCmd, 'gitPushTerminalCmd');
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          {copiedKey === 'gitPushTerminalCmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'gitPushTerminalCmd' ? 'Copied Commands!' : 'Copy Commands'}</span>
                        </button>
                      </div>

                      <pre className="bg-slate-900 p-3 rounded-lg font-mono text-xs text-cyan-300 border border-slate-800 leading-relaxed select-all">
{`git init -b main
git remote add origin ${gitRepoInput}
git add .
git commit -m "Initial commit of KioskBoard"
git push -u origin main --force`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Clone and Install on Raspberry Pi */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/30 text-indigo-300 flex items-center justify-center text-xs font-mono">3</span>
                    <span>Clone & Install on Your Raspberry Pi</span>
                  </div>
                  <button
                    onClick={() => {
                      const cmd = `git clone ${gitRepoInput} ~/kioskboard && cd ~/kioskboard && bash scripts/install-kiosk.sh`;
                      copyToClipboard(cmd, 'gitCloneCmd');
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-all active:scale-95"
                  >
                    {copiedKey === 'gitCloneCmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'gitCloneCmd' ? 'Copied!' : 'Copy Clone Command'}</span>
                  </button>
                </div>

                <p className="text-slate-300 text-xs">
                  Once your code is pushed to GitHub, open a terminal on your Raspberry Pi (or SSH into it) and run this single command:
                </p>

                <pre className="bg-slate-900 p-2.5 rounded-lg font-mono text-xs text-indigo-300 border border-slate-800 break-all select-all">
                  git clone {gitRepoInput} ~/kioskboard && cd ~/kioskboard && bash scripts/install-kiosk.sh
                </pre>

                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Continuous Upgrades Enabled:</strong> Whenever you push changes to GitHub in the future, just click <strong>"Update Kiosk Now"</strong> in the Admin Dashboard on your Pi to auto-update!
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Detailed Manual Step-by-Step Guide */}
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-5 shadow-lg space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Raspberry Pi OS Configuration Steps</span>
            </h3>
            <p className="text-xs text-slate-400">
              Customized for Raspberry Pi 4 & 5 running 64-bit Raspberry Pi OS
            </p>
          </div>

          {/* OS Selector Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setSelectedDesktop('bookworm')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedDesktop === 'bookworm'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pi OS Bookworm (Wayland)
            </button>
            <button
              onClick={() => setSelectedDesktop('bullseye')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedDesktop === 'bullseye'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Bullseye / Legacy (X11)
            </button>
          </div>
        </div>

        {/* Step A: Autostart Config */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[11px] font-bold">1</span>
              <span>Autostart Fullscreen Kiosk on Power-On</span>
            </span>
            <button
              onClick={() => copyToClipboard(selectedDesktop === 'bookworm' ? wayfireConfig : bullseyeConfig, 'autostart')}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedKey === 'autostart' ? 'Copied!' : 'Copy Config'}</span>
            </button>
          </div>

          <pre className="bg-slate-950 p-3 rounded-xl font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800 leading-relaxed whitespace-pre-wrap">
            {selectedDesktop === 'bookworm' ? wayfireConfig : bullseyeConfig}
          </pre>
        </div>

        {/* Step B: Sudoers Rule for In-App Updates */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[11px] font-bold">2</span>
              <span>Enable Passwordless Restart for In-App Updates</span>
            </span>
            <button
              onClick={() => copyToClipboard(sudoersRule, 'sudoers')}
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-mono"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedKey === 'sudoers' ? 'Copied!' : 'Copy Rule'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Allows the in-app update button to restart the systemd service cleanly without requiring terminal password prompts:
          </p>
          <pre className="bg-slate-950 p-3 rounded-xl font-mono text-xs text-indigo-200 overflow-x-auto border border-slate-800 leading-relaxed whitespace-pre-wrap">
            {sudoersRule}
          </pre>
        </div>

        {/* Step C: Raspberry Pi Hardware Settings */}
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300/90 space-y-1.5">
          <div className="font-semibold flex items-center gap-1.5 text-white">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Raspberry Pi OS System Optimization Tips:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 ml-1">
            <li>Run <code className="text-amber-200 font-mono">sudo raspi-config</code> → <strong>System Options</strong> → <strong>Boot / Auto Login</strong> → <strong>Desktop Autologin</strong>.</li>
            <li>In <strong>Display Options</strong>, disable <strong>Screen Blanking</strong> so the screen stays awake 24/7 without turning off.</li>
            <li>Under <strong>Performance Options</strong>, allocate at least 128MB to GPU Memory for smooth animations and transitions.</li>
          </ul>
        </div>
      </div>

      {/* 4. Downloadable Scripts Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Direct Scripts & Service Files:</span>
        </span>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/api/scripts/install-kiosk.sh"
            download="install-kiosk.sh"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <span>install-kiosk.sh</span>
          </a>
          <a
            href="/api/scripts/kiosk.sh"
            download="kioskboard-launch.sh"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <span>kiosk.sh</span>
          </a>
          <a
            href="/api/scripts/update.sh"
            download="update.sh"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <span>update.sh</span>
          </a>
          <a
            href="/api/scripts/kioskboard.service"
            download="kioskboard.service"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <span>kioskboard.service</span>
          </a>
        </div>
      </div>
    </div>
  );
};
