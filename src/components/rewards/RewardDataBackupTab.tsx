import React, { useState, useEffect } from 'react';
import { AppConfig, RewardConfig } from '../../types/config';
import {
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  Clock,
  HardDrive,
  FileText,
  AlertCircle,
  CheckCircle2,
  Users,
  Star,
  Sparkles,
  ArrowRight,
  Database,
  History,
  FileCheck,
} from 'lucide-react';

interface BackupItem {
  path: string;
  filename: string;
  dir: string;
  sizeBytes: number;
  mtime: string;
  isCurrent: boolean;
  hasCustomData: boolean;
  summary: {
    children: Array<{ id: string; name: string; avatarIcon: string; avatarColor: string; stars: number }>;
    tasksCount: number;
    shopCount: number;
    starLogsCount: number;
    auditLogsCount: number;
  };
}

interface RewardDataBackupTabProps {
  currentConfig: AppConfig;
  onApplyConfig: (restoredConfig: AppConfig) => void;
}

export const RewardDataBackupTab: React.FC<RewardDataBackupTabProps> = ({
  currentConfig,
  onApplyConfig,
}) => {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentFilePath, setCurrentFilePath] = useState<string>('');
  const [restoringPath, setRestoringPath] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [importing, setImporting] = useState<boolean>(false);

  const fetchBackups = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/config/backups');
      const data = await res.json();
      if (res.ok && data.ok) {
        setBackups(data.backups || []);
        setCurrentFilePath(data.currentConfigFile || '');
      } else {
        setStatusMessage({ text: data.error || 'Failed to scan backup files', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Error querying backup service', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleRestore = async (backupPath: string) => {
    if (!confirm(`Restore configuration from "${backupPath}"? This will update active children, star banks, custom tasks, and rewards.`)) {
      return;
    }

    setRestoringPath(backupPath);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/config/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupPath }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusMessage({
          text: `Successfully restored configuration from ${data.message || backupPath}!`,
          type: 'success',
        });
        if (data.config) {
          onApplyConfig(data.config);
        }
        fetchBackups();
      } else {
        setStatusMessage({ text: data.error || 'Failed to restore backup', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Restore network error', type: 'error' });
    } finally {
      setRestoringPath(null);
    }
  };

  const handleExport = () => {
    window.location.href = '/api/config/export';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setStatusMessage(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const res = await fetch('/api/config/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setStatusMessage({ text: 'Backup file imported and applied successfully!', type: 'success' });
        if (data.config) {
          onApplyConfig(data.config);
        }
        fetchBackups();
      } else {
        setStatusMessage({ text: data.error || 'Failed to import configuration', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: `Invalid JSON file: ${err.message}`, type: 'error' });
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  // Find candidate backups with customized data that aren't the current file
  const candidateCustomBackups = backups.filter(b => !b.isCurrent && b.hasCustomData);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Overview & Quick Actions */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Data Safety & Automatic Backups
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                  Protected
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Crash-proof atomic storage, rotating snapshots, and automated multi-path recovery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export Backup (JSON)</span>
            </button>

            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm active:scale-95">
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>{importing ? 'Importing...' : 'Import Backup'}</span>
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileUpload}
                disabled={importing}
              />
            </label>

            <button
              type="button"
              onClick={fetchBackups}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Refresh backup scan"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-3 rounded-2xl flex items-center gap-3 text-xs font-medium ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                : 'bg-sky-500/20 border border-sky-500/30 text-sky-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Detected Custom Data Alert Banner */}
        {candidateCustomBackups.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-200 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Sparkles className="w-4 h-4" />
              <span>Previous Reward Chart Customizations Detected on Disk!</span>
            </div>
            <p className="text-amber-200/90 leading-relaxed">
              We discovered a saved configuration on your Raspberry Pi with customized children and stars from before the update. Click <strong>&quot;Restore&quot;</strong> on that backup below to bring back your exact children profiles, star banks, custom tasks, and audit logs.
            </p>
          </div>
        )}

        {/* Current Active Storage Path */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-slate-400">Active Storage File:</span>
            <span className="font-mono text-emerald-300 break-all">{currentFilePath || 'Resolving...'}</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium shrink-0">
            Atomic writes + Dual-mirror active
          </span>
        </div>
      </div>

      {/* Discovered Backups List */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h4 className="text-sm font-bold text-white">Discovered Snapshots & Backups on Device</h4>
          </div>
          <span className="text-xs text-slate-400">
            {backups.length} location{backups.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span className="text-xs">Scanning Raspberry Pi directories for backup snapshots...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No external backup snapshots found. A new backup will be saved automatically when settings are updated.
          </div>
        ) : (
          <div className="space-y-3">
            {backups.map((b) => (
              <div
                key={b.path}
                className={`p-4 rounded-2xl border transition-all ${
                  b.isCurrent
                    ? 'bg-slate-800/80 border-emerald-500/40 shadow-sm'
                    : b.hasCustomData
                    ? 'bg-amber-950/20 border-amber-500/40 hover:bg-amber-950/30'
                    : 'bg-slate-800/40 border-white/5 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-white break-all">
                        {b.filename}
                      </span>
                      {b.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          CURRENT ACTIVE
                        </span>
                      )}
                      {b.hasCustomData && !b.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          CUSTOM REWARD DATA
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {new Date(b.mtime).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>{(b.sizeBytes / 1024).toFixed(1)} KB</span>
                      <span className="text-slate-500 truncate max-w-xs">{b.dir}</span>
                    </div>

                    {/* Children & Stars Preview */}
                    <div className="pt-1 flex items-center gap-2 flex-wrap text-xs">
                      <span className="text-slate-400 font-medium">Children:</span>
                      {b.summary.children.length > 0 ? (
                        b.summary.children.map((c) => (
                          <span
                            key={c.id || c.name}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 text-[11px]"
                          >
                            <span className="font-semibold">{c.name}</span>
                            <span className="text-amber-400 flex items-center gap-0.5">
                              {c.stars} <Star className="w-2.5 h-2.5 fill-amber-400" />
                            </span>
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">None</span>
                      )}

                      <span className="text-slate-500 mx-1">•</span>
                      <span className="text-slate-400">{b.summary.tasksCount} tasks</span>
                      <span className="text-slate-500 mx-1">•</span>
                      <span className="text-slate-400">{b.summary.shopCount} rewards</span>
                      {b.summary.auditLogsCount > 0 && (
                        <>
                          <span className="text-slate-500 mx-1">•</span>
                          <span className="text-indigo-400">{b.summary.auditLogsCount} audit entries</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!b.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRestore(b.path)}
                        disabled={restoringPath === b.path}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5 ${
                          b.hasCustomData
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {restoringPath === b.path ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Restoring...</span>
                          </>
                        ) : (
                          <>
                            <FileCheck className="w-3.5 h-3.5" />
                            <span>Restore This</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Technical Explanation / How updates work */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/5 space-y-3 text-xs text-slate-400 leading-relaxed">
        <h5 className="font-bold text-white flex items-center gap-2 text-sm">
          <Database className="w-4 h-4 text-sky-400" />
          Why did data reset during the previous update, and how is it fixed now?
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <span className="font-bold text-rose-300 block">Previous Behavior (Root Cause):</span>
            <p className="text-slate-300">
              When updating on Raspberry Pi via Git pull or update scripts, configurations were previously stored in <code className="text-rose-300 bg-rose-500/10 px-1 py-0.5 rounded font-mono">data/config.json</code> or moved to <code className="text-rose-300 bg-rose-500/10 px-1 py-0.5 rounded font-mono">~/.luminahome</code>. If the update script ran as <code className="text-rose-300 bg-rose-500/10 px-1 py-0.5 rounded font-mono">sudo</code> or if git stashed untracked files, the node server looked in the root home folder or failed to deep-merge the new reward schema fields, causing the chart to fall back to the default Leo &amp; Mia profile.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
            <span className="font-bold text-emerald-300 block">Permanent Protection (Now Active):</span>
            <p className="text-slate-300">
              The configuration engine now features <strong>crash-proof atomic writes</strong> (writing to a temp file before renaming), <strong>automatic dual-path synchronization</strong> (mirroring between <code className="text-emerald-300 bg-emerald-500/10 px-1 py-0.5 rounded font-mono">~/.luminahome/config.json</code> and <code className="text-emerald-300 bg-emerald-500/10 px-1 py-0.5 rounded font-mono">data/config.json</code>), <strong>deep lossless reward merging</strong>, and <strong>automatic multi-path scanning</strong> that searches for and preserves your children, stars, and custom tasks across every future update.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
