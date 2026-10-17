import React, { useState, useMemo, useEffect } from 'react';
import { AppConfig, CalendarEvent, CalendarFeed } from '../../types/config';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Users, 
  X,
  CalendarRange,
  LayoutGrid,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
} from 'lucide-react';

interface BigCalendarViewProps {
  events: CalendarEvent[];
  feeds: CalendarFeed[];
  config?: AppConfig['calendar'];
  onRefresh?: () => void;
}

interface MonthCalendarDay {
  date: Date;
  dayNumber: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPassed: boolean;
  dayIndexInWeek: number; // 0..6
  dateKey: string;
}

interface MonthCalendarWeek {
  weekIndex: number;
  startDate: Date;
  endDate: Date;
  days: MonthCalendarDay[];
  allDaySegments: WeekEventSegment[];
  maxTracks: number;
  timedEventsByDay: Record<number, CalendarEvent[]>;
}

interface WeekEventSegment {
  event: CalendarEvent;
  startCol: number; // 0..6
  endCol: number;   // 0..6
  span: number;     // 1..7
  isStart: boolean;
  isEnd: boolean;
  track: number;
}

function getContrastColor(hexColor?: string): { text: string; isLight: boolean } {
  if (!hexColor) return { text: '#ffffff', isLight: false };
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155
    ? { text: '#0f172a', isLight: true }
    : { text: '#ffffff', isLight: false };
}

function parseLocalDate(dateStr: string, isEnd = false): Date {
  if (!dateStr) return new Date();
  const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2}))?/);
  if (m) {
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const day = parseInt(m[3], 10);
    if (m[4] !== undefined) {
      const hour = parseInt(m[4], 10);
      const min = parseInt(m[5], 10);
      const sec = parseInt(m[6], 10);
      return new Date(year, month, day, hour, min, sec);
    }
    return new Date(year, month, day, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0);
  }
  return new Date(dateStr);
}

function normalizeEventDates(ev: CalendarEvent) {
  let s: Date;
  let e: Date;

  if (ev.allDay) {
    s = parseLocalDate(ev.start, false);
    e = ev.end ? parseLocalDate(ev.end, true) : s;

    if (e.getTime() > s.getTime() && e.getHours() === 0 && e.getMinutes() === 0 && e.getSeconds() === 0) {
      e = new Date(e.getTime() - 1000);
    }
  } else {
    s = new Date(ev.start);
    e = ev.end ? new Date(ev.end) : new Date(s.getTime() + 60 * 60 * 1000);
  }

  const sMidnight = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0);
  const eMidnight = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0);
  const isMultiDay = eMidnight.getTime() > sMidnight.getTime();
  const isAllDayOrMultiDay = ev.allDay || isMultiDay;

  return {
    startDate: sMidnight,
    endDate: eMidnight,
    realStart: s,
    realEnd: e,
    isAllDayOrMultiDay,
    isMultiDay,
  };
}

export const BigCalendarView: React.FC<BigCalendarViewProps> = ({
  events,
  feeds,
  config,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year' | 'columns'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dayDate: Date; events: CalendarEvent[] } | null>(null);
  const [activeFeedIds, setActiveFeedIds] = useState<Set<string>>(
    new Set(feeds.map((f) => f.id))
  );

  // Collapsible feeds list in sidebar: default is FALSE (hidden/collapsed)
  const [isCalendarsOpen, setIsCalendarsOpen] = useState<boolean>(false);

  useEffect(() => {
    setActiveFeedIds(new Set(feeds.map((f) => f.id)));
  }, [feeds]);

  // Today reference normalized to midnight
  const today = useMemo(() => new Date(), []);
  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const startOfWeekPreference = config?.startOfWeek || 'monday';

  // Day headers according to startOfWeek preference (Monday default)
  const daysOfWeek = useMemo(() => {
    if (startOfWeekPreference === 'sunday') {
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    }
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  }, [startOfWeekPreference]);

  // Filter events by active feeds
  const activeEvents = useMemo(() => {
    return events.filter((ev) => activeFeedIds.has(ev.calendarId));
  }, [events, activeFeedIds]);

  // Theme styling based on config.theme
  const themeClasses = useMemo(() => {
    const t = config?.theme || 'default';
    switch (t) {
      case 'glass':
        return {
          aside: 'bg-slate-900/40 backdrop-blur-3xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
          main: 'bg-slate-900/35 backdrop-blur-3xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
          header: 'bg-black/40 border-white/10 text-slate-300',
          activeButton: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30',
          todayBadge: 'bg-indigo-500 text-white ring-2 ring-indigo-400/40',
        };
      case 'minimal':
        return {
          aside: 'bg-slate-950/85 border-slate-800/40 backdrop-blur-none',
          main: 'bg-slate-950/80 border-slate-800/40 backdrop-blur-none',
          header: 'bg-slate-950 border-slate-800/40 text-slate-400',
          activeButton: 'bg-slate-700 text-white shadow-sm',
          todayBadge: 'bg-slate-600 text-white ring-1 ring-slate-400',
        };
      case 'vibrant':
        return {
          aside: 'bg-slate-900/95 border-sky-500/30 shadow-[0_0_30px_rgba(14,165,233,0.12)]',
          main: 'bg-slate-900/90 border-sky-500/30 shadow-[0_0_30px_rgba(14,165,233,0.12)]',
          header: 'bg-indigo-950/80 border-slate-800 text-sky-300',
          activeButton: 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30',
          todayBadge: 'bg-gradient-to-tr from-sky-400 to-indigo-500 text-white shadow-md ring-2 ring-sky-300/40',
        };
      case 'monochrome':
        return {
          aside: 'bg-black border-neutral-800 text-neutral-200',
          main: 'bg-black border-neutral-800 text-neutral-200',
          header: 'bg-neutral-950 border-neutral-800 text-neutral-400',
          activeButton: 'bg-white text-black font-bold shadow-md',
          todayBadge: 'bg-white text-black font-bold ring-2 ring-neutral-400',
        };
      case 'warm':
        return {
          aside: 'bg-[#15110f]/95 border-amber-900/30 text-amber-100',
          main: 'bg-[#120f0d]/90 border-amber-900/30 text-amber-100',
          header: 'bg-[#1a1411]/90 border-amber-900/30 text-amber-300',
          activeButton: 'bg-amber-600 text-white shadow-md shadow-amber-600/20',
          todayBadge: 'bg-amber-500 text-slate-950 font-bold ring-2 ring-amber-300/40',
        };
      case 'nordic':
        return {
          aside: 'bg-[#080e1a]/95 border-cyan-900/40 text-cyan-100',
          main: 'bg-[#060b14]/90 border-cyan-900/40 text-cyan-100',
          header: 'bg-[#0a1220]/90 border-cyan-900/40 text-cyan-300',
          activeButton: 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30',
          todayBadge: 'bg-cyan-500 text-slate-950 font-bold ring-2 ring-cyan-300/50',
        };
      case 'forest':
        return {
          aside: 'bg-[#06140e]/95 border-emerald-900/40 text-emerald-100',
          main: 'bg-[#040f0a]/90 border-emerald-900/40 text-emerald-100',
          header: 'bg-[#081a12]/90 border-emerald-900/40 text-emerald-300',
          activeButton: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30',
          todayBadge: 'bg-emerald-500 text-slate-950 font-bold ring-2 ring-emerald-300/50',
        };
      case 'default':
      default:
        return {
          aside: 'bg-slate-900/90 backdrop-blur-xl border-slate-800 shadow-2xl',
          main: 'bg-slate-900/80 backdrop-blur-xl border-slate-800 shadow-2xl',
          header: 'bg-slate-950/80 border-slate-800 text-slate-400',
          activeButton: 'bg-sky-600 text-white shadow-md shadow-sky-600/20',
          todayBadge: 'bg-sky-500 text-white shadow-md ring-2 ring-sky-400/40',
        };
    }
  }, [config?.theme]);

  // Compute Month Structure with Weeks and Spanning All-Day / Multi-Day Bars
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleDateString(undefined, { month: 'long' });
    const monthTitle = `${monthName} ${year}`;

    // First day of this month
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay(); // 0 is Sunday
    const firstDayOfWeekIndex =
      startOfWeekPreference === 'monday' ? (dayOfWeek + 6) % 7 : dayOfWeek;
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

    // Start date of the first week
    const calendarStartDate = new Date(year, month, 1 - firstDayOfWeekIndex);
    calendarStartDate.setHours(0, 0, 0, 0);

    // Calculate total weeks
    const totalDaysNeeded = firstDayOfWeekIndex + daysInCurrentMonth;
    const numWeeks = Math.ceil(totalDaysNeeded / 7);

    const weeks: MonthCalendarWeek[] = [];

    for (let w = 0; w < numWeeks; w++) {
      const days: MonthCalendarDay[] = [];
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(calendarStartDate);
        dayDate.setDate(calendarStartDate.getDate() + (w * 7 + d));
        dayDate.setHours(0, 0, 0, 0);

        const isCurrentMonth = dayDate.getMonth() === month;
        const isToday = dayDate.toDateString() === today.toDateString();
        const isPassed = dayDate.getTime() < startOfToday.getTime();
        const dateKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;

        days.push({
          date: dayDate,
          dayNumber: dayDate.getDate(),
          month: dayDate.getMonth(),
          year: dayDate.getFullYear(),
          isCurrentMonth,
          isToday,
          isPassed,
          dayIndexInWeek: d,
          dateKey,
        });
      }

      const weekStartDate = days[0].date;
      const weekEndDate = days[6].date;

      // Extract all-day & multi-day segments intersecting this week
      const rawSegments: WeekEventSegment[] = [];
      const timedEventsByDay: Record<number, CalendarEvent[]> = {
        0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
      };

      for (const ev of activeEvents) {
        const { startDate, endDate, isAllDayOrMultiDay } = normalizeEventDates(ev);

        // Check if event intersects this week
        if (endDate.getTime() >= weekStartDate.getTime() && startDate.getTime() <= weekEndDate.getTime()) {
          if (isAllDayOrMultiDay) {
            let startCol = 0;
            let endCol = 6;

            for (let i = 0; i < 7; i++) {
              if (startDate.getTime() <= days[i].date.getTime()) {
                startCol = i;
                break;
              }
            }
            if (startDate.getTime() < days[0].date.getTime()) {
              startCol = 0;
            }

            for (let i = 6; i >= 0; i--) {
              if (endDate.getTime() >= days[i].date.getTime()) {
                endCol = i;
                break;
              }
            }
            if (endDate.getTime() > days[6].date.getTime()) {
              endCol = 6;
            }

            const isStart = startDate.getTime() === days[startCol].date.getTime();
            const isEnd = endDate.getTime() === days[endCol].date.getTime();

            rawSegments.push({
              event: ev,
              startCol,
              endCol,
              span: endCol - startCol + 1,
              isStart,
              isEnd,
              track: 0,
            });
          } else {
            // Single-day timed event: assign to corresponding day column
            for (let i = 0; i < 7; i++) {
              if (startDate.getTime() === days[i].date.getTime()) {
                timedEventsByDay[i].push(ev);
                break;
              }
            }
          }
        }
      }

      // Sort timed events chronologically
      for (let i = 0; i < 7; i++) {
        timedEventsByDay[i].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      }

      // Track-packing algorithm for multi-day segments
      rawSegments.sort((a, b) => {
        if (a.startCol !== b.startCol) return a.startCol - b.startCol;
        return b.span - a.span;
      });

      const trackAssignments: boolean[][] = [];
      const packedSegments: WeekEventSegment[] = [];

      for (const seg of rawSegments) {
        let assignedTrack = -1;
        for (let t = 0; t < trackAssignments.length; t++) {
          let conflict = false;
          for (let col = seg.startCol; col <= seg.endCol; col++) {
            if (trackAssignments[t][col]) {
              conflict = true;
              break;
            }
          }
          if (!conflict) {
            assignedTrack = t;
            break;
          }
        }

        if (assignedTrack === -1) {
          assignedTrack = trackAssignments.length;
          trackAssignments.push(new Array(7).fill(false));
        }

        for (let col = seg.startCol; col <= seg.endCol; col++) {
          trackAssignments[assignedTrack][col] = true;
        }

        packedSegments.push({
          ...seg,
          track: assignedTrack,
        });
      }

      weeks.push({
        weekIndex: w,
        startDate: weekStartDate,
        endDate: weekEndDate,
        days,
        allDaySegments: packedSegments,
        maxTracks: Math.max(trackAssignments.length, 1),
        timedEventsByDay,
      });
    }

    return {
      year,
      month,
      monthName,
      monthTitle,
      weeks,
    };
  }, [currentDate, activeEvents, today, startOfToday, startOfWeekPreference]);

  // Compute Week View data with All-Day Spanning Bar area and Daily Timed columns
  const weekInfo = useMemo(() => {
    const startOfWeekDate = new Date(currentDate);
    const day = startOfWeekDate.getDay();
    const dayOffset =
      startOfWeekPreference === 'monday' ? (day + 6) % 7 : day;
    startOfWeekDate.setDate(startOfWeekDate.getDate() - dayOffset);
    startOfWeekDate.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeekDate);
      d.setDate(d.getDate() + i);
      const isPassed = d.getTime() < startOfToday.getTime();
      days.push({
        date: d,
        dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: d.toDateString() === today.toDateString(),
        isPassed,
      });
    }

    const weekStartDate = days[0].date;
    const weekEndDate = days[6].date;

    const rawSegments: WeekEventSegment[] = [];
    const timedEventsByDay: Record<number, CalendarEvent[]> = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: []
    };

    for (const ev of activeEvents) {
      const { startDate, endDate, isAllDayOrMultiDay } = normalizeEventDates(ev);

      if (endDate.getTime() >= weekStartDate.getTime() && startDate.getTime() <= weekEndDate.getTime()) {
        if (isAllDayOrMultiDay) {
          let startCol = 0;
          let endCol = 6;

          for (let i = 0; i < 7; i++) {
            if (startDate.getTime() <= days[i].date.getTime()) {
              startCol = i;
              break;
            }
          }
          if (startDate.getTime() < days[0].date.getTime()) startCol = 0;

          for (let i = 6; i >= 0; i--) {
            if (endDate.getTime() >= days[i].date.getTime()) {
              endCol = i;
              break;
            }
          }
          if (endDate.getTime() > days[6].date.getTime()) endCol = 6;

          const isStart = startDate.getTime() === days[startCol].date.getTime();
          const isEnd = endDate.getTime() === days[endCol].date.getTime();

          rawSegments.push({
            event: ev,
            startCol,
            endCol,
            span: endCol - startCol + 1,
            isStart,
            isEnd,
            track: 0,
          });
        } else {
          for (let i = 0; i < 7; i++) {
            if (startDate.getTime() === days[i].date.getTime()) {
              timedEventsByDay[i].push(ev);
              break;
            }
          }
        }
      }
    }

    // Sort timed events
    for (let i = 0; i < 7; i++) {
      timedEventsByDay[i].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }

    // Pack tracks for week view
    rawSegments.sort((a, b) => {
      if (a.startCol !== b.startCol) return a.startCol - b.startCol;
      return b.span - a.span;
    });

    const trackAssignments: boolean[][] = [];
    const packedSegments: WeekEventSegment[] = [];

    for (const seg of rawSegments) {
      let assignedTrack = -1;
      for (let t = 0; t < trackAssignments.length; t++) {
        let conflict = false;
        for (let col = seg.startCol; col <= seg.endCol; col++) {
          if (trackAssignments[t][col]) {
            conflict = true;
            break;
          }
        }
        if (!conflict) {
          assignedTrack = t;
          break;
        }
      }

      if (assignedTrack === -1) {
        assignedTrack = trackAssignments.length;
        trackAssignments.push(new Array(7).fill(false));
      }

      for (let col = seg.startCol; col <= seg.endCol; col++) {
        trackAssignments[assignedTrack][col] = true;
      }

      packedSegments.push({
        ...seg,
        track: assignedTrack,
      });
    }

    const weekTitle = `${weekStartDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weekEndDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return {
      days,
      weekTitle,
      allDaySegments: packedSegments,
      maxTracks: Math.max(trackAssignments.length, 1),
      timedEventsByDay,
    };
  }, [currentDate, activeEvents, today, startOfToday, startOfWeekPreference]);

  // Compute Day View Events
  const dayInfo = useMemo(() => {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    const isToday = dayStart.toDateString() === today.toDateString();
    const isPassed = dayStart.getTime() < startOfToday.getTime();

    const allDayEvents: CalendarEvent[] = [];
    const timedEvents: CalendarEvent[] = [];

    for (const ev of activeEvents) {
      const { startDate, endDate, realStart, realEnd, isAllDayOrMultiDay } = normalizeEventDates(ev);
      if (endDate.getTime() >= dayStart.getTime() && startDate.getTime() <= dayEnd.getTime()) {
        if (isAllDayOrMultiDay) {
          allDayEvents.push(ev);
        } else {
          timedEvents.push(ev);
        }
      }
    }

    timedEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return {
      dayStart,
      isToday,
      isPassed,
      allDayEvents,
      timedEvents,
      totalEvents: allDayEvents.length + timedEvents.length,
    };
  }, [currentDate, activeEvents, today, startOfToday]);

  // Compute Year View Data (12 Mini Month Grids)
  const yearData = useMemo(() => {
    const year = currentDate.getFullYear();
    const months = [];

    // Map all active events to date keys for fast year-dot lookups
    const eventsByDateKey = new Map<string, CalendarEvent[]>();
    for (const ev of activeEvents) {
      const { startDate, endDate } = normalizeEventDates(ev);
      const curr = new Date(startDate);
      while (curr.getTime() <= endDate.getTime()) {
        const k = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}-${String(curr.getDate()).padStart(2, '0')}`;
        if (!eventsByDateKey.has(k)) eventsByDateKey.set(k, []);
        eventsByDateKey.get(k)!.push(ev);
        curr.setDate(curr.getDate() + 1);
      }
    }

    for (let m = 0; m < 12; m++) {
      const firstDay = new Date(year, m, 1);
      const dayOfWeek = firstDay.getDay();
      const firstDayIndex =
        startOfWeekPreference === 'monday' ? (dayOfWeek + 6) % 7 : dayOfWeek;
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      const monthName = firstDay.toLocaleDateString(undefined, { month: 'long' });

      const dayCells = [];
      // Empty blanks
      for (let b = 0; b < firstDayIndex; b++) {
        dayCells.push({ blank: true, key: `b-${m}-${b}` });
      }

      // Actual days
      for (let d = 1; d <= daysInMonth; d++) {
        const dDate = new Date(year, m, d, 0, 0, 0);
        const dateKey = `${year}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dDate.toDateString() === today.toDateString();
        const isPassed = dDate.getTime() < startOfToday.getTime();
        const dayEvents = eventsByDateKey.get(dateKey) || [];

        dayCells.push({
          blank: false,
          dayNum: d,
          date: dDate,
          dateKey,
          isToday,
          isPassed,
          events: dayEvents,
          hasEvents: dayEvents.length > 0,
          key: dateKey,
        });
      }

      months.push({
        monthIndex: m,
        monthName,
        dayCells,
      });
    }

    return {
      year,
      months,
    };
  }, [currentDate, activeEvents, today, startOfToday, startOfWeekPreference]);

  // Feed selection toggle
  const toggleFeed = (feedId: string) => {
    setActiveFeedIds((prev) => {
      const next = new Set(prev);
      if (next.has(feedId)) {
        if (next.size > 1) next.delete(feedId);
      } else {
        next.add(feedId);
      }
      return next;
    });
  };

  const selectAllFeeds = () => {
    setActiveFeedIds(new Set(feeds.map((f) => f.id)));
  };

  // Period navigation according to active view mode
  const nextPeriod = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') {
      next.setDate(next.getDate() + 1);
    } else if (viewMode === 'week' || viewMode === 'columns') {
      next.setDate(next.getDate() + 7);
    } else if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'year') {
      next.setFullYear(next.getFullYear() + 1);
    }
    setCurrentDate(next);
  };

  const prevPeriod = () => {
    const prev = new Date(currentDate);
    if (viewMode === 'day') {
      prev.setDate(prev.getDate() - 1);
    } else if (viewMode === 'week' || viewMode === 'columns') {
      prev.setDate(prev.getDate() - 7);
    } else if (viewMode === 'month') {
      prev.setMonth(prev.getMonth() - 1);
    } else if (viewMode === 'year') {
      prev.setFullYear(prev.getFullYear() - 1);
    }
    setCurrentDate(prev);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatTime = (isoString: string, allDay: boolean) => {
    if (allDay) return 'All Day';
    return new Date(isoString).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const formatTimeOnly = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  // Count events today
  const todayEventsCount = useMemo(() => {
    return activeEvents.filter((ev) => {
      const { startDate, endDate } = normalizeEventDates(ev);
      return today.getTime() >= startDate.getTime() && today.getTime() <= endDate.getTime();
    }).length;
  }, [activeEvents, today]);

  // Open day events list modal
  const handleOpenDayModal = (dayDate: Date) => {
    const dayMidnight = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0);
    const dayEvents = activeEvents.filter((ev) => {
      const { startDate, endDate } = normalizeEventDates(ev);
      return dayMidnight.getTime() >= startDate.getTime() && dayMidnight.getTime() <= endDate.getTime();
    });
    setSelectedDayEvents({
      dayDate,
      events: dayEvents,
    });
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 p-3 md:p-4 gap-3 md:gap-4 overflow-hidden select-none font-sans text-slate-100">
      {/* ============================================================ */}
      {/* LEFT-HAND SIDEBAR CONTROLS                                    */}
      {/* ============================================================ */}
      <aside className={`w-64 md:w-72 lg:w-80 shrink-0 h-full flex flex-col justify-between ${themeClasses.aside} rounded-2xl p-4 md:p-5 overflow-y-auto scrollbar-none`}>
        <div className="space-y-4">
          {/* Calendar Month & Navigation */}
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-md shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-mono tracking-widest text-sky-400 uppercase font-semibold block">
                  {currentDate.getFullYear()}
                </span>
                <h1 className="text-lg md:text-xl font-black tracking-tight text-white leading-none truncate">
                  {viewMode === 'month' && monthData.monthName}
                  {viewMode === 'day' && currentDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  {viewMode === 'week' && 'Week Schedule'}
                  {viewMode === 'year' && `${yearData.year} Year`}
                  {viewMode === 'columns' && 'Columns'}
                </h1>
              </div>
            </div>

            {viewMode === 'day' && (
              <p className="text-xs text-slate-400 font-medium mb-1">
                {currentDate.toLocaleDateString(undefined, { weekday: 'long' })}
              </p>
            )}

            {viewMode === 'week' && (
              <p className="text-xs text-slate-400 font-medium mb-1">
                {weekInfo.weekTitle}
              </p>
            )}

            {/* Previous / Today / Next Navigation */}
            <div className="grid grid-cols-4 gap-1.5 mt-2.5 pt-2.5 border-t border-slate-800">
              <button
                type="button"
                onClick={prevPeriod}
                className="col-span-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700 flex items-center justify-center active:scale-95 shadow-sm cursor-pointer"
                title="Previous Period"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={goToToday}
                className="col-span-2 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-300 hover:text-sky-200 rounded-xl transition-colors border border-slate-700 flex items-center justify-center active:scale-95 shadow-sm cursor-pointer"
              >
                Today
              </button>

              <button
                type="button"
                onClick={nextPeriod}
                className="col-span-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700 flex items-center justify-center active:scale-95 shadow-sm cursor-pointer"
                title="Next Period"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* View Mode Switcher: Day, Week, Month, Year, Columns */}
          <div className="space-y-1 pt-2 border-t border-slate-800">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block px-1 mb-1">
              View Layout
            </span>
            <div className="flex flex-col gap-1">
              {/* Day View */}
              <button
                type="button"
                onClick={() => setViewMode('day')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                  viewMode === 'day'
                    ? themeClasses.activeButton
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>Day View</span>
              </button>

              {/* Week View */}
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? themeClasses.activeButton
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <CalendarRange className="w-4 h-4 shrink-0" />
                <span>Week View</span>
              </button>

              {/* Month Grid */}
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? themeClasses.activeButton
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <CalendarIcon className="w-4 h-4 shrink-0" />
                <span>Month Grid</span>
              </button>

              {/* Year View */}
              <button
                type="button"
                onClick={() => setViewMode('year')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                  viewMode === 'year'
                    ? themeClasses.activeButton
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <LayoutGrid className="w-4 h-4 shrink-0" />
                <span>Year View</span>
              </button>

              {/* Family Columns */}
              <button
                type="button"
                onClick={() => setViewMode('columns')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all cursor-pointer ${
                  viewMode === 'columns'
                    ? themeClasses.activeButton
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Family Columns</span>
              </button>
            </div>
          </div>

          {/* Collapsible Calendars Section (Default is Hidden/Collapsed) */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCalendarsOpen(!isCalendarsOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/70 transition-colors border border-slate-800/80 group cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <CalendarDays className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200 group-hover:text-white truncate">
                  Calendars ({feeds.length})
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {activeFeedIds.size} on
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                  {isCalendarsOpen ? 'Hide' : 'Show'}
                </span>
                {isCalendarsOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-white" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white" />
                )}
              </div>
            </button>

            {isCalendarsOpen && (
              <div className="mt-2 space-y-1.5 animate-fadeIn">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    Visible Feeds
                  </span>
                  <button
                    type="button"
                    onClick={selectAllFeeds}
                    className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
                  >
                    Select All
                  </button>
                </div>

                <div className="space-y-1 max-h-56 overflow-y-auto scrollbar-thin pr-1">
                  {feeds.map((feed) => {
                    const active = activeFeedIds.has(feed.id);
                    const count = events.filter((e) => e.calendarId === feed.id).length;
                    return (
                      <button
                        key={feed.id}
                        type="button"
                        onClick={() => toggleFeed(feed.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          active
                            ? 'bg-slate-800/80 text-white border border-slate-700/80'
                            : 'text-slate-500 opacity-60 hover:opacity-80'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: feed.color }}
                          />
                          <span className="truncate">{feed.name}</span>
                        </div>

                        <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-950/60 shrink-0">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer Stats */}
        <div className="pt-3 border-t border-slate-800 space-y-2 mt-4">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Events Today</span>
              <span className="font-bold text-sky-400 font-mono text-sm">
                {todayEventsCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1.5">
              <span className="text-slate-400 font-medium">Total Synced</span>
              <span className="font-bold text-slate-200 font-mono">
                {events.length}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MAIN CALENDAR DISPLAY AREA (Responsive, fills all space)     */}
      {/* ============================================================ */}
      <main className={`flex-1 h-full min-w-0 flex flex-col ${themeClasses.main} rounded-2xl overflow-hidden`}>
        {/* ============================================================ */}
        {/* VIEW 1: MONTH GRID (Dim passed dates & multi-day bars)       */}
        {/* ============================================================ */}
        {viewMode === 'month' && (
          <div className="flex-1 h-full flex flex-col min-h-0">
            {/* Weekday Headers */}
            <div className={`grid grid-cols-7 border-b ${themeClasses.header} text-center py-2 shrink-0 font-bold text-xs md:text-sm tracking-wider uppercase`}>
              {daysOfWeek.map((d, i) => (
                <div key={i} className={i === 5 || i === 6 ? 'text-slate-500' : ''}>
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks Container */}
            <div className="flex-1 h-full flex flex-col min-h-0 divide-y divide-slate-800/80">
              {monthData.weeks.map((week) => (
                <div 
                  key={week.weekIndex}
                  className="flex-1 min-h-0 flex flex-col relative group"
                >
                  {/* Background Columns & Grid Borders (7 columns) */}
                  <div className="absolute inset-0 grid grid-cols-7 divide-x divide-slate-800/80 pointer-events-none">
                    {week.days.map((day, dIdx) => (
                      <div
                        key={dIdx}
                        className={`h-full transition-opacity ${
                          day.isToday 
                            ? 'bg-sky-950/25 ring-1 ring-inset ring-sky-500/30' 
                            : day.isPassed
                            ? 'opacity-40 bg-slate-950/40'
                            : !day.isCurrentMonth 
                            ? 'bg-slate-950/30' 
                            : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Foreground Content for the Week */}
                  <div className="relative z-10 flex flex-col h-full min-h-0">
                    {/* 1. Day Numbers Header Row */}
                    <div className="grid grid-cols-7 shrink-0 px-1 pt-1 pb-0.5">
                      {week.days.map((day, dIdx) => {
                        const timedEvents = week.timedEventsByDay[dIdx] || [];
                        const hasEvents = timedEvents.length > 0;
                        return (
                          <div
                            key={dIdx}
                            className={`flex items-center justify-between px-1.5 cursor-pointer ${
                              day.isPassed && !day.isToday ? 'opacity-50 hover:opacity-100 transition-opacity' : ''
                            }`}
                            onClick={() => handleOpenDayModal(day.date)}
                          >
                            <span
                              className={`text-[11px] lg:text-xs font-bold w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-full transition-transform hover:scale-110 ${
                                day.isToday
                                  ? themeClasses.todayBadge
                                  : day.isPassed
                                  ? 'text-slate-500 font-normal'
                                  : day.isCurrentMonth
                                  ? 'text-slate-200'
                                  : 'text-slate-600'
                              }`}
                            >
                              {day.dayNumber}
                            </span>

                            {hasEvents && (
                              <span className="text-[9px] text-slate-400 font-mono hidden md:inline">
                                {timedEvents.length}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* 2. All-Day & Multi-Day Spanning Bars Area */}
                    {week.allDaySegments.length > 0 && (
                      <div 
                        className="grid grid-cols-7 gap-y-1 px-1 my-0.5 shrink-0"
                        style={{
                          gridTemplateRows: `repeat(${week.maxTracks}, minmax(18px, auto))`,
                        }}
                      >
                        {week.allDaySegments.map((seg, sIdx) => {
                          const contrast = getContrastColor(seg.event.color);
                          const isPastSegment = week.days[seg.endCol]?.isPassed && !week.days[seg.startCol]?.isToday;
                          return (
                            <div
                              key={`${seg.event.id}-${week.weekIndex}-${sIdx}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEvent(seg.event);
                              }}
                              style={{
                                gridColumnStart: seg.startCol + 1,
                                gridColumnEnd: seg.endCol + 2,
                                gridRowStart: seg.track + 1,
                                backgroundColor: seg.event.color || '#0284c7',
                                color: contrast.text,
                              }}
                              className={`
                                relative h-[18px] lg:h-[20px] flex items-center px-1.5 z-10 cursor-pointer
                                shadow-sm hover:brightness-110 active:scale-[0.99] transition-all select-none
                                ${seg.isStart ? 'rounded-l-md' : 'rounded-l-none border-l border-dashed border-white/60'}
                                ${seg.isEnd ? 'rounded-r-md' : 'rounded-r-none border-r border-dashed border-white/60'}
                                ${isPastSegment ? 'opacity-40 saturate-50 hover:opacity-100 hover:saturate-100' : ''}
                              `}
                              title={seg.event.title}
                            >
                              <span className="text-[10px] lg:text-[11px] font-bold truncate leading-none">
                                {seg.event.title}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 3. Timed Events Section */}
                    <div className="flex-1 min-h-0 grid grid-cols-7 gap-1 px-1 overflow-hidden">
                      {week.days.map((day, dIdx) => {
                        const dayTimedEvents = week.timedEventsByDay[dIdx] || [];
                        const isDimmed = day.isPassed && !day.isToday;
                        return (
                          <div 
                            key={dIdx}
                            className={`flex flex-col gap-1 min-h-0 overflow-y-auto scrollbar-none pb-1 ${
                              isDimmed ? 'opacity-60 hover:opacity-100 transition-opacity' : ''
                            }`}
                            onClick={() => handleOpenDayModal(day.date)}
                          >
                            {dayTimedEvents.map((ev) => (
                              <div
                                key={ev.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEvent(ev);
                                }}
                                className="px-1.5 py-0.5 rounded text-[10px] leading-tight truncate border transition-all cursor-pointer hover:brightness-125"
                                style={{
                                  backgroundColor: `${ev.color}25`,
                                  borderColor: `${ev.color}50`,
                                  color: '#ffffff',
                                  borderLeft: `3px solid ${ev.color}`,
                                }}
                                title={`${formatTime(ev.start, false)} - ${ev.title}`}
                              >
                                <span className="font-mono text-[9px] opacity-75 mr-1 hidden lg:inline">
                                  {formatTimeOnly(ev.start)}
                                </span>
                                <span className="font-semibold">{ev.title}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: WEEK VIEW (Dimmed passed day columns)                 */}
        {/* ============================================================ */}
        {viewMode === 'week' && (
          <div className="flex-1 h-full min-h-0 flex flex-col">
            {/* Weekday & Date Header */}
            <div className={`grid grid-cols-7 border-b ${themeClasses.header} text-center py-2.5 shrink-0 divide-x divide-slate-800/80`}>
              {weekInfo.days.map((day, idx) => (
                <div key={idx} className={`px-2 ${day.isPassed && !day.isToday ? 'opacity-50' : ''}`}>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    {day.dayName}
                  </span>
                  <span
                    className={`text-lg md:text-xl font-black inline-block mt-0.5 ${
                      day.isToday ? 'text-sky-400' : 'text-white'
                    }`}
                  >
                    {day.dayNum}
                  </span>
                </div>
              ))}
            </div>

            {/* All-Day Spanning Bars Section for Week View */}
            {weekInfo.allDaySegments.length > 0 && (
              <div className="border-b border-slate-800/80 bg-slate-950/40 p-2 shrink-0">
                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1.5 px-1">
                  All-Day & Multi-Day
                </div>
                <div
                  className="grid grid-cols-7 gap-y-1.5 gap-x-1"
                  style={{
                    gridTemplateRows: `repeat(${weekInfo.maxTracks}, minmax(22px, auto))`,
                  }}
                >
                  {weekInfo.allDaySegments.map((seg, sIdx) => {
                    const contrast = getContrastColor(seg.event.color);
                    const isPastSegment = weekInfo.days[seg.endCol]?.isPassed && !weekInfo.days[seg.startCol]?.isToday;
                    return (
                      <div
                        key={`${seg.event.id}-week-${sIdx}`}
                        onClick={() => setSelectedEvent(seg.event)}
                        style={{
                          gridColumnStart: seg.startCol + 1,
                          gridColumnEnd: seg.endCol + 2,
                          gridRowStart: seg.track + 1,
                          backgroundColor: seg.event.color || '#0284c7',
                          color: contrast.text,
                        }}
                        className={`
                          relative h-[22px] lg:h-[24px] flex items-center px-2 z-10 cursor-pointer
                          shadow-sm hover:brightness-110 active:scale-[0.99] transition-all select-none
                          ${seg.isStart ? 'rounded-l-lg' : 'rounded-l-none border-l-2 border-dashed border-white/60 pl-1.5'}
                          ${seg.isEnd ? 'rounded-r-lg' : 'rounded-r-none border-r-2 border-dashed border-white/60 pr-1.5'}
                          ${isPastSegment ? 'opacity-40 saturate-50 hover:opacity-100 hover:saturate-100' : ''}
                        `}
                        title={seg.event.title}
                      >
                        {!seg.isStart && <span className="text-[9px] opacity-75 mr-1 font-mono">◀</span>}
                        <span className="text-[10px] lg:text-[11px] font-bold truncate leading-none flex-1">
                          {seg.event.title}
                        </span>
                        {!seg.isEnd && <span className="text-[9px] opacity-75 ml-1 font-mono">▶</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 7 Daily Columns for Timed Events */}
            <div className="flex-1 h-full min-h-0 grid grid-cols-7 divide-x divide-slate-800">
              {weekInfo.days.map((day, idx) => {
                const dayEvents = weekInfo.timedEventsByDay[idx] || [];
                const isDimmed = day.isPassed && !day.isToday;
                return (
                  <div
                    key={idx}
                    className={`flex flex-col h-full min-h-0 p-2.5 overflow-hidden transition-opacity ${
                      day.isToday
                        ? 'bg-sky-950/20'
                        : isDimmed
                        ? 'bg-slate-950/60 opacity-55 hover:opacity-100'
                        : 'bg-slate-900/40'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 overflow-y-auto agenda-scroll pr-1 min-h-0">
                      {dayEvents.length === 0 ? (
                        <div className="text-[10px] text-slate-600 text-center pt-8">
                          No timed events
                        </div>
                      ) : (
                        dayEvents.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className="p-2 rounded-xl border transition-all cursor-pointer hover:bg-slate-800/80 shadow-sm"
                            style={{
                              backgroundColor: `${ev.color}15`,
                              borderColor: `${ev.color}35`,
                              borderLeft: `3px solid ${ev.color}`,
                            }}
                          >
                            <div className="text-[9.5px] font-mono text-sky-300 font-semibold flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 opacity-70" />
                              <span>{formatTimeOnly(ev.start)}</span>
                            </div>
                            <h4 className="text-[10.5px] lg:text-[11px] font-bold text-white mt-0.5 break-words whitespace-normal leading-tight">
                              {ev.title}
                            </h4>
                            {ev.location && (
                              <div className="flex items-center gap-1 text-[9.5px] text-slate-400 mt-0.5 truncate">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{ev.location}</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: DAY VIEW (Hourly Schedule & Day Overview)            */}
        {/* ============================================================ */}
        {viewMode === 'day' && (
          <div className="flex-1 h-full min-h-0 flex flex-col p-4 md:p-6 overflow-y-auto agenda-scroll">
            {/* Day Header Banner */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider ${
                  dayInfo.isToday
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                    : dayInfo.isPassed
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                }`}>
                  {dayInfo.isToday ? 'Today' : dayInfo.isPassed ? 'Past Day' : 'Upcoming'}
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white">
                  {currentDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h2>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                {dayInfo.totalEvents} event{dayInfo.totalEvents === 1 ? '' : 's'}
              </div>
            </div>

            {/* All-Day Events Banner */}
            {dayInfo.allDayEvents.length > 0 && (
              <div className="mb-6 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                  All-Day & Multi-Day
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {dayInfo.allDayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-850 transition-all cursor-pointer shadow-md flex items-start gap-3"
                      style={{ borderLeft: `4px solid ${ev.color}` }}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          {ev.calendarName}
                        </span>
                        <h4 className="text-sm font-bold text-white leading-snug mt-0.5">
                          {ev.title}
                        </h4>
                        {ev.location && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timed Events Schedule Grid */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Day Schedule
              </span>

              {dayInfo.timedEvents.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80 space-y-2">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-semibold text-slate-300">No timed events scheduled</h4>
                  <p className="text-xs text-slate-500">Enjoy your free time!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dayInfo.timedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => setSelectedEvent(ev)}
                      className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:bg-slate-800/60 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm hover:border-slate-700"
                      style={{ borderLeft: `4px solid ${ev.color}` }}
                    >
                      <div className="flex items-start md:items-center gap-3 min-w-0">
                        <div className="w-20 shrink-0">
                          <span className="text-xs font-mono font-bold text-sky-400 block">
                            {formatTimeOnly(ev.start)}
                          </span>
                          {ev.end && (
                            <span className="text-[10px] font-mono text-slate-500 block">
                              to {formatTimeOnly(ev.end)}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">
                            {ev.title}
                          </h4>
                          {ev.location && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="truncate">{ev.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: ev.color }}
                        />
                        <span className="text-xs text-slate-400 font-medium">
                          {ev.calendarName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 4: YEAR VIEW (12 Month Grid Cards, Dimmed Past Days)     */}
        {/* ============================================================ */}
        {viewMode === 'year' && (
          <div className="flex-1 h-full min-h-0 p-4 md:p-6 overflow-y-auto agenda-scroll">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <h2 className="text-xl md:text-2xl font-black text-white">
                Year {yearData.year}
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Click any day to open Day View, or month header for Month Grid
              </span>
            </div>

            {/* 12 Months Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {yearData.months.map((m) => (
                <div
                  key={m.monthIndex}
                  className="bg-slate-950/60 rounded-xl border border-slate-800/80 p-3 hover:border-slate-700 transition-colors flex flex-col"
                >
                  {/* Month Title (Clickable to jump to month view) */}
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date(yearData.year, m.monthIndex, 1);
                      setCurrentDate(d);
                      setViewMode('month');
                    }}
                    className="text-left font-bold text-sm text-sky-400 hover:text-sky-300 pb-2 mb-2 border-b border-slate-800/80 flex items-center justify-between group cursor-pointer"
                  >
                    <span>{m.monthName}</span>
                    <span className="text-[10px] text-slate-500 group-hover:text-sky-300 font-normal">
                      Month View →
                    </span>
                  </button>

                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 mb-1.5">
                    {daysOfWeek.map((d, i) => (
                      <span key={i}>{d.slice(0, 1)}</span>
                    ))}
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center text-[11px]">
                    {m.dayCells.map((cell) => {
                      if (cell.blank) {
                        return <div key={cell.key} className="h-6" />;
                      }

                      return (
                        <button
                          key={cell.key}
                          type="button"
                          onClick={() => {
                            if (cell.date) {
                              setCurrentDate(cell.date);
                              setViewMode('day');
                            }
                          }}
                          className={`h-6 rounded-md flex flex-col items-center justify-center relative cursor-pointer transition-all hover:scale-110 ${
                            cell.isToday
                              ? 'bg-sky-500 text-white font-black shadow-sm'
                              : cell.isPassed
                              ? 'text-slate-600 font-normal hover:text-slate-300'
                              : 'text-slate-300 hover:bg-slate-800 font-medium'
                          }`}
                          title={`${cell.dateKey}${cell.hasEvents ? ` (${cell.events.length} events)` : ''}`}
                        >
                          <span className="leading-none">{cell.dayNum}</span>
                          {cell.hasEvents && (
                            <span
                              className={`w-1 h-1 rounded-full mt-0.5 ${
                                cell.isToday ? 'bg-white' : 'bg-sky-400'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 5: FAMILY COLUMNS                                       */}
        {/* ============================================================ */}
        {viewMode === 'columns' && (
          <div className="flex-1 h-full min-h-0 grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-800">
            {feeds.map((feed) => {
              const feedEvents = activeEvents.filter((ev) => ev.calendarId === feed.id);
              return (
                <div key={feed.id} className="flex flex-col h-full min-h-0 p-4 overflow-hidden">
                  {/* Column Header */}
                  <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-800 shrink-0">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0"
                      style={{ backgroundColor: feed.color }}
                    >
                      {feed.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{feed.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {feedEvents.length} events
                      </span>
                    </div>
                  </div>

                  {/* Events List */}
                  <div className="flex-1 overflow-y-auto space-y-2 agenda-scroll pr-1">
                    {feedEvents.length === 0 ? (
                      <div className="text-xs text-slate-600 text-center pt-8">
                        No events for this calendar
                      </div>
                    ) : (
                      feedEvents.map((ev) => {
                        const { isAllDayOrMultiDay, endDate } = normalizeEventDates(ev);
                        const isPassed = endDate.getTime() < startOfToday.getTime();
                        return (
                          <div
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className={`p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 transition-all cursor-pointer shadow-sm hover:border-slate-700 ${
                              isPassed ? 'opacity-45 hover:opacity-100 transition-opacity' : ''
                            }`}
                            style={{ borderLeft: `3px solid ${feed.color}` }}
                          >
                            <span className="text-[10px] font-mono text-sky-300 font-semibold block">
                              {formatTime(ev.start, isAllDayOrMultiDay)}
                            </span>
                            <h4 className="text-xs font-bold text-white mt-0.5 break-words whitespace-normal leading-tight">
                              {ev.title}
                            </h4>
                            {ev.location && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 truncate">
                                <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                                <span className="truncate">{ev.location}</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODAL: DAY EVENTS LIST MODAL                                 */}
      {/* ============================================================ */}
      {selectedDayEvents && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedDayEvents(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div>
                <span className="text-xs font-mono text-sky-400 font-semibold block uppercase tracking-wider">
                  {selectedDayEvents.dayDate.toLocaleDateString(undefined, { weekday: 'long' })}
                </span>
                <h3 className="text-lg font-black text-white">
                  {selectedDayEvents.dayDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 agenda-scroll">
              {selectedDayEvents.events.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-8">
                  No events on this date
                </div>
              ) : (
                selectedDayEvents.events.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setSelectedDayEvents(null);
                      setSelectedEvent(ev);
                    }}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-800/80 cursor-pointer transition-all flex items-center justify-between"
                    style={{ borderLeft: `4px solid ${ev.color}` }}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-mono text-sky-300 font-semibold block">
                        {formatTime(ev.start, ev.allDay)}
                      </span>
                      <h4 className="text-sm font-bold text-white break-words whitespace-normal mt-0.5 leading-snug">
                        {ev.title}
                      </h4>
                      {ev.location && (
                        <span className="text-xs text-slate-400 block truncate mt-0.5">{ev.location}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EVENT DETAILS                                         */}
      {/* ============================================================ */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span 
                  className="w-3.5 h-3.5 rounded-full shrink-0" 
                  style={{ backgroundColor: selectedEvent.color }} 
                />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {selectedEvent.calendarName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-white break-words whitespace-normal">
              {selectedEvent.title}
            </h3>

            <div className="space-y-2 text-xs md:text-sm text-slate-300 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  {selectedEvent.allDay ? (
                    (() => {
                      const { startDate, endDate, isMultiDay } = normalizeEventDates(selectedEvent);
                      if (isMultiDay) {
                        return (
                          <>
                            <span className="font-semibold text-white">
                              {startDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                              {' – '}
                              {endDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <br />
                            <span className="font-mono text-sky-300 font-semibold">
                              All Day (Multi-Day Span)
                            </span>
                          </>
                        );
                      }
                      return (
                        <>
                          <span className="font-semibold text-white">
                            {startDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                          </span>
                          <br />
                          <span className="font-mono text-sky-300 font-semibold">All Day</span>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <span className="font-semibold text-white">
                        {new Date(selectedEvent.start).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                      <br />
                      <span className="font-mono text-sky-300">
                        {formatTime(selectedEvent.start, false)}
                        {selectedEvent.end && ` – ${formatTime(selectedEvent.end, false)}`}
                      </span>
                    </>
                  )}
                </span>
              </div>

              {selectedEvent.location && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}

              {selectedEvent.description && (
                <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 leading-relaxed max-h-40 overflow-y-auto">
                  {selectedEvent.description}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
