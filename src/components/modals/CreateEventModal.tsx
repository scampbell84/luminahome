import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '../../types/config';
import { 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Tag, 
  Check, 
  Trash2, 
  Sparkles, 
  CheckSquare, 
  CalendarPlus, 
  Bell 
} from 'lucide-react';

export interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialDate?: string; // YYYY-MM-DD
  initialMode?: 'event' | 'reminder';
  editingEvent?: CalendarEvent | null;
}

const EVENT_PRESET_CATEGORIES = [
  { label: 'Family Dinner', icon: '🍽️', color: '#38bdf8' },
  { label: 'School Run', icon: '🎒', color: '#fbbf24' },
  { label: 'Doctor / Dentist', icon: '🩺', color: '#f87171' },
  { label: 'Trash & Recycling', icon: '♻️', color: '#34d399' },
  { label: 'Work Meeting', icon: '💼', color: '#a855f7' },
  { label: 'Birthday / Party', icon: '🎉', color: '#ec4899' },
  { label: 'Workout / Sports', icon: '🏃', color: '#f97316' },
  { label: 'Home Chores', icon: '🧹', color: '#94a3b8' },
];

const REMINDER_PRESET_CATEGORIES = [
  { label: 'Take out bins & recycling', icon: '🗑️' },
  { label: 'Water indoor plants', icon: '🌿' },
  { label: 'Pick up groceries & milk', icon: '🛒' },
  { label: 'Take medicine / vitamins', icon: '💊' },
  { label: 'Call school / doctor', icon: '📞' },
  { label: 'Clean living room & kitchen', icon: '🧹' },
  { label: 'Collect parcel / delivery', icon: '📦' },
  { label: 'Pay monthly bills', icon: '💳' },
];

const COLOR_OPTIONS = [
  '#38bdf8', // Sky
  '#34d399', // Emerald
  '#a855f7', // Purple
  '#fbbf24', // Amber
  '#f87171', // Rose
  '#ec4899', // Pink
  '#f97316', // Orange
  '#64748b', // Slate
];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialDate,
  initialMode = 'event',
  editingEvent,
}) => {
  const [mode, setMode] = useState<'event' | 'reminder'>('event');

  // Event State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('#38bdf8');

  // Reminder State
  const [reminderText, setReminderText] = useState('');
  const [pinToCalendar, setPinToCalendar] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingEvent) {
      setMode('event');
      setTitle(editingEvent.title);
      const startD = new Date(editingEvent.start);
      setDate(startD.toISOString().slice(0, 10));
      setAllDay(Boolean(editingEvent.allDay));
      setStartTime(startD.toTimeString().slice(0, 5));
      const endD = new Date(editingEvent.end);
      setEndTime(endD.toTimeString().slice(0, 5));
      setLocation(editingEvent.location || '');
      setColor(editingEvent.color || '#38bdf8');
    } else {
      setMode(initialMode);
      const today = initialDate || new Date().toISOString().slice(0, 10);
      setDate(today);
      setTitle('');
      setReminderText('');
      setAllDay(false);
      setStartTime('09:00');
      setEndTime('10:00');
      setLocation('');
      setColor('#38bdf8');
      setPinToCalendar(true);
    }
    setError(null);
  }, [isOpen, initialDate, initialMode, editingEvent]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === 'event') {
        if (!title.trim()) {
          throw new Error('Please enter an event title');
        }
        if (!date) {
          throw new Error('Please choose a date');
        }

        const startIso = allDay
          ? `${date}T00:00:00.000Z`
          : new Date(`${date}T${startTime}:00`).toISOString();
        const endIso = allDay
          ? `${date}T23:59:59.000Z`
          : new Date(`${date}T${endTime}:00`).toISOString();

        const payload = {
          title: title.trim(),
          start: startIso,
          end: endIso,
          allDay,
          location: location.trim() || undefined,
          color,
        };

        const url = editingEvent
          ? `/api/calendar/events/${editingEvent.id}`
          : '/api/calendar/events';
        const method = editingEvent ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Failed to save event');
        }
      } else {
        // Reminder Mode
        if (!reminderText.trim()) {
          throw new Error('Please enter a reminder description');
        }

        // 1. Add to Notes Checklist
        const notesRes = await fetch('/api/notes/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: date ? `${reminderText.trim()} (${new Date(date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})` : reminderText.trim()
          }),
        });

        const notesData = await notesRes.json();
        if (!notesRes.ok || !notesData.ok) {
          throw new Error(notesData.error || 'Failed to add reminder');
        }

        // 2. If pinned to calendar, also save as all-day reminder event
        if (pinToCalendar && date) {
          await fetch('/api/calendar/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: `Reminder: ${reminderText.trim()}`,
              start: `${date}T00:00:00.000Z`,
              end: `${date}T23:59:59.000Z`,
              allDay: true,
              color: '#a855f7', // Purple for reminders
            }),
          });
        }
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/calendar/events/${editingEvent.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to delete event');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error deleting event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDisplayDate = date
    ? new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm ${
              mode === 'reminder'
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
            }`}>
              {mode === 'reminder' ? <CheckSquare className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                {editingEvent ? 'Edit Calendar Event' : mode === 'reminder' ? 'Add Household Reminder' : 'Add Calendar Event'}
              </h3>
              <p className="text-xs text-white/60">
                {formattedDisplayDate || 'Direct Touch Entry'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (only when not editing existing event) */}
        {!editingEvent && (
          <div className="px-5 pt-3 pb-1 border-b border-white/10 bg-black/20 flex gap-2">
            <button
              type="button"
              onClick={() => setMode('event')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'event'
                  ? 'bg-sky-500 text-white shadow-md'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Calendar Event</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('reminder')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'reminder'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>To-Do Reminder</span>
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-medium">
              {error}
            </div>
          )}

          {/* ===================== EVENT MODE ===================== */}
          {mode === 'event' && (
            <>
              {/* Quick Preset Chips */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {EVENT_PRESET_CATEGORIES.map((preset) => (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => {
                        setTitle(preset.label);
                        setColor(preset.color);
                      }}
                      className="px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/15 active:scale-95 border border-white/10 text-xs text-left font-medium transition-all flex items-center gap-1.5 truncate cursor-pointer"
                    >
                      <span className="text-sm shrink-0">{preset.icon}</span>
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Event Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Parent Teacher Conference"
                  className="w-full h-12 px-3.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm font-medium"
                  required
                  autoFocus
                />
              </div>

              {/* Date & All Day */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-white/80 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    required
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={() => setAllDay(!allDay)}
                    className={`h-11 px-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                      allDay
                        ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                        : 'bg-black/30 border-white/15 text-white/70 hover:text-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      allDay ? 'bg-sky-500 border-sky-400 text-white' : 'border-white/30'
                    }`}>
                      {allDay && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>All Day</span>
                  </button>
                </div>
              </div>

              {/* Start and End Times */}
              {!allDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-400" /> Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-black/40 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-sky-400" /> End Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-black/40 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                </div>
              )}

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-white/50" /> Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Community Hall, Living Room"
                  className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>

              {/* Color Tag */}
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-white/50" /> Color Accent
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-9 h-9 rounded-full transition-transform active:scale-90 flex items-center justify-center cursor-pointer ${
                        color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                    >
                      {color === c && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ===================== REMINDER MODE ===================== */}
          {mode === 'reminder' && (
            <>
              {/* Quick Preset Reminder Chips */}
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-purple-400" />
                  Quick Reminder Presets
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {REMINDER_PRESET_CATEGORIES.map((preset) => (
                    <button
                      type="button"
                      key={preset.label}
                      onClick={() => setReminderText(preset.label)}
                      className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/15 active:scale-95 border border-white/10 text-xs text-left font-medium transition-all flex items-center gap-2 truncate cursor-pointer"
                    >
                      <span className="text-base shrink-0">{preset.icon}</span>
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reminder Text Field */}
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Reminder / Task Description <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={reminderText}
                  onChange={(e) => setReminderText(e.target.value)}
                  placeholder="e.g., Take out recycling bins before 8am"
                  className="w-full h-12 px-3.5 rounded-xl bg-black/40 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm font-medium"
                  required
                  autoFocus
                />
              </div>

              {/* Target Date */}
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-black/40 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  required
                />
              </div>

              {/* Calendar Sync Checkbox */}
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">
                    Pin to Calendar on this Date
                  </span>
                  <span className="text-[11px] text-purple-200/70 block mt-0.5">
                    Displays an all-day reminder marker in the calendar grid and agenda
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={pinToCalendar}
                  onChange={(e) => setPinToCalendar(e.target.checked)}
                  className="w-5 h-5 rounded text-purple-600 cursor-pointer"
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/10">
            {editingEvent ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="h-12 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="h-12 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`h-12 px-7 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 ml-auto cursor-pointer ${
                mode === 'reminder'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/30'
                  : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/30'
              }`}
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    {editingEvent
                      ? 'Save Changes'
                      : mode === 'reminder'
                      ? 'Add Reminder'
                      : 'Add Calendar Event'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
