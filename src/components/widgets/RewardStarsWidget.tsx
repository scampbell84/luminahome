import React, { useMemo } from 'react';
import { AppConfig, RewardConfig, ChildProfile, StarLogEntry, RewardShopItem } from '../../types/config';
import { DEFAULT_REWARD_CONFIG } from '../../constants/defaultConfig';
import { getAvatarEmoji } from '../../constants/avatarIcons';
import {
  Star,
  Rocket,
  Crown,
  Heart,
  Sparkles,
  Smile,
  ChevronRight,
  Gift,
  Award,
} from 'lucide-react';

interface RewardStarsWidgetProps {
  config?: RewardConfig;
  allConfig?: AppConfig;
  onOpenRewards?: () => void;
}

export const RewardStarsWidget: React.FC<RewardStarsWidgetProps> = ({
  config,
  onOpenRewards,
}) => {
  const rewards = config || DEFAULT_REWARD_CONFIG;
  const childrenList: ChildProfile[] =
    rewards.children && rewards.children.length > 0
      ? rewards.children
      : DEFAULT_REWARD_CONFIG.children;
  const starLogs: StarLogEntry[] = rewards.starLogs || [];
  const shopItems: RewardShopItem[] = rewards.shopItems || DEFAULT_REWARD_CONFIG.shopItems;

  // Compute stars earned this week
  const weekStartStr = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);
    return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
  }, []);

  const getChildWeekStars = (childId: string) => {
    return starLogs
      .filter((l) => l.childId === childId && l.date >= weekStartStr)
      .reduce((sum, l) => sum + (l.starsAwarded || 1), 0);
  };

  // Find next affordable or aspirational reward
  const getNextGoal = (currentStars: number) => {
    const sorted = [...shopItems].filter((i) => i.enabled !== false).sort((a, b) => a.cost - b.cost);
    const nextItem = sorted.find((i) => i.cost > currentStars) || sorted[sorted.length - 1];
    return nextItem;
  };

  const getChildAvatarIcon = (iconName?: string) => {
    return <span className="text-sm leading-none select-none">{getAvatarEmoji(iconName)}</span>;
  };

  const getChildColorClasses = (color?: string) => {
    switch (color) {
      case 'sky':
        return 'bg-sky-500/20 text-sky-300 border-sky-400/40 shadow-[0_0_10px_rgba(56,189,248,0.2)]';
      case 'rose':
        return 'bg-rose-500/20 text-rose-300 border-rose-400/40 shadow-[0_0_10px_rgba(244,63,94,0.2)]';
      case 'emerald':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
      case 'purple':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]';
      case 'orange':
        return 'bg-orange-500/20 text-orange-300 border-orange-400/40 shadow-[0_0_10px_rgba(249,115,22,0.2)]';
      case 'amber':
      default:
        return 'bg-amber-500/20 text-amber-300 border-amber-400/40 shadow-[0_0_10px_rgba(251,191,36,0.2)]';
    }
  };

  return (
    <div className="bg-black/35 backdrop-blur-md rounded-xl p-3.5 border border-white/10 text-white select-none text-kiosk-shadow h-full flex flex-col justify-between">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-sm font-bold">
            <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Star Bank
          </span>
        </div>

        {onOpenRewards && (
          <button
            type="button"
            onClick={onOpenRewards}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 hover:bg-white/15 text-amber-300 hover:text-amber-200 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer"
            title="Open Family Reward Chart"
          >
            <span>Reward Chart</span>
            <ChevronRight className="w-3 h-3 text-amber-400" />
          </button>
        )}
      </div>

      {/* Children Star Bank List */}
      <div className="space-y-2 flex-1 flex flex-col justify-center">
        {childrenList.map((child) => {
          const weekStars = getChildWeekStars(child.id);
          const nextGoal = getNextGoal(child.currentStars);

          return (
            <div
              key={child.id}
              onClick={onOpenRewards}
              className={`p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border transition-all cursor-pointer group flex items-center justify-between gap-3 ${
                child.avatarColor === 'sky'
                  ? 'border-sky-500/20 hover:border-sky-500/40'
                  : child.avatarColor === 'rose'
                  ? 'border-rose-500/20 hover:border-rose-500/40'
                  : child.avatarColor === 'emerald'
                  ? 'border-emerald-500/20 hover:border-emerald-500/40'
                  : 'border-amber-500/20 hover:border-amber-500/40'
              }`}
            >
              {/* Child Info & Avatar */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border font-bold text-xs shrink-0 ${getChildColorClasses(
                    child.avatarColor
                  )}`}
                >
                  {getChildAvatarIcon(child.avatarIcon)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-amber-200 transition-colors">
                    {child.name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span className="text-amber-300/90 font-semibold">+{weekStars} this week</span>
                    {nextGoal && (
                      <span className="hidden sm:inline text-slate-400 truncate max-w-[110px]">
                        • {nextGoal.title} ({nextGoal.cost}⭐)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Stars Counter */}
              <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/30 group-hover:bg-amber-400/20 transition-colors">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                <span className="text-sm sm:text-base font-black font-mono text-amber-300">
                  {child.currentStars}
                </span>
                <span className="text-[10px] uppercase font-bold text-amber-400/80 hidden xs:inline">
                  Stars
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Widget Footer Hint */}
      <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-medium shrink-0">
        <span className="flex items-center gap-1 text-slate-400">
          <Award className="w-3 h-3 text-amber-400" />
          <span>Redeem treats in shop</span>
        </span>
        <span className="text-amber-300/80 font-mono">Tap to view chart</span>
      </div>
    </div>
  );
};
