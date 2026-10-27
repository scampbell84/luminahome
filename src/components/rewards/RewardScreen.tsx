import React, { useState, useMemo } from 'react';
import { AppConfig, RewardConfig, ChildProfile, RewardTask, StarLogEntry, RewardShopItem, RewardRedemption, RewardAuditEvent } from '../../types/config';
import { DEFAULT_REWARD_CONFIG } from '../../constants/defaultConfig';
import { getAvatarEmoji } from '../../constants/avatarIcons';
import {
  Star,
  Gift,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  Award,
  Users,
  CheckCircle2,
  Trash2,
  Plus,
  BookOpen,
  Bed,
  Utensils,
  Heart,
  Gamepad2,
  Smile,
  Rocket,
  Crown,
  Columns2,
  Music,
  Apple,
  Droplets,
  Shirt,
  Brain,
  Sun,
  ThumbsUp,
  Activity,
  Clock,
} from 'lucide-react';
import { playStarChime, playRemovePop } from '../../utils/soundEffects';
import { StarRemovalModal } from './StarRemovalModal';
import { RewardShopModal } from './RewardShopModal';
import { AddTaskModal } from './AddTaskModal';

interface RewardScreenProps {
  config: AppConfig;
  onUpdateConfig?: (updatedConfig: AppConfig) => void;
}

export const RewardScreen: React.FC<RewardScreenProps> = ({ config, onUpdateConfig }) => {
  const rewards: RewardConfig = config.rewards || DEFAULT_REWARD_CONFIG;
  const childrenList: ChildProfile[] = rewards.children && rewards.children.length > 0
    ? rewards.children
    : DEFAULT_REWARD_CONFIG.children;
  const tasksList: RewardTask[] = rewards.tasks && rewards.tasks.length > 0
    ? rewards.tasks
    : DEFAULT_REWARD_CONFIG.tasks;
  const shopItems: RewardShopItem[] = rewards.shopItems && rewards.shopItems.length > 0
    ? rewards.shopItems
    : DEFAULT_REWARD_CONFIG.shopItems;
  const starLogs: StarLogEntry[] = rewards.starLogs || [];

  // Selected child filter: 'all' or child.id
  const [selectedChildId, setSelectedChildId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0); // 0 = current week
  const [currentMonthOffset, setCurrentMonthOffset] = useState<number>(0);

  // Modals state
  const [isShopOpen, setIsShopOpen] = useState<boolean>(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState<boolean>(false);
  const [removalTarget, setRemovalTarget] = useState<{
    childId: string;
    childName: string;
    taskId: string;
    taskTitle: string;
    dateStr: string;
    logId: string;
  } | null>(null);

  // Sparkle burst celebration feedback
  const [celebrationCell, setCelebrationCell] = useState<string | null>(null);

  // Child avatar icon helper - displays vibrant emoji with fallback
  const getChildAvatarIcon = (iconName?: string) => {
    return <span className="text-base leading-none select-none">{getAvatarEmoji(iconName)}</span>;
  };

  // Child avatar color classes
  const getChildColorClasses = (color?: string, isSelected?: boolean) => {
    switch (color) {
      case 'sky':
        return isSelected
          ? 'bg-sky-500 text-white border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)]'
          : 'bg-sky-500/15 border-sky-500/30 text-sky-300 hover:bg-sky-500/25';
      case 'rose':
        return isSelected
          ? 'bg-rose-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
          : 'bg-rose-500/15 border-rose-500/30 text-rose-300 hover:bg-rose-500/25';
      case 'emerald':
        return isSelected
          ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25';
      case 'purple':
        return isSelected
          ? 'bg-purple-500 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
          : 'bg-purple-500/15 border-purple-500/30 text-purple-300 hover:bg-purple-500/25';
      case 'orange':
        return isSelected
          ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.5)]'
          : 'bg-orange-500/15 border-orange-500/30 text-orange-300 hover:bg-orange-500/25';
      case 'amber':
      default:
        return isSelected
          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.6)] font-black'
          : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25';
    }
  };

  // Task icon helper
  const getTaskIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'bed':
        return <Bed className="w-4 h-4 text-sky-400" />;
      case 'book':
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'utensils':
        return <Utensils className="w-4 h-4 text-orange-400" />;
      case 'heart':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'gamepad':
        return <Gamepad2 className="w-4 h-4 text-indigo-400" />;
      case 'music':
        return <Music className="w-4 h-4 text-pink-400" />;
      case 'apple':
        return <Apple className="w-4 h-4 text-red-400" />;
      case 'droplets':
        return <Droplets className="w-4 h-4 text-cyan-400" />;
      case 'shirt':
        return <Shirt className="w-4 h-4 text-purple-400" />;
      case 'brain':
        return <Brain className="w-4 h-4 text-violet-400" />;
      case 'sun':
        return <Sun className="w-4 h-4 text-yellow-400" />;
      case 'trash':
        return <Trash2 className="w-4 h-4 text-slate-400" />;
      case 'thumbs-up':
      case 'thumbsup':
        return <ThumbsUp className="w-4 h-4 text-emerald-400" />;
      case 'activity':
        return <Activity className="w-4 h-4 text-lime-400" />;
      case 'clock':
        return <Clock className="w-4 h-4 text-teal-400" />;
      case 'star':
        return <Star className="w-4 h-4 text-amber-400" />;
      case 'sparkles':
      default:
        return <Sparkles className="w-4 h-4 text-amber-300" />;
    }
  };

  // Compute 7 days of the active week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday + currentWeekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const days: Array<{ dateStr: string; label: string; dayNum: number; isToday: boolean; dateObj: Date }> = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({
        dateStr,
        label: dayNames[i],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        dateObj: d,
      });
    }

    return days;
  }, [currentWeekOffset]);

  // Compute Month days for monthly overview
  const monthDays = useMemo(() => {
    const today = new Date();
    const targetMonthDate = new Date(today.getFullYear(), today.getMonth() + currentMonthOffset, 1);
    const year = targetMonthDate.getFullYear();
    const month = targetMonthDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const days: Array<{ dayNum: number; dateStr: string; isToday: boolean } | null> = [];

    // Blank padding before first day
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dayNum,
        dateStr,
        isToday: dateStr === todayStr,
      });
    }

    return {
      year,
      monthName: targetMonthDate.toLocaleDateString([], { month: 'long', year: 'numeric' }),
      days,
    };
  }, [currentMonthOffset]);

  // Star Log lookup map: `${childId}_${taskId}_${dateStr}` -> StarLogEntry
  const starLogMap = useMemo(() => {
    const map = new Map<string, StarLogEntry>();
    for (const entry of starLogs) {
      map.set(`${entry.childId}_${entry.taskId}_${entry.date}`, entry);
    }
    return map;
  }, [starLogs]);

  // Handle cell click (award star or prompt removal)
  const handleCellClick = (child: ChildProfile, task: RewardTask, dateStr: string) => {
    const cellKey = `${child.id}_${task.id}_${dateStr}`;
    const existingLog = starLogMap.get(cellKey);

    if (existingLog) {
      // Cell already has a star -> prompt confirmation to remove
      setRemovalTarget({
        childId: child.id,
        childName: child.name,
        taskId: task.id,
        taskTitle: task.title,
        dateStr,
        logId: existingLog.id,
      });
    } else {
      // Cell is blank -> award star!
      if (rewards.enableSoundEffects) {
        playStarChime();
      }

      setCelebrationCell(cellKey);
      setTimeout(() => setCelebrationCell(null), 1200);

      const approver = rewards.activeParent || 'Mom';
      const pts = task.points || 1;

      const newLog: StarLogEntry = {
        id: cellKey,
        childId: child.id,
        taskId: task.id,
        date: dateStr,
        starsAwarded: pts,
        timestamp: Date.now(),
        approvedBy: approver,
      };

      const auditEvent: RewardAuditEvent = {
        id: `audit_star_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'star_earned',
        timestamp: new Date().toISOString(),
        childId: child.id,
        childName: child.name,
        childAvatar: child.avatarIcon,
        actionTitle: task.title,
        starsDelta: pts,
        category: task.category,
        approvedBy: approver,
        notes: `Awarded ${pts} star${pts > 1 ? 's' : ''} for completing ${task.title}`,
      };

      const updatedChildren = childrenList.map((c) => {
        if (c.id === child.id) {
          return {
            ...c,
            currentStars: c.currentStars + pts,
            lifetimeStars: c.lifetimeStars + pts,
          };
        }
        return c;
      });

      const updatedConfig: AppConfig = {
        ...config,
        rewards: {
          ...rewards,
          children: updatedChildren,
          starLogs: [...starLogs, newLog],
          auditLogs: [auditEvent, ...(rewards.auditLogs || [])],
        },
      };

      if (onUpdateConfig) {
        onUpdateConfig(updatedConfig);
      }
    }
  };

  // Confirm star removal
  const handleConfirmRemoval = () => {
    if (!removalTarget) return;

    if (rewards.enableSoundEffects) {
      playRemovePop();
    }

    const { childId, taskId, dateStr } = removalTarget;
    const cellKey = `${childId}_${taskId}_${dateStr}`;
    const existingLog = starLogMap.get(cellKey);
    const starVal = existingLog?.starsAwarded || 1;
    const approver = rewards.activeParent || 'Mom';

    const removalAuditEvent: RewardAuditEvent = {
      id: `audit_rem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'star_removed',
      timestamp: new Date().toISOString(),
      childId: childId,
      childName: removalTarget.childName,
      actionTitle: removalTarget.taskTitle,
      starsDelta: -starVal,
      approvedBy: `${approver} (Confirmed Removal)`,
      notes: `Removed star for ${removalTarget.taskTitle} on ${dateStr}`,
    };

    const updatedChildren = childrenList.map((c) => {
      if (c.id === childId) {
        return {
          ...c,
          currentStars: Math.max(0, c.currentStars - starVal),
          lifetimeStars: Math.max(0, c.lifetimeStars - starVal),
        };
      }
      return c;
    });

    const updatedStarLogs = starLogs.filter((l) => !(l.childId === childId && l.taskId === taskId && l.date === dateStr));

    const updatedConfig: AppConfig = {
      ...config,
      rewards: {
        ...rewards,
        children: updatedChildren,
        starLogs: updatedStarLogs,
        auditLogs: [removalAuditEvent, ...(rewards.auditLogs || [])],
      },
    };

    if (onUpdateConfig) {
      onUpdateConfig(updatedConfig);
    }

    setRemovalTarget(null);
  };

  // Handle prize redemption in Reward Shop
  const handleRedeemReward = (childId: string, item: RewardShopItem, approvedBy?: string) => {
    const approver = approvedBy || rewards.activeParent || 'Mom';
    const targetChild = childrenList.find((c) => c.id === childId);

    const updatedChildren = childrenList.map((c) => {
      if (c.id === childId) {
        return {
          ...c,
          currentStars: Math.max(0, c.currentStars - item.cost),
        };
      }
      return c;
    });

    const newRedemption: RewardRedemption = {
      id: `redemption_${Date.now()}`,
      childId,
      rewardId: item.id,
      rewardTitle: item.title,
      starCost: item.cost,
      date: new Date().toISOString(),
      status: 'approved' as const,
      approvedBy: `${approver} (PIN Verified)`,
    };

    const redemptionAuditEvent: RewardAuditEvent = {
      id: `audit_red_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'redemption',
      timestamp: new Date().toISOString(),
      childId,
      childName: targetChild?.name || 'Child',
      childAvatar: targetChild?.avatarIcon,
      actionTitle: item.title,
      starsDelta: -item.cost,
      category: item.category,
      approvedBy: `${approver} (PIN Verified)`,
      notes: `Redeemed "${item.title}" for ${item.cost} stars`,
    };

    const updatedConfig: AppConfig = {
      ...config,
      rewards: {
        ...rewards,
        children: updatedChildren,
        redemptions: [newRedemption, ...(rewards.redemptions || [])],
        auditLogs: [redemptionAuditEvent, ...(rewards.auditLogs || [])],
      },
    };

    if (onUpdateConfig) {
      onUpdateConfig(updatedConfig);
    }
  };

  // Add new task handler from AddTaskModal
  const handleAddCreatedTask = (taskData: {
    title: string;
    category: 'routine' | 'chore' | 'learning' | 'behaviour' | 'health';
    icon: string;
    points: number;
  }) => {
    const newTask: RewardTask = {
      id: `task-${Date.now()}`,
      ...taskData,
    };
    const updatedConfig: AppConfig = {
      ...config,
      rewards: {
        ...rewards,
        tasks: [...tasksList, newTask],
      },
    };
    if (onUpdateConfig) {
      onUpdateConfig(updatedConfig);
    }
  };

  // Target child for individual view or shop
  const activeSingleChild = childrenList.find((c) => c.id === selectedChildId);

  // Week range label e.g. "20 Oct - 26 Oct 2026"
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length < 7) return '';
    const first = weekDays[0].dateObj;
    const last = weekDays[6].dateObj;
    const firstMonth = first.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const lastMonth = last.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return `${firstMonth} – ${lastMonth}`;
  }, [weekDays]);

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 text-white font-sans select-none overflow-y-auto pb-24 pt-4 px-4 md:px-8">
      {/* 1. Header Toolbar */}
      <header className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
              <Star className="w-6 h-6 fill-slate-950 text-slate-950" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                Family Reward Chart
              </h1>
              <p className="text-xs text-slate-400">
                Track positive daily habits, collect stars, and redeem treats in the Reward Shop!
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Add Habit & Reward Shop */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
          {/* Quick Bank Balance summary */}
          {activeSingleChild && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 font-mono text-xs">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-amber-300">{activeSingleChild.currentStars}</span>
              <span className="text-slate-300">Stars in Bank</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsAddTaskOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs md:text-sm active:scale-95 transition-all cursor-pointer shadow-md"
            title="Add a suggested or custom habit task"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Habit</span>
          </button>

          <button
            type="button"
            onClick={() => setIsShopOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs md:text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Gift className="w-4 h-4" />
            <span>Reward Shop</span>
          </button>
        </div>
      </header>

      {/* 2. Controls Bar: Child Switcher & Date Range Navigator */}
      <div className="max-w-[1920px] mx-auto py-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Child Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <button
            type="button"
            onClick={() => setSelectedChildId('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
              selectedChildId === 'all'
                ? 'bg-white text-slate-950 border-white shadow-lg'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Display children side-by-side in a 50/50 split"
          >
            <Columns2 className="w-4 h-4 text-amber-500" />
            <span>50/50 Split (All)</span>
          </button>

          {childrenList.map((c) => {
            const isSelected = selectedChildId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedChildId(c.id)}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${getChildColorClasses(
                  c.avatarColor,
                  isSelected
                )}`}
              >
                {getChildAvatarIcon(c.avatarIcon)}
                <span>{c.name}</span>
                <span className="font-mono text-[11px] opacity-90 border-l border-current/20 pl-1.5 flex items-center gap-0.5">
                  {c.currentStars}
                  <Star className="w-3 h-3 fill-current" />
                </span>
              </button>
            );
          })}
        </div>

        {/* View Switcher & Date Stepper */}
        <div className="flex items-center gap-2.5 justify-between lg:justify-end shrink-0">
          {/* Week vs Month segmented toggle */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'week' ? 'bg-amber-400 text-slate-950 shadow-md font-black' : 'text-slate-300 hover:text-white'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'month' ? 'bg-amber-400 text-slate-950 shadow-md font-black' : 'text-slate-300 hover:text-white'
              }`}
            >
              Monthly
            </button>
          </div>

          {/* Stepper */}
          {viewMode === 'week' ? (
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentWeekOffset(0)}
                className="px-2 py-1 text-[11px] font-bold text-slate-200 hover:text-white transition-colors"
                title="Jump to Current Week"
              >
                {currentWeekOffset === 0 ? 'This Week' : weekRangeLabel}
              </button>
              <button
                type="button"
                onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setCurrentMonthOffset((prev) => prev - 1)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonthOffset(0)}
                className="px-2 py-1 text-[11px] font-bold text-slate-200 hover:text-white transition-colors"
              >
                {monthDays.monthName}
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonthOffset((prev) => prev + 1)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Chart View Area (50/50 Split on Wide/Desktop Screens) */}
      <main className="max-w-[1920px] mx-auto mt-2 w-full">
        {viewMode === 'week' ? (
          /* WEEKLY GRID VIEW (50/50 Split for Left & Right Children) */
          <div className={selectedChildId === 'all' ? 'grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start' : 'max-w-5xl mx-auto'}>
            {childrenList
              .filter((c) => selectedChildId === 'all' || selectedChildId === c.id)
              .map((child) => {
                // Total stars earned this week for this child
                const childWeekStars = starLogs
                  .filter((l) => l.childId === child.id && weekDays.some((w) => w.dateStr === l.date))
                  .reduce((sum, l) => sum + (l.starsAwarded || 1), 0);

                return (
                  <div
                    key={child.id}
                    className="p-3.5 sm:p-4 md:p-5 rounded-3xl bg-slate-900/90 border border-white/15 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col justify-between"
                  >
                    {/* Child Card Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 gap-2">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border font-bold text-sm sm:text-base shadow-md shrink-0 ${getChildColorClasses(
                            child.avatarColor,
                            true
                          )}`}
                        >
                          {getChildAvatarIcon(child.avatarIcon)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">{child.name}</h3>
                            <span className="text-[10px] sm:text-[11px] font-mono text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shrink-0">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{child.currentStars} in Bank</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            Earned <strong className="text-amber-300 font-mono">+{childWeekStars} stars</strong> this week (Total: {child.lifetimeStars})
                          </p>
                        </div>
                      </div>

                      {/* Quick Card Actions: Week Progress & Direct Shop Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedChildId(child.id);
                            setIsShopOpen(true);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                          title={`Open Reward Shop for ${child.name}`}
                        >
                          <Gift className="w-3.5 h-3.5" />
                          <span>Shop</span>
                        </button>
                      </div>
                    </div>

                    {/* Chart Table */}
                    <div className="overflow-x-auto scrollbar-thin">
                      <table className="w-full text-left border-collapse min-w-[480px]">
                        <thead>
                          <tr className="border-b border-white/10 text-xs text-slate-400 font-mono">
                            <th className="py-2 pl-2 pr-2 font-bold text-slate-300 w-[120px] sm:w-[140px]">Task / Habit</th>
                            {weekDays.map((d) => (
                              <th
                                key={d.dateStr}
                                className={`py-2 px-1 text-center transition-colors ${
                                  d.isToday
                                    ? 'text-amber-300 font-bold bg-amber-400/10 rounded-t-xl'
                                    : 'text-slate-400'
                                }`}
                              >
                                <div className="text-[10px] sm:text-[11px] uppercase tracking-wider">{d.label}</div>
                                <div className="text-xs sm:text-sm font-black text-white">{d.dayNum}</div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {tasksList.map((task) => (
                            <tr key={task.id} className="hover:bg-white/[0.02] transition-colors">
                              {/* Task Name & Icon */}
                              <td className="py-2.5 pl-2 pr-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                    {getTaskIcon(task.icon)}
                                  </div>
                                  <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-semibold text-white tracking-wide truncate max-w-[95px] sm:max-w-[120px]" title={task.title}>
                                      {task.title}
                                    </span>
                                    {(task.points && task.points > 1) ? (
                                      <span className="text-[10px] font-mono font-black text-amber-300 bg-amber-400/15 border border-amber-400/40 px-1 py-0.2 rounded shrink-0" title={`Awards +${task.points} stars`}>
                                        +{task.points}⭐
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </td>

                              {/* Day Interactive Cells */}
                              {weekDays.map((d) => {
                                const cellKey = `${child.id}_${task.id}_${d.dateStr}`;
                                const isEarned = starLogMap.has(cellKey);
                                const isBursting = celebrationCell === cellKey;
                                const pts = task.points || 1;

                                return (
                                  <td
                                    key={d.dateStr}
                                    className={`py-1.5 px-0.5 sm:px-1 text-center align-middle ${
                                      d.isToday ? 'bg-amber-400/5' : ''
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleCellClick(child, task, d.dateStr)}
                                      className={`relative w-9 h-9 sm:w-10 sm:h-10 mx-auto rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                                        isEarned
                                          ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-md shadow-amber-500/30 scale-100 hover:scale-105 active:scale-95'
                                          : 'bg-white/5 hover:bg-white/10 active:bg-amber-400/20 border border-dashed border-white/20 hover:border-amber-400/50 text-white/25 hover:text-amber-300'
                                      } ${isBursting ? 'animate-bounce ring-4 ring-amber-300 scale-110' : ''}`}
                                      title={isEarned ? `${pts} star${pts > 1 ? 's' : ''} awarded! Tap to remove` : `Tap to award +${pts} star${pts > 1 ? 's' : ''}`}
                                    >
                                      {isEarned ? (
                                        <div className="relative flex items-center justify-center">
                                          <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-950 text-slate-950 drop-shadow-sm" />
                                          {pts > 1 && (
                                            <span className="absolute -bottom-1 -right-1 font-mono font-black text-[9px] bg-slate-950 text-amber-300 px-0.5 rounded border border-amber-400/60 leading-none">
                                              +{pts}
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="relative flex items-center justify-center">
                                          <Star className="w-4 h-4 stroke-1 text-white/40" />
                                          {pts > 1 && (
                                            <span className="absolute -bottom-1 -right-1 font-mono font-bold text-[8px] text-amber-400/80">
                                              +{pts}
                                            </span>
                                          )}
                                        </div>
                                      )}

                                      {/* Particle burst animation indicator */}
                                      {isBursting && (
                                        <span className="absolute -top-1.5 -right-1.5 text-xs animate-ping">
                                          ✨
                                        </span>
                                      )}
                                    </button>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          /* MONTHLY CALENDAR VIEW (50/50 Split for Left & Right Children) */
          <div className={selectedChildId === 'all' ? 'grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-start' : 'max-w-5xl mx-auto'}>
            {childrenList
              .filter((c) => selectedChildId === 'all' || selectedChildId === c.id)
              .map((child) => {
                // Compute stars earned per day in this month
                const monthStarsByDate = new Map<string, number>();
                for (const log of starLogs) {
                  if (log.childId === child.id) {
                    monthStarsByDate.set(log.date, (monthStarsByDate.get(log.date) || 0) + (log.starsAwarded || 1));
                  }
                }

                const totalMonthStars = Array.from(monthStarsByDate.values()).reduce((a, b) => a + b, 0);

                return (
                  <div
                    key={child.id}
                    className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-white/15 backdrop-blur-xl shadow-2xl flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/10 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border font-bold text-sm sm:text-base shadow-md shrink-0 ${getChildColorClasses(
                            child.avatarColor,
                            true
                          )}`}
                        >
                          {getChildAvatarIcon(child.avatarIcon)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base sm:text-lg font-black text-white truncate">{child.name}&apos;s Progress</h3>
                            <span className="text-[11px] font-mono text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2.5 py-0.5 rounded-full font-bold">
                              {totalMonthStars} Month Stars
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {monthDays.monthName} • Daily stars earned across all tasks
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedChildId(child.id);
                          setIsShopOpen(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                        title={`Open Reward Shop for ${child.name}`}
                      >
                        <Gift className="w-3.5 h-3.5" />
                        <span>Shop</span>
                      </button>
                    </div>

                    {/* Month Grid */}
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2 text-center font-mono">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                        <div key={d} className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider py-1">
                          {d}
                        </div>
                      ))}

                      {monthDays.days.map((day, idx) => {
                        if (!day) {
                          return <div key={`empty-${idx}`} className="h-12 sm:h-14 rounded-xl bg-transparent" />;
                        }

                        const dayStars = monthStarsByDate.get(day.dateStr) || 0;

                        return (
                          <div
                            key={day.dateStr}
                            className={`h-12 sm:h-14 rounded-xl p-1.5 border flex flex-col justify-between transition-all ${
                              day.isToday
                                ? 'bg-amber-400/10 border-amber-400/60 ring-2 ring-amber-400/30'
                                : dayStars > 0
                                ? 'bg-slate-800/80 border-amber-400/30'
                                : 'bg-white/[0.03] border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className={day.isToday ? 'font-black text-amber-300' : 'text-slate-400'}>
                                {day.dayNum}
                              </span>
                              {day.isToday && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                              )}
                            </div>

                            {dayStars > 0 ? (
                              <div className="flex items-center justify-center gap-0.5 font-bold text-amber-300 text-[11px]">
                                <span>+{dayStars}</span>
                                <Star className="w-3 h-3 fill-amber-400" />
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-600">-</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </main>

      {/* 4. Reward Shop Modal */}
      {isShopOpen && (
        <RewardShopModal
          childrenList={childrenList}
          shopItems={shopItems}
          selectedChildId={selectedChildId === 'all' ? childrenList[0]?.id : selectedChildId}
          onSelectChild={(id) => setSelectedChildId(id)}
          parentPin={rewards.parentPin || '1234'}
          requirePin={rewards.requirePinForRedemption !== false}
          parentNames={rewards.parentNames || ['Mom', 'Dad']}
          activeParent={rewards.activeParent || 'Mom'}
          redemptions={rewards.redemptions || []}
          onRedeem={handleRedeemReward}
          onClose={() => setIsShopOpen(false)}
        />
      )}

      {/* 5. Star Removal Confirmation Modal */}
      {removalTarget && (
        <StarRemovalModal
          childName={removalTarget.childName}
          taskTitle={removalTarget.taskTitle}
          dateStr={removalTarget.dateStr}
          onConfirm={handleConfirmRemoval}
          onCancel={() => setRemovalTarget(null)}
        />
      )}

      {/* 6. Add Task Modal (Suggested & Custom with Categories & Star Values) */}
      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        existingTasks={tasksList}
        onAddTask={handleAddCreatedTask}
      />
    </div>
  );
};
