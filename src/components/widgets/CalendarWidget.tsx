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
    const today = new Date();
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
  }, [events, config.maxAgendaItems]);

  // Generate Month Grid Data including multi-day spanning events
  const monthData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
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
  }, [events]);

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
            <div className="text-xs uppercase tracking-wider font-bold text-sky-400 mb-1.5 flex items-center gap-1.5">
              <span>Today</span>
              <span className="text-[10px] bg-sky-500/20 px-1.5 py-0.5 rounded text-sky-300 font-mono">
                {groupedEvents.today.length}
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
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const blanks = Array.from({ length: monthData.firstDayIndex });
    const dayNumbers = Array.from({ length: monthData.daysInMonth }, (_, i) => i + 1);

    return (
      <div className="bg-black/30 backdrop-blur-md rounded-xl p-3 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white tracking-wide">
            {monthData.monthName}
          </span>
          <div className="flex items-center gap-1.5">
            {config.feeds.filter(f => f.enabled).map(feed => (
              <span 
                key={feed.id} 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: feed.color }}
                title={feed.name}
              />
            ))}
          </div>
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
            const dayEvents = monthData.eventsByDay[day] || [];
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={day}
                className={`h-8 lg:h-9 w-full rounded-lg flex flex-col items-center justify-center relative text-xs lg:text-sm transition-colors ${
                  isToday
                    ? 'bg-sky-500 font-bold text-white shadow-sm'
                    : hasEvents
                    ? 'bg-white/10 text-white font-medium hover:bg-white/20'
                    : 'text-white/70'
                }`}
              >
                <span>{day}</span>
                {hasEvents && !isToday && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev, idx) => (
                      <span
                        key={idx}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: ev.color || '#38bdf8' }}
                      />
                    ))}
                  </div>
                )}
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

        {/* Feeds legend */}
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
      </div>

      {/* Main Content according to view */}
      {view === 'agenda' && renderAgendaList()}
      {view === 'month' && renderMonthGrid()}
      {view === 'split' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          <div className="md:col-span-5">
            {renderMonthGrid()}
          </div>
          <div className="md:col-span-7">
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
