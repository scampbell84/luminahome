import React, { useState, useEffect, useRef } from 'react';
import { AppConfig } from '../../types/config';
import { WALLPAPER_PRESETS } from '../../constants/defaultConfig';
import { ClockWidget } from '../widgets/ClockWidget';
import { WeatherWidget } from '../widgets/WeatherWidget';
import { CalendarWidget } from '../widgets/CalendarWidget';
import { CountdownWidget } from '../widgets/CountdownWidget';
import { NewsWidget } from '../widgets/NewsWidget';
import { NotesWidget } from '../widgets/NotesWidget';
import { SystemWidget } from '../widgets/SystemWidget';
import { Settings, Maximize2, Minimize2, RefreshCw, AlertCircle } from 'lucide-react';

import { CountdownItem } from '../../types/config';

interface DisplayScreenProps {
  config: AppConfig;
  onOpenAdmin: () => void;
  onRefreshConfig: () => void;
  onUpdateConfig?: (updatedConfig: AppConfig) => void;
}

export const DisplayScreen: React.FC<DisplayScreenProps> = ({
  config,
  onOpenAdmin,
  onRefreshConfig,
  onUpdateConfig,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(new Date());
  const [mouseActive, setMouseActive] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeWallpaperIndex, setActiveWallpaperIndex] = useState<number>(0);
  const mouseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Self-healing Heartbeat checker
  useEffect(() => {
    const heartbeatInterval = Math.max(10, config.general.heartbeatIntervalSeconds || 30) * 1000;
    
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
          setIsOnline(true);
          setLastHeartbeat(new Date());
        } else {
          setIsOnline(false);
        }
      } catch (err) {
        setIsOnline(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, heartbeatInterval);
    return () => clearInterval(interval);
  }, [config.general.heartbeatIntervalSeconds]);

  // Wallpaper rotation
  useEffect(() => {
    if (config.general.backgroundType !== 'preset' || !config.general.rotateBackgroundInterval) return;
    const intervalMs = Math.max(1, config.general.rotateBackgroundInterval) * 60 * 1000;
    const interval = setInterval(() => {
      setActiveWallpaperIndex((prev) => (prev + 1) % WALLPAPER_PRESETS.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [config.general.backgroundType, config.general.rotateBackgroundInterval]);

  // Auto-hide mouse cursor in kiosk mode
  useEffect(() => {
    let lastMoveTime = 0;
    const handleMouseMove = () => {
      const now = Date.now();
      if (now - lastMoveTime < 1000) return;
      lastMoveTime = now;
      setMouseActive(true);
      if (mouseTimerRef.current) clearTimeout(mouseTimerRef.current);
      if (config.general.kioskHideCursor) {
        mouseTimerRef.current = setTimeout(() => {
          setMouseActive(false);
        }, 3000);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A') {
        onOpenAdmin();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    if (config.general.kioskHideCursor) {
      mouseTimerRef.current = setTimeout(() => setMouseActive(false), 3000);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (mouseTimerRef.current) clearTimeout(mouseTimerRef.current);
    };
  }, [config.general.kioskHideCursor, onOpenAdmin]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  // Determine current wallpaper URL
  let backgroundImageUrl = '';
  if (config.general.backgroundType === 'preset') {
    const preset = WALLPAPER_PRESETS.find(p => p.id === config.general.presetWallpaper) || WALLPAPER_PRESETS[activeWallpaperIndex % WALLPAPER_PRESETS.length];
    backgroundImageUrl = preset.url;
  } else if (config.general.backgroundType === 'unsplash') {
    const keyword = encodeURIComponent(config.general.unsplashKeyword || 'landscape,nature,mountains');
    backgroundImageUrl = `https://images.unsplash.com/featured/?${keyword}&auto=format&fit=crop&w=2560&q=80`;
  } else if (config.general.backgroundType === 'custom_url') {
    backgroundImageUrl = config.general.customBackgroundUrl;
  }

  const isPortrait = config.general.orientation === 'portrait';
  const gridItems = config.layout.gridItems;

  const handleUpdateCountdownItems = (items: CountdownItem[]) => {
    if (onUpdateConfig) {
      onUpdateConfig({
        ...config,
        countdown: {
          ...config.countdown,
          items,
        },
      });
    }
  };

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case 'clock':
        return config.clock.enabled ? (
          <ClockWidget config={config.clock} orientation={config.general.orientation} />
        ) : null;
      case 'weather':
        return config.weather.enabled ? (
          <WeatherWidget config={config.weather} />
        ) : null;
      case 'calendar':
        return config.calendar.enabled ? (
          <CalendarWidget config={config.calendar} />
        ) : null;
      case 'countdown':
        return config.countdown.enabled ? (
          <CountdownWidget config={config.countdown} onUpdateItems={handleUpdateCountdownItems} />
        ) : null;
      case 'notes':
        return config.notes.enabled ? (
          <NotesWidget config={config.notes} />
        ) : null;
      case 'system':
        return config.system.enabled ? (
          <SystemWidget config={config.system} isOnline={isOnline} lastHeartbeat={lastHeartbeat} />
        ) : null;
      case 'news':
        return config.news.enabled ? (
          <NewsWidget config={config.news} />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden kiosk-screen bg-slate-950 font-sans select-none ${
        config.general.kioskHideCursor && !mouseActive ? 'cursor-none' : ''
      }`}
    >
      {/* Background Wallpaper Layer with smooth transition */}
      {backgroundImageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
          style={{
            backgroundImage: `url('${backgroundImageUrl}')`,
            filter: config.general.backgroundBlur ? `blur(${config.general.backgroundBlur}px)` : undefined,
          }}
        />
      )}

      {/* Dim Overlay Layer for guaranteed text contrast */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          backgroundColor: '#05070e',
          opacity: config.general.backgroundDim,
        }}
      />

      {/* Gradient Vignette Layer */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

      {/* Main Kiosk Layout Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 md:p-6 lg:p-8 pb-28 md:pb-32 overflow-hidden">
        {gridItems && gridItems.length > 0 ? (
          <div 
            className={`w-full h-full grid grid-cols-12 gap-4 items-start ${
              isPortrait ? 'auto-rows-auto' : ''
            }`}
            style={
              !isPortrait
                ? {
                    gridTemplateRows: 'repeat(9, minmax(0, 1fr))',
                  }
                : undefined
            }
          >
            {gridItems
              .filter((item) => item.i !== 'news')
              .map((item) => {
                const content = renderWidgetContent(item.i);
                if (!content) return null;

                return (
                  <div
                    key={item.i}
                    className="w-full"
                    style={
                      !isPortrait
                        ? {
                            gridColumn: `${item.x + 1} / span ${item.w}`,
                            gridRow: `${item.y + 1} / span ${item.h}`,
                          }
                        : {
                            gridColumn: `span ${Math.min(12, item.w)}`,
                          }
                    }
                  >
                    {content}
                  </div>
                );
              })}
          </div>
        ) : (
          <>
            {/* Classic Fallback Layout */}
            <header className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
              {config.clock.enabled && (
                <div className="shrink-0">
                  <ClockWidget config={config.clock} orientation={config.general.orientation} />
                </div>
              )}

              {config.weather.enabled && (
                <div className="shrink-0 self-end sm:self-auto max-w-md w-full sm:w-auto">
                  <WeatherWidget config={config.weather} />
                </div>
              )}
            </header>

            <main className={`flex-1 w-full my-auto ${isPortrait ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'}`}>
              {config.calendar.enabled && (
                <div className={isPortrait ? 'w-full' : 'lg:col-span-8'}>
                  <CalendarWidget config={config.calendar} />
                </div>
              )}

              <div className={`${isPortrait ? 'w-full space-y-4' : 'lg:col-span-4 space-y-4'}`}>
                {config.countdown.enabled && (
                  <CountdownWidget config={config.countdown} onUpdateItems={handleUpdateCountdownItems} />
                )}

                {config.notes.enabled && (
                  <NotesWidget config={config.notes} />
                )}


                {config.system.enabled && (
                  <div className="pt-2">
                    <SystemWidget 
                      config={config.system} 
                      isOnline={isOnline} 
                      lastHeartbeat={lastHeartbeat} 
                    />
                  </div>
                )}
              </div>
            </main>
          </>
        )}
      </div>

      {/* Docked News Ticker (Sits directly above the bottom menu buttons) */}
      {config.news.enabled && (
        <div className="fixed bottom-[49px] md:bottom-[52px] left-0 right-0 z-30 shadow-lg">
          <NewsWidget config={config.news} />
        </div>
      )}

      {/* Subtle Floating Kiosk Control Pill (reveals on mouse move) */}
      <div
        className={`fixed top-4 right-4 z-50 transition-opacity duration-300 flex items-center gap-2 ${
          mouseActive ? 'opacity-90' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          onClick={onRefreshConfig}
          className="p-2 bg-black/60 hover:bg-black/90 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/20 transition-all shadow-lg"
          title="Reload Dashboard Config"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-2 bg-black/60 hover:bg-black/90 backdrop-blur-md rounded-full text-white/80 hover:text-white border border-white/20 transition-all shadow-lg"
          title="Toggle Fullscreen (F)"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenAdmin}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-full text-xs font-semibold shadow-lg transition-all border border-sky-400/30"
          title="Open Admin Settings (A)"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Admin Settings</span>
        </button>
      </div>

      {/* Network dropout silent indicator badge (only if disconnected) */}
      {!isOnline && (
        <div className="fixed bottom-3 left-3 z-50 bg-rose-950/80 text-rose-300 border border-rose-600/50 px-3 py-1 rounded-full text-xs flex items-center gap-2 backdrop-blur-md animate-pulse">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Reconnecting to Lumina Home Server...</span>
        </div>
      )}
    </div>
  );
};
