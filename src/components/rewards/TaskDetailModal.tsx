import React from 'react';
import { RewardTask, ChildProfile, StarLogEntry } from '../../types/config';
import { getAvatarEmoji } from '../../constants/avatarIcons';
import {
  X,
  Star,
  CheckCircle2,
  Calendar,
  Clock,
  Sparkles,
  Bed,
  BookOpen,
  Utensils,
  Heart,
  Gamepad2,
  Music,
  Apple,
  Droplets,
  Shirt,
  Brain,
  Sun,
  Trash2,
  ThumbsUp,
  Activity,
  Layers,
} from 'lucide-react';

interface TaskDetailModalProps {
  task: RewardTask | null;
  isOpen: boolean;
  onClose: () => void;
  childrenList: ChildProfile[];
  starLogs: StarLogEntry[];
  weekDays: Array<{ dateStr: string; label: string; dayNum: number; isToday: boolean }>;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  childrenList,
  starLogs,
  weekDays,
}) => {
  if (!isOpen || !task) return null;

  const isWeekly = task.frequency === 'weekly';
  const weekStartStr = weekDays.length > 0 ? weekDays[0].dateStr : '';

  // Get task icon
  const getTaskIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'bed':
        return <Bed className="w-6 h-6 text-sky-400" />;
      case 'book':
        return <BookOpen className="w-6 h-6 text-emerald-400" />;
      case 'utensils':
        return <Utensils className="w-6 h-6 text-orange-400" />;
      case 'heart':
        return <Heart className="w-6 h-6 text-rose-400" />;
      case 'gamepad':
        return <Gamepad2 className="w-6 h-6 text-indigo-400" />;
      case 'music':
        return <Music className="w-6 h-6 text-pink-400" />;
      case 'apple':
        return <Apple className="w-6 h-6 text-red-400" />;
      case 'droplets':
        return <Droplets className="w-6 h-6 text-cyan-400" />;
      case 'shirt':
        return <Shirt className="w-6 h-6 text-purple-400" />;
      case 'brain':
        return <Brain className="w-6 h-6 text-violet-400" />;
      case 'sun':
        return <Sun className="w-6 h-6 text-yellow-400" />;
      case 'trash':
        return <Trash2 className="w-6 h-6 text-slate-400" />;
      case 'thumbs-up':
      case 'thumbsup':
        return <ThumbsUp className="w-6 h-6 text-emerald-400" />;
      case 'activity':
        return <Activity className="w-6 h-6 text-lime-400" />;
      case 'clock':
        return <Clock className="w-6 h-6 text-teal-400" />;
      case 'star':
        return <Star className="w-6 h-6 text-amber-400" />;
      case 'sparkles':
      default:
        return <Sparkles className="w-6 h-6 text-amber-300" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'routine':
        return { label: 'Daily Routine', color: 'bg-sky-500/15 border-sky-400/30 text-sky-300' };
      case 'chore':
        return { label: 'Household Chore', color: 'bg-amber-500/15 border-amber-400/30 text-amber-300' };
      case 'learning':
        return { label: 'Learning & School', color: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300' };
      case 'behaviour':
        return { label: 'Manners & Kindness', color: 'bg-rose-500/15 border-rose-400/30 text-rose-300' };
      case 'health':
        return { label: 'Health & Activity', color: 'bg-indigo-500/15 border-indigo-400/30 text-indigo-300' };
      default:
        return { label: 'Positive Habit', color: 'bg-white/10 border-white/20 text-slate-300' };
    }
  };

  const catInfo = getCategoryLabel(task.category);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-white/20 rounded-3xl p-5 sm:p-6 shadow-2xl text-white space-y-5 animate-scaleUp overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow-lg shrink-0">
              {getTaskIcon(task.icon)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${catInfo.color}`}>
                  {catInfo.label}
                </span>

                {isWeekly ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-purple-500/15 border-purple-400/30 text-purple-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Weekly Task</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-cyan-500/15 border-cyan-400/30 text-cyan-300 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Daily Habit</span>
                  </span>
                )}
              </div>

              {/* Full Untruncated Title */}
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
                {task.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task Rewards & Frequency Overview Card */}
        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Star Value
            </span>
            <div className="flex items-center gap-1.5 font-mono font-black text-amber-300 text-lg mt-0.5">
              <span>+{task.points || 1}</span>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-xs text-slate-300 font-sans font-semibold">per completion</span>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Schedule
            </span>
            <span className="text-xs font-bold text-white mt-0.5 block">
              {isWeekly ? 'Weekly (Anytime)' : 'Daily (Mon – Sun)'}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Assigned To
            </span>
            <span className="text-xs font-bold text-indigo-300 mt-0.5 block">
              {(!task.assignedChildIds || task.assignedChildIds.length === 0 || task.assignedChildIds.length === childrenList.length)
                ? 'All Children'
                : `${task.assignedChildIds.map((id) => childrenList.find((c) => c.id === id)?.name || id).join(', ')}`}
            </span>
          </div>
        </div>

        {/* Description / Instructions */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Details & Instructions
          </label>
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
            {task.description ? (
              <p>{task.description}</p>
            ) : isWeekly ? (
              <p>
                This is a flexible weekly goal that can be completed at any point during the current week. Tapping the weekly star completes it and banks the stars for your child!
              </p>
            ) : (
              <p>
                Complete this daily habit each day. Tapping the day&apos;s box on the reward chart awards golden stars directly to the child&apos;s bank.
              </p>
            )}
          </div>
        </div>

        {/* Current Week Progress by Child */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            This Week&apos;s Progress by Child
          </label>

          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin pr-1">
            {childrenList.map((child) => {
              const isAssigned = !task.assignedChildIds || task.assignedChildIds.length === 0 || task.assignedChildIds.includes(child.id);

              if (!isAssigned) {
                return (
                  <div
                    key={child.id}
                    className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{getAvatarEmoji(child.avatarIcon)}</span>
                      <span className="font-semibold text-slate-400">{child.name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono italic">
                      Not assigned to this child
                    </span>
                  </div>
                );
              }

              if (isWeekly) {
                // Check if completed for this week
                const isCompletedThisWeek = starLogs.some((l) => {
                  if (l.childId !== child.id || l.taskId !== task.id) return false;
                  return (
                    l.date === weekStartStr ||
                    l.date === `week_${weekStartStr}` ||
                    weekDays.some((w) => w.dateStr === l.date)
                  );
                });

                return (
                  <div
                    key={child.id}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg leading-none">{getAvatarEmoji(child.avatarIcon)}</span>
                      <span className="font-bold text-white">{child.name}</span>
                    </div>

                    {isCompletedThisWeek ? (
                      <span className="flex items-center gap-1.5 font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed This Week! (+{task.points || 1}⭐)</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px] bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                        Pending (0/1)
                      </span>
                    )}
                  </div>
                );
              }

              // Daily Task
              const completedDays = weekDays.filter((w) =>
                starLogs.some((l) => l.childId === child.id && l.taskId === task.id && l.date === w.dateStr)
              );

              return (
                <div
                  key={child.id}
                  className="p-3 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="flex items-center justify-between sm:justify-start gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{getAvatarEmoji(child.avatarIcon)}</span>
                      <span className="font-bold text-white">{child.name}</span>
                    </div>
                    <span className="font-mono font-bold text-amber-300">
                      {completedDays.length} / 7 days
                    </span>
                  </div>

                  {/* 7 mini day dots */}
                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    {weekDays.map((w) => {
                      const done = starLogs.some(
                        (l) => l.childId === child.id && l.taskId === task.id && l.date === w.dateStr
                      );
                      return (
                        <div
                          key={w.dateStr}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold transition-all ${
                            done
                              ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                              : 'bg-white/5 text-slate-500 border border-white/10'
                          }`}
                          title={`${w.label} ${w.dayNum}: ${done ? 'Completed' : 'Not completed'}`}
                        >
                          {done ? '★' : w.label[0]}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
