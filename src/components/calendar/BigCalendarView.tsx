import React, { useState, useMemo } from 'react';
import { CalendarEvent, CalendarFeed } from '../../types/config';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Users, 
  X,
  CalendarRange,
} from 'lucide-react';

interface BigCalendarViewProps {
  events: CalendarEvent[];
  feeds: CalendarFeed[];
  onRefresh?: () => void;
}

interface MonthCalendarDay {
  date: Date;
  dayNumber: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
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

    // Safety guard: if an event still arrived with raw RFC 5545 exclusive DTEND
    // (e.g. midnight 00:00:00 on the day after):
    if (e.getTime() > s.getTime() && e.getHours() === 0 && e.getMinutes() === 0 && e.getSeconds() === 0) {
      e = new Date(e.getTime() - 1000);
    }
  } else {
    s = new Date(ev.start);
    e = ev.end ? new Date(ev.end) : new Date(s.getTime() + 60 * 60 * 1000);
  }

  const startDate = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0);
  const endDate = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0);

  const isMultiDay = endDate.getTime() > startDate.getTime();
  const isAllDayOrMultiDay = Boolean(ev.allDay || isMultiDay);

  return {
    start: s,
    end: e,
    startDate,
    endDate,
    isMultiDay,
    isAllDayOrMultiDay,
  };
}

function assignTracks(segments: WeekEventSegment[]): { segments: WeekEventSegment[]; maxTracks: number } {
  const sorted = [...segments].sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    if (b.span !== a.span) return b.span - a.span;
    return a.event.title.localeCompare(b.event.title);
  });

  const tracks: boolean[][] = [];

  for (const seg of sorted) {
    let t = 0;
    while (true) {
      if (!tracks[t]) tracks[t] = [];
      let fits = true;
      for (let col = seg.startCol; col <= seg.endCol; col++) {
        if (tracks[t][col]) {
          fits = false;
          break;
        }
      }
      if (fits) {
        seg.track = t;
        for (let col = seg.startCol; col <= seg.endCol; col++) {
          tracks[t][col] = true;
        }
        break;
      }
      t++;
    }
  }

  return { segments: sorted, maxTracks: tracks.length };
}

export const BigCalendarView: React.FC<BigCalendarViewProps> = ({
  events,
  feeds,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'columns'>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dayDate: Date; events: CalendarEvent[] } | null>(null);
  const [activeFeedIds, setActiveFeedIds] = useState<Set<string>>(
    new Set(feeds.map((f) => f.id))
  );

  React.useEffect(() => {
    setActiveFeedIds(new Set(feeds.map((f) => f.id)));
  }, [feeds]);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = useMemo(() => new Date(), []);

  // Filter events by active feeds
  const activeEvents = useMemo(() => {
    return events.filter((ev) => activeFeedIds.has(ev.calendarId));
  }, [events, activeFeedIds]);

  // Compute Month Structure with Weeks and Spanning All-Day / Multi-Day Bars
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleDateString(undefined, { month: 'long' });
    const monthTitle = `${monthName} ${year}`;

    // First day of this month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

    // Start date of the first week (can be in previous month)
    const calendarStartDate = new Date(year, month, 1 - firstDayOfWeek);
    calendarStartDate.setHours(0, 0, 0, 0);

    // Calculate total weeks (usually 5 or 6)
    const totalDaysNeeded = firstDayOfWeek + daysInCurrentMonth;
    const numWeeks = Math.ceil(totalDaysNeeded / 7);

    // Build weeks array
    const weeks: MonthCalendarWeek[] = [];

    for (let w = 0; w < numWeeks; w++) {
      const days: MonthCalendarDay[] = [];
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(calendarStartDate);
        dayDate.setDate(calendarStartDate.getDate() + (w * 7 + d));
        dayDate.setHours(0, 0, 0, 0);

        const isCurrentMonth = dayDate.getMonth() === month;
        const isToday = dayDate.toDateString() === today.toDateString();
        const dateKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;

        days.push({
          date: dayDate,
          dayNumber: dayDate.getDate(),
          month: dayDate.getMonth(),
          year: dayDate.getFullYear(),
          isCurrentMonth,
          isToday,
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
            // Find startCol and endCol
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
            // Timed event (single day)
            for (let i = 0; i < 7; i++) {
              if (startDate.getTime() === days[i].date.getTime()) {
                timedEventsByDay[i].push(ev);
                break;
              }
            }
          }
        }
      }

      // Sort timed events for each day
      for (let i = 0; i < 7; i++) {
        timedEventsByDay[i].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      }

      const { segments: allDaySegments, maxTracks } = assignTracks(rawSegments);

      weeks.push({
        weekIndex: w,
        startDate: weekStartDate,
        endDate: weekEndDate,
        days,
        allDaySegments,
        maxTracks,
        timedEventsByDay,
      });
    }

    return {
      year,
      month,
      monthName,
      monthTitle,
      numWeeks,
      weeks,
    };
  }, [currentDate, activeEvents, today]);

  // Compute Week View data with All-Day Spanning Bar area and Daily Timed columns
  const weekInfo = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(d.getDate() + i);
      days.push({
        date: d,
        dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: d.toDateString() === today.toDateString(),
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

    const { segments: allDaySegments, maxTracks } = assignTracks(rawSegments);
    const weekTitle = `${days[0].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

    return { days, weekTitle, allDaySegments, maxTracks, timedEventsByDay };
  }, [currentDate, activeEvents, today]);

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

  const nextPeriod = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const prevPeriod = () => {
    const prev = new Date(currentDate);
    if (viewMode === 'month') {
      prev.setMonth(prev.getMonth() - 1);
    } else {
      prev.setDate(prev.getDate() - 7);
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
      const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return t.getTime() >= startDate.getTime() && t.getTime() <= endDate.getTime();
    }).length;
  }, [activeEvents, today]);

  // Open day events list helper
  const handleOpenDayModal = (dayDate: Date) => {
    const targetTime = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate()).getTime();
    const dayEvents = activeEvents.filter((ev) => {
      const { startDate, endDate } = normalizeEventDates(ev);
      return targetTime >= startDate.getTime() && targetTime <= endDate.getTime();
    });
    setSelectedDayEvents({ dayDate, events: dayEvents });
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-white font-sans pb-[58px] pt-3 px-3 md:px-5 flex flex-row gap-3 md:gap-4 select-none">
      {/* ============================================================ */}
      {/* LEFT-HAND SIDEBAR CONTROLS (Frees up 100% vertical space)    */}
      {/* ============================================================ */}
      <aside className="w-64 md:w-72 lg:w-80 shrink-0 h-full flex flex-col justify-between bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 md:p-5 shadow-2xl overflow-y-auto scrollbar-none">
        <div className="space-y-5">
          {/* Calendar Month & Navigation */}
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shadow-md shrink-0">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono tracking-widest text-sky-400 uppercase font-semibold block">
                  {monthData.year}
                </span>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white leading-none">
                  {viewMode === 'month' ? monthData.monthName : 'Schedule'}
                </h1>
              </div>
            </div>

            {viewMode !== 'month' && (
              <p className="text-xs text-slate-400 font-medium mb-2">
                {weekInfo.weekTitle}
              </p>
            )}

            {/* Previous / Today / Next Navigation */}
            <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-slate-800">
              <button
                onClick={prevPeriod}
                className="col-span-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700 flex items-center justify-center active:scale-95 shadow-sm"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={goToToday}
                className="col-span-2 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-sky-300 hover:text-sky-200 rounded-xl transition-colors border border-slate-700 flex items-center justify-center active:scale-95 shadow-sm"
              >
                Today
              </button>

              <button
                onClick={nextPeriod}
                className="col-span-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700 flex items-center justify-center active:scale-95 shadow-sm"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block px-1">
              View Layout
            </span>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setViewMode('month')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                  viewMode === 'month'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <CalendarRange className="w-4 h-4" />
                <span>Month Grid</span>
              </button>

              <button
                onClick={() => setViewMode('week')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                  viewMode === 'week'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Week View</span>
              </button>

              <button
                onClick={() => setViewMode('columns')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs md:text-sm font-semibold transition-all ${
                  viewMode === 'columns'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Family Columns</span>
              </button>
            </div>
          </div>

          {/* Calendar Feeds Filter */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Calendars ({feeds.length})
              </span>
              <button
                onClick={selectAllFeeds}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold"
              >
                Select All
              </button>
            </div>

            <div className="space-y-1">
              {feeds.map((feed) => {
                const active = activeFeedIds.has(feed.id);
                const count = events.filter((e) => e.calendarId === feed.id).length;
                return (
                  <button
                    key={feed.id}
                    onClick={() => toggleFeed(feed.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
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
        </div>

        {/* Sidebar Footer Stats */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
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
      <main className="flex-1 h-full min-w-0 flex flex-col bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* ============================================================ */}
        {/* VIEW 1: MONTH GRID (Continuous multi-day bars across days)   */}
        {/* ============================================================ */}
        {viewMode === 'month' && (
          <div className="flex-1 h-full flex flex-col min-h-0">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/80 text-center py-2 shrink-0 font-bold text-xs md:text-sm text-slate-400 tracking-wider uppercase">
              {daysOfWeek.map((d, i) => (
                <div key={i} className={i === 0 || i === 6 ? 'text-slate-500' : ''}>
                  {d}
                </div>
              ))}
            </div>

            {/* Weeks Container (flex-1 with min-h-0 so each week expands equally) */}
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
                        className={`h-full ${
                          day.isToday 
                            ? 'bg-sky-950/20' 
                            : !day.isCurrentMonth 
                            ? 'bg-slate-950/40' 
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
                            className="flex items-center justify-between px-1.5 cursor-pointer"
                            onClick={() => handleOpenDayModal(day.date)}
                          >
                            <span
                              className={`text-[11px] lg:text-xs font-bold w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-full transition-transform hover:scale-110 ${
                                day.isToday
                                  ? 'bg-sky-500 text-white shadow-md ring-2 ring-sky-400/40'
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
                                relative h-[20px] lg:h-[22px] flex items-center px-1.5 z-10 cursor-pointer
                                shadow-sm hover:brightness-110 active:scale-[0.99] transition-all select-none
                                ${seg.isStart ? 'rounded-l-md ml-0.5' : 'rounded-l-none border-l-2 border-dashed border-white/60 pl-1'}
                                ${seg.isEnd ? 'rounded-r-md mr-0.5' : 'rounded-r-none border-r-2 border-dashed border-white/60 pr-1'}
                              `}
                              title={`${seg.event.title} (${seg.event.calendarName})`}
                            >
                              {/* Left continuation marker */}
                              {!seg.isStart && (
                                <span className="text-[8px] opacity-75 mr-1 font-mono font-bold">◀</span>
                              )}

                              {/* Event title - small, wrapping/truncate as needed */}
                              <span className="text-[9.5px] lg:text-[10.5px] font-bold truncate leading-none drop-shadow-xs flex-1">
                                {seg.event.title}
                              </span>

                              {/* Right continuation marker */}
                              {!seg.isEnd && (
                                <span className="text-[8px] opacity-75 ml-1 font-mono font-bold">▶</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* 3. Daily Timed Events (7 columns, text wrapped, small font) */}
                    <div className="grid grid-cols-7 flex-1 min-h-0 px-1 pb-1">
                      {week.days.map((day, dIdx) => {
                        const dayEvents = week.timedEventsByDay[dIdx] || [];
                        return (
                          <div 
                            key={dIdx} 
                            className="h-full flex flex-col justify-start px-0.5 overflow-hidden"
                            onClick={() => handleOpenDayModal(day.date)}
                          >
                            <div className="space-y-0.5 overflow-y-auto scrollbar-none flex-1 min-h-0">
                              {dayEvents.slice(0, 4).map((ev) => (
                                <div
                                  key={ev.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(ev);
                                  }}
                                  className="w-full px-1 py-0.5 rounded hover:bg-slate-800/70 transition-colors cursor-pointer group"
                                  title={ev.title}
                                >
                                  {/* Time with color dot */}
                                  <div className="flex items-center gap-1 leading-none mb-0.5">
                                    <span
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ backgroundColor: ev.color || '#38bdf8' }}
                                    />
                                    <span 
                                      className="font-bold font-mono text-[8.5px] lg:text-[9.5px]"
                                      style={{ color: ev.color || '#facc15' }}
                                    >
                                      {formatTimeOnly(ev.start)}
                                    </span>
                                  </div>

                                  {/* Title - small font, wraps to next line, never cut off */}
                                  <div className="text-[9px] lg:text-[10px] font-medium text-white/95 leading-tight break-words whitespace-normal pl-2.5">
                                    {ev.title}
                                  </div>
                                </div>
                              ))}

                              {/* More events indicator */}
                              {dayEvents.length > 4 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenDayModal(day.date);
                                  }}
                                  className="text-[8.5px] lg:text-[9.5px] text-sky-400 font-semibold hover:underline block text-left pl-1 pt-0.5"
                                >
                                  +{dayEvents.length - 4} more
                                </button>
                              )}
                            </div>
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
        {/* VIEW 2: WEEK VIEW (With Spanning All-Day Multi-Day Bar Area) */}
        {/* ============================================================ */}
        {viewMode === 'week' && (
          <div className="flex-1 h-full min-h-0 flex flex-col">
            {/* Weekday & Date Header */}
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/80 text-center py-2.5 shrink-0 divide-x divide-slate-800/80">
              {weekInfo.days.map((day, idx) => (
                <div key={idx} className="px-2">
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
                return (
                  <div
                    key={idx}
                    className={`flex flex-col h-full min-h-0 p-2.5 overflow-hidden ${
                      day.isToday ? 'bg-sky-950/20' : 'bg-slate-900/40'
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
        {/* VIEW 3: FAMILY COLUMNS (Fills 100% of height)               */}
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
                      {feed.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-white truncate">{feed.name}</h3>
                      <span className="text-[11px] text-slate-400">
                        {feedEvents.length} events
                      </span>
                    </div>
                  </div>

                  {/* Column Events (small font, wrapped text) */}
                  <div className="space-y-2 flex-1 overflow-y-auto agenda-scroll pr-1 min-h-0">
                    {feedEvents.length === 0 ? (
                      <div className="text-[11px] text-slate-600 text-center pt-12">
                        No scheduled events
                      </div>
                    ) : (
                      feedEvents.map((ev) => {
                        const evDate = new Date(ev.start);
                        const dateStr = evDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                        return (
                          <div
                            key={ev.id}
                            onClick={() => setSelectedEvent(ev)}
                            className="p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 hover:border-slate-700 transition-all cursor-pointer shadow-md"
                            style={{ borderLeft: `3px solid ${feed.color}` }}
                          >
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                              <span className="font-semibold text-sky-300">{dateStr}</span>
                              <span>{formatTime(ev.start, ev.allDay)}</span>
                            </div>
                            <h4 className="text-[11px] lg:text-xs font-bold text-white break-words whitespace-normal leading-snug">
                              {ev.title}
                            </h4>
                            {ev.location && (
                              <div className="flex items-center gap-1 text-[9.5px] text-slate-400 mt-0.5 truncate">
                                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
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

      {/* Day Events Overview Modal (When clicking a day cell or +X more) */}
      {selectedDayEvents && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedDayEvents(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selectedDayEvents.dayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedDayEvents.events.length} events scheduled
                </span>
              </div>
              <button
                onClick={() => setSelectedDayEvents(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 flex-1 overflow-y-auto agenda-scroll pr-1">
              {selectedDayEvents.events.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-8">
                  No events for this date
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

      {/* Event Details Modal */}
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
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
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
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
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
