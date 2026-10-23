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
  Clock, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { CreateEventModal } from '../modals/CreateEventModal';

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

interface SmartBriefingWidgetProps {
  onEventCreated?: () => void;
  className?: string;
}

export const SmartBriefingWidget: React.FC<SmartBriefingWidgetProps> = ({ 
  onEventCreated,
  className = '' 
}) => {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
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
      console.warn('[SmartBriefing] Failed to load briefing, using local circadian summary:', err);
      setData((prev) => prev || getFallbackBriefing());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
    // Auto refresh every 20 minutes
    const interval = setInterval(() => {
      fetchBriefing();
    }, 20 * 60 * 1000);

    return () => {
      clearInterval(interval);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleToggleVoice = () => {
    if (!('speechSynthesis' in window) || !data?.briefing) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(data.briefing);
    utterance.rate = 0.95; // Friendly, clear pacing
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
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
        return <Sunrise className="w-5 h-5 text-amber-400" />;
      case 'afternoon':
        return <Sun className="w-5 h-5 text-amber-300" />;
      case 'evening':
        return <Sunset className="w-5 h-5 text-indigo-400" />;
      case 'night':
      default:
        return <Moon className="w-5 h-5 text-sky-400" />;
    }
  };

  const getPeriodGlow = (period?: string) => {
    switch (period) {
      case 'morning':
        return 'from-amber-500/15 via-orange-500/5 to-transparent border-amber-500/25';
      case 'afternoon':
        return 'from-sky-500/15 via-blue-500/5 to-transparent border-sky-500/25';
      case 'evening':
        return 'from-indigo-500/20 via-purple-500/10 to-transparent border-indigo-500/30';
      case 'night':
      default:
        return 'from-slate-800/40 via-sky-950/20 to-transparent border-sky-400/20';
    }
  };

  return (
    <>
      <div 
        className={`relative bg-black/40 backdrop-blur-xl rounded-2xl p-4 md:p-5 border shadow-xl text-white select-none transition-all ${getPeriodGlow(data?.period)} ${className}`}
      >
        {/* Header row: Greeting, Period Badge, Listen button & Refresh */}
        <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 shadow-sm">
              {getPeriodIcon(data?.period)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-bold tracking-tight text-white">
                  {data?.greeting || 'Daily Briefing'}
                </h3>
                {data?.isAiGenerated ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                    <Sparkles className="w-3 h-3 text-indigo-300" /> Smart Summary
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/15">
                    Ambient Circadian
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60">
                {data?.period === 'morning' && 'Morning Household Overview'}
                {data?.period === 'afternoon' && 'Afternoon Household Update'}
                {data?.period === 'evening' && 'Evening Wind-Down & Tomorrow Prep'}
                {data?.period === 'night' && 'Night Mode & Sleep Sanctuary'}
              </p>
            </div>
          </div>

          {/* Quick Touch Action Controls */}
          <div className="flex items-center gap-2">
            {/* Audio Read Aloud */}
            <button
              onClick={handleToggleVoice}
              disabled={!data?.briefing}
              className={`h-9 px-3 rounded-xl border flex items-center gap-2 text-xs font-semibold transition-all active:scale-95 shadow-sm ${
                isPlayingAudio
                  ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/15'
              }`}
              title={isPlayingAudio ? 'Stop Reading' : 'Listen to Briefing'}
            >
              {isPlayingAudio ? (
                <>
                  <VolumeX className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">Stop</span>
                  {/* Equalizer animation */}
                  <span className="flex items-center gap-0.5 h-3 ml-0.5">
                    <span className="w-0.5 h-2 bg-slate-950 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-0.5 h-3 bg-slate-950 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-0.5 h-1.5 bg-slate-950 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 shrink-0 text-amber-300" />
                  <span className="hidden md:inline">Listen</span>
                </>
              )}
            </button>

            {/* Quick Add Event on Screen */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-9 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/30 flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shadow-sm"
              title="Add Event Directly on Touch Screen"
            >
              <CalendarPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Event</span>
            </button>

            {/* Force Refresh */}
            <button
              onClick={() => fetchBriefing(true)}
              disabled={loading}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white/80 transition-all border border-white/15 disabled:opacity-50"
              title="Refresh Briefing"
              aria-label="Refresh Briefing"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Briefing Narrative Speech Block */}
        <div className="py-1">
          {loading && !data ? (
            <div className="flex items-center gap-2 py-3 text-white/60 text-sm animate-pulse">
              <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
              <span>Synthesizing today's household briefing...</span>
            </div>
          ) : (
            <p className="text-sm md:text-base leading-relaxed text-white/95 font-medium tracking-wide">
              {data?.briefing || 'Loading ambient briefing...'}
            </p>
          )}
        </div>

        {/* Highlights Pills Row */}
        {data && data.highlights && data.highlights.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-2.5 border-t border-white/10">
            {data.highlights.map((highlight, idx) => (
              <div 
                key={idx}
                className="px-2.5 py-1 rounded-lg bg-black/35 backdrop-blur-md border border-white/10 text-xs font-medium text-white/85 flex items-center gap-1.5 shadow-sm"
              >
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Direct Quick Add Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSaved={() => {
          fetchBriefing(true);
          onEventCreated?.();
        }}
      />
    </>
  );
};
