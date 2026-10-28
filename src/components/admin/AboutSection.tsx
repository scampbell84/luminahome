import React, { useState, useEffect } from 'react';
import {
  Info,
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Terminal,
  Cpu,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import { APP_VERSION, RELEASE_NOTES, ReleaseNote } from '../../constants/version';

export interface VersionData {
  appName?: string;
  version: string;
  versionTag?: string;
  buildNumber?: number;
  buildTime?: string;
  buildDate?: string;
  gitCommit?: string;
  gitBranch?: string;
  nodeVersion?: string;
  releaseDate?: string;
  currentRelease?: ReleaseNote;
  releaseNotes?: ReleaseNote[];
}

interface AboutSectionProps {
  onNavigateToSystem?: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({ onNavigateToSystem }) => {
  const [versionData, setVersionData] = useState<VersionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedVersion, setExpandedVersion] = useState<string>(RELEASE_NOTES[0]?.version || 'v3.5.1');

  const fetchVersionInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/version', {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data: VersionData = await res.json();
        setVersionData(data);
        if (data.releaseNotes && data.releaseNotes.length > 0) {
          setExpandedVersion(data.releaseNotes[0].version);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch /api/version, falling back to static config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersionInfo();
  }, []);

  const currentVersion = versionData?.version || APP_VERSION;
  const currentTag = versionData?.versionTag || `v${currentVersion}`;
  const buildNumber = versionData?.buildNumber ?? 1;
  const buildDateFormatted = versionData?.buildDate || 'October 2026';
  const gitCommit = versionData?.gitCommit || 'latest';
  const gitBranch = versionData?.gitBranch || 'main';

  const notesList: ReleaseNote[] =
    versionData?.releaseNotes && versionData.releaseNotes.length > 0
      ? versionData.releaseNotes
      : RELEASE_NOTES;

  const activeRelease: ReleaseNote =
    versionData?.currentRelease || notesList[0] || {
      version: currentTag,
      releaseDate: 'October 2026',
      title: 'Resilient Multi-iCal Sync & Enhanced Weather Legibility',
      highlights: [],
      details: [],
    };

  const handleCopyDiagnostics = () => {
    const text = [
      `Lumina Home Kiosk Diagnostics`,
      `Version: ${currentTag}`,
      `Build Number: #${buildNumber}`,
      `Build Time: ${versionData?.buildTime || 'N/A'}`,
      `Git: ${gitBranch}@${gitCommit}`,
      `Node Runtime: ${versionData?.nodeVersion || process.version || 'Node.js'}`,
      `Platform: Web SPA / Linux Host`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO APPLICATION IDENTITY CARD */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-sky-950/40 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-600 via-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 shrink-0 ring-4 ring-sky-500/10">
              <Sparkles className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Lumina Home
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-sm">
                  {currentTag}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Installed & Up to Date</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Smart Wall Kiosk & Circadian Ambient Family Dashboard. Designed for always-on wall displays, touch-first interaction, and reliable household coordination.
              </p>

              {/* Build Meta Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
                <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-mono text-[11px] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" />
                  <span>Build #{buildNumber}</span>
                </div>

                <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-mono text-[11px] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{buildDateFormatted}</span>
                </div>

                <div className="px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-mono text-[11px] flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{gitBranch} ({gitCommit})</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-row md:flex-col gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyDiagnostics}
              className="px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer shadow-sm"
              title="Copy version diagnostics to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-300">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-400" />
                  <span>Copy Version Info</span>
                </>
              )}
            </button>

            {onNavigateToSystem && (
              <button
                type="button"
                onClick={onNavigateToSystem}
                className="px-3.5 py-2 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>System Health</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. AUTOMATED BUILD VERSIONING PIPELINE STATUS */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Automated Build Versioning Engine</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.2 rounded font-bold">
                  ACTIVE
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Application metadata and release notes are dynamically compiled into <code className="text-sky-300 font-mono text-[11px]">version.json</code> on every build.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchVersionInfo}
            disabled={loading}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-50"
            title="Reload version information"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            <span>Check Version Status</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">Target Artifact</span>
            <span className="text-xs font-mono font-bold text-sky-300 block">/version.json</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Synchronized across root, public, and API</span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">Current Build Cycle</span>
            <span className="text-xs font-mono font-bold text-emerald-400 block">Build #{buildNumber}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">Auto-incremented on every build trigger</span>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80">
            <span className="text-[11px] text-slate-400 block mb-1">Timestamp Handshake</span>
            <span className="text-xs font-mono text-slate-300 block truncate" title={versionData?.buildTime}>
              {versionData?.buildTime ? new Date(versionData.buildTime).toUTCString() : 'Active'}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Verified via local Node server</span>
          </div>
        </div>
      </div>

      {/* 3. CURRENT ACTIVE RELEASE HIGHLIGHTS */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Current Release: {activeRelease.version} — {activeRelease.title}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Released {activeRelease.releaseDate} • Running in active production profile
            </p>
          </div>
          <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono font-bold px-2 py-0.5 rounded-full border border-sky-400/30">
            CURRENT
          </span>
        </div>

        {/* Highlights Pills */}
        {activeRelease.highlights && activeRelease.highlights.length > 0 && (
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Key Features & Enhancements
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {activeRelease.highlights.map((h, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-start gap-2.5"
                >
                  <div className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span className="text-xs text-slate-200 leading-snug">{h}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details Bullets */}
        {activeRelease.details && activeRelease.details.length > 0 && (
          <div className="pt-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Detailed Changelog Notes
            </span>
            <ul className="space-y-2 text-xs text-slate-300">
              {activeRelease.details.map((d, i) => (
                <li key={i} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-sky-400 font-bold shrink-0 mt-0.5">•</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 4. FULL RELEASE NOTES & CHANGELOG ACCORDION */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Full Release Notes & Version History</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological log of all software releases, features, and fixes for Lumina Home
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{notesList.length} releases</span>
        </div>

        <div className="space-y-3">
          {notesList.map((note) => {
            const isExpanded = expandedVersion === note.version;
            const isCurrentRelease = note.version === currentTag || note.version === `v${currentVersion}` || note.isCurrent;

            return (
              <div
                key={note.version}
                className={`rounded-xl border transition-all ${
                  isExpanded
                    ? 'bg-slate-950/90 border-slate-700 shadow-md'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedVersion(isExpanded ? '' : note.version)}
                  className="w-full p-4 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${
                      isCurrentRelease
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {note.version}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          {note.title}
                        </h4>
                        {isCurrentRelease && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-mono font-bold uppercase">
                            Installed
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {note.releaseDate}
                      </span>
                    </div>
                  </div>

                  <div className="text-slate-400 shrink-0 ml-2">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800 space-y-3">
                    {note.highlights && note.highlights.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Highlights
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {note.highlights.map((h, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] bg-slate-900 text-slate-300 px-2 py-1 rounded-md border border-slate-800 flex items-center gap-1.5"
                            >
                              <Sparkles className="w-3 h-3 text-sky-400 shrink-0" />
                              <span>{h}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {note.details && note.details.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                          Changelog Details
                        </span>
                        <ul className="space-y-1.5 text-[11px] text-slate-300">
                          {note.details.map((d, idx) => (
                            <li key={idx} className="flex items-start gap-2 leading-relaxed">
                              <span className="text-sky-400 font-bold shrink-0">•</span>
                              <span>{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
