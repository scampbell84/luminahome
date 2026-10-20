import React, { useState, useEffect } from 'react';
import { AppConfig, ChecklistItem } from '../../types/config';
import { Quote, StickyNote, CheckSquare, Sparkles, Plus, Check, X } from 'lucide-react';

interface NotesWidgetProps {
  config: AppConfig['notes'];
  onChecklistChanged?: (items: ChecklistItem[]) => void;
}

export const NotesWidget: React.FC<NotesWidgetProps> = ({ config, onChecklistChanged }) => {
  const [dailyQuote, setDailyQuote] = useState<{ text: string; author: string } | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>(config.checklist || []);
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setItems(config.checklist || []);
  }, [config.checklist]);

  useEffect(() => {
    if (config.mode === 'quote') {
      fetch(`/api/quotes?category=${config.quoteCategory || 'inspirational'}`)
        .then((res) => res.json())
        .then((data) => setDailyQuote(data))
        .catch(() => {
          setDailyQuote({
            text: "The journey of a thousand miles begins with a single step.",
            author: "Lao Tzu",
          });
        });
    }
  }, [config.mode, config.quoteCategory]);

  const handleToggleItem = async (itemId: string) => {
    // Optimistic UI update
    const updated = items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setItems(updated);
    onChecklistChanged?.(updated);

    try {
      const res = await fetch('/api/notes/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checklist) {
          setItems(data.checklist);
        }
      }
    } catch (err) {
      console.warn('Failed to toggle note item:', err);
    }
  };

  const handleAddNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/notes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checklist) {
          setItems(data.checklist);
          onChecklistChanged?.(data.checklist);
        }
        setNewText('');
        setIsAdding(false);
      }
    } catch (err) {
      console.warn('Failed to add note item:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-black/35 backdrop-blur-md rounded-xl p-3.5 border border-white/10 text-white select-none text-kiosk-shadow">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          {config.mode === 'quote' && <Quote className="w-4 h-4 text-emerald-400" />}
          {config.mode === 'custom_note' && <StickyNote className="w-4 h-4 text-amber-300" />}
          {config.mode === 'checklist' && <CheckSquare className="w-4 h-4 text-sky-400" />}
          <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
            {config.mode === 'quote' && 'Daily Inspiration'}
            {config.mode === 'custom_note' && 'Family Notes'}
            {config.mode === 'checklist' && 'Daily To-Do List'}
          </span>
        </div>

        {config.mode === 'checklist' ? (
          <button
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="h-6 px-2 rounded-md bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center gap-1 text-[11px] font-semibold active:scale-95 transition-all"
            title="Add reminder to list"
          >
            {isAdding ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            <span>{isAdding ? 'Cancel' : 'Add'}</span>
          </button>
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-white/40" />
        )}
      </div>

      {/* Quote Mode */}
      {config.mode === 'quote' && dailyQuote && (
        <div className="py-1">
          <p className="text-sm md:text-base italic font-serif leading-relaxed text-white/95">
            "{dailyQuote.text}"
          </p>
          <p className="text-xs font-medium text-emerald-300 mt-2 text-right">
            — {dailyQuote.author}
          </p>
        </div>
      )}

      {/* Custom Note Mode */}
      {config.mode === 'custom_note' && (
        <div className="text-sm text-white/90 whitespace-pre-line leading-relaxed font-sans">
          {config.customNote || 'No notes added yet.'}
        </div>
      )}

      {/* Checklist Mode */}
      {config.mode === 'checklist' && (
        <div className="space-y-2">
          {/* Quick Add Input Field */}
          {isAdding && (
            <form onSubmit={handleAddNewTask} className="flex items-center gap-1.5 pb-1">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="New reminder (e.g. Milk & bread)..."
                className="flex-1 h-9 px-2.5 rounded-lg bg-black/50 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:ring-1 focus:ring-sky-400 font-medium"
                autoFocus
              />
              <button
                type="submit"
                disabled={submitting || !newText.trim()}
                className="h-9 px-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center justify-center active:scale-95 transition-all disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </button>
            </form>
          )}

          {items.length === 0 ? (
            <p className="text-xs text-white/50 py-1">All items completed</p>
          ) : (
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => handleToggleItem(item.id)}
                  className="w-full text-left flex items-center gap-2.5 p-1 rounded-lg hover:bg-white/5 transition-all active:scale-[0.98] group"
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                    item.completed ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-white/30 group-hover:border-white/60'
                  }`}>
                    {item.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                  <span className={`text-xs md:text-sm font-medium transition-all break-words ${
                    item.completed ? 'line-through text-white/40' : 'text-white/90'
                  }`}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
