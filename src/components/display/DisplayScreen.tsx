import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppConfig, CountdownItem, ICloudPhoto } from '../../types/config';
import { WALLPAPER_PRESETS, DEFAULT_ICLOUD_SAMPLE_PHOTOS } from '../../constants/defaultConfig';
import { ClockWidget } from '../widgets/ClockWidget';
import { WeatherWidget } from '../widgets/WeatherWidget';
import { CalendarWidget } from '../widgets/CalendarWidget';
import { CountdownWidget } from '../widgets/CountdownWidget';
import { NewsWidget } from '../widgets/NewsWidget';
import { NotesWidget } from '../widgets/NotesWidget';
import { SystemWidget } from '../widgets/SystemWidget';
import { SmartBriefingWidget } from '../widgets/SmartBriefingWidget';
import { RewardStarsWidget } from '../widgets/RewardStarsWidget';
import { SmartBriefingModal } from '../modals/SmartBriefingModal';
import { AlertCircle, Camera, Sparkles, PartyPopper } from 'lucide-react';
import { createShuffledDeck, expandShuffledDeck } from '../../utils/shuffleDeck';
import { MediaWallpaper } from './MediaWallpaper';

interface DisplayScreenProps {
  config: AppConfig;
  onOpenAdmin: () => void;
  onOpenRewards?: () => void;
  onRefreshConfig: () => void;
  onUpdateConfig?: (updatedConfig: AppConfig) => void;
  onTriggerPartyMode?: () => void;
}

export const DisplayScreen: React.FC<DisplayScreenProps> = ({
  config,
  onOpenAdmin,
  onOpenRewards,
  onRefreshConfig,
  onUpdateConfig,
  onTriggerPartyMode,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(new Date());
  const [mouseActive, setMouseActive] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeWallpaperIndex, setActiveWallpaperIndex] = useState<number>(0);
  const [icloudPhotos, setIcloudPhotos] = useState<ICloudPhoto[]>(DEFAULT_ICLOUD_SAMPLE_PHOTOS);
  const [activeICloudIndex, setActiveICloudIndex] = useState<number>(0);
  const [albumInfo, setAlbumInfo] = useState<{ title?: string; owner?: string }>({});
  const [isBriefingOpen, setIsBriefingOpen] = useState<boolean>(false);
  const [briefingSlotLabel, setBriefingSlotLabel] = useState<string>('Household Briefing');
  const mouseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-display Briefing Overlay at scheduled times (Default: 7:00 AM morning, 12:00 PM afternoon, 4:30 PM evening)
  useEffect(() => {
    if (config.briefing?.enabled === false || config.briefing?.autoPopup === false) {
      return;
    }

    const morningTarget = config.briefing?.morningTime || '07:00';
    const afternoonTarget = config.briefing?.afternoonTime || '12:00';
    const eveningTarget = config.briefing?.eveningTime || '16:30';

    const parseTimeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map((x) => parseInt(x, 10));
      return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
    };

    const morningMin = parseTimeToMinutes(morningTarget);
    const afternoonMin = parseTimeToMinutes(afternoonTarget);
    const eveningMin = parseTimeToMinutes(eveningTarget);

    const checkBriefingSchedule = () => {
      const now = new Date();
      const currentMin = now.getHours() * 60 + now.getMinutes();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      type SlotType = 'morning' | 'afternoon' | 'evening';
      let activeSlot: { slot: SlotType; label: string } | null = null;

      // Check slot trigger windows: triggers once scheduled time is reached, and remains active for up to 60 mins
      if (currentMin >= morningMin && currentMin < morningMin + 60 && currentMin < afternoonMin) {
        activeSlot = { slot: 'morning', label: 'Morning Briefing' };
      } else if (currentMin >= afternoonMin && currentMin < afternoonMin + 60 && currentMin < eveningMin) {
        activeSlot = { slot: 'afternoon', label: 'Afternoon Briefing' };
      } else if (currentMin >= eveningMin && currentMin < eveningMin + 60) {
        activeSlot = { slot: 'evening', label: 'Evening Briefing' };
      }

      if (activeSlot) {
        const storageKey = `lumina_briefing_seen_${todayStr}_${activeSlot.slot}`;
        const hasTriggered = sessionStorage.getItem(storageKey);
        if (!hasTriggered) {
          sessionStorage.setItem(storageKey, 'true');
          setBriefingSlotLabel(activeSlot.label);
          setIsBriefingOpen(true);
        }
      }
    };

    checkBriefingSchedule();
    const interval = setInterval(checkBriefingSchedule, 5000);
    return () => clearInterval(interval);
  }, [
    config.briefing?.enabled,
    config.briefing?.autoPopup,
    config.briefing?.morningTime,
    config.briefing?.afternoonTime,
    config.briefing?.eveningTime,
  ]);

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

  // Smart Shuffle Deck for Wallpaper
  const isWallpaperShuffleEnabled = config.general.icloudShuffle !== false;
  const wallpaperDeckRef = useRef<number[]>([]);
  const wallpaperPosRef = useRef<number>(0);

  useEffect(() => {
    if (icloudPhotos.length === 0) {
      wallpaperDeckRef.current = [];
      wallpaperPosRef.current = 0;
      return;
    }

    if (wallpaperDeckRef.current.length === 0) {
      const initialDeck = isWallpaperShuffleEnabled
        ? createShuffledDeck(icloudPhotos.length)
        : Array.from({ length: icloudPhotos.length }, (_, i) => i);
      wallpaperDeckRef.current = initialDeck;
      wallpaperPosRef.current = 0;
      setActiveICloudIndex(initialDeck[0] || 0);
    } else if (icloudPhotos.length > wallpaperDeckRef.current.length) {
      if (isWallpaperShuffleEnabled) {
        wallpaperDeckRef.current = expandShuffledDeck(
          wallpaperDeckRef.current,
          wallpaperPosRef.current,
          icloudPhotos.length
        );
      } else {
        wallpaperDeckRef.current = Array.from({ length: icloudPhotos.length }, (_, i) => i);
      }
    }
  }, [icloudPhotos.length, isWallpaperShuffleEnabled]);

  // Fetch Apple Photos iCloud Shared Album with background progressive sync
  useEffect(() => {
    if (config.general.backgroundType !== 'icloud_album') return;

    const albumUrl = (config.general.icloudAlbumUrl || '').trim();
    if (!albumUrl) {
      setIcloudPhotos(DEFAULT_ICLOUD_SAMPLE_PHOTOS);
      return;
    }

    let isMounted = true;
    let pollTimer: NodeJS.Timeout | null = null;

    const fetchAlbum = async () => {
      try {
        const res = await fetch(`/api/icloud-album?url=${encodeURIComponent(albumUrl)}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data.photos && data.photos.length > 0) {
              setIcloudPhotos(data.photos);
            } else if (data.fallbackPhotos) {
              setIcloudPhotos(data.fallbackPhotos);
            }
            if (data.streamName) {
              setAlbumInfo({ title: data.streamName, owner: data.owner });
            }

            // Progressive streaming: poll every 6s while background harvest is syncing, then 20m when complete
            if (data.isSyncing) {
              pollTimer = setTimeout(fetchAlbum, 6000);
            } else {
              pollTimer = setTimeout(fetchAlbum, 20 * 60 * 1000);
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch iCloud shared album for wallpaper:', err);
      }
    };

    fetchAlbum();
    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [config.general.backgroundType, config.general.icloudAlbumUrl]);

  // iCloud Photos cycling timer (1 min, 3 min, 5 min, etc.) with Smart Shuffle
  useEffect(() => {
    if (config.general.backgroundType !== 'icloud_album' || icloudPhotos.length <= 1) return;
    const cycleMinutes = Math.max(1, config.general.icloudCycleMinutes || 3);
    const interval = setInterval(() => {
      if (isWallpaperShuffleEnabled) {
        const currentDeck = wallpaperDeckRef.current;
        if (currentDeck.length === 0) return;

        let nextPos = wallpaperPosRef.current + 1;
        if (nextPos >= currentDeck.length) {
          const lastIdx = currentDeck[currentDeck.length - 1];
          const newDeck = createShuffledDeck(icloudPhotos.length, lastIdx);
          wallpaperDeckRef.current = newDeck;
          wallpaperPosRef.current = 0;
          setActiveICloudIndex(newDeck[0] || 0);
        } else {
          wallpaperPosRef.current = nextPos;
          setActiveICloudIndex(currentDeck[nextPos]);
        }
      } else {
        setActiveICloudIndex((prev) => (prev + 1) % icloudPhotos.length);
      }
    }, cycleMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [config.general.backgroundType, config.general.icloudCycleMinutes, icloudPhotos.length, isWallpaperShuffleEnabled]);

  // Standard wallpaper preset rotation
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
  let activeICloudPhoto: ICloudPhoto | null = null;
  if (config.general.backgroundType === 'preset') {
    const preset = WALLPAPER_PRESETS.find(p => p.id === config.general.presetWallpaper) || WALLPAPER_PRESETS[activeWallpaperIndex % WALLPAPER_PRESETS.length];
    backgroundImageUrl = preset.url;
  } else if (config.general.backgroundType === 'unsplash') {
    const keyword = encodeURIComponent(config.general.unsplashKeyword || 'landscape,nature,mountains');
    backgroundImageUrl = `https://images.unsplash.com/featured/?${keyword}&auto=format&fit=crop&w=2560&q=80`;
  } else if (config.general.backgroundType === 'custom_url') {
    backgroundImageUrl = config.general.customBackgroundUrl;
  } else if (config.general.backgroundType === 'icloud_album') {
    if (icloudPhotos.length > 0) {
      activeICloudPhoto = icloudPhotos[activeICloudIndex % icloudPhotos.length];
      backgroundImageUrl = `/api/icloud-photo-proxy?url=${encodeURIComponent(activeICloudPhoto.url)}`;
    }
  }

  const isPortrait = config.general.orientation === 'portrait';
  const rawGridItems = config.layout.gridItems;
  const gridItems = useMemo(() => {
    if (!rawGridItems || rawGridItems.length === 0) return rawGridItems;
    const hasRewards = rawGridItems.some((item) => item.i === 'rewards');
    if (!hasRewards && config.rewards?.enabled !== false && config.rewards?.showWidget !== false) {
      return [
        ...rawGridItems,
        { i: 'rewards', x: 8, y: 3, w: 4, h: 2, minW: 3, minH: 2 },
      ];
    }
    return rawGridItems;
  }, [rawGridItems, config.rewards?.enabled, config.rewards?.showWidget]);

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
      case 'rewards':
      case 'starbank':
        return config.rewards?.enabled !== false && config.rewards?.showWidget !== false ? (
          <RewardStarsWidget
            config={config.rewards}
            allConfig={config}
            onOpenRewards={onOpenRewards}
          />
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
      case 'briefing':
        return config.briefing?.enabled !== false ? (
          <SmartBriefingWidget onEventCreated={onRefreshConfig} />
        ) : null;
      default:
        return null;
    }
  };

  const wallpaperFocalY = config.general.photoFocalBias === 'center'
    ? 50
    : config.general.photoFocalBias === 'top'
    ? 10
    : (config.general.photoFocalOffsetY ?? 20);

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden kiosk-screen bg-slate-950 font-sans select-none ${
        config.general.kioskHideCursor && !mouseActive ? 'cursor-none' : ''
      }`}
    >
      {/* Background Wallpaper Layer with smart face-framing, video playback & smooth transition */}
      {config.general.backgroundType === 'icloud_album' && activeICloudPhoto ? (
        <MediaWallpaper
          photo={activeICloudPhoto}
          brightness={config.general.icloudBrightness ?? 50}
          blur={config.general.icloudBlur ?? 0}
          focalOffsetY={wallpaperFocalY}
        />
      ) : backgroundImageUrl ? (
        <div
          className="absolute inset-0 bg-cover transition-all duration-1000 ease-in-out"
          style={{
            backgroundImage: `url('${backgroundImageUrl}')`,
            backgroundPosition: `center ${wallpaperFocalY}%`,
            filter: config.general.backgroundBlur ? `blur(${config.general.backgroundBlur}px)` : undefined,
            transform: (config.general.backgroundBlur || 0) > 0 ? 'scale(1.05)' : undefined,
          }}
        />
      ) : null}

      {/* Dim Overlay Layer for guaranteed text contrast */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          backgroundColor: '#05070e',
          opacity: config.general.backgroundType === 'icloud_album'
            ? Math.max(0.1, config.general.backgroundDim * 0.7) // Slightly lighter if user controls brightness directly
            : config.general.backgroundDim,
        }}
      />

      {/* Gradient Vignette Layer */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

      {/* Optional Photo Badge for iCloud Shared Album */}
      {config.general.backgroundType === 'icloud_album' && activeICloudPhoto && mouseActive && (
        <div className="absolute bottom-20 left-6 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/80 text-[11px] font-mono pointer-events-none transition-opacity">
          <Camera className="w-3.5 h-3.5 text-sky-300" />
          <span>
            {albumInfo.title || 'iCloud Photos'} • {activeICloudIndex + 1}/{icloudPhotos.length}
          </span>
          {activeICloudPhoto.caption && (
            <span className="hidden sm:inline text-white/60 border-l border-white/20 pl-2 max-w-[200px] truncate">
              {activeICloudPhoto.caption}
            </span>
          )}
        </div>
      )}

      {/* Main Kiosk Layout Container */}
      <div className="relative z-10 w-full h-full flex flex-col justify-between p-4 md:p-6 lg:p-8 pb-28 md:pb-32 overflow-hidden">
        {/* Daily Smart Summary Briefing Banner or Ambient Trigger Pill */}
        {config.briefing?.enabled !== false && (
          config.briefing?.showInHeader ? (
            <div className="w-full mb-3 shrink-0">
              <SmartBriefingWidget onEventCreated={onRefreshConfig} />
            </div>
          ) : (
            <div className="w-full flex justify-end items-center gap-2 mb-2 shrink-0">
              {onTriggerPartyMode && config.party?.enabled !== false && (
                <button
                  type="button"
                  onClick={onTriggerPartyMode}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/25 via-pink-500/25 to-purple-500/25 hover:from-amber-500/40 hover:via-pink-500/40 hover:to-purple-500/40 text-amber-200 hover:text-white border border-amber-400/40 backdrop-blur-xl shadow-lg transition-all active:scale-95 cursor-pointer text-xs font-bold group"
                  title="Switch to Party & Celebration Screen"
                >
                  <PartyPopper className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
                  <span>Party Mode</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const hour = now.getHours();
                  let label = 'Household Briefing';
                  if (hour >= 5 && hour < 12) label = 'Morning Briefing';
                  else if (hour >= 12 && hour < 17) label = 'Afternoon Briefing';
                  else if (hour >= 17) label = 'Evening Briefing';
                  setBriefingSlotLabel(label);
                  setIsBriefingOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white/90 hover:text-white border border-white/15 backdrop-blur-xl shadow-lg transition-all active:scale-95 cursor-pointer text-xs font-semibold"
                title="Open Daily Summary Briefing Overlay"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Daily Briefing</span>
              </button>
            </div>
          )
        )}

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
                {config.rewards?.enabled !== false && config.rewards?.showWidget !== false && (
                  <RewardStarsWidget
                    config={config.rewards}
                    allConfig={config}
                    onOpenRewards={onOpenRewards}
                  />
                )}

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


      {/* Network dropout silent indicator badge (only if disconnected) */}
      {!isOnline && (
        <div className="fixed bottom-3 left-3 z-50 bg-rose-950/80 text-rose-300 border border-rose-600/50 px-3 py-1 rounded-full text-xs flex items-center gap-2 backdrop-blur-md animate-pulse">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Reconnecting to Lumina Home Server...</span>
        </div>
      )}

      {/* Daily Smart Summary Briefing Popup Overlay */}
      <SmartBriefingModal
        isOpen={isBriefingOpen}
        onClose={() => setIsBriefingOpen(false)}
        onEventCreated={onRefreshConfig}
        slotLabel={briefingSlotLabel}
      />
    </div>
  );
};
