import React, { useState, useEffect, useMemo } from 'react';
import { CalendarEvent, AppConfig } from '../../types/config';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronRight } from 'lucide-react';

interface CalendarWidgetProps {
  config: AppConfig['calendar'];
}

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ config }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [view, setView] = useState<'split' | 'agenda' | 'month'>(config.view || 'split');
  const [todayDate, setTodayDate] = useState<Date>(() => new Date());

  useEffect(() => {
    setView(config.view || 'split');
  }, [config.view]);

  const fetchCalendar = async () => {
    try {
      const res = await fetch('/api/calendar');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.warn('Failed to fetch calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
    const intervalMinutes = Math.max(5, config.refreshIntervalMinutes || 15);
    const interval = setInterval(fetchCalendar, intervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [config.refreshIntervalMinutes, config.feeds]);

  // Synchronize calendar precisely across midnight so the highlight moves immediately
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      setTodayDate((prev) => {
        if (prev.toDateString() !== now.toDateString()) {
          // Midnight has arrived! Fetch fresh calendar data and advance date state
          fetchCalendar();
          return now;
        }
        return prev;
      });
    };

    // Check every second to switch at 00:00:00 without delay
    const midnightInterval = setInterval(checkMidnight, 1000);
    return () => clearInterval(midnightInterval);
  }, []);

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

  // Group events for agenda view with full multi-day support
  const groupedEvents = useMemo(() => {
    const today = new Date(todayDate);
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvents: CalendarEvent[] = [];
    const tomorrowEvents: CalendarEvent[] = [];
    const upcomingEvents: CalendarEvent[] = [];

    for (const ev of events) {
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
        e = ev.end ? new Date(ev.end) : s;
      }
      const sDate = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0);
      const eDate = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0);

      if (today.getTime() >= sDate.getTime() && today.getTime() <= eDate.getTime()) {
        todayEvents.push(ev);
      }
      if (tomorrow.getTime() >= sDate.getTime() && tomorrow.getTime() <= eDate.getTime()) {
        tomorrowEvents.push(ev);
      }
      if (sDate.getTime() > tomorrow.getTime()) {
        upcomingEvents.push(ev);
      }
    }

    return {
      today: todayEvents,
      tomorrow: tomorrowEvents,
      upcoming: upcomingEvents.slice(0, Math.max(config.maxAgendaItems || 15, 30)),
    };
  }, [events, todayDate, config.maxAgendaItems]);

  // Generate Month Grid Data including multi-day spanning events
  const monthData = useMemo(() => {
    const now = todayDate;
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const startOfWeek = config.startOfWeek || 'monday';
    const rawFirstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const firstDayIndex = startOfWeek === 'monday' 
      ? (rawFirstDayIndex + 6) % 7 
      : rawFirstDayIndex;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Map events by day number
    const eventsByDay: Record<number, CalendarEvent[]> = {};
    for (const ev of events) {
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
        e = ev.end ? new Date(ev.end) : s;
      }
      const sDay = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0);
      const eDay = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0);

      for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const d = new Date(year, month, dayNum);
        if (d.getTime() >= sDay.getTime() && d.getTime() <= eDay.getTime()) {
          if (!eventsByDay[dayNum]) eventsByDay[dayNum] = [];
          eventsByDay[dayNum].push(ev);
        }
      }
    }

    return {
      monthName,
      firstDayIndex,
      daysInMonth,
      currentDay: now.getDate(),
      eventsByDay,
    };
  }, [events, todayDate, config.startOfWeek]);

  const formatEventTime = (ev: CalendarEvent) => {
    if (ev.allDay) {
      const s = parseLocalDate(ev.start, false);
      const e = ev.end ? parseLocalDate(ev.end, true) : s;
      const sDate = new Date(s.getFullYear(), s.getMonth(), s.getDate(), 0, 0, 0);
      const eDate = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0);
      const isMulti = eDate.getTime() > sDate.getTime();
      return isMulti ? 'All Day (Multi-day)' : 'All Day';
    }
    const s = new Date(ev.start);
    return s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const formatUpcomingDateHeader = (dateStr: string) => {
    const d = parseLocalDate(dateStr, false);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const renderAgendaList = () => {
    const totalCount = groupedEvents.today.length + groupedEvents.tomorrow.length + groupedEvents.upcoming.length;

    if (totalCount === 0) {
      return (
        <div className="py-6 text-center text-white/50 text-sm">
          No upcoming events scheduled
        </div>
      );
    }

    return (
      <div className="space-y-3 agenda-scroll max-h-[320px] md:max-h-[380px] lg:max-h-[460px] xl:max-h-[520px] overflow-y-auto pr-2">
        {/* Today Section */}
        {groupedEvents.today.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wider font-extrabold text-sky-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 ring-2 ring-sky-300/40 animate-pulse shadow-sm" />
                <span>Today's Schedule</span>
              </span>
              <span className="text-[10px] bg-gradient-to-r from-sky-500 to-blue-600 text-white px-2 py-0.5 rounded-full font-mono font-bold shadow-md ring-1 ring-sky-300/40">
                {groupedEvents.today.length} {groupedEvents.today.length === 1 ? 'event' : 'events'}
              </span>
            </div>
            <div className="space-y-1.5">
              {groupedEvents.today.map((ev) => (
                <AgendaItem key={ev.id} event={ev} formatTime={formatEventTime} />
              ))}
            </div>
          </div>
        )}

        {/* Tomorrow Section */}
        {groupedEvents.tomorrow.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
              <span>Tomorrow</span>
              <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300 font-mono">
                {groupedEvents.tomorrow.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {groupedEvents.tomorrow.map((ev) => (
                <AgendaItem key={ev.id} event={ev} formatTime={formatEventTime} />
              ))}
            </div>
          </div>
        )}

        {/* Later This Week / Month */}
        {groupedEvents.upcoming.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wider font-bold text-emerald-400 mb-1.5">
              Upcoming
            </div>
            <div className="space-y-1.5">
              {groupedEvents.upcoming.map((ev) => (
                <AgendaItem 
                  key={ev.id} 
                  event={ev} 
                  formatTime={formatEventTime} 
                  dateHeader={formatUpcomingDateHeader(ev.start)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMonthGrid = () => {
    const startOfWeek = config.startOfWeek || 'monday';
    const days = startOfWeek === 'sunday' 
      ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] 
      : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const blanks = Array.from({ length: monthData.firstDayIndex });
    const dayNumbers = Array.from({ length: monthData.daysInMonth }, (_, i) => i + 1);

    return (
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white tracking-wide">
            {monthData.monthName}
          </span>
        </div>

        {/* Day of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {days.map((d, i) => (
            <span key={i} className="text-[11px] font-bold text-white/50">
              {d}
            </span>
          ))}
        </div>

        {/* Month Day Cells */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="h-7 w-full" />
          ))}

          {dayNumbers.map((day) => {
            const isToday = day === monthData.currentDay;
            const isPassed = day < monthData.currentDay;

            return (
              <div
                key={day}
                className={`h-8 lg:h-9 w-full rounded-lg flex items-center justify-center text-xs lg:text-sm transition-all ${
                  isToday
                    ? 'bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 font-black text-white shadow-lg shadow-sky-500/40 ring-2 ring-sky-300 ring-offset-2 ring-offset-slate-950 scale-105 z-10'
                    : isPassed
                    ? 'text-white/35 opacity-40'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                <span className="leading-none">{day}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col text-white select-none text-kiosk-shadow">
      {/* Widget Header with Feeds badges */}
      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-semibold tracking-wide">Schedule & Events</h2>
        </div>

        {/* Feeds legend - off by default, not shown here unless showLegend is true */}
        {config.showLegend && (
          <div className="flex items-center gap-2 text-xs">
            {config.feeds.filter(f => f.enabled).map((feed) => (
              <div key={feed.id} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: feed.color }} />
                <span className="text-white/80 text-[11px] font-medium hidden sm:inline">
                  {feed.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content according to view */}
      {view === 'agenda' && renderAgendaList()}
      {view === 'month' && renderMonthGrid()}
      {view === 'split' && (
        <div className="flex flex-col md:flex-row gap-3.5 items-start">
          <div className="w-full md:w-[250px] lg:w-[260px] shrink-0">
            {renderMonthGrid()}
          </div>
          <div className="flex-1 min-w-0 w-full">
            {renderAgendaList()}
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component: Individual Agenda Item
interface AgendaItemProps {
  event: CalendarEvent;
  formatTime: (e: CalendarEvent) => string;
  dateHeader?: string;
}

const AgendaItem: React.FC<AgendaItemProps> = ({ event, formatTime, dateHeader }) => {
  return (
    <div 
      className="bg-black/35 backdrop-blur-md rounded-lg p-2.5 border border-white/10 flex items-start gap-2.5 transition-all hover:bg-black/45"
      style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xs md:text-sm font-semibold text-white break-words leading-snug">
            {event.title}
          </h4>
          <span className="text-xs font-mono font-medium text-sky-200 shrink-0 flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3 opacity-70" />
            {dateHeader ? `${dateHeader} • ` : ''}{formatTime(event)}
          </span>
        </div>

        {event.location && (
          <div className="flex items-center gap-1 text-[11px] text-white/70 mt-0.5 truncate">
            <MapPin className="w-3 h-3 text-white/50 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
      </div>
    </div>
  );
};
