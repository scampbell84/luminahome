import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppConfig, CountdownItem } from '../../types/config';
import { 
  Plane, 
  Gift, 
  Sun, 
  Trophy, 
  PartyPopper, 
  Heart, 
  Sparkles, 
  Repeat, 
  Clock, 
  Calendar,
  Cake,
  GraduationCap,
  Rocket,
  Flame,
  CheckCircle2
} from 'lucide-react';

interface CountdownWidgetProps {
  config: AppConfig['countdown'];
  onUpdateItems?: (items: CountdownItem[]) => void;
}

interface CalculatedCountdown {
  item: CountdownItem;
  effectiveTarget: Date;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isToday: boolean;
  isExpiredPast: boolean;
  needsAnnualRollOver: boolean;
  nextYearDateStr?: string;
}

function parseEventDate(dateStr: string) {
  if (!dateStr) {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), hour: 0, minute: 0, hasTime: false };
  }
  // Matches YYYY-MM-DD or YYYY-MM-DDTHH:mm or ISO
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (m) {
    return {
      year: parseInt(m[1], 10),
      month: parseInt(m[2], 10) - 1, // 0-indexed
      day: parseInt(m[3], 10),
      hour: m[4] !== undefined ? parseInt(m[4], 10) : 0,
      minute: m[5] !== undefined ? parseInt(m[5], 10) : 0,
      hasTime: m[4] !== undefined,
    };
  }
  const d = new Date(dateStr);
  return {
    year: d.getFullYear(),
    month: d.getMonth(),
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    hasTime: true,
  };
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parsed = parseEventDate(dateStr);
  const d = new Date(parsed.year, parsed.month, parsed.day);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export const CountdownWidget: React.FC<CountdownWidgetProps> = ({ config, onUpdateItems }) => {
  // Normalize items from config (backwards compatibility with single countdown config)
  const normalizedItems = useMemo<CountdownItem[]>(() => {
    if (config.items && Array.isArray(config.items) && config.items.length > 0) {
      return config.items;
    }
    if (config.title && config.targetDate) {
      return [
        {
          id: 'countdown-primary',
          title: config.title,
          targetDate: config.targetDate,
          icon: config.icon || 'plane',
          annual: config.annual || false,
        },
      ];
    }
    return [];
  }, [config.items, config.title, config.targetDate, config.icon, config.annual]);

  const [activeItems, setActiveItems] = useState<CountdownItem[]>(normalizedItems);
  const lastSavedRef = useRef<string>('');

  useEffect(() => {
    setActiveItems(normalizedItems);
  }, [normalizedItems]);

  const [now, setNow] = useState<Date>(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute countdown calculations for each item
  const calculations = useMemo<CalculatedCountdown[]>(() => {
    return activeItems.map((item) => {
      const parsed = parseEventDate(item.targetDate);
      let effectiveTarget: Date;
      let isToday = false;
      let isExpiredPast = false;
      let needsAnnualRollOver = false;
      let nextYearDateStr: string | undefined;

      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      if (item.annual) {
        // Annual recurring event
        const thisYearTarget = new Date(now.getFullYear(), parsed.month, parsed.day, parsed.hour, parsed.minute, 0);
        const endOfThisYearTargetDay = new Date(now.getFullYear(), parsed.month, parsed.day, 23, 59, 59, 999);

        if (now.getTime() > endOfThisYearTargetDay.getTime()) {
          // This year's event has passed! Roll over to next year
          const nextYear = now.getFullYear() + 1;
          effectiveTarget = new Date(nextYear, parsed.month, parsed.day, parsed.hour, parsed.minute, 0);
          needsAnnualRollOver = true;
          // Format ISO / local date string pointing to next year
          const pad = (n: number) => String(n).padStart(2, '0');
          nextYearDateStr = `${nextYear}-${pad(parsed.month + 1)}-${pad(parsed.day)}${parsed.hasTime ? `T${pad(parsed.hour)}:${pad(parsed.minute)}:00` : ''}`;
        } else if (
          now.getFullYear() === thisYearTarget.getFullYear() &&
          now.getMonth() === thisYearTarget.getMonth() &&
          now.getDate() === thisYearTarget.getDate()
        ) {
          // It's the event day!
          if (parsed.hasTime && now.getTime() < thisYearTarget.getTime()) {
            // Specific time later today
            effectiveTarget = thisYearTarget;
            isToday = false;
          } else {
            // Target date/time reached! Show 'Today'
            effectiveTarget = thisYearTarget;
            isToday = true;
          }
        } else {
          // Upcoming later this year
          effectiveTarget = thisYearTarget;
        }
      } else {
        // Non-annual one-time countdown
        const target = new Date(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute, 0);
        const endOfTargetDay = new Date(parsed.year, parsed.month, parsed.day, 23, 59, 59, 999);

        if (now.getTime() > endOfTargetDay.getTime()) {
          // Once that day passes, item should be removed
          isExpiredPast = true;
          effectiveTarget = target;
        } else if (
          now.getFullYear() === target.getFullYear() &&
          now.getMonth() === target.getMonth() &&
          now.getDate() === target.getDate()
        ) {
          // Event day is today!
          if (parsed.hasTime && now.getTime() < target.getTime()) {
            effectiveTarget = target;
            isToday = false;
          } else {
            // Target date/time reached! Show 'Today'
            effectiveTarget = target;
            isToday = true;
          }
        } else {
          // Future event
          effectiveTarget = target;
        }
      }

      // Calculate time remaining
      const difference = effectiveTarget.getTime() - now.getTime();
      let days = 0;
      let hours = 0;
      let minutes = 0;
      let seconds = 0;

      if (difference > 0 && !isToday) {
        days = Math.floor(difference / (1000 * 60 * 60 * 24));
        hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        seconds = Math.floor((difference % (1000 * 60)) / 1000);
      }

      return {
        item,
        effectiveTarget,
        days,
        hours,
        minutes,
        seconds,
        isToday,
        isExpiredPast,
        needsAnnualRollOver,
        nextYearDateStr,
      };
    });
  }, [activeItems, now]);

  // Synchronize expired items and annual roll-overs
  useEffect(() => {
    const expiredCount = calculations.filter((c) => c.isExpiredPast).length;
    const rolloverCount = calculations.filter((c) => c.needsAnnualRollOver).length;

    if (expiredCount === 0 && rolloverCount === 0) {
      return;
    }

    // Build updated items list:
    // 1. Remove expired non-annual items
    // 2. Advance annual items that passed to their next year date
    const updated: CountdownItem[] = [];
    for (const c of calculations) {
      if (c.isExpiredPast && !c.item.annual) {
        // Skip expired non-annual item (it is removed)
        continue;
      }
      if (c.needsAnnualRollOver && c.nextYearDateStr) {
        updated.push({
          ...c.item,
          targetDate: c.nextYearDateStr,
        });
      } else {
        updated.push(c.item);
      }
    }

    const jsonKey = JSON.stringify(updated);
    if (jsonKey === lastSavedRef.current) {
      return;
    }
    lastSavedRef.current = jsonKey;
    setActiveItems(updated);

    if (onUpdateItems) {
      onUpdateItems(updated);
    } else {
      // Save directly to backend
      fetch('/api/config')
        .then((res) => res.json())
        .then((currentConfig) => {
          if (currentConfig && currentConfig.countdown) {
            const newConfig = {
              ...currentConfig,
              countdown: {
                ...currentConfig.countdown,
                items: updated,
              },
            };
            fetch('/api/config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newConfig),
            }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [calculations, onUpdateItems]);

  const renderIcon = (iconName?: string, className = 'w-4 h-4') => {
    switch (iconName) {
      case 'plane':
        return <Plane className={className} />;
      case 'gift':
        return <Gift className={className} />;
      case 'cake':
        return <Cake className={className} />;
      case 'party':
        return <PartyPopper className={className} />;
      case 'sun':
        return <Sun className={className} />;
      case 'trophy':
        return <Trophy className={className} />;
      case 'heart':
        return <Heart className={className} />;
      case 'graduation':
        return <GraduationCap className={className} />;
      case 'rocket':
        return <Rocket className={className} />;
      case 'flame':
        return <Flame className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  // Filter out expired items for render
  const visibleCalculations = calculations.filter((c) => !c.isExpiredPast);

  // Sort countdown events chronologically from closest to furthest away from today
  const sortedCalculations = useMemo(() => {
    return [...visibleCalculations].sort((a, b) => {
      // 1. Events happening Today always come first
      if (a.isToday && !b.isToday) return -1;
      if (!a.isToday && b.isToday) return 1;

      // 2. Sort by effective target timestamp (closest to furthest)
      const diff = a.effectiveTarget.getTime() - b.effectiveTarget.getTime();
      if (diff !== 0) return diff;

      // 3. Tie-breaker by remaining days
      if (a.days !== b.days) return a.days - b.days;

      // 4. Stable tie-breaker by title
      return (a.item.title || '').localeCompare(b.item.title || '');
    });
  }, [visibleCalculations]);

  if (sortedCalculations.length === 0) {
    return (
      <div className="bg-black/35 backdrop-blur-md rounded-xl p-3 border border-white/10 text-white select-none text-kiosk-shadow">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-amber-300" />
          <span className="text-xs md:text-sm font-semibold tracking-wide">
            Event Countdowns
          </span>
        </div>
        <div className="py-4 text-center text-xs text-white/50">
          No active countdown timers. Add events in Settings.
        </div>
      </div>
    );
  }

  // If only 1 item, display the featured countdown card
  if (sortedCalculations.length === 1) {
    const single = sortedCalculations[0];
    return (
      <div className="bg-black/35 backdrop-blur-md rounded-xl p-3.5 border border-white/10 text-white select-none text-kiosk-shadow shadow-lg transition-all">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-300">
              {renderIcon(single.item.icon, 'w-3.5 h-3.5')}
            </div>
            <div className="min-w-0">
              <span className="text-xs md:text-sm font-bold tracking-wide truncate block text-white">
                {single.item.title || 'Event Countdown'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {single.item.annual && (
              <span className="text-[9px] bg-sky-400/20 text-sky-300 border border-sky-400/30 px-1.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                <Repeat className="w-2.5 h-2.5" />
                <span>Annual</span>
              </span>
            )}
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-mono">
              {single.isToday ? 'EVENT' : 'COUNTDOWN'}
            </span>
          </div>
        </div>

        {single.isToday ? (
          <div className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/25 via-rose-500/25 to-amber-500/25 border border-amber-400/50 text-center space-y-1 shadow-lg animate-pulse">
            <div className="text-lg md:text-xl font-black text-amber-300 tracking-wider flex items-center justify-center gap-2">
              <span>🎉 TODAY 🎉</span>
            </div>
            <p className="text-xs text-amber-100/90 font-medium">
              Today is the day! Enjoy every single moment!
            </p>
          </div>
        ) : config.displayMode === 'full' ? (
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-white/10 rounded-lg py-1.5 px-1 border border-white/10 shadow-sm">
              <span className="text-xl md:text-2xl font-black tracking-tight text-white block">
                {single.days}
              </span>
              <span className="text-[10px] font-medium text-white/60 uppercase">Days</span>
            </div>

            <div className="bg-white/10 rounded-lg py-1.5 px-1 border border-white/10 shadow-sm">
              <span className="text-xl md:text-2xl font-black tracking-tight text-white block">
                {pad(single.hours)}
              </span>
              <span className="text-[10px] font-medium text-white/60 uppercase">Hours</span>
            </div>

            <div className="bg-white/10 rounded-lg py-1.5 px-1 border border-white/10 shadow-sm">
              <span className="text-xl md:text-2xl font-black tracking-tight text-white block">
                {pad(single.minutes)}
              </span>
              <span className="text-[10px] font-medium text-white/60 uppercase">Mins</span>
            </div>

            <div className="bg-white/10 rounded-lg py-1.5 px-1 border border-white/10 shadow-sm">
              <span className="text-xl md:text-2xl font-black tracking-tight text-cyan-300 block">
                {pad(single.seconds)}
              </span>
              <span className="text-[10px] font-medium text-white/60 uppercase">Secs</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-2">
            <div className="bg-white/10 rounded-xl px-6 py-2 border border-white/15 text-center shadow-md flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-black tracking-tight text-white block">
                {single.days}
              </span>
              <span className="text-xs font-bold text-sky-200/80 uppercase tracking-widest">
                {single.days === 1 ? 'Day to go' : 'Days to go'}
              </span>
            </div>
          </div>
        )}

        <div className="mt-2 text-[10px] text-white/40 flex items-center justify-between px-0.5">
          <span>Target: {formatDisplayDate(single.item.targetDate)}</span>
          {single.item.annual && <span>Repeats every year</span>}
        </div>
      </div>
    );
  }

  // Multiple items view: Scrollable list of countdown cards (sorted closest to furthest away)
  const todayItemsCount = sortedCalculations.filter((c) => c.isToday).length;

  return (
    <div className="bg-black/35 backdrop-blur-md rounded-xl p-3 border border-white/10 text-white select-none text-kiosk-shadow flex flex-col shadow-lg">
      {/* Widget Header */}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-300" />
          <h3 className="text-xs md:text-sm font-semibold tracking-wide">
            Event Countdowns ({sortedCalculations.length})
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {todayItemsCount > 0 && (
            <span className="text-[10px] bg-amber-500/25 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
              <span>🎉</span>
              <span>{todayItemsCount} Today</span>
            </span>
          )}
          <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono hidden sm:inline">
            Active
          </span>
        </div>
      </div>

      {/* Scrollable Countdown List (Ordered Closest to Furthest) */}
      <div className="max-h-[250px] sm:max-h-[290px] md:max-h-[330px] overflow-y-auto agenda-scroll pr-1.5 space-y-2">
        {sortedCalculations.map((calc) => {
          const { item, days, hours, minutes, seconds, isToday } = calc;

          if (isToday) {
            return (
              <div
                key={item.id}
                className="bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border border-amber-400/50 rounded-xl p-2.5 flex items-center justify-between gap-2.5 shadow-md transition-all animate-pulse"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-400/25 border border-amber-400/50 flex items-center justify-center shrink-0 text-amber-300">
                    {renderIcon(item.icon, 'w-4 h-4')}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs md:text-sm font-bold text-white truncate">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-200/90 font-medium mt-0.5">
                      <span>{formatDisplayDate(item.targetDate)}</span>
                      {item.annual && (
                        <span className="bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded text-[9px] font-mono flex items-center gap-0.5">
                          <Repeat className="w-2.5 h-2.5" />
                          <span>Annual</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 font-black text-xs md:text-sm tracking-wider uppercase shadow-md shrink-0 flex items-center gap-1">
                  <span>🎉 Today</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-2.5 flex items-center justify-between gap-2.5 transition-all shadow-sm"
            >
              {/* Event Icon & Title */}
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0 text-sky-300">
                  {renderIcon(item.icon, 'w-4 h-4')}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs md:text-sm font-bold text-white truncate">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-white/50 font-medium mt-0.5">
                    <span>{formatDisplayDate(item.targetDate)}</span>
                    {item.annual && (
                      <span className="bg-sky-400/10 text-sky-300 border border-sky-400/20 px-1 rounded text-[9px] font-mono flex items-center gap-0.5">
                        <Repeat className="w-2.5 h-2.5" />
                        <span>Annual</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Countdown Digits - by default just show number of days */}
              {config.displayMode === 'full' ? (
                <div className="flex items-center gap-1 shrink-0">
                  <div className="bg-white/10 rounded-lg px-2 py-1 text-center min-w-[36px] sm:min-w-[40px] border border-white/10">
                    <span className="text-xs md:text-sm font-black text-white block leading-tight">
                      {days}
                    </span>
                    <span className="text-[8px] text-white/50 uppercase font-bold">Days</span>
                  </div>

                  <div className="bg-white/10 rounded-lg px-2 py-1 text-center min-w-[34px] sm:min-w-[38px] border border-white/10">
                    <span className="text-xs md:text-sm font-black text-white block leading-tight">
                      {pad(hours)}
                    </span>
                    <span className="text-[8px] text-white/50 uppercase font-bold">Hrs</span>
                  </div>

                  <div className="bg-white/10 rounded-lg px-2 py-1 text-center min-w-[34px] sm:min-w-[38px] border border-white/10">
                    <span className="text-xs md:text-sm font-black text-white block leading-tight">
                      {pad(minutes)}
                    </span>
                    <span className="text-[8px] text-white/50 uppercase font-bold">Min</span>
                  </div>

                  <div className="bg-white/10 rounded-lg px-2 py-1 text-center min-w-[34px] sm:min-w-[38px] border border-white/10">
                    <span className="text-xs md:text-sm font-black text-cyan-300 block leading-tight">
                      {pad(seconds)}
                    </span>
                    <span className="text-[8px] text-white/50 uppercase font-bold">Sec</span>
                  </div>
                </div>
              ) : (
                <div className="bg-white/10 rounded-xl px-3 py-1.5 text-center min-w-[54px] sm:min-w-[62px] border border-white/15 shrink-0 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-sm md:text-base font-black text-white block leading-tight">
                    {days}
                  </span>
                  <span className="text-[8px] sm:text-[9px] text-sky-200/80 uppercase font-bold tracking-wider mt-0.5">
                    {days === 1 ? 'Day' : 'Days'}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
