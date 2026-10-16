import React, { useState, useEffect } from 'react';
import { AppConfig } from '../../types/config';
import { Quote, StickyNote, CheckSquare, Sparkles } from 'lucide-react';

interface NotesWidgetProps {
  config: AppConfig['notes'];
}

export const NotesWidget: React.FC<NotesWidgetProps> = ({ config }) => {
  const [dailyQuote, setDailyQuote] = useState<{ text: string; author: string } | null>(null);

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
        <Sparkles className="w-3.5 h-3.5 text-white/40" />
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
        <div className="space-y-1.5">
          {config.checklist.length === 0 ? (
            <p className="text-xs text-white/50">All items completed</p>
          ) : (
            config.checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs md:text-sm">
                <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                  item.completed ? 'bg-emerald-500 border-emerald-400 text-white' : 'border-white/30'
                }`}>
                  {item.completed && '✓'}
                </span>
                <span className={item.completed ? 'line-through text-white/40' : 'text-white/90'}>
                  {item.text}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
