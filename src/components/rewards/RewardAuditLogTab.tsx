import React, { useState, useMemo } from 'react';
import { RewardConfig, RewardAuditEvent, ChildProfile } from '../../types/config';
import { getAvatarEmoji } from '../../constants/avatarIcons';
import {
  Shield,
  Lock,
  Unlock,
  Search,
  Filter,
  History,
  Trash2,
  Star,
  Gift,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { playErrorBuzzer } from '../../utils/soundEffects';

interface RewardAuditLogTabProps {
  rewards: RewardConfig;
  onUpdateRewards: (partial: Partial<RewardConfig>) => void;
  isUnlocked: boolean;
  onUnlock: () => void;
  onLock: () => void;
}

export const RewardAuditLogTab: React.FC<RewardAuditLogTabProps> = ({
  rewards,
  onUpdateRewards,
  isUnlocked,
  onUnlock,
  onLock,
}) => {
  // Pin entry state for locked view
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedParentFilter, setSelectedParentFilter] = useState<string>('all');

  const auditEvents: RewardAuditEvent[] = rewards.auditLogs || [];
  const parentNames = rewards.parentNames || ['Mom', 'Dad'];
  const activeParent = rewards.activeParent || parentNames[0] || 'Mom';

  // Verify PIN to unlock
  const handleVerifyPin = () => {
    const targetPin = rewards.parentPin || '1234';
    if (enteredPin === targetPin) {
      setPinError(false);
      setEnteredPin('');
      onUnlock();
    } else {
      playErrorBuzzer();
      setPinError(true);
      setTimeout(() => {
        setPinError(false);
        setEnteredPin('');
      }, 700);
    }
  };

  // Metrics
  const stats = useMemo(() => {
    let starsEarned = 0;
    let starsRedeemed = 0;
    for (const evt of auditEvents) {
      if (evt.starsDelta > 0) {
        starsEarned += evt.starsDelta;
      } else if (evt.starsDelta < 0) {
        starsRedeemed += Math.abs(evt.starsDelta);
      }
    }
    return {
      totalEvents: auditEvents.length,
      starsEarned,
      starsRedeemed,
    };
  }, [auditEvents]);

  // Filtered event list
  const filteredEvents = useMemo(() => {
    return auditEvents.filter((evt) => {
      // Child filter
      if (selectedChildFilter !== 'all' && evt.childId !== selectedChildFilter) {
        return false;
      }
      // Type filter
      if (selectedTypeFilter !== 'all' && evt.type !== selectedTypeFilter) {
        return false;
      }
      // Parent filter
      if (selectedParentFilter !== 'all') {
        const approver = (evt.approvedBy || '').toLowerCase();
        if (!approver.includes(selectedParentFilter.toLowerCase())) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesAction = (evt.actionTitle || '').toLowerCase().includes(query);
        const matchesChild = (evt.childName || '').toLowerCase().includes(query);
        const matchesApprover = (evt.approvedBy || '').toLowerCase().includes(query);
        const matchesCategory = (evt.category || '').toLowerCase().includes(query);
        return matchesAction || matchesChild || matchesApprover || matchesCategory;
      }
      return true;
    });
  }, [auditEvents, selectedChildFilter, selectedTypeFilter, selectedParentFilter, searchQuery]);

  // Format timestamp helper
  const formatEventTimestamp = (isoStr: string): { datePart: string; timePart: string; full: string } => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return { datePart: isoStr, timePart: '', full: isoStr };

      const datePart = d.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const timePart = d.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return { datePart, timePart, full: `${datePart} at ${timePart}` };
    } catch {
      return { datePart: isoStr, timePart: '', full: isoStr };
    }
  };

  // Clear audit log handler
  const handleClearLog = () => {
    if (window.confirm('Are you sure you want to clear the entire Audit Log? This action cannot be undone.')) {
      onUpdateRewards({ auditLogs: [] });
    }
  };

  // Locked View (Hidden behind Parent PIN)
  if (!isUnlocked) {
    return (
      <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-5 animate-fadeIn">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-xl shadow-amber-500/10">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full">
            Protected Parent Feature
          </span>
          <h3 className="text-2xl font-black text-white tracking-tight mt-2.5">
            Hidden Parent Audit Log
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed max-w-sm">
            This private audit trail logs all star-earning tasks, reward redemptions, and approvals. Enter your 4-digit Parent PIN to view history.
          </p>
        </div>

        {/* PIN input box */}
        <div className="w-full max-w-xs space-y-3">
          <div className="relative">
            <input
              type="password"
              maxLength={4}
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVerifyPin();
              }}
              placeholder="••••"
              className={`w-full px-4 py-3 rounded-2xl bg-black/60 border text-center font-mono font-black text-2xl tracking-[0.5em] text-amber-300 focus:outline-none transition-all ${
                pinError
                  ? 'border-rose-500 bg-rose-500/10 text-rose-300 animate-shake ring-2 ring-rose-500/50'
                  : 'border-white/20 focus:border-amber-400'
              }`}
            />
          </div>

          <button
            type="button"
            onClick={handleVerifyPin}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            <span>Unlock Audit Log</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500 font-mono">
          Default Parent PIN: {rewards.parentPin || '1234'} (Change in Security Settings)
        </p>
      </div>
    );
  }

  // Unlocked View
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header Toolbar */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-black text-white tracking-tight">Parent Audit Log</h3>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Unlocked</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Chronological log of positive habit completions, shop redemptions, and approving parents
            </p>
          </div>
        </div>

        {/* Header Actions: Active Parent Switcher & Lock Button */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
          {/* Active Approving Parent pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Default Approver:</span>
            <select
              value={activeParent}
              onChange={(e) => onUpdateRewards({ activeParent: e.target.value })}
              className="bg-black/40 text-amber-300 font-bold border border-white/15 rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer"
            >
              {parentNames.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onLock}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-300 hover:text-white font-bold text-xs transition-all active:scale-95 cursor-pointer"
            title="Lock and hide audit log"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Lock & Hide</span>
          </button>
        </div>
      </div>

      {/* 2. Metric Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Stars Awarded</span>
            <span className="text-2xl font-black font-mono text-amber-300 mt-1 block">+{stats.starsEarned}⭐</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/25 flex items-center justify-center text-amber-400">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Redeemed</span>
            <span className="text-2xl font-black font-mono text-rose-400 mt-1 block">-{stats.starsRedeemed}⭐</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
            <Gift className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Logged Events</span>
            <span className="text-2xl font-black font-mono text-indigo-300 mt-1 block">{stats.totalEvents}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
            <History className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Approving Parents</span>
            <span className="text-sm font-black text-white mt-1 block truncate">
              {parentNames.join(' & ')}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Search and Filters Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-white/10 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Live Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by habit, reward, child or parent..."
              className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 font-medium"
            />
          </div>

          {/* Clear Log Button */}
          {auditEvents.length > 0 && (
            <button
              type="button"
              onClick={handleClearLog}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 font-bold text-xs transition-colors cursor-pointer shrink-0"
              title="Clear all audit log history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {/* Filter Chips Bar */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-white/5">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-indigo-400" />
            <span>Filter:</span>
          </span>

          {/* Child filter */}
          <select
            value={selectedChildFilter}
            onChange={(e) => setSelectedChildFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/15 text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">All Children</option>
            {rewards.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {getAvatarEmoji(c.avatarIcon)}
              </option>
            ))}
          </select>

          {/* Event Type filter */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/15 text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">All Event Types</option>
            <option value="star_earned">Stars Earned (+⭐)</option>
            <option value="redemption">Reward Redemptions (-🎁)</option>
            <option value="star_removed">Star Removals (-⭐)</option>
          </select>

          {/* Approving Parent filter */}
          <select
            value={selectedParentFilter}
            onChange={(e) => setSelectedParentFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/15 text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">All Approving Parents</option>
            {parentNames.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {(selectedChildFilter !== 'all' || selectedTypeFilter !== 'all' || selectedParentFilter !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedChildFilter('all');
                setSelectedTypeFilter('all');
                setSelectedParentFilter('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Event Feed List */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-white/10 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Showing {filteredEvents.length} of {auditEvents.length} Recorded Events
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2">
            <History className="w-8 h-8 stroke-1 text-slate-600" />
            <p className="font-semibold text-slate-400">No audit events match your selected filters</p>
            <p className="text-[11px] text-slate-500">
              When stars are awarded on the chart or rewards are redeemed in the shop, they will automatically appear here with exact timestamps.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredEvents.map((evt) => {
              const { full: formattedTime } = formatEventTimestamp(evt.timestamp);
              const isPositive = evt.starsDelta > 0;
              const isRedemption = evt.type === 'redemption';

              return (
                <div
                  key={evt.id}
                  className="py-3 px-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.02] rounded-xl transition-colors"
                >
                  {/* Left: Child Avatar + Action Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Child Avatar Emoji Badge */}
                    <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-lg shrink-0 shadow-md">
                      {getAvatarEmoji(evt.childAvatar)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{evt.childName}</span>

                        {/* Action Badge */}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isRedemption
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                              : isPositive
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                              : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                          }`}
                        >
                          {isRedemption ? 'Redeemed Prize' : isPositive ? 'Habit Completed' : 'Star Removed'}
                        </span>

                        {evt.category && (
                          <span className="text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded capitalize">
                            {evt.category}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-semibold text-slate-200 mt-0.5 truncate">
                        {evt.actionTitle}
                      </div>

                      {evt.notes && (
                        <div className="text-[11px] text-slate-400 italic truncate max-w-md">
                          &quot;{evt.notes}&quot;
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Star Delta + Timestamp + Approving Parent */}
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-0 border-white/5">
                    {/* Stars Delta Indicator */}
                    <div
                      className={`font-mono font-black text-sm flex items-center gap-1 ${
                        isPositive ? 'text-amber-300' : 'text-rose-400'
                      }`}
                    >
                      <span>
                        {isPositive ? `+${evt.starsDelta}` : evt.starsDelta}
                      </span>
                      <Star className={`w-3.5 h-3.5 ${isPositive ? 'fill-amber-400 text-amber-400' : 'fill-rose-400 text-rose-400'}`} />
                    </div>

                    {/* Approver Badge */}
                    <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 px-2 py-0.5 rounded-full">
                      <Shield className="w-3 h-3 text-indigo-400" />
                      <span>Approved by: {evt.approvedBy || 'Parent'}</span>
                    </div>

                    {/* Timestamp */}
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formattedTime}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
