import React, { useState, useEffect, useMemo } from 'react';
import { AppConfig, CalendarEvent, WeatherData } from '../../types/config';
import { SCREENSAVER_ARTWORK_PRESETS, ScreenSaverArtItem } from '../../constants/defaultConfig';
import { WeatherIcon } from '../widgets/WeatherIcon';
import {
  Sparkles,
  Clock,
  Calendar,
  CloudSun,
  Image as ImageIcon,
  Moon,
  ChevronLeft,
  ChevronRight,
  Layers,
  Home,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Droplets,
  Wind,
  Bell,
  Compass,
  Thermometer,
  AlertTriangle,
  Music,
  Play,
  Pause,
} from 'lucide-react';
import { HomeViewWeatherWidget } from './HomeViewWeatherWidget';

interface ScreenSaverProps {
  config: AppConfig;
  calendarEvents: CalendarEvent[];
  onWake: () => void;
  onUpdateConfig?: (updatedConfig: AppConfig) => void;
}

export const ScreenSaver: React.FC<ScreenSaverProps> = ({
  config,
  calendarEvents,
  onWake,
  onUpdateConfig,
}) => {
  const ssConfig = config.screensaver || {
    enabled: true,
    idleTimeoutMinutes: 3,
    style: 'standby-duo',
    artworkCategory: 'nature',
    clockColor: 'sunset',
    showWeatherComplication: true,
    showCalendarComplication: true,
    showBinReminder: true,
    autoNightMode: false,
    artCycleSeconds: 30,
    dimLevel: 10,
  };

  // Screensaver style is configured strictly in Settings menu
  const configuredStyle = ssConfig.style || 'standby-duo';
  const clockColor = ssConfig.clockColor || 'sunset';
  const [activeStackIndex, setActiveStackIndex] = useState<number>(0); // 0 = Schedule, 1 = Weather, 2 = Bin & Home
  const [photoIndex, setPhotoIndex] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Time updater (every second)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live weather
  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      try {
        const query = new URLSearchParams({
          lat: String(config.weather.latitude || 51.5074),
          lon: String(config.weather.longitude || -0.1278),
          units: config.weather.units || 'metric',
          city: config.weather.cityName || 'London',
        });
        const res = await fetch(`/api/weather?${query.toString()}`);
        if (res.ok && isMounted) {
          const data = await res.json();
          setWeather(data);
        }
      } catch (err) {
        console.warn('ScreenSaver weather fetch warning:', err);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [config.weather]);

  // Live Apple Music & HomePod state for Screensaver Complication
  const [mediaNowPlaying, setMediaNowPlaying] = useState<{
    isPlaying: boolean;
    title: string;
    artist: string;
    album: string;
    artworkUrl: string;
    speakers: string;
    audioQuality?: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMedia = async () => {
      try {
        const res = await fetch('/api/media/applemusic/state');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.ok && data.currentTrack) {
            const spNames = (data.activeSpeakers || []).map((s: any) => s.name.split(' ')[0]).join(' + ');
            setMediaNowPlaying({
              isPlaying: data.isPlaying,
              title: data.currentTrack.title,
              artist: data.currentTrack.artist,
              album: data.currentTrack.album,
              artworkUrl: data.currentTrack.artworkUrl,
              speakers: spNames || 'HomePods',
              audioQuality: data.audioQuality,
            });
          }
        }
      } catch {
        // Quiet
      }
    };
    fetchMedia();
    const interval = setInterval(fetchMedia, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleTogglePlayScreensaver = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mediaNowPlaying) return;
    setMediaNowPlaying(prev => (prev ? { ...prev, isPlaying: !prev.isPlaying } : null));
    try {
      await fetch('/api/media/applemusic/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' }),
      });
    } catch {
      // Quiet
    }
  };

  // Filter artwork presets by selected category
  const filteredArtwork = useMemo(() => {
    const cat = ssConfig.artworkCategory;
    if (!cat || cat === 'all') return SCREENSAVER_ARTWORK_PRESETS;
    const filtered = SCREENSAVER_ARTWORK_PRESETS.filter((item) => item.category === cat);
    return filtered.length > 0 ? filtered : SCREENSAVER_ARTWORK_PRESETS;
  }, [ssConfig.artworkCategory]);

  // Artwork auto-rotation
  useEffect(() => {
    if (configuredStyle !== 'photo-art') return;
    const intervalSeconds = Math.max(10, ssConfig.artCycleSeconds || 30);
    const interval = setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % filteredArtwork.length);
    }, intervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [configuredStyle, ssConfig.artCycleSeconds, filteredArtwork.length]);

  // StandBy Duo right stack auto-rotation (every 14s)
  useEffect(() => {
    if (configuredStyle !== 'standby-duo') return;
    const interval = setInterval(() => {
      setActiveStackIndex((prev) => (prev + 1) % 3);
    }, 14000);
    return () => clearInterval(interval);
  }, [configuredStyle]);

  // Auto-Night Mode check (e.g. between 22:00 and 06:30)
  const isNightHours = useMemo(() => {
    const h = currentTime.getHours();
    return h >= 22 || h < 7;
  }, [currentTime]);

  const effectiveStyle = (ssConfig.autoNightMode && isNightHours) ? 'night-stand' : configuredStyle;

  // Format time strings
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const format24 = config.clock.format24;

  const displayHours = format24
    ? String(hours).padStart(2, '0')
    : String(hours % 12 || 12);
  const displayMinutes = String(minutes).padStart(2, '0');
  const displaySeconds = String(seconds).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  // Date formatting with Apple style
  const weekdayShort = currentTime.toLocaleDateString(undefined, { weekday: 'short' });
  const weekdayName = currentTime.toLocaleDateString(undefined, { weekday: 'long' });
  const monthShort = currentTime.toLocaleDateString(undefined, { month: 'short' }).toUpperCase();
  const dayOfMonth = currentTime.getDate();
  const dateFormatted = currentTime.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const fullDateFormatted = currentTime.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Calculate upcoming events and bin collections
  const { upcomingEvents, upcomingBinEvent } = useMemo(() => {
    const now = currentTime.getTime();
    const sorted = [...calendarEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    // Future or current events
    const valid = sorted.filter((ev) => {
      const eEnd = ev.end ? new Date(ev.end).getTime() : new Date(ev.start).getTime() + 24 * 3600 * 1000;
      return eEnd >= now - 12 * 3600 * 1000;
    });

    const binKeywords = ['bin', 'waste', 'recycle', 'recycling', 'rubbish', 'trash', 'brown', 'black', 'green', 'garden'];
    const bin = valid.find((ev) =>
      binKeywords.some((kw) => ev.title.toLowerCase().includes(kw))
    );

    return {
      upcomingEvents: valid.slice(0, 4),
      upcomingBinEvent: bin || null,
    };
  }, [calendarEvents, currentTime]);

  // Apple Color Schemes for Clocks & Accents
  const clockColorClasses = useMemo(() => {
    if (effectiveStyle === 'night-stand') {
      return {
        text: 'text-red-500',
        gradient: 'from-red-500 via-rose-500 to-red-600',
        glow: 'drop-shadow-[0_0_40px_rgba(239,68,68,0.45)]',
        accentBg: 'bg-red-500/15 border-red-500/30 text-red-400',
        ringColor: '#ef4444',
      };
    }

    switch (clockColor) {
      case 'sunset':
        return {
          text: 'text-amber-400',
          gradient: 'from-amber-200 via-orange-400 to-rose-400',
          glow: 'drop-shadow-[0_0_40px_rgba(251,146,60,0.35)]',
          accentBg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
          ringColor: '#fb923c',
        };
      case 'glacier':
        return {
          text: 'text-sky-300',
          gradient: 'from-sky-100 via-sky-300 to-blue-500',
          glow: 'drop-shadow-[0_0_40px_rgba(56,189,248,0.35)]',
          accentBg: 'bg-sky-500/15 border-sky-500/30 text-sky-300',
          ringColor: '#38bdf8',
        };
      case 'emerald':
        return {
          text: 'text-emerald-300',
          gradient: 'from-emerald-200 via-teal-300 to-cyan-500',
          glow: 'drop-shadow-[0_0_40px_rgba(52,211,153,0.35)]',
          accentBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
          ringColor: '#34d399',
        };
      case 'crimson':
        return {
          text: 'text-rose-400',
          gradient: 'from-rose-300 via-red-400 to-pink-500',
          glow: 'drop-shadow-[0_0_40px_rgba(244,63,94,0.35)]',
          accentBg: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
          ringColor: '#f43f5e',
        };
      case 'lavender':
        return {
          text: 'text-purple-300',
          gradient: 'from-purple-200 via-violet-300 to-indigo-400',
          glow: 'drop-shadow-[0_0_40px_rgba(168,85,247,0.35)]',
          accentBg: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
          ringColor: '#c084fc',
        };
      case 'white':
      default:
        return {
          text: 'text-white',
          gradient: 'from-white via-slate-100 to-slate-300',
          glow: 'drop-shadow-[0_0_40px_rgba(255,255,255,0.3)]',
          accentBg: 'bg-white/10 border-white/20 text-white',
          ringColor: '#ffffff',
        };
    }
  }, [clockColor, effectiveStyle]);

  // Current active artwork photo
  const currentArt: ScreenSaverArtItem = filteredArtwork[photoIndex % filteredArtwork.length] || filteredArtwork[0];

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev + 1) % filteredArtwork.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotoIndex((prev) => (prev - 1 + filteredArtwork.length) % filteredArtwork.length);
  };

  // Keyboard wake up
  useEffect(() => {
    const handleKeyDown = () => {
      onWake();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onWake]);

  return (
    <div
      onClick={onWake}
      role="button"
      tabIndex={0}
      aria-label="Screen Saver active. Tap anywhere to wake and return to Home screen"
      className="fixed inset-0 z-50 w-screen h-screen overflow-hidden select-none cursor-pointer flex flex-col justify-between transition-all duration-700 font-apple-display"
      style={{
        backgroundColor: effectiveStyle === 'night-stand' ? '#000000' : '#030712',
      }}
    >
      {/* 1. Dynamic Background Materials & Ambient Caustics */}
      {effectiveStyle === 'photo-art' ? (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            key={currentArt.id}
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-105 animate-[pulse_12s_ease-in-out_infinite]"
            style={{
              backgroundImage: `url(${currentArt.url})`,
              filter: `brightness(${100 - (ssConfig.dimLevel || 10)}%)`,
            }}
          />
          {/* Subtle multi-layer vignette for maximum contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/60 pointer-events-none" />
          <div className="absolute inset-0 bg-radial from-transparent via-black/20 to-black/80 pointer-events-none" />
        </div>
      ) : effectiveStyle === 'cosmic-glow' ? (
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#030712]">
          {/* Ambient fluid lights */}
          <div className="absolute -top-40 -left-40 w-[640px] h-[640px] bg-indigo-600/25 rounded-full blur-[140px] animate-pulse" />
          <div className="absolute top-1/3 right-[-100px] w-[720px] h-[720px] bg-teal-500/20 rounded-full blur-[160px] animate-pulse delay-700" />
          <div className="absolute -bottom-40 left-1/3 w-[800px] h-[800px] bg-purple-700/20 rounded-full blur-[180px] animate-pulse delay-1000" />
          {/* Micro-starlight dust */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff20_1px,transparent_1px)] [background-size:28px_28px] pointer-events-none opacity-40" />
        </div>
      ) : effectiveStyle === 'night-stand' ? (
        /* True OLED Black with faint crimson glow */
        <div className="absolute inset-0 z-0 bg-black">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/[0.04] rounded-full blur-[160px] pointer-events-none" />
        </div>
      ) : (
        /* Apple StandBy Duo Canvas: Deep midnight slate with liquid chromatic orbs */
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#040814]">
          <div className="absolute -top-32 left-1/4 w-[550px] h-[550px] bg-sky-500/12 rounded-full blur-[160px]" />
          <div className="absolute -bottom-32 right-1/4 w-[650px] h-[650px] bg-indigo-500/15 rounded-full blur-[180px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/[0.06] rounded-full blur-[200px]" />
          {/* Apple Glass grid texture subtle overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0d_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none opacity-30" />
        </div>
      )}

      {/* Dim overlay based on user setting */}
      {ssConfig.dimLevel > 0 && effectiveStyle !== 'night-stand' && (
        <div
          className="absolute inset-0 z-1 pointer-events-none bg-black transition-opacity duration-500"
          style={{ opacity: (ssConfig.dimLevel || 10) / 100 }}
        />
      )}

      {/* Top Floating Glass Pill / Dynamic Island Ambient Bar */}
      <div className="relative z-10 w-full px-6 md:px-12 pt-6 md:pt-8 flex items-center justify-between text-white/80">
        <div className="flex items-center gap-3">
          {/* Apple HomeView Capsule */}
          <div
            className={`flex items-center gap-2.5 px-4 py-2 rounded-full font-apple-rounded text-xs font-semibold tracking-wide transition-all ${
              effectiveStyle === 'night-stand'
                ? 'apple-glass-crimson text-red-400'
                : 'apple-glass-pill text-white/95'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${effectiveStyle === 'night-stand' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-emerald-400 shadow-[0_0_8px_#34d399]'} animate-pulse`} />
            <Sparkles className="w-3.5 h-3.5 opacity-90" />
            <span>HomeView StandBy</span>
          </div>

          {effectiveStyle === 'photo-art' && (
            <div className="apple-glass-pill px-4 py-2 rounded-full text-xs text-white/80 font-medium hidden sm:flex items-center gap-2">
              <span className="font-semibold text-white">{currentArt.title}</span>
              <span className="text-white/40">•</span>
              <span>{currentArt.location}</span>
            </div>
          )}
        </div>

        {/* Live Weather Complication (Top Right Liquid Glass Pill) */}
        {ssConfig.showWeatherComplication && weather && (
          <div className="flex items-center gap-2">
            {(weather.activeAlert || (weather.alerts && weather.alerts.length > 0)) && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 text-slate-950 font-black font-apple-rounded text-xs uppercase tracking-wider shadow-lg shadow-amber-500/30 border-2 border-amber-200 animate-pulse"
                title="Active Weather Alert"
              >
                <AlertTriangle className="w-3.5 h-3.5 fill-black stroke-amber-400" />
                <span>Alert</span>
                <span className="hidden md:inline font-bold normal-case text-slate-900 text-[11px] truncate max-w-[130px]">
                  : {(weather.activeAlert || weather.alerts![0]).event}
                </span>
              </div>
            )}
            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-full font-apple-rounded text-xs font-semibold transition-all ${
                effectiveStyle === 'night-stand'
                  ? 'apple-glass-crimson text-red-400'
                  : 'apple-glass-pill text-white'
              }`}
            >
              <WeatherIcon icon={weather.icon || 'sun'} className="w-4 h-4 text-amber-300" />
              <span className="font-bold text-sm">{Math.round(weather.temp)}°{weather.tempUnit}</span>
              <span className="text-white/60 font-medium hidden sm:inline">• {weather.condition}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Main Center Canvas */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 md:px-12 w-full max-w-[1920px] mx-auto py-4">
        {/* MODE A: Apple StandBy Duo (Dual Liquid Glass Squircle Slabs) */}
        {effectiveStyle === 'standby-duo' && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-stretch max-w-6xl">
            {/* Left Slab: Apple StandBy Clock with Liquid Glass Material */}
            <div className="apple-glass-card apple-glass-sheen rounded-[2.5rem] p-8 md:p-12 flex flex-col items-center justify-center min-h-[380px] md:min-h-[440px] text-center relative group transition-all duration-500 hover:border-white/25">
              {/* Massive Apple Rounded Clock Numerals */}
              <div className="flex items-baseline justify-center gap-2 md:gap-4">
                <span
                  className={`text-[96px] sm:text-[132px] md:text-[164px] font-black leading-none font-apple-rounded tracking-tighter bg-gradient-to-b ${clockColorClasses.gradient} bg-clip-text text-transparent ${clockColorClasses.glow}`}
                >
                  {displayHours}:{displayMinutes}
                </span>
                {!format24 && (
                  <span className="text-2xl md:text-3xl font-extrabold font-apple-rounded text-white/45 tracking-normal">
                    {ampm}
                  </span>
                )}
              </div>

              {/* Apple Date Pill & Complication Bar */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <div className="apple-glass-pill px-4 py-1.5 rounded-full flex items-center gap-2 text-white/90">
                  <span className="font-extrabold font-apple-rounded text-sm md:text-base uppercase tracking-wider text-white">
                    {weekdayName}
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="font-semibold font-apple-rounded text-sm md:text-base text-white/80">
                    {dateFormatted}
                  </span>
                </div>

                {ssConfig.showBinReminder && upcomingBinEvent && (
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs md:text-sm font-bold font-apple-rounded shadow-[0_0_20px_rgba(52,211,153,0.2)] animate-pulse">
                    <Trash2 className="w-4 h-4" />
                    <span>{upcomingBinEvent.title}</span>
                  </div>
                )}
              </div>

              {/* Liquid Gloss Light Arc Overlay at Bottom Edge */}
              <div className="absolute -bottom-6 left-1/4 right-1/4 h-12 bg-white/[0.04] rounded-full blur-xl pointer-events-none" />
            </div>

            {/* Right Slab: Apple Smart Stack (Liquid Glass Squircle) */}
            <div className="apple-glass-card apple-glass-sheen rounded-[2.5rem] p-8 md:p-10 flex flex-col justify-between min-h-[380px] md:min-h-[440px] relative transition-all duration-500 hover:border-white/25">
              {/* Stack Header Bar with Apple Style Segmented Pill */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] uppercase tracking-widest font-extrabold font-apple-rounded text-white/50">
                    Smart Stack
                  </span>
                  <span className="text-xs font-bold font-apple-rounded px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-white/90">
                    {activeStackIndex === 0
                      ? 'Upcoming Schedule'
                      : activeStackIndex === 1
                      ? 'Live Weather'
                      : 'Home Waste & Bins'}
                  </span>
                </div>

                {/* Stack Tabs (Pill style, stopPropagation to allow interactive previews) */}
                <div
                  className="flex items-center gap-1.5 p-1 rounded-full apple-glass-pill"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setActiveStackIndex(0)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      activeStackIndex === 0
                        ? 'bg-white text-black shadow-md scale-105'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    title="Upcoming Schedule"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveStackIndex(1)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      activeStackIndex === 1
                        ? 'bg-white text-black shadow-md scale-105'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    title="Live Weather"
                  >
                    <CloudSun className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveStackIndex(2)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      activeStackIndex === 2
                        ? 'bg-white text-black shadow-md scale-105'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    title="Waste & Bins"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* STACK 0: Apple Calendar View */}
              {activeStackIndex === 0 && (
                <div className="py-4 space-y-3 flex-1 flex flex-col justify-center">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((ev) => {
                      const s = new Date(ev.start);
                      const isToday = s.toDateString() === currentTime.toDateString();
                      return (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between p-3.5 rounded-2xl apple-glass-card hover:border-white/30 transition-all group"
                        >
                          <div className="flex items-center gap-3.5 truncate">
                            {/* Apple Calendar Colored Bar Marker */}
                            <div
                              className="w-1.5 h-8 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: ev.color || '#38bdf8' }}
                            />
                            <div className="truncate">
                              <p className="text-sm md:text-base font-bold font-apple-rounded text-white truncate group-hover:text-sky-200 transition-colors">
                                {ev.title}
                              </p>
                              <p className="text-xs font-medium font-apple-rounded text-white/60">
                                {isToday ? 'Today' : s.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                {ev.allDay
                                  ? ' • All Day'
                                  : ` • ${s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`}
                              </p>
                            </div>
                          </div>
                          {ev.allDay && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-apple-rounded shrink-0">
                              All Day
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-white/50 text-sm font-apple-rounded">
                      <CheckCircle2 className="w-9 h-9 mx-auto text-emerald-400 mb-2 opacity-90 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]" />
                      <span className="font-semibold text-white/80">No more events scheduled for today</span>
                    </div>
                  )}
                </div>
              )}

              {/* STACK 1: Apple Weather View with Interactive Toggles (Current Temp, Humidity, 3-Day Forecast) */}
              {activeStackIndex === 1 && (
                <div className="py-2 flex-1 flex flex-col justify-center">
                  <HomeViewWeatherWidget
                    weather={weather}
                    initialTab={ssConfig.weatherWidgetView || 'current'}
                    isNightMode={false}
                    className="border-0 bg-transparent p-0 shadow-none"
                    showTitle={false}
                  />
                </div>
              )}

              {/* STACK 2: Apple Home & Waste View */}
              {activeStackIndex === 2 && (
                <div className="py-4 flex-1 flex flex-col justify-center space-y-4">
                  {upcomingBinEvent ? (
                    <div className="p-5 rounded-2xl apple-glass-card border-amber-500/30 flex items-center gap-4 bg-gradient-to-r from-amber-500/10 to-transparent">
                      <div className="w-12 h-12 rounded-2xl apple-glass-pill text-amber-400 flex items-center justify-center shrink-0 border-amber-500/40">
                        <Trash2 className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-400 font-apple-rounded">
                          Next Waste Collection
                        </span>
                        <h4 className="text-base md:text-lg font-bold font-apple-rounded text-white">
                          {upcomingBinEvent.title}
                        </h4>
                        <p className="text-xs font-medium font-apple-rounded text-white/70">
                          {new Date(upcomingBinEvent.start).toLocaleDateString(undefined, {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-2xl apple-glass-card text-center">
                      <Trash2 className="w-8 h-8 mx-auto text-white/30 mb-2" />
                      <p className="text-sm font-bold font-apple-rounded text-white/80">
                        No upcoming bin collections
                      </p>
                      <p className="text-xs font-apple-rounded text-white/50 mt-1">
                        Calendar is up to date
                      </p>
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl apple-glass-card flex items-center justify-between text-xs text-white/70 font-apple-rounded">
                    <span>Display Resolution Target</span>
                    <span className="font-extrabold text-sky-400">1920 × 1200 Optimized</span>
                  </div>
                </div>
              )}

              {/* Stack Footer: Tap to Wake Notice & Seconds Ring */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50 font-apple-rounded">
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Tap screen to return to Home</span>
                </span>
                <span className="font-mono font-bold text-white/70">{displaySeconds}s</span>
              </div>
            </div>
          </div>
        )}

        {/* MODE A2: Apple Weather Station & Focus (Dual Slab with Full Interactive Weather Widget) */}
        {effectiveStyle === 'weather-focus' && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10 items-stretch max-w-6xl">
            {/* Left Slab: Apple StandBy Clock with Date and Live Weather Status (5 cols) */}
            <div className="lg:col-span-5 apple-glass-card apple-glass-sheen rounded-[2.5rem] p-8 md:p-10 flex flex-col items-center justify-center min-h-[380px] md:min-h-[460px] text-center relative group">
              <span
                className={`text-[80px] sm:text-[108px] md:text-[132px] font-black leading-none font-apple-rounded tracking-tighter bg-gradient-to-b ${clockColorClasses.gradient} bg-clip-text text-transparent ${clockColorClasses.glow}`}
              >
                {displayHours}:{displayMinutes}
              </span>
              {!format24 && (
                <span className="text-xl md:text-2xl font-extrabold font-apple-rounded text-white/45 tracking-normal mt-1">
                  {ampm}
                </span>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                <div className="apple-glass-pill px-4 py-1.5 rounded-full text-white/90 text-sm font-extrabold font-apple-rounded">
                  {weekdayName} • {dateFormatted}
                </div>

                <div className="apple-glass-pill px-3.5 py-1.5 rounded-full text-sky-300 text-xs font-bold font-apple-rounded flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>Weather Station</span>
                </div>
              </div>

              {upcomingBinEvent && (
                <div className="mt-3 flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold font-apple-rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{upcomingBinEvent.title}</span>
                </div>
              )}
            </div>

            {/* Right Slab: Comprehensive Apple HomeView Weather Widget with 3-Way Toggles (7 cols) */}
            <div className="lg:col-span-7 flex flex-col min-h-[380px] md:min-h-[460px]">
              <HomeViewWeatherWidget
                weather={weather}
                initialTab={ssConfig.weatherWidgetView || 'current'}
                isNightMode={false}
                className="w-full h-full flex-1"
                showTitle={true}
              />
            </div>
          </div>
        )}

        {/* MODE B: Curated Photo Frame Gallery with Apple Glass Info Capsule */}
        {effectiveStyle === 'photo-art' && (
          <div className="w-full h-full flex flex-col justify-end pb-8">
            <div className="max-w-xl p-8 rounded-[2.5rem] apple-glass-card apple-glass-sheen shadow-2xl text-white">
              <div className="flex items-baseline gap-3">
                <span className="text-6xl md:text-8xl font-black font-apple-rounded tracking-tighter drop-shadow-lg">
                  {displayHours}:{displayMinutes}
                </span>
                {!format24 && (
                  <span className="text-2xl font-extrabold font-apple-rounded text-white/60">
                    {ampm}
                  </span>
                )}
              </div>

              <p className="text-base md:text-xl font-bold font-apple-rounded text-white/90 mt-1 tracking-wide">
                {fullDateFormatted}
              </p>

              {upcomingEvents.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/15 flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: upcomingEvents[0].color || '#38bdf8' }}
                  />
                  <div className="flex-1 truncate">
                    <span className="text-xs text-white/60 uppercase tracking-wider font-bold font-apple-rounded block">
                      Next Up
                    </span>
                    <span className="text-sm font-bold font-apple-rounded text-white truncate block">
                      {upcomingEvents[0].title}
                    </span>
                  </div>
                </div>
              )}

              {/* Photo Navigation Pill */}
              <div
                className="mt-4 flex items-center justify-between pt-2 border-t border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs text-white/60 font-medium font-apple-rounded">
                  {photoIndex + 1} of {filteredArtwork.length} • {currentArt.title}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevPhoto}
                    className="p-2 rounded-full apple-glass-pill text-white hover:scale-105 active:scale-95 transition-all"
                    title="Previous Photo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    className="p-2 rounded-full apple-glass-pill text-white hover:scale-105 active:scale-95 transition-all"
                    title="Next Photo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE C: Minimalist Bold Digital (Apple SF Pro Rounded Numerals) */}
        {effectiveStyle === 'bold-digital' && (
          <div className="flex flex-col items-center justify-center text-center">
            {/* Massive Apple Rounded Numerals */}
            <div className="relative">
              <span
                className={`text-[120px] sm:text-[180px] md:text-[240px] font-black leading-none font-apple-rounded tracking-tighter bg-gradient-to-b ${clockColorClasses.gradient} bg-clip-text text-transparent ${clockColorClasses.glow}`}
              >
                {displayHours}:{displayMinutes}
              </span>
              <span className="absolute -top-2 -right-12 md:-right-16 text-3xl md:text-5xl font-apple-rounded font-extrabold text-white/40">
                {displaySeconds}
              </span>
            </div>

            {/* Apple Floating Liquid Glass Complication Capsules */}
            <div className="mt-8 md:mt-10 flex flex-wrap items-center justify-center gap-3 md:gap-4 max-w-4xl">
              <div className="apple-glass-pill px-5 py-2.5 rounded-full text-sm md:text-base font-bold font-apple-rounded text-white tracking-wide">
                {fullDateFormatted}
              </div>

              {weather && (
                <div className="apple-glass-pill px-5 py-2.5 rounded-full text-sm md:text-base font-bold font-apple-rounded text-white flex items-center gap-2.5">
                  <WeatherIcon icon={weather.icon || 'sun'} className="w-4 h-4 text-amber-300" />
                  <span>{Math.round(weather.temp)}°{weather.tempUnit}</span>
                  <span className="text-white/60 font-medium">• {weather.condition}</span>
                </div>
              )}

              {upcomingEvents.length > 0 && (
                <div className="apple-glass-pill px-5 py-2.5 rounded-full text-sm md:text-base font-bold font-apple-rounded text-white flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <span>{upcomingEvents[0].title}</span>
                </div>
              )}

              {upcomingBinEvent && (
                <div className="px-5 py-2.5 rounded-full bg-emerald-500/20 backdrop-blur-2xl border border-emerald-400/40 text-sm md:text-base font-bold font-apple-rounded text-emerald-300 flex items-center gap-2.5 shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                  <Trash2 className="w-4 h-4" />
                  <span>{upcomingBinEvent.title}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODE D: Classic Luxury Analog (Apple Watch Chronograph with Sapphire Crystal Glass) */}
        {effectiveStyle === 'classic-analog' && (
          <div className="flex flex-col items-center justify-center">
            {/* SVG Analog Dial with Liquid Sapphire Bezel */}
            <div className="relative w-[340px] h-[340px] md:w-[460px] md:h-[460px] rounded-full p-4 apple-glass-card apple-glass-sheen shadow-[0_24px_80px_rgba(0,0,0,0.7)] flex items-center justify-center">
              <svg viewBox="0 0 400 400" className="w-full h-full">
                <defs>
                  {/* Brushed metal bezel gradient */}
                  <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#475569" />
                    <stop offset="30%" stopColor="#94a3b8" />
                    <stop offset="50%" stopColor="#334155" />
                    <stop offset="70%" stopColor="#64748b" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>

                  {/* Inner dial radial gradient */}
                  <radialGradient id="dialGrad" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="85%" stopColor="#020617" />
                    <stop offset="100%" stopColor="#000000" />
                  </radialGradient>

                  {/* Sapphire curved glass sheen */}
                  <linearGradient id="sapphireSheen" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
                    <stop offset="35%" stopColor="rgba(255,255,255,0.06)" />
                    <stop offset="60%" stopColor="rgba(255,255,255,0)" />
                  </linearGradient>
                </defs>

                {/* Outer Bezel */}
                <circle cx="200" cy="200" r="192" fill="url(#dialGrad)" stroke="url(#bezelGrad)" strokeWidth="4" />
                <circle cx="200" cy="200" r="183" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1.5" />

                {/* Minute & Hour Ticks */}
                {Array.from({ length: 60 }).map((_, i) => {
                  const angle = (i * 6 * Math.PI) / 180;
                  const isHour = i % 5 === 0;
                  const r1 = isHour ? 164 : 172;
                  const r2 = 180;
                  const x1 = 200 + r1 * Math.sin(angle);
                  const y1 = 200 - r1 * Math.cos(angle);
                  const x2 = 200 + r2 * Math.sin(angle);
                  const y2 = 200 - r2 * Math.cos(angle);
                  return (
                    <line
                      key={i}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isHour ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.35)'}
                      strokeWidth={isHour ? 3.5 : 1.5}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Hour numerals with Apple SF Pro Rounded curve styling */}
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => {
                  const angle = (n * 30 * Math.PI) / 180;
                  const x = 200 + 138 * Math.sin(angle);
                  const y = 200 - 138 * Math.cos(angle) + 7;
                  return (
                    <text
                      key={n}
                      x={x}
                      y={y}
                      fill="rgba(255, 255, 255, 0.95)"
                      fontSize="22"
                      fontWeight="800"
                      fontFamily="-apple-system, 'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif"
                      textAnchor="middle"
                    >
                      {n}
                    </text>
                  );
                })}

                {/* Date Complication Sub-dial at 3 o'clock */}
                <g transform="translate(270, 200)">
                  <rect x="-24" y="-12" width="48" height="24" rx="7" fill="rgba(255, 255, 255, 0.12)" stroke="rgba(255, 255, 255, 0.3)" />
                  <text x="0" y="5" fill="#ffffff" fontSize="13" fontWeight="800" textAnchor="middle" fontFamily="system-ui">
                    {currentTime.getDate()}
                  </text>
                </g>

                {/* Weather Sub-dial at 9 o'clock */}
                {weather && (
                  <g transform="translate(130, 200)">
                    <circle cx="0" cy="0" r="24" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.22)" />
                    <text x="0" y="5" fill="#38bdf8" fontSize="13" fontWeight="800" textAnchor="middle" fontFamily="system-ui">
                      {Math.round(weather.temp)}°
                    </text>
                  </g>
                )}

                {/* Next Event Sub-dial at 6 o'clock */}
                <g transform="translate(200, 270)">
                  <rect x="-44" y="-12" width="88" height="24" rx="7" fill="rgba(255, 255, 255, 0.08)" stroke="rgba(255, 255, 255, 0.22)" />
                  <text x="0" y="5" fill="rgba(255, 255, 255, 0.85)" fontSize="11" fontWeight="800" textAnchor="middle" fontFamily="system-ui">
                    {upcomingEvents.length} UPCOMING
                  </text>
                </g>

                {/* Hour Hand (Apple Watch Pill Shape) */}
                {(() => {
                  const hourAngle = ((hours % 12) * 30 + minutes * 0.5) * (Math.PI / 180);
                  const hx = 200 + 82 * Math.sin(hourAngle);
                  const hy = 200 - 82 * Math.cos(hourAngle);
                  return (
                    <line
                      x1="200"
                      y1="200"
                      x2={hx}
                      y2={hy}
                      stroke="#ffffff"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                  );
                })()}

                {/* Minute Hand (Apple Watch Pill Shape) */}
                {(() => {
                  const minAngle = (minutes * 6 + seconds * 0.1) * (Math.PI / 180);
                  const mx = 200 + 124 * Math.sin(minAngle);
                  const my = 200 - 124 * Math.cos(minAngle);
                  return (
                    <line
                      x1="200"
                      y1="200"
                      x2={mx}
                      y2={my}
                      stroke="#e2e8f0"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                  );
                })()}

                {/* Apple Safety Orange Chronograph Second Hand */}
                {(() => {
                  const secAngle = seconds * 6 * (Math.PI / 180);
                  const sx = 200 + 138 * Math.sin(secAngle);
                  const sy = 200 - 138 * Math.cos(secAngle);
                  const bx = 200 - 28 * Math.sin(secAngle);
                  const by = 200 + 28 * Math.cos(secAngle);
                  return (
                    <>
                      <line
                        x1={bx}
                        y1={by}
                        x2={sx}
                        y2={sy}
                        stroke="#ff9f0a"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <circle cx={sx} cy={sy} r="3.5" fill="#ff9f0a" />
                      <circle cx={bx} cy={by} r="4" fill="#ff9f0a" />
                    </>
                  );
                })()}

                {/* Center Chrome Hub */}
                <circle cx="200" cy="200" r="7" fill="#ff9f0a" />
                <circle cx="200" cy="200" r="3.5" fill="#ffffff" />

                {/* Sapphire Glass Light Reflection Highlight */}
                <ellipse cx="160" cy="140" rx="110" ry="70" fill="url(#sapphireSheen)" transform="rotate(-30 160 140)" pointerEvents="none" />
              </svg>
            </div>

            <div className="mt-5 apple-glass-pill px-5 py-2 rounded-full text-sm md:text-base font-bold font-apple-rounded text-white tracking-wide uppercase">
              {weekdayName} • {dateFormatted}
            </div>
          </div>
        )}

        {/* MODE E: Cosmic Glow */}
        {effectiveStyle === 'cosmic-glow' && (
          <div className="flex flex-col items-center justify-center text-center">
            {/* Liquid Glass Orb */}
            <div className="p-12 md:p-16 rounded-full apple-glass-card apple-glass-sheen shadow-[0_0_120px_rgba(99,102,241,0.3)]">
              <span className="text-[100px] sm:text-[150px] md:text-[210px] font-black font-apple-rounded leading-none tracking-tighter bg-gradient-to-r from-teal-200 via-sky-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-[0_10px_35px_rgba(56,189,248,0.4)]">
                {displayHours}:{displayMinutes}
              </span>
            </div>

            <div className="mt-8 flex items-center gap-3 text-lg md:text-2xl font-extrabold font-apple-rounded text-teal-200 tracking-wider">
              <span>{weekdayName}</span>
              <span className="text-white/40">•</span>
              <span>{dateFormatted}</span>
            </div>
          </div>
        )}

        {/* MODE F: Apple StandBy Night Mode (Pure OLED Red Monochrome with Ruby Glass) */}
        {effectiveStyle === 'night-stand' && (
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-[120px] sm:text-[180px] md:text-[240px] font-black leading-none font-apple-rounded tracking-tighter text-red-500 drop-shadow-[0_0_50px_rgba(239,68,68,0.5)]">
              {displayHours}:{displayMinutes}
            </span>

            <div className="mt-6 flex items-center gap-4 text-lg md:text-2xl font-bold font-apple-rounded text-red-500/80">
              <span>{weekdayName}</span>
              <span>•</span>
              <span>{dateFormatted}</span>
              {weather && <span>• {Math.round(weather.temp)}°</span>}
            </div>

            <div className="mt-4 apple-glass-crimson px-4 py-1.5 rounded-full text-xs text-red-400 font-bold font-apple-rounded uppercase tracking-widest">
              Night Vision StandBy Active
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Floating Liquid Glass Dock & Controls */}
      <div className="relative z-20 w-full px-6 md:px-12 pb-6 md:pb-8 flex items-center justify-between gap-4">
        {/* Tap to Wake Prompt */}
        <div className="flex items-center gap-2.5 text-xs md:text-sm font-semibold font-apple-rounded text-white/70">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Tap screen to return to Home</span>
        </div>

        {/* Apple Music Now Playing Complication Capsule */}
        {mediaNowPlaying && config.appleMusic?.showNowPlayingInScreensaver && (
          <div
            onClick={e => {
              e.stopPropagation();
              onWake();
            }}
            className="apple-glass-pill px-3 py-1.5 rounded-full flex items-center gap-3 border border-white/15 bg-slate-900/85 backdrop-blur-xl shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer group"
            title="Now Playing on HomePods. Tap to open full player"
          >
            {/* Album Artwork with mini EQ */}
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow">
              <img
                src={mediaNowPlaying.artworkUrl}
                alt={mediaNowPlaying.title}
                className="w-full h-full object-cover"
              />
              {mediaNowPlaying.isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-3">
                    <div className="w-0.5 bg-rose-400 rounded-full animate-pulse h-2" />
                    <div className="w-0.5 bg-rose-400 rounded-full animate-pulse delay-100 h-3" />
                    <div className="w-0.5 bg-rose-400 rounded-full animate-pulse delay-200 h-1.5" />
                  </div>
                </div>
              )}
            </div>

            {/* Title & Artist */}
            <div className="text-left min-w-0 max-w-[140px] sm:max-w-[200px]">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                  {mediaNowPlaying.title}
                </span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 font-semibold shrink-0">
                  AirPlay
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {mediaNowPlaying.artist} {mediaNowPlaying.speakers ? `· ${mediaNowPlaying.speakers}` : ''}
              </p>
            </div>

            {/* Quick Play/Pause button directly in screensaver */}
            <button
              type="button"
              onClick={handleTogglePlayScreensaver}
              className="w-7 h-7 rounded-full bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 flex items-center justify-center transition-colors shrink-0"
              title={mediaNowPlaying.isPlaying ? 'Pause' : 'Play'}
            >
              {mediaNowPlaying.isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
              )}
            </button>
          </div>
        )}

        {/* Direct Wake Button */}
        <button
          onClick={onWake}
          className="apple-glass-pill px-4 py-2 rounded-full text-white text-xs font-extrabold font-apple-rounded flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shrink-0"
        >
          <Home className="w-4 h-4" />
          <span>Exit to Home</span>
        </button>
      </div>
    </div>
  );
};
