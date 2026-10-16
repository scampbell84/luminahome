import React, { useState, useEffect, useMemo } from 'react';
import { AppConfig, CalendarEvent, WeatherData } from '../../types/config';
import { WeatherIcon } from '../widgets/WeatherIcon';
import { AlertTriangle } from 'lucide-react';

interface ScreenSaverProps {
  config: AppConfig;
  calendarEvents?: CalendarEvent[];
  onWake: () => void;
  onUpdateConfig?: (updatedConfig: AppConfig) => void;
}

export const ScreenSaver: React.FC<ScreenSaverProps> = ({
  config,
  onWake,
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

  const clockColor = ssConfig.clockColor || 'sunset';
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Time ticker: synchronize to the millisecond boundary of each second
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    const now = Date.now();
    const msToNextSecond = 1000 - (now % 1000);

    const initialTimeout = setTimeout(() => {
      setCurrentTime(new Date());
      timer = setInterval(() => setCurrentTime(new Date()), 1000);
    }, msToNextSecond);

    return () => {
      clearTimeout(initialTimeout);
      if (timer) clearInterval(timer);
    };
  }, []);

  // Fetch live weather periodically
  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      try {
        const query = new URLSearchParams({
          lat: String(config.weather.latitude || 55.7925),
          lon: String(config.weather.longitude || -3.9875),
          units: config.weather.units || 'metric',
          city: config.weather.cityName || 'Motherwell, United Kingdom',
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
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [config.weather]);

  // Keyboard wake up
  useEffect(() => {
    const handleKeyDown = () => {
      onWake();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onWake]);

  // Format time components
  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const format24 = config.clock.format24;

  const displayHours = format24
    ? String(hours).padStart(2, '0')
    : String(hours % 12 || 12);
  const displayMinutes = String(minutes).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  // Format date: e.g. "Friday, 16 October"
  const fullDateFormatted = currentTime.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Apple Color Schemes for Liquid Glass Clock
  const colorTheme = useMemo(() => {
    switch (clockColor) {
      case 'glacier':
        return {
          gradient: 'from-sky-100 via-sky-300 to-blue-500',
          glowColor: 'rgba(56, 189, 248, 0.45)',
          ambientOrb: 'bg-sky-500/20',
          accentText: 'text-sky-300',
        };
      case 'emerald':
        return {
          gradient: 'from-emerald-100 via-teal-300 to-emerald-500',
          glowColor: 'rgba(52, 211, 153, 0.45)',
          ambientOrb: 'bg-emerald-500/20',
          accentText: 'text-emerald-300',
        };
      case 'crimson':
        return {
          gradient: 'from-rose-200 via-red-400 to-pink-500',
          glowColor: 'rgba(244, 63, 94, 0.45)',
          ambientOrb: 'bg-rose-500/20',
          accentText: 'text-rose-300',
        };
      case 'lavender':
        return {
          gradient: 'from-purple-100 via-violet-300 to-indigo-400',
          glowColor: 'rgba(168, 85, 247, 0.45)',
          ambientOrb: 'bg-purple-500/20',
          accentText: 'text-purple-300',
        };
      case 'white':
        return {
          gradient: 'from-white via-slate-100 to-slate-300',
          glowColor: 'rgba(255, 255, 255, 0.35)',
          ambientOrb: 'bg-white/10',
          accentText: 'text-white',
        };
      case 'sunset':
      default:
        return {
          gradient: 'from-amber-200 via-orange-400 to-rose-400',
          glowColor: 'rgba(251, 146, 60, 0.45)',
          ambientOrb: 'bg-orange-500/20',
          accentText: 'text-amber-300',
        };
    }
  }, [clockColor]);

  // Clean temperature formatting helper with guaranteed single degree symbol
  const formattedTemp = useMemo(() => {
    if (!weather) return null;
    const cleanUnit = (weather.tempUnit || '°C').replace(/^°+/, '');
    return `${Math.round(weather.temp)}°${cleanUnit}`;
  }, [weather]);

  return (
    <div
      onClick={onWake}
      role="button"
      tabIndex={0}
      aria-label="Screen Saver active. Tap anywhere to wake"
      className="fixed inset-0 z-50 w-screen h-screen overflow-hidden select-none cursor-pointer flex flex-col items-center justify-center font-apple-display bg-[#02040a] transition-colors duration-700"
    >
      {/* 1. Ambient Dynamic Liquid Glass Caustics */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Soft breathing color orb radiating from behind clock */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] sm:w-[850px] md:w-[1100px] h-[450px] sm:h-[600px] md:h-[750px] ${colorTheme.ambientOrb} rounded-full blur-[140px] md:blur-[200px] transition-all duration-1000 opacity-70`}
        />
        {/* Subtle secondary ambient fill */}
        <div className="absolute -top-32 left-1/3 w-[500px] h-[500px] bg-indigo-600/[0.08] rounded-full blur-[160px]" />
        <div className="absolute -bottom-32 right-1/4 w-[600px] h-[600px] bg-sky-600/[0.08] rounded-full blur-[180px]" />
        {/* Micro-starlight / texture layer */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      </div>

      {/* Dim overlay based on user setting */}
      {ssConfig.dimLevel > 0 && (
        <div
          className="absolute inset-0 z-1 pointer-events-none bg-black transition-opacity duration-500"
          style={{ opacity: (ssConfig.dimLevel || 10) / 100 }}
        />
      )}

      {/* 2. Main Centerpiece: Digital Apple Liquid Glass Clock + Small Widget */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-6 max-w-6xl mx-auto my-auto select-none">
        {/* Massive Digital Apple Liquid Glass Clock Numerals */}
        <div
          aria-label={`${displayHours}:${displayMinutes} ${!format24 ? ampm : ''}`}
          className="relative flex items-baseline justify-center drop-shadow-2xl"
        >
          {/* Hours */}
          <span
            className={`text-[120px] sm:text-[180px] md:text-[230px] lg:text-[280px] xl:text-[340px] font-black leading-none font-apple-rounded tracking-tight bg-gradient-to-b ${colorTheme.gradient} bg-clip-text text-transparent`}
            style={{
              filter: `drop-shadow(0 0 55px ${colorTheme.glowColor}) drop-shadow(0 20px 40px rgba(0,0,0,0.85))`,
            }}
          >
            {displayHours}
          </span>

          {/* Gently Pulsing Liquid Glass Colon Separator */}
          <span
            aria-hidden="true"
            className={`inline-block select-none animate-colon-pulse text-[120px] sm:text-[180px] md:text-[230px] lg:text-[280px] xl:text-[340px] font-black leading-none font-apple-rounded tracking-tight bg-gradient-to-b ${colorTheme.gradient} bg-clip-text text-transparent px-1 sm:px-2 md:px-3 -translate-y-[2%]`}
            style={{
              filter: `drop-shadow(0 0 55px ${colorTheme.glowColor}) drop-shadow(0 20px 40px rgba(0,0,0,0.85))`,
            }}
          >
            :
          </span>

          {/* Minutes */}
          <span
            className={`text-[120px] sm:text-[180px] md:text-[230px] lg:text-[280px] xl:text-[340px] font-black leading-none font-apple-rounded tracking-tight bg-gradient-to-b ${colorTheme.gradient} bg-clip-text text-transparent`}
            style={{
              filter: `drop-shadow(0 0 55px ${colorTheme.glowColor}) drop-shadow(0 20px 40px rgba(0,0,0,0.85))`,
            }}
          >
            {displayMinutes}
          </span>

          {!format24 && (
            <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-apple-rounded text-white/40 tracking-normal ml-3 sm:ml-5 md:ml-6 mb-4 sm:mb-8 md:mb-12">
              {ampm}
            </span>
          )}

          {/* Liquid Glass Top Refraction Glow Bar */}
          <div className="absolute -top-4 left-1/4 right-1/4 h-8 bg-white/[0.06] rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* 3. Small Refined Liquid Glass Widget: Date & Current Weather */}
        <div className="mt-6 sm:mt-10 md:mt-12 flex items-center gap-3 sm:gap-4 px-5 sm:px-7 py-2.5 sm:py-3 rounded-full bg-slate-900/75 border border-white/15 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
          {/* Date */}
          <span className="text-sm sm:text-base md:text-lg font-bold font-apple-rounded text-white/95 tracking-wide">
            {fullDateFormatted}
          </span>

          {weather && (
            <>
              {/* Subtle glass separator */}
              <span className="text-white/30 text-xs sm:text-sm select-none" aria-hidden="true">•</span>

              {/* Weather Info with single degree symbol */}
              <div className="flex items-center gap-2">
                <WeatherIcon
                  icon={weather.icon || 'sun'}
                  className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 drop-shadow-sm"
                />
                <span className="text-sm sm:text-base md:text-lg font-extrabold font-apple-rounded text-white">
                  {formattedTemp}
                </span>
                <span className="text-xs sm:text-sm md:text-base font-medium text-white/70 hidden sm:inline">
                  {weather.condition}
                </span>

                {/* Optional Alert Badge if severe weather alert active */}
                {(weather.activeAlert || (weather.alerts && weather.alerts.length > 0)) && (
                  <span
                    className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black font-apple-rounded text-[10px] uppercase tracking-wider"
                    title={(weather.activeAlert || weather.alerts![0]).event}
                  >
                    <AlertTriangle className="w-3 h-3 fill-black stroke-amber-400" />
                    <span>Alert</span>
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
