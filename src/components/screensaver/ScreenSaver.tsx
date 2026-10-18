import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppConfig, CalendarEvent, WeatherData, ICloudPhoto } from '../../types/config';
import { DEFAULT_ICLOUD_SAMPLE_PHOTOS } from '../../constants/defaultConfig';
import { WeatherIcon } from '../widgets/WeatherIcon';
import { AlertTriangle, Moon, Sun, Camera } from 'lucide-react';

interface ScreenSaverProps {
  config: AppConfig;
  calendarEvents?: CalendarEvent[];
  onWake: () => void;
  onUpdateConfig?: (updatedConfig: AppConfig) => void;
}

// Time-based range checker (handles overnight ranges like 22:00 to 07:00)
function isWithinSchedule(currentDate: Date, startTimeStr?: string, endTimeStr?: string): boolean {
  if (!startTimeStr || !endTimeStr) return false;
  const [startH, startM] = startTimeStr.split(':').map((v) => parseInt(v, 10) || 0);
  const [endH, endM] = endTimeStr.split(':').map((v) => parseInt(v, 10) || 0);
  const currentH = currentDate.getHours();
  const currentM = currentDate.getMinutes();
  const currentMins = currentH * 60 + currentM;
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  if (startMins < endMins) {
    // Normal same-day schedule (e.g. 13:00 to 17:00)
    return currentMins >= startMins && currentMins < endMins;
  } else {
    // Overnight schedule (e.g. 22:00 to 07:00)
    return currentMins >= startMins || currentMins < endMins;
  }
}

export const ScreenSaver: React.FC<ScreenSaverProps> = ({
  config,
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
    nightMode: false,
    nightModeDimLevel: 80,
    nightModeScheduleEnabled: false,
    nightModeStartTime: '22:00',
    nightModeEndTime: '07:00',
    nightModePixelShift: true,
    backgroundType: 'liquid-glow',
    photoBrightness: 40,
    photoBlur: 4,
  };

  const clockColor = ssConfig.clockColor || 'sunset';
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Photos state for Apple Photos iCloud Shared Album background
  const [ssPhotos, setSsPhotos] = useState<ICloudPhoto[]>(DEFAULT_ICLOUD_SAMPLE_PHOTOS);
  const [currentSsIndex, setCurrentSsIndex] = useState<number>(0);
  const [ssAlbumName, setSsAlbumName] = useState<string>('');

  // Local override state for quick in-screensaver toggle
  const [manualNightModeOverride, setManualNightModeOverride] = useState<boolean | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subtle anti-burn-in pixel shift for all-night displays
  const [driftOffset, setDriftOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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

  // Determine whether Night Mode is currently active
  const isNightMode = useMemo(() => {
    if (manualNightModeOverride !== null) {
      return manualNightModeOverride;
    }
    if (ssConfig.nightMode) {
      return true;
    }
    if (ssConfig.nightModeScheduleEnabled || ssConfig.autoNightMode) {
      return isWithinSchedule(
        currentTime,
        ssConfig.nightModeStartTime || '22:00',
        ssConfig.nightModeEndTime || '07:00'
      );
    }
    return false;
  }, [
    manualNightModeOverride,
    ssConfig.nightMode,
    ssConfig.nightModeScheduleEnabled,
    ssConfig.autoNightMode,
    ssConfig.nightModeStartTime,
    ssConfig.nightModeEndTime,
    currentTime,
  ]);

  // Anti-burn-in micro-drift: slightly shift container by 2-4px every 3 minutes in Night Mode
  useEffect(() => {
    if (!isNightMode || ssConfig.nightModePixelShift === false) {
      setDriftOffset({ x: 0, y: 0 });
      return;
    }

    const shiftInterval = setInterval(() => {
      const x = Math.floor(Math.random() * 7) - 3;
      const y = Math.floor(Math.random() * 7) - 3;
      setDriftOffset({ x, y });
    }, 3 * 60 * 1000);

    return () => clearInterval(shiftInterval);
  }, [isNightMode, ssConfig.nightModePixelShift]);

  // Fetch live weather periodically
  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      try {
        const query = new URLSearchParams({
          lat: String(config.weather.latitude || 51.5074),
          lon: String(config.weather.longitude || -0.1278),
          units: config.weather.units || 'metric',
          city: config.weather.cityName || 'London, United Kingdom',
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

  // Fetch Apple Photos iCloud Shared Album for ScreenSaver if configured
  useEffect(() => {
    if (ssConfig.backgroundType !== 'icloud_album') return;

    const albumUrl = (ssConfig.icloudAlbumUrl || config.general.icloudAlbumUrl || '').trim();
    if (!albumUrl) {
      setSsPhotos(DEFAULT_ICLOUD_SAMPLE_PHOTOS);
      return;
    }

    let isMounted = true;
    const fetchAlbum = async () => {
      try {
        const res = await fetch(`/api/icloud-album?url=${encodeURIComponent(albumUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.photos && data.photos.length > 0) {
              setSsPhotos(data.photos);
            } else if (data.fallbackPhotos) {
              setSsPhotos(data.fallbackPhotos);
            }
            if (data.streamName) {
              setSsAlbumName(data.streamName);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch iCloud photos for screensaver:', err);
      }
    };

    fetchAlbum();
    const interval = setInterval(fetchAlbum, 20 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [ssConfig.backgroundType, ssConfig.icloudAlbumUrl, config.general.icloudAlbumUrl]);

  // Screensaver photo cycling timer (1 min, 3 min, 5 min, etc.)
  useEffect(() => {
    if (ssConfig.backgroundType !== 'icloud_album' || ssPhotos.length <= 1) return;
    const cycleMinutes = Math.max(1, ssConfig.icloudCycleMinutes || 3);
    const interval = setInterval(() => {
      setCurrentSsIndex((prev) => (prev + 1) % ssPhotos.length);
    }, cycleMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [ssConfig.backgroundType, ssConfig.icloudCycleMinutes, ssPhotos.length]);

  // Keyboard wake up
  useEffect(() => {
    const handleKeyDown = () => {
      onWake();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onWake]);

  // Handle in-screensaver quick toggle of Night Mode
  const toggleNightMode = () => {
    const nextState = !isNightMode;
    setManualNightModeOverride(nextState);

    // Show temporary feedback toast
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(nextState ? '🌙 Night Mode: Enabled (Ultra-Dim Red)' : '☀️ Night Mode: Disabled');
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2500);

    // Persist to user configuration if onUpdateConfig is provided
    if (onUpdateConfig) {
      onUpdateConfig({
        ...config,
        screensaver: {
          ...config.screensaver,
          nightMode: nextState,
        },
      });
    }
  };

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
    if (isNightMode) {
      return {
        gradient: 'from-red-500 via-rose-600 to-red-700',
        glowColor: 'rgba(239, 68, 68, 0.35)',
        ambientOrb: 'bg-red-950/20',
        accentText: 'text-red-400',
      };
    }

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
  }, [clockColor, isNightMode]);

  // Clean temperature formatting helper with guaranteed single degree symbol
  const formattedTemp = useMemo(() => {
    if (!weather) return null;
    const cleanUnit = (weather.tempUnit || '°C').replace(/^°+/, '');
    return `${Math.round(weather.temp)}°${cleanUnit}`;
  }, [weather]);

  // Compute active screen dimming percentage
  const activeDimPercentage = useMemo(() => {
    if (isNightMode) {
      return ssConfig.nightModeDimLevel ?? 80;
    }
    return ssConfig.dimLevel ?? 10;
  }, [isNightMode, ssConfig.nightModeDimLevel, ssConfig.dimLevel]);

  const currentPhoto = ssPhotos.length > 0 ? ssPhotos[currentSsIndex % ssPhotos.length] : null;
  const photoUrl = currentPhoto ? `/api/icloud-photo-proxy?url=${encodeURIComponent(currentPhoto.url)}` : '';
  const photoBrightness = isNightMode ? 15 : Math.max(10, Math.min(100, ssConfig.photoBrightness ?? 40));
  const photoBlur = ssConfig.photoBlur ?? 4;

  return (
    <div
      onClick={onWake}
      role="button"
      tabIndex={0}
      aria-label="Screen Saver active. Tap anywhere to wake"
      className={`fixed inset-0 z-50 w-screen h-screen overflow-hidden select-none cursor-pointer flex flex-col items-center justify-center font-apple-display transition-colors duration-700 ${
        isNightMode ? 'bg-[#000000]' : 'bg-[#02040a]'
      }`}
    >
      {/* Photo Background Layer for Apple Photos iCloud Shared Album */}
      {ssConfig.backgroundType === 'icloud_album' && photoUrl && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 ease-in-out pointer-events-none"
          style={{
            backgroundImage: `url('${photoUrl}')`,
            filter: `brightness(${photoBrightness}%) blur(${photoBlur}px)`,
            transform: photoBlur > 0 ? 'scale(1.06)' : undefined,
          }}
        />
      )}

      {/* Photo Vignette Shade Layer */}
      {ssConfig.backgroundType === 'icloud_album' && (
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-black/85 via-black/40 to-black/75 pointer-events-none" />
      )}

      {/* 1. Ambient Dynamic Liquid Glass Caustics */}
      <div className={`absolute inset-0 z-0 overflow-hidden pointer-events-none ${ssConfig.backgroundType === 'icloud_album' ? 'opacity-40' : ''}`}>
        {/* Soft breathing color orb radiating from behind clock (suppressed in Night Mode for darkness) */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] sm:w-[1150px] md:w-[1450px] h-[550px] sm:h-[750px] md:h-[950px] ${
            colorTheme.ambientOrb
          } rounded-full blur-[160px] md:blur-[220px] transition-all duration-1000 ${
            isNightMode ? 'opacity-20' : 'opacity-75'
          }`}
        />
        {!isNightMode && (
          <>
            {/* Subtle secondary ambient fill */}
            <div className="absolute -top-32 left-1/3 w-[500px] h-[500px] bg-indigo-600/[0.08] rounded-full blur-[160px]" />
            <div className="absolute -bottom-32 right-1/4 w-[600px] h-[600px] bg-sky-600/[0.08] rounded-full blur-[180px]" />
            {/* Micro-starlight / texture layer */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
          </>
        )}
      </div>

      {/* Dim overlay based on active dim level (Ultra-dim black layer in Night Mode) */}
      {activeDimPercentage > 0 && (
        <div
          className="absolute inset-0 z-1 pointer-events-none bg-black transition-opacity duration-700"
          style={{ opacity: activeDimPercentage / 100 }}
        />
      )}

      {/* 2. Top Bar: Quick Night Mode Toggle Button (Corner Unobtrusive Access) */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
        {/* Night Mode Interactive Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleNightMode();
          }}
          className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-full backdrop-blur-xl border transition-all duration-300 text-xs font-semibold ${
            isNightMode
              ? 'bg-red-950/70 border-red-800/60 text-red-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-red-900/80 hover:border-red-700'
              : 'bg-black/50 border-white/10 text-white/70 hover:bg-black/80 hover:text-white hover:border-white/25'
          }`}
          title={isNightMode ? 'Night Mode Active (Click to switch to Standard Mode)' : 'Enable Ultra-Dim Red Night Mode'}
          aria-label="Toggle Night Mode"
        >
          {isNightMode ? (
            <Moon className="w-3.5 h-3.5 text-red-400 fill-red-400/40" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-slate-300" />
          )}
          <span className="font-apple-rounded text-[11px] tracking-wide">
            {isNightMode ? 'Night Mode' : 'Night Mode'}
          </span>
          <span
            className={`w-2 h-2 rounded-full transition-all ${
              isNightMode
                ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                : 'bg-slate-600'
            }`}
          />
        </button>
      </div>

      {/* Feedback Toast Banner when toggling */}
      {toastMessage && (
        <div className="absolute top-20 z-40 px-4 py-2 rounded-full bg-slate-900/90 border border-white/10 text-white text-xs font-apple-rounded shadow-2xl backdrop-blur-xl animate-fade-in pointer-events-none">
          {toastMessage}
        </div>
      )}

      {/* 3. Main Centerpiece: Digital Apple Liquid Glass Clock + Small Widget */}
      <div
        className="relative z-10 flex flex-col items-center justify-center w-full px-4 sm:px-8 max-w-7xl mx-auto my-auto select-none transition-transform duration-1000 ease-out"
        style={{
          transform: `translate(${driftOffset.x}px, ${driftOffset.y}px)`,
        }}
      >
        {/* Massive Digital Apple Liquid Glass Clock Numerals */}
        <div
          aria-label={`${displayHours}:${displayMinutes} ${!format24 ? ampm : ''}`}
          className="relative flex items-baseline justify-center drop-shadow-2xl"
        >
          {/* Hours */}
          <span
            className={`text-[140px] sm:text-[200px] md:text-[270px] lg:text-[340px] xl:text-[400px] 2xl:text-[460px] font-black leading-none font-apple-rounded tracking-tight bg-gradient-to-b ${colorTheme.gradient} bg-clip-text text-transparent transition-all duration-700`}
            style={{
              filter: `drop-shadow(0 0 ${isNightMode ? '35px' : '65px'} ${colorTheme.glowColor}) drop-shadow(0 25px 50px rgba(0,0,0,0.95))`,
            }}
          >
            {displayHours}
          </span>

          {/* Gently Pulsing Liquid Glass Colon Separator */}
          <span
            aria-hidden="true"
            className={`inline-block select-none animate-colon-pulse text-[140px] sm:text-[200px] md:text-[270px] lg:text-[340px] xl:text-[400px] 2xl:text-[460px] font-black leading-none font-apple-rounded tracking-tight bg-gradient-to-b ${colorTheme.gradient} bg-clip-text text-transparent px-1 sm:px-2 md:px-4 -translate-y-[2%] transition-all duration-700`}
            style={{
              filter: `drop-shadow(0 0 ${isNightMode ? '35px' : '65px'} ${colorTheme.glowColor}) drop-shadow(0 25px 50px rgba(0,0,0,0.95))`,
            }}
          >
            :
          </span>

          {/* Minutes */}
          <span
            className={`text-[140px] sm:text-[200px] md:text-[270px] lg:text-[340px] xl:text-[400px] 2xl:text-[460px] font-black leading-none font-apple-rounded tracking-tight bg-gradient-to-b ${colorTheme.gradient} bg-clip-text text-transparent transition-all duration-700`}
            style={{
              filter: `drop-shadow(0 0 ${isNightMode ? '35px' : '65px'} ${colorTheme.glowColor}) drop-shadow(0 25px 50px rgba(0,0,0,0.95))`,
            }}
          >
            {displayMinutes}
          </span>

          {!format24 && (
            <span
              className={`text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black font-apple-rounded tracking-normal ml-3 sm:ml-6 md:ml-8 mb-4 sm:mb-8 md:mb-16 transition-colors duration-700 ${
                isNightMode ? 'text-red-900/60' : 'text-white/40'
              }`}
            >
              {ampm}
            </span>
          )}

          {/* Liquid Glass Top Refraction Glow Bar */}
          {!isNightMode && (
            <div className="absolute -top-6 left-1/4 right-1/4 h-10 bg-white/[0.08] rounded-full blur-2xl pointer-events-none" />
          )}
        </div>

        {/* 4. Small Refined Liquid Glass Widget: Date & Current Weather */}
        <div
          className={`mt-8 sm:mt-12 md:mt-14 flex items-center gap-3 sm:gap-4 px-6 sm:px-8 py-3 sm:py-3.5 rounded-full transition-all duration-700 ${
            isNightMode
              ? 'bg-red-950/30 border border-red-900/40 shadow-none backdrop-blur-xl'
              : 'bg-slate-900/75 border border-white/15 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)]'
          }`}
        >
          {/* Date */}
          <span
            className={`text-sm sm:text-base md:text-lg font-bold font-apple-rounded tracking-wide transition-colors duration-700 ${
              isNightMode ? 'text-red-300/80' : 'text-white/95'
            }`}
          >
            {fullDateFormatted}
          </span>

          {weather && (
            <>
              {/* Subtle glass separator */}
              <span
                className={`text-xs sm:text-sm select-none transition-colors duration-700 ${
                  isNightMode ? 'text-red-900/60' : 'text-white/30'
                }`}
                aria-hidden="true"
              >
                •
              </span>

              {/* Weather Info with single degree symbol */}
              <div className="flex items-center gap-2">
                <WeatherIcon
                  icon={weather.icon || 'sun'}
                  className={`w-4 h-4 sm:w-5 sm:h-5 drop-shadow-sm transition-colors duration-700 ${
                    isNightMode ? 'text-red-400' : 'text-amber-300'
                  }`}
                />
                <span
                  className={`text-sm sm:text-base md:text-lg font-extrabold font-apple-rounded transition-colors duration-700 ${
                    isNightMode ? 'text-red-400' : 'text-white'
                  }`}
                >
                  {formattedTemp}
                </span>
                <span
                  className={`text-xs sm:text-sm md:text-base font-medium hidden sm:inline transition-colors duration-700 ${
                    isNightMode ? 'text-red-400/70' : 'text-white/70'
                  }`}
                >
                  {weather.condition}
                </span>

                {/* Optional Alert Badge if severe weather alert active */}
                {(weather.activeAlert || (weather.alerts && weather.alerts.length > 0)) && (
                  <span
                    className={`ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black font-apple-rounded text-[10px] uppercase tracking-wider transition-colors duration-700 ${
                      isNightMode
                        ? 'bg-red-950 text-red-300 border border-red-800'
                        : 'bg-amber-400 text-slate-950'
                    }`}
                    title={(weather.activeAlert || weather.alerts![0]).event}
                  >
                    <AlertTriangle
                      className={`w-3 h-3 ${
                        isNightMode ? 'fill-red-400 stroke-red-950' : 'fill-black stroke-amber-400'
                      }`}
                    />
                    <span>Alert</span>
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 5. Bottom Photo Album Pill (Subtle Apple-style indicator) */}
      {ssConfig.backgroundType === 'icloud_album' && currentPhoto && (
        <div className="absolute bottom-6 left-6 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/10 text-white/75 text-xs font-mono pointer-events-none transition-opacity">
          <Camera className="w-3.5 h-3.5 text-sky-400" />
          <span>{ssAlbumName || 'iCloud Photos'} • {currentSsIndex + 1}/{ssPhotos.length}</span>
          {currentPhoto.caption && (
            <span className="hidden sm:inline text-white/50 border-l border-white/20 pl-2 max-w-[260px] truncate">
              {currentPhoto.caption}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
