import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  Sunrise, 
  Sunset, 
  Moon, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  Sparkles, 
  CalendarPlus, 
  CheckSquare, 
  X, 
  Check 
} from 'lucide-react';
import { CreateEventModal } from './CreateEventModal';

interface BriefingData {
  briefing: string;
  greeting: string;
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  highlights: string[];
  weatherAlert: string | null;
  weatherSummary: string | null;
  eventCount: number;
  firstEvent: { title: string; time: string; location?: string } | null;
  activeRemindersCount: number;
  nearestCountdown: { title: string; days: number } | null;
  cachedAt: string;
  isAiGenerated: boolean;
}

interface SmartBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated?: () => void;
  slotLabel?: string;
}

export const SmartBriefingModal: React.FC<SmartBriefingModalProps> = ({
  isOpen,
  onClose,
  onEventCreated,
  slotLabel,
}) => {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalMode, setAddModalMode] = useState<'event' | 'reminder'>('event');

  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const getFallbackBriefing = (): BriefingData => {
    const hour = new Date().getHours();
    const period: 'morning' | 'afternoon' | 'evening' | 'night' =
      hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : hour >= 17 && hour < 22 ? 'evening' : 'night';
    const greeting =
      period === 'morning' ? 'Good morning' : period === 'afternoon' ? 'Good afternoon' : period === 'evening' ? 'Good evening' : 'Good night';

    return {
      briefing: `${greeting}! Welcome to Lumina Home. Household systems, schedule, and ambiance are operating smoothly.`,
      greeting,
      period,
      highlights: ['System operating normally', 'Circadian wall ambiance active'],
      weatherAlert: null,
      weatherSummary: null,
      eventCount: 0,
      firstEvent: null,
      activeRemindersCount: 0,
      nearestCountdown: null,
      cachedAt: new Date().toISOString(),
      isAiGenerated: false,
    };
  };

  const fetchBriefing = async (force = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/briefing${force ? '?force=true' : ''}`, {
        headers: {
          Accept: 'application/json',
        },
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const json = await res.json();
        setData(json);
      } else {
        setData((prev) => prev || getFallbackBriefing());
      }
    } catch (err) {
      console.warn('[SmartBriefing] Failed to fetch live briefing, using local circadian summary:', err);
      setData((prev) => prev || getFallbackBriefing());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBriefing();
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
    }
  }, [isOpen]);

  const handleToggleVoice = () => {
    if (!('speechSynthesis' in window) || !data?.briefing) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(data.briefing);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const getPeriodIcon = (period?: string) => {
    switch (period) {
      case 'morning':
        return <Sunrise className="w-6 h-6 text-amber-400" />;
      case 'afternoon':
        return <Sun className="w-6 h-6 text-amber-300" />;
      case 'evening':
        return <Sunset className="w-6 h-6 text-indigo-400" />;
      case 'night':
      default:
        return <Moon className="w-6 h-6 text-sky-400" />;
    }
  };

  const getPeriodGlow = (period?: string) => {
    switch (period) {
      case 'morning':
        return 'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30';
      case 'afternoon':
        return 'from-sky-500/20 via-blue-500/10 to-transparent border-sky-500/30';
      case 'evening':
        return 'from-indigo-500/25 via-purple-500/10 to-transparent border-indigo-500/35';
      case 'night':
      default:
        return 'from-slate-800/50 via-sky-950/30 to-transparent border-sky-400/25';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div 
          className={`w-full max-w-2xl bg-slate-900/95 border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-white transition-all ${getPeriodGlow(data?.period)}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popup Header */}
          <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between bg-white/5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/10 border border-white/15 shadow-inner">
                {getPeriodIcon(data?.period)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold tracking-wider text-sky-400 uppercase">
                    {slotLabel || (data?.period === 'morning' ? 'Morning Briefing' : data?.period === 'afternoon' ? 'Afternoon Briefing' : 'Evening Briefing')}
                  </span>
                  {data?.isAiGenerated ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                      <Sparkles className="w-3 h-3 text-indigo-300" /> AI Synthesized
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/15">
                      Circadian Overview
                    </span>
                  )}
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-0.5">
                  {data?.greeting ? `${data.greeting}!` : 'Household Summary'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Force Refresh */}
              <button
                type="button"
                onClick={() => fetchBriefing(true)}
                disabled={loading}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/70 hover:text-white transition-all border border-white/10 disabled:opacity-50 cursor-pointer"
                title="Refresh Briefing"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/70 hover:text-white transition-all cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Narrative Content Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            {/* Spoken Text Container */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 shadow-sm relative">
              {loading && !data ? (
                <div className="flex items-center gap-3 py-6 text-white/60 text-sm animate-pulse">
                  <Sparkles className="w-5 h-5 text-sky-400 animate-spin" />
                  <span>Synthesizing today's household briefing...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-base md:text-lg leading-relaxed text-white/95 font-medium tracking-wide">
                    {data?.briefing || 'Loading ambient briefing...'}
                  </p>

                  {/* Audio Listen Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handleToggleVoice}
                      disabled={!data?.briefing}
                      className={`h-10 px-4 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer ${
                        isPlayingAudio
                          ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse'
                          : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
                      }`}
                    >
                      {isPlayingAudio ? (
                        <>
                          <VolumeX className="w-4 h-4" />
                          <span>Stop Voice</span>
                          <span className="flex items-center gap-0.5 h-3 ml-1">
                            <span className="w-0.5 h-2 bg-slate-950 animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-0.5 h-3 bg-slate-950 animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-0.5 h-1.5 bg-slate-950 animate-bounce" style={{ animationDelay: '300ms' }} />
                          </span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 text-amber-300" />
                          <span>Listen to Briefing</span>
                        </>
                      )}
                    </button>

                    <span className="text-[11px] font-mono text-white/40">
                      Auto-scheduled overlay
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Highlights Breakdown Cards */}
            {data && data.highlights && data.highlights.length > 0 && (
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-white/50 block mb-2 font-semibold">
                  Today's Household Highlights
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {data.highlights.map((highlight, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs md:text-sm font-semibold text-white/90 flex items-center gap-2 shadow-sm"
                    >
                      <span className="text-sky-400 shrink-0">•</span>
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="px-6 py-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAddModalMode('event');
                  setShowAddModal(true);
                }}
                className="h-11 px-3.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/30 flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                title="Add Event"
              >
                <CalendarPlus className="w-4 h-4" />
                <span>+ Event</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAddModalMode('reminder');
                  setShowAddModal(true);
                }}
                className="h-11 px-3.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-400/30 flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                title="Add Reminder"
              >
                <CheckSquare className="w-4 h-4" />
                <span>+ Reminder</span>
              </button>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-7 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-sky-500/30 flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Dismiss</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Quick Add Event or Reminder Modal */}
      <CreateEventModal
        isOpen={showAddModal}
        initialMode={addModalMode}
        onClose={() => setShowAddModal(false)}
        onSaved={() => {
          fetchBriefing(true);
          onEventCreated?.();
        }}
      />
    </>
  );
};
