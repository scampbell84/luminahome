import React, { useState, useEffect, useRef } from 'react';
import { AppConfig, CalendarFeed, CountdownItem, ICloudPhoto, PartyAccentColor, PartyEffect } from '../../types/config';
import { WALLPAPER_PRESETS, DEFAULT_CONFIG, DEFAULT_REWARD_CONFIG, CALENDAR_THEMES, HOLIDAY_PRESETS, HolidayFeedPreset, RANDOM_FEED_COLORS, DEFAULT_ICLOUD_SAMPLE_PHOTOS, PARTY_TEMPLATES } from '../../constants/defaultConfig';
import { APP_VERSION } from '../../constants/version';
import { SystemSettings } from '../system/SystemSettings';
import { AboutSection } from './AboutSection';
import { GridVisualEditor } from './GridVisualEditor';
import { PartySettingsTab } from './PartySettingsTab';
import { RewardSettingsTab } from './RewardSettingsTab';
import { generateQrDataUrl, formatWifiQrString } from '../../utils/qrCode';
import {
  Save,
  RotateCcw,
  Monitor,
  Calendar,
  CloudSun,
  Clock,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  ArrowUpDown,
  Newspaper,
  CheckSquare,
  Hourglass,
  Cpu,
  Plus,
  Trash2,
  ExternalLink,
  Check,
  AlertCircle,
  Search,
  Sparkles,
  Sliders,
  Image as ImageIcon,
  Repeat,
  Eye,
  LayoutGrid,
  Moon,
  Sun,
  Camera,
  Loader2,
  Layers,
  Thermometer,
  Droplets,
  CalendarDays,
  MapPin,
  AlertTriangle,
  Home,
  Wifi,
  Globe,
  Activity,
  CheckCircle2,
  Key,
  Copy,
  Lock,
  Info,
  RefreshCw,
  PartyPopper,
  Music,
  QrCode,
  Radio,
  Keyboard,
  Volume2,
  Shuffle,
  Star,
} from 'lucide-react';

import { SmartBriefingModal } from '../modals/SmartBriefingModal';

interface AdminDashboardProps {
  initialConfig: AppConfig;
  onSave: (config: AppConfig) => Promise<void>;
  onReset: () => Promise<void>;
  onOpenDisplay: () => void;
  onTriggerScreensaver?: () => void;
  onTriggerPartyMode?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialConfig,
  onSave,
  onReset,
  onOpenDisplay,
  onTriggerScreensaver,
  onTriggerPartyMode,
}) => {
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<'display' | 'layout' | 'calendar' | 'weather' | 'widgets' | 'screensaver' | 'party' | 'rewards' | 'system' | 'about'>('layout');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showBriefingPreview, setShowBriefingPreview] = useState<boolean>(false);

  // Tab strip horizontal scroll indicators and controls
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);
  const [hasOverflow, setHasOverflow] = useState<boolean>(false);
  const isDraggingTabsRef = useRef<boolean>(false);
  const dragStartXRef = useRef<number>(0);
  const dragScrollLeftRef = useRef<number>(0);

  const checkTabScroll = () => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const clientWidth = el.clientWidth;
    const scrollWidth = el.scrollWidth;

    if (clientWidth > 0 && scrollWidth > 0) {
      const overflow = scrollWidth > clientWidth + 4;
      setHasOverflow(overflow);
      setCanScrollLeft(scrollLeft > 6);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
    }
  };

  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;

    checkTabScroll();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        checkTabScroll();
      });
      resizeObserver.observe(el);
    }

    el.addEventListener('scroll', checkTabScroll, { passive: true });
    window.addEventListener('resize', checkTabScroll);

    const t1 = setTimeout(checkTabScroll, 100);
    const t2 = setTimeout(checkTabScroll, 350);
    const t3 = setTimeout(checkTabScroll, 750);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      el.removeEventListener('scroll', checkTabScroll);
      window.removeEventListener('resize', checkTabScroll);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  useEffect(() => {
    checkTabScroll();
    const t = setTimeout(checkTabScroll, 150);
    return () => clearTimeout(t);
  }, [activeTab]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
      const offset = direction === 'left' ? -260 : 260;
      tabsContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      setTimeout(checkTabScroll, 320);
    }
  };

  const handleTabsWheel = (e: React.WheelEvent) => {
    const el = tabsContainerRef.current;
    if (el && e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
      checkTabScroll();
    }
  };

  const handleTabsMouseDown = (e: React.MouseEvent) => {
    const el = tabsContainerRef.current;
    if (!el) return;
    isDraggingTabsRef.current = true;
    dragStartXRef.current = e.pageX - el.offsetLeft;
    dragScrollLeftRef.current = el.scrollLeft;
  };

  const handleTabsMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingTabsRef.current) return;
    const el = tabsContainerRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragStartXRef.current) * 1.5;
    el.scrollLeft = dragScrollLeftRef.current - walk;
    checkTabScroll();
  };

  const handleTabsMouseUpOrLeave = () => {
    isDraggingTabsRef.current = false;
  };

  const handleToggleWidget = (key: keyof AppConfig) => {
    setConfig((prev) => {
      if (key === 'rewards') {
        const rewards = prev.rewards || DEFAULT_REWARD_CONFIG;
        const currentShow = rewards.showWidget !== false;
        return {
          ...prev,
          rewards: {
            ...rewards,
            showWidget: !currentShow,
          },
        };
      }
      const current = prev[key] as any;
      if (current && typeof current === 'object' && 'enabled' in current) {
        return {
          ...prev,
          [key]: {
            ...current,
            enabled: !current.enabled,
          },
        };
      }
      return prev;
    });
  };

  const handleUpdateLayout = (newGridItems: AppConfig['layout']['gridItems']) => {
    setConfig((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        gridItems: newGridItems,
      },
    }));
  };

  // Weather search autocomplete state
  const [searchCityQuery, setSearchCityQuery] = useState<string>('');
  const [citySearchResults, setCitySearchResults] = useState<any[]>([]);
  const [searchingCity, setSearchingCity] = useState<boolean>(false);

  // Feed testing state
  const [testingFeedId, setTestingFeedId] = useState<string | null>(null);
  const [feedTestResult, setFeedTestResult] = useState<{ id: string; ok: boolean; count?: number; error?: string } | null>(null);

  // Apple Photos iCloud Shared Album testing state
  const [testingICloud, setTestingICloud] = useState<boolean>(false);
  const [icloudTestResult, setIcloudTestResult] = useState<{
    ok: boolean;
    streamName?: string;
    owner?: string;
    count?: number;
    totalEstimated?: number;
    isSyncing?: boolean;
    isComplete?: boolean;
    photos?: ICloudPhoto[];
    error?: string;
  } | null>(null);

  const handleTestICloudAlbum = async (urlToTest?: string, force = false) => {
    const rawTarget = (urlToTest !== undefined ? urlToTest : (config.general.icloudAlbumUrl || config.screensaver?.icloudAlbumUrl || '')).trim();
    if (!rawTarget) {
      setIcloudTestResult({
        ok: false,
        error: 'Please enter an Apple Photos iCloud Shared Album URL first (or click "Use Sample Demo Album").',
      });
      return;
    }

    setTestingICloud(true);
    setIcloudTestResult(null);

    try {
      const res = await fetch(`/api/icloud-album?url=${encodeURIComponent(rawTarget)}${force ? '&force=true' : ''}`);
      const data = await res.json();
      if (res.ok && data.ok) {
        setIcloudTestResult({
          ok: true,
          streamName: data.streamName,
          owner: data.owner,
          count: data.count,
          totalEstimated: data.totalEstimated,
          isSyncing: data.isSyncing,
          isComplete: data.isComplete,
          photos: data.photos || [],
        });
      } else {
        setIcloudTestResult({
          ok: false,
          error: data.error || 'Failed to fetch photos from iCloud.',
          photos: data.fallbackPhotos || [],
        });
      }
    } catch (err: any) {
      setIcloudTestResult({
        ok: false,
        error: `Network error: ${err.message}`,
      });
    } finally {
      setTestingICloud(false);
    }
  };

  // Sync state if initialConfig updates externally
  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      await onSave(config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (confirm('Are you sure you want to reset all settings to factory default?')) {
      await onReset();
      setConfig(DEFAULT_CONFIG);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Weather city geocode search
  const handleCitySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCityQuery.trim()) return;
    setSearchingCity(true);
    try {
      const res = await fetch(`/api/weather/geocode?query=${encodeURIComponent(searchCityQuery)}`);
      const data = await res.json();
      setCitySearchResults(data.results || []);
    } catch (err) {
      console.warn('Geocoding search failed:', err);
    } finally {
      setSearchingCity(false);
    }
  };

  const selectCity = (city: any) => {
    setConfig((prev) => ({
      ...prev,
      weather: {
        ...prev.weather,
        cityName: city.label,
        latitude: parseFloat(city.latitude.toFixed(4)),
        longitude: parseFloat(city.longitude.toFixed(4)),
      },
    }));
    setCitySearchResults([]);
    setSearchCityQuery('');
  };

  // Calendar feed operations
  const addCalendarFeed = () => {
    const existingColors = new Set(config.calendar.feeds.map((f) => f.color.toLowerCase()));
    const availableColors = RANDOM_FEED_COLORS.filter((c) => !existingColors.has(c.toLowerCase()));
    const assignedColor =
      availableColors.length > 0
        ? availableColors[Math.floor(Math.random() * availableColors.length)]
        : RANDOM_FEED_COLORS[Math.floor(Math.random() * RANDOM_FEED_COLORS.length)];

    const newFeed: CalendarFeed = {
      id: `feed-${Date.now()}`,
      name: 'New Calendar',
      url: '',
      color: assignedColor,
      enabled: true,
    };
    setConfig((prev) => ({
      ...prev,
      calendar: {
        ...prev.calendar,
        feeds: [...prev.calendar.feeds, newFeed],
      },
    }));
  };

  const isHolidayActive = (preset: HolidayFeedPreset) => {
    return config.calendar.feeds.some((f) => f.url === preset.url || f.id === preset.id);
  };

  const toggleHolidayPreset = (preset: HolidayFeedPreset) => {
    setConfig((prev) => {
      const isCurrentlyActive = prev.calendar.feeds.some(
        (f) => f.url === preset.url || f.id === preset.id
      );

      const currentHolidays = prev.calendar.holidays || {};
      const updatedHolidays = {
        ...currentHolidays,
        [preset.countryKey]: !isCurrentlyActive,
      };

      let updatedFeeds = [...prev.calendar.feeds];
      if (isCurrentlyActive) {
        // Remove holiday feed
        updatedFeeds = updatedFeeds.filter(
          (f) => f.url !== preset.url && f.id !== preset.id
        );
      } else {
        // Add holiday feed
        const newFeed: CalendarFeed = {
          id: preset.id,
          name: preset.name,
          url: preset.url,
          color: preset.color,
          enabled: true,
        };
        updatedFeeds.push(newFeed);
      }

      return {
        ...prev,
        calendar: {
          ...prev.calendar,
          holidays: updatedHolidays,
          feeds: updatedFeeds,
        },
      };
    });
  };

  const updateCalendarFeed = (id: string, updates: Partial<CalendarFeed>) => {
    setConfig((prev) => ({
      ...prev,
      calendar: {
        ...prev.calendar,
        feeds: prev.calendar.feeds.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      },
    }));
  };

  const removeCalendarFeed = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      calendar: {
        ...prev.calendar,
        feeds: prev.calendar.feeds.filter((f) => f.id !== id),
      },
    }));
  };

  // Countdown multi-item operations
  const getCountdownItems = (): CountdownItem[] => {
    if (config.countdown.items && Array.isArray(config.countdown.items)) {
      return config.countdown.items;
    }
    if (config.countdown.title && config.countdown.targetDate) {
      return [
        {
          id: 'countdown-default',
          title: config.countdown.title,
          targetDate: config.countdown.targetDate,
          icon: config.countdown.icon || 'plane',
          annual: config.countdown.annual || false,
        },
      ];
    }
    return [];
  };

  const addCountdownItem = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setHours(12, 0, 0, 0);
    const dateStr = nextMonth.toISOString().slice(0, 16);

    const newItem: CountdownItem = {
      id: `countdown-${Date.now()}`,
      title: 'New Event Countdown',
      targetDate: dateStr,
      icon: 'sparkles',
      annual: false,
    };

    setConfig((prev) => {
      const currentItems = prev.countdown.items && Array.isArray(prev.countdown.items)
        ? prev.countdown.items
        : prev.countdown.title && prev.countdown.targetDate
        ? [
            {
              id: 'countdown-default',
              title: prev.countdown.title,
              targetDate: prev.countdown.targetDate,
              icon: prev.countdown.icon || 'plane',
              annual: prev.countdown.annual || false,
            },
          ]
        : [];
      return {
        ...prev,
        countdown: {
          ...prev.countdown,
          items: [...currentItems, newItem],
        },
      };
    });
  };

  const updateCountdownItem = (id: string, updates: Partial<CountdownItem>) => {
    setConfig((prev) => {
      const currentItems = prev.countdown.items && Array.isArray(prev.countdown.items)
        ? prev.countdown.items
        : prev.countdown.title && prev.countdown.targetDate
        ? [
            {
              id: 'countdown-default',
              title: prev.countdown.title,
              targetDate: prev.countdown.targetDate,
              icon: prev.countdown.icon || 'plane',
              annual: prev.countdown.annual || false,
            },
          ]
        : [];
      return {
        ...prev,
        countdown: {
          ...prev.countdown,
          items: currentItems.map((item) => (item.id === id ? { ...item, ...updates } : item)),
        },
      };
    });
  };

  const removeCountdownItem = (id: string) => {
    setConfig((prev) => {
      const currentItems = prev.countdown.items && Array.isArray(prev.countdown.items)
        ? prev.countdown.items
        : prev.countdown.title && prev.countdown.targetDate
        ? [
            {
              id: 'countdown-default',
              title: prev.countdown.title,
              targetDate: prev.countdown.targetDate,
              icon: prev.countdown.icon || 'plane',
              annual: prev.countdown.annual || false,
            },
          ]
        : [];
      return {
        ...prev,
        countdown: {
          ...prev.countdown,
          items: currentItems.filter((item) => item.id !== id),
        },
      };
    });
  };

  const sortCountdownItemsByDate = () => {
    const items = getCountdownItems();
    const now = new Date();
    const parseItemDate = (dateStr: string) => {
      if (!dateStr) return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate(), hour: 0, minute: 0 };
      const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
      if (m) {
        return {
          year: parseInt(m[1], 10),
          month: parseInt(m[2], 10) - 1,
          day: parseInt(m[3], 10),
          hour: m[4] !== undefined ? parseInt(m[4], 10) : 0,
          minute: m[5] !== undefined ? parseInt(m[5], 10) : 0,
        };
      }
      const d = new Date(dateStr);
      return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
    };

    const sorted = [...items].sort((a, b) => {
      const getEffectiveTargetTime = (item: CountdownItem) => {
        const parsed = parseItemDate(item.targetDate);
        if (item.annual) {
          const thisYearTarget = new Date(now.getFullYear(), parsed.month, parsed.day, parsed.hour, parsed.minute);
          const endOfThisYear = new Date(now.getFullYear(), parsed.month, parsed.day, 23, 59, 59, 999);
          if (now.getTime() > endOfThisYear.getTime()) {
            return new Date(now.getFullYear() + 1, parsed.month, parsed.day, parsed.hour, parsed.minute).getTime();
          }
          return thisYearTarget.getTime();
        }
        return new Date(parsed.year, parsed.month, parsed.day, parsed.hour, parsed.minute).getTime();
      };
      return getEffectiveTargetTime(a) - getEffectiveTargetTime(b);
    });

    setConfig((prev) => ({
      ...prev,
      countdown: {
        ...prev.countdown,
        items: sorted,
      },
    }));
  };

  const testCalendarFeed = async (feed: CalendarFeed) => {
    if (!feed.url.trim()) return;
    setTestingFeedId(feed.id);
    setFeedTestResult(null);
    try {
      const res = await fetch('/api/calendar/test-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: feed.url }),
      });
      const data = await res.json();
      setFeedTestResult({
        id: feed.id,
        ok: data.ok,
        count: data.eventCount,
        error: data.error,
      });
    } catch (err: any) {
      setFeedTestResult({
        id: feed.id,
        ok: false,
        error: err.message,
      });
    } finally {
      setTestingFeedId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-md">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>Lumina Home Settings</span>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono px-2 py-0.5 rounded-full uppercase">
                Self-Hosted
              </span>
            </h1>
            <p className="text-xs text-slate-400 hidden sm:block">
              Smart display settings, layout & multi-feed calendar manager
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetToDefault}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-700/60"
            title="Reset to factory defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={onOpenDisplay}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-sky-200 rounded-lg transition-colors flex items-center gap-1.5 border border-sky-500/30 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Kiosk Display</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-md ${
              saveSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-sky-600 hover:bg-sky-500 text-white'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6 pb-28">
        {/* Navigation Tabs with Swipe / Scroll Indicators */}
        <div className="relative mb-6">
          {/* Left Scroll Indicator & Button */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-2 z-20 flex items-center pr-10 pl-1 bg-gradient-to-r from-slate-950 via-slate-950/95 to-transparent pointer-events-none">
              <button
                type="button"
                onClick={() => scrollTabs('left')}
                aria-label="Scroll left to see previous menu options"
                className="pointer-events-auto p-1.5 rounded-full bg-slate-850 hover:bg-slate-750 text-sky-400 hover:text-white border border-sky-500/40 shadow-xl active:scale-90 transition-all flex items-center justify-center cursor-pointer"
                title="Scroll left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Right Scroll Indicator & "More" Button */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-2 z-20 flex items-center pl-10 pr-1 bg-gradient-to-l from-slate-950 via-slate-950/95 to-transparent pointer-events-none">
              <button
                type="button"
                onClick={() => scrollTabs('right')}
                aria-label="Scroll right to see more menu options"
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/50 text-sky-300 hover:text-white shadow-xl active:scale-95 transition-all text-xs font-bold cursor-pointer group animate-pulse"
                title="Swipe or click to see more tabs"
              >
                <span className="tracking-wide">More</span>
                <ChevronRight className="w-4 h-4 text-sky-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* Scrollable Tabs Row */}
          <div
            ref={tabsContainerRef}
            onWheel={handleTabsWheel}
            onMouseDown={handleTabsMouseDown}
            onMouseMove={handleTabsMouseMove}
            onMouseUp={handleTabsMouseUpOrLeave}
            onMouseLeave={handleTabsMouseUpOrLeave}
            className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none scroll-smooth select-none cursor-grab active:cursor-grabbing touch-pan-x"
          >
            <button
              onClick={(e) => {
                setActiveTab('display');
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'display'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>Screen & Wallpaper</span>
            </button>

            <button
              onClick={(e) => {
                setActiveTab('layout');
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'layout'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutGrid className="w-4 h-4 text-amber-400" />
              <span>Drag & Drop Grid</span>
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                Visual
              </span>
            </button>

            <button
              onClick={(e) => {
                setActiveTab('calendar');
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'calendar'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Calendar</span>
              <span className="text-[10px] bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded-full font-mono border border-sky-400/30">
                {config.calendar.feeds.length}
              </span>
            </button>

            <button
              onClick={(e) => {
                setActiveTab('weather');
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'weather'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CloudSun className="w-4 h-4" />
              <span>Weather & Location</span>
            </button>

            <button
              onClick={(e) => {
                setActiveTab('widgets');
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'widgets'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Widgets & Content</span>
            </button>

            <button
              onClick={(e) => {
                setActiveTab('screensaver');
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'screensaver'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Screen Saver</span>
            </button>

            <button
              onClick={(e) => {
                setActiveTab('party');
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'party'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-md shadow-fuchsia-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <PartyPopper className="w-4 h-4 text-fuchsia-400" />
              <span>Party & Events</span>
              <span className="text-[10px] bg-fuchsia-500/20 text-fuchsia-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                New
              </span>
            </button>

            <button
              onClick={(e) => {
                setActiveTab('rewards');
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'rewards'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Star className="w-4 h-4 text-amber-400" />
              <span>Reward Chart</span>
            </button>

            <button
              onClick={(e) => {
                setActiveTab('system');
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'system'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>System & Updates</span>
            </button>

            <button
              onClick={(e) => {
                setActiveTab('about');
                e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
              }}
              className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
                activeTab === 'about'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Info className="w-4 h-4 text-sky-400" />
              <span>About</span>
              <span className="text-[10px] bg-sky-400/20 text-sky-300 font-bold px-1.5 py-0.5 rounded font-mono">
                v{APP_VERSION}
              </span>
            </button>
          </div>

          {/* Persistent Overflow & Swipe Guide Indicator */}
          {hasOverflow && (
            <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-1">
              <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-medium select-none">
                <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400 shrink-0 animate-pulse" />
                <span>Swipe or scroll horizontally to view all menu options</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollTabs('left')}
                  disabled={!canScrollLeft}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-0.5 cursor-pointer"
                  title="Scroll tabs left"
                >
                  <ChevronLeft className="w-3 h-3" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  onClick={() => scrollTabs('right')}
                  disabled={!canScrollRight}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-0.5 cursor-pointer"
                  title="Scroll tabs right"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tab 1: Screen & Wallpaper */}
        {activeTab === 'display' && (
          <div className="space-y-6">
            {/* Screen Orientation & Scale */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-sky-400" />
                <span>Screen Orientation & Behavior</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">
                    Display Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, general: { ...prev.general, orientation: 'landscape' } }))}
                      className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        config.general.orientation === 'landscape'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-8 h-5 border border-current rounded-sm" />
                      <span>Landscape (16:10 • 1920×1200)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, general: { ...prev.general, orientation: 'portrait' } }))}
                      className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                        config.general.orientation === 'portrait'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="w-5 h-8 border border-current rounded-sm" />
                      <span>Portrait (10:16 • 1200×1920)</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-xs font-medium text-white block">Auto-Hide Mouse Cursor</span>
                      <span className="text-[11px] text-slate-400">Hides mouse after 3 seconds of inactivity (ideal for Pi kiosk)</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.general.kioskHideCursor}
                      onChange={(e) => setConfig(prev => ({ ...prev, general: { ...prev.general, kioskHideCursor: e.target.checked } }))}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                    />
                  </div>

                  {/* On-Screen Virtual Keyboard for Raspberry Pi Touchscreen */}
                  <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-xs font-medium text-white flex items-center gap-1.5">
                        <Keyboard className="w-3.5 h-3.5 text-sky-400" />
                        <span>On-Screen Touchscreen Keyboard</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Automatically pops up when tapping any text field or password on touchscreen
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.system?.virtualKeyboard ?? true}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          system: {
                            ...prev.system,
                            virtualKeyboard: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                  </div>

                  {/* Keyboard Audio Click Sound */}
                  <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-xs font-medium text-white flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Keyboard Click Audio Feedback</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Synthesizes a soft mechanical tactile click sound on touch keypresses
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.system?.virtualKeyboardSound ?? true}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          system: {
                            ...prev.system,
                            virtualKeyboardSound: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                    />
                  </div>

                  {/* Touchscreen Keyboard Interactive Test Field */}
                  <div className="p-3 bg-sky-950/20 border border-sky-500/20 rounded-lg">
                    <label className="text-[11px] font-semibold text-sky-300 block mb-1">
                      Touchscreen Keyboard Test Box
                    </label>
                    <input
                      type="text"
                      placeholder="Tap here to test the on-screen keyboard..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-white">Heartbeat Self-Healing Interval</span>
                      <span className="text-xs font-mono text-sky-400">{config.general.heartbeatIntervalSeconds}s</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={120}
                      step={5}
                      value={config.general.heartbeatIntervalSeconds}
                      onChange={(e) => setConfig(prev => ({ ...prev, general: { ...prev.general, heartbeatIntervalSeconds: parseInt(e.target.value) } }))}
                      className="w-full accent-sky-500"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1">Periodically checks server health to quietly reconnect without crashes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Background Wallpapers */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <span>Background Wallpaper & Photography</span>
              </h3>

              {/* Wallpaper Type Picker */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, general: { ...prev.general, backgroundType: 'preset' } }))}
                  className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    config.general.backgroundType === 'preset'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Curated 4K Presets
                </button>

                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, general: { ...prev.general, backgroundType: 'icloud_album' } }))}
                  className={`p-2.5 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    config.general.backgroundType === 'icloud_album'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-300 shadow-sm'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  <span>Apple Photos (iCloud)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, general: { ...prev.general, backgroundType: 'unsplash' } }))}
                  className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    config.general.backgroundType === 'unsplash'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Unsplash Keywords
                </button>

                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, general: { ...prev.general, backgroundType: 'custom_url' } }))}
                  className={`p-2.5 rounded-lg border text-xs font-medium transition-all ${
                    config.general.backgroundType === 'custom_url'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  Custom Photo URL
                </button>
              </div>

              {/* Apple Photos iCloud Shared Album Configuration */}
              {config.general.backgroundType === 'icloud_album' && (
                <div className="space-y-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">Apple Photos iCloud Shared Album</h4>
                        <p className="text-[11px] text-slate-400">Stream photos directly from your family's iCloud Shared Album.</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const demoUrl = 'sample';
                        setConfig(prev => ({
                          ...prev,
                          general: { ...prev.general, icloudAlbumUrl: demoUrl },
                        }));
                        handleTestICloudAlbum(demoUrl);
                      }}
                      className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg border border-slate-700 transition-colors shrink-0"
                    >
                      Use Sample Demo Album
                    </button>
                  </div>

                  {/* URL Input & Test Action */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium block">
                      iCloud Shared Album Public Web Link:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={config.general.icloudAlbumUrl || ''}
                        onChange={(e) =>
                          setConfig(prev => ({
                            ...prev,
                            general: { ...prev.general, icloudAlbumUrl: e.target.value },
                          }))
                        }
                        placeholder="https://www.icloud.com/sharedalbum/#B0zG6XBubJk..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleTestICloudAlbum(undefined, false)}
                          disabled={testingICloud}
                          className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm"
                        >
                          {testingICloud ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Fetching...</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-3.5 h-3.5" />
                              <span>Test & Fetch Photos</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTestICloudAlbum(undefined, true)}
                          disabled={testingICloud}
                          title="Forces a fresh pull of all album partitions from Apple CloudKit"
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 border border-slate-700 transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${testingICloud ? 'animate-spin' : ''}`} />
                          <span>Force Re-Sync</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-800/40 text-[11px] text-sky-200/80 leading-relaxed flex items-start gap-2">
                      <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>How to get this link:</strong> In Apple Photos on iPhone, iPad, or Mac, open any Shared Album &gt; tap the People / Info icon &gt; turn <strong>Public Website</strong> ON &gt; tap <strong>Share Link</strong> and paste it here.
                      </div>
                    </div>
                  </div>

                  {/* Test Results Display */}
                  {icloudTestResult && (
                    <div
                      className={`p-3 rounded-lg border text-xs space-y-2.5 ${
                        icloudTestResult.ok
                          ? 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
                          : 'bg-rose-950/30 border-rose-800 text-rose-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-semibold">
                          {icloudTestResult.ok ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Album Verified: {icloudTestResult.streamName}</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-rose-400" />
                              <span>Connection Warning</span>
                            </>
                          )}
                        </div>
                        {icloudTestResult.ok && (
                          <div className="flex items-center gap-2">
                            {icloudTestResult.isSyncing && (
                              <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Background Harvester Syncing</span>
                              </span>
                            )}
                            <span className="text-[11px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono font-bold">
                              {icloudTestResult.count} Photos Ready
                            </span>
                          </div>
                        )}
                      </div>

                      {icloudTestResult.isSyncing && (
                        <div className="p-2 rounded-md bg-sky-950/50 border border-sky-500/30 text-[11px] text-sky-200 flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                          <span>
                            Progressive background streaming is active! Initial photos are ready immediately, and remaining photos (2,000+) are being fetched without rate limits or UI lag.
                          </span>
                        </div>
                      )}

                      {icloudTestResult.error && (
                        <p className="text-[11px] text-rose-300/90 leading-normal">
                          {icloudTestResult.error}
                        </p>
                      )}

                      {/* Photo Thumbnail Strip */}
                      {icloudTestResult.photos && icloudTestResult.photos.length > 0 && (
                        <div className="pt-2 border-t border-white/10">
                          <span className="text-[10px] text-white/60 block mb-1.5 uppercase tracking-wider font-semibold">
                            Preview of Photos in Album:
                          </span>
                          <div className="flex gap-2 overflow-x-auto pb-1 agenda-scroll">
                            {icloudTestResult.photos.slice(0, 10).map((p, idx) => (
                              <div
                                key={p.id || idx}
                                className="w-16 h-16 rounded-md overflow-hidden shrink-0 border border-white/15 relative group bg-black"
                              >
                                <img
                                  src={`/api/icloud-photo-proxy?url=${encodeURIComponent(p.thumbnailUrl || p.url)}`}
                                  alt={p.caption || `Photo ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = p.url;
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Photo Rotation Interval and Playback Order */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1">
                        Rotate / Cycle Interval
                      </label>
                      <select
                        value={config.general.icloudCycleMinutes ?? 3}
                        onChange={(e) =>
                          setConfig(prev => ({
                            ...prev,
                            general: {
                              ...prev.general,
                              icloudCycleMinutes: parseInt(e.target.value, 10),
                            },
                          }))
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value={1}>Every 1 Minute</option>
                        <option value={3}>Every 3 Minutes (Recommended)</option>
                        <option value={5}>Every 5 Minutes</option>
                        <option value={10}>Every 10 Minutes</option>
                        <option value={15}>Every 15 Minutes</option>
                        <option value={30}>Every 30 Minutes</option>
                        <option value={60}>Every 1 Hour</option>
                      </select>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Smoothly transitions between photos in the album.
                      </span>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1">
                        Playback Order
                      </label>
                      <div className="flex rounded-lg bg-slate-900 border border-slate-700 p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setConfig(prev => ({
                              ...prev,
                              general: { ...prev.general, icloudShuffle: true },
                            }))
                          }
                          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            config.general.icloudShuffle !== false
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          <span>Smart Shuffle</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfig(prev => ({
                              ...prev,
                              general: { ...prev.general, icloudShuffle: false },
                            }))
                          }
                          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            config.general.icloudShuffle === false
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Repeat className="w-3.5 h-3.5" />
                          <span>Sequential</span>
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Smart Shuffle guarantees non-repeating photos until all are shown.
                      </span>
                    </div>

                    {/* Photo Brightness Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-300 font-medium">Photo Brightness</label>
                        <span className="text-xs font-mono font-bold text-sky-400">
                          {config.general.icloudBrightness ?? 50}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={config.general.icloudBrightness ?? 50}
                        onChange={(e) =>
                          setConfig(prev => ({
                            ...prev,
                            general: {
                              ...prev.general,
                              icloudBrightness: parseInt(e.target.value, 10),
                            },
                          }))
                        }
                        className="w-full accent-sky-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Dims photo to ensure clock & calendar widgets remain readable.
                      </span>
                    </div>

                    {/* Photo Blur Slider */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-300 font-medium">Photo Blur</label>
                        <span className="text-xs font-mono font-bold text-sky-400">
                          {config.general.icloudBlur ?? 0}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="25"
                        step="1"
                        value={config.general.icloudBlur ?? 0}
                        onChange={(e) =>
                          setConfig(prev => ({
                            ...prev,
                            general: {
                              ...prev.general,
                              icloudBlur: parseInt(e.target.value, 10),
                            },
                          }))
                        }
                        className="w-full accent-sky-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Softens background details so foreground text pops.
                      </span>
                    </div>
                  </div>

                  {/* Photo Framing & Face Focus Positioning */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold">
                          👤
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-white">Photo Framing & Face Focus</h5>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold px-2 py-0.5 rounded-full">
                              Prevents Cutoff
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Anchors the vertical crop on widescreen displays so family faces and heads are never chopped off.
                          </p>
                        </div>
                      </div>

                      <div className="text-[11px] font-mono text-sky-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 self-start sm:self-auto">
                        Anchor: {config.general.photoFocalBias === 'center' ? 'Center (50%)' : config.general.photoFocalBias === 'top' ? 'Top (10%)' : `${config.general.photoFocalOffsetY ?? 20}% Y`}
                      </div>
                    </div>

                    {/* Preset Choice Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            general: {
                              ...prev.general,
                              photoFocalBias: 'face_bias',
                              photoFocalOffsetY: 20,
                            },
                          }))
                        }
                        className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                          (config.general.photoFocalBias || 'face_bias') === 'face_bias'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/40'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>Smart Face Bias</span>
                          <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1 py-0.2 rounded font-mono font-bold">
                            Rec
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Upper 20% (Keeps heads & faces visible)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            general: {
                              ...prev.general,
                              photoFocalBias: 'top',
                              photoFocalOffsetY: 10,
                            },
                          }))
                        }
                        className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                          config.general.photoFocalBias === 'top'
                            ? 'border-sky-500 bg-sky-500/10 text-sky-200 ring-1 ring-sky-500/40'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-white">Top Anchor</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Upper 10% (Tightly aligns to top edge)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            general: {
                              ...prev.general,
                              photoFocalBias: 'center',
                              photoFocalOffsetY: 50,
                            },
                          }))
                        }
                        className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                          config.general.photoFocalBias === 'center'
                            ? 'border-sky-500 bg-sky-500/10 text-sky-200 ring-1 ring-sky-500/40'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-white">Center Crop</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Middle 50% (Standard symmetrical zoom)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            general: {
                              ...prev.general,
                              photoFocalBias: 'custom',
                            },
                          }))
                        }
                        className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                          config.general.photoFocalBias === 'custom'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/40'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-white">Custom Slider</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Manual vertical focal point (0% - 100%)
                        </div>
                      </button>
                    </div>

                    {/* Fine-Tuning Vertical Slider */}
                    <div className="pt-1">
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <label className="text-slate-300 font-medium flex items-center gap-1.5">
                          <span>Vertical Focal Offset</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (0% = Top of photo, 50% = Center, 100% = Bottom)
                          </span>
                        </label>
                        <span className="font-mono font-bold text-sky-400">
                          {config.general.photoFocalOffsetY ?? 20}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={config.general.photoFocalOffsetY ?? 20}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({
                            ...prev,
                            general: {
                              ...prev.general,
                              photoFocalOffsetY: val,
                              photoFocalBias: val === 50 ? 'center' : val === 10 ? 'top' : val === 20 ? 'face_bias' : 'custom',
                            },
                          }));
                        }}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                        <span>0% (Top)</span>
                        <span className="text-emerald-400 font-semibold">20% (Face & Head Zone)</span>
                        <span>50% (Center)</span>
                        <span>100% (Bottom)</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Simulation Card with Face Focus Guide */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                      Live Wallpaper Preview with Smart Face Framing:
                    </span>
                    <div className="relative h-32 rounded-lg overflow-hidden border border-slate-700/80 flex items-center justify-center">
                      <div
                        className="absolute inset-0 bg-cover transition-all duration-300"
                        style={{
                          backgroundImage: `url('https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80')`,
                          backgroundPosition: `center ${
                            config.general.photoFocalBias === 'center'
                              ? '50%'
                              : config.general.photoFocalBias === 'top'
                              ? '10%'
                              : `${config.general.photoFocalOffsetY ?? 20}%`
                          }`,
                          filter: `brightness(${config.general.icloudBrightness ?? 50}%) blur(${config.general.icloudBlur ?? 0}px)`,
                          transform: (config.general.icloudBlur ?? 0) > 0 ? 'scale(1.08)' : undefined,
                        }}
                      />
                      <div
                        className="absolute inset-0 bg-black"
                        style={{ opacity: (config.general.backgroundDim || 0.45) * 0.4 }}
                      />
                      {/* Face Safe-Zone Visual Guide Overlay in Preview */}
                      <div
                        className="absolute left-0 right-0 border-t border-dashed border-emerald-400/60 pointer-events-none transition-all duration-300 z-1"
                        style={{
                          top: `${
                            config.general.photoFocalBias === 'center'
                              ? 50
                              : config.general.photoFocalBias === 'top'
                              ? 10
                              : (config.general.photoFocalOffsetY ?? 20)
                          }%`,
                        }}
                      >
                        <span className="absolute right-2 -top-4 text-[9px] bg-slate-900/90 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/40 shadow">
                          Focal Anchor ({config.general.photoFocalBias === 'center' ? 50 : config.general.photoFocalBias === 'top' ? 10 : (config.general.photoFocalOffsetY ?? 20)}%)
                        </span>
                      </div>
                      <div className="relative z-10 text-center px-4 py-2 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 shadow-lg">
                        <div className="text-lg font-black text-white leading-none">10:45 AM</div>
                        <div className="text-[11px] font-bold text-sky-300 mt-0.5">Family Calendar • 3 Events Today</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Curated Presets Grid */}
              {config.general.backgroundType === 'preset' && (
                <div>
                  <label className="text-xs text-slate-400 block mb-2 font-medium">
                    Select a Preset Wallpaper:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {WALLPAPER_PRESETS.map((preset) => {
                      const isSelected = config.general.presetWallpaper === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => setConfig(prev => ({ ...prev, general: { ...prev.general, presetWallpaper: preset.id } }))}
                          className={`group cursor-pointer rounded-lg overflow-hidden border-2 transition-all relative ${
                            isSelected ? 'border-sky-400 ring-2 ring-sky-400/30' : 'border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <img
                            src={preset.thumbnail}
                            alt={preset.name}
                            className="w-full h-24 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="p-2 bg-slate-950/90 text-left">
                            <span className="text-xs font-medium text-white block truncate">{preset.name}</span>
                            <span className="text-[10px] text-slate-400">{preset.category}</span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 bg-sky-500 text-white rounded-full p-0.5">
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unsplash keyword input */}
              {config.general.backgroundType === 'unsplash' && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-medium block">
                    Unsplash Search Keywords (comma-separated):
                  </label>
                  <input
                    type="text"
                    value={config.general.unsplashKeyword}
                    onChange={(e) => setConfig(prev => ({ ...prev, general: { ...prev.general, unsplashKeyword: e.target.value } }))}
                    placeholder="e.g. nature, mountains, dark, minimal"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    A fresh, high-resolution photography wallpaper matching these keywords will be fetched automatically.
                  </p>
                </div>
              )}

              {/* Custom URL */}
              {config.general.backgroundType === 'custom_url' && (
                <div className="space-y-2">
                  <label className="text-xs text-slate-300 font-medium block">
                    Custom Image URL:
                  </label>
                  <input
                    type="text"
                    value={config.general.customBackgroundUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, general: { ...prev.general, customBackgroundUrl: e.target.value } }))}
                    placeholder="https://example.com/my-wallpaper.jpg"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              {/* Contrast and Dim Slider Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-4 border-t border-slate-800">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-white">Background Dim Overlay</span>
                    <span className="text-xs font-mono text-sky-400">{Math.round(config.general.backgroundDim * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.85}
                    step={0.05}
                    value={config.general.backgroundDim}
                    onChange={(e) => setConfig(prev => ({ ...prev, general: { ...prev.general, backgroundDim: parseFloat(e.target.value) } }))}
                    className="w-full accent-sky-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Darkens background for high-contrast text readability (recommended: 40-55%)
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-white">Background Blur</span>
                    <span className="text-xs font-mono text-sky-400">{config.general.backgroundBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={config.general.backgroundBlur}
                    onChange={(e) => setConfig(prev => ({ ...prev, general: { ...prev.general, backgroundBlur: parseInt(e.target.value) } }))}
                    className="w-full accent-sky-500"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Subtle blur helps soften complex photographic textures behind widget text
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Drag & Drop Grid Layout */}
        {activeTab === 'layout' && (
          <GridVisualEditor
            config={config}
            onChangeLayout={handleUpdateLayout}
            onToggleWidget={handleToggleWidget}
          />
        )}

        {/* Tab 2: Calendar Settings */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            {/* 1. Calendar Aesthetic Themes Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Calendar Aesthetic Themes</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Choose the visual presentation and atmospheric styling for your calendar views.
                  </p>
                </div>
                <span className="text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 font-mono px-2 py-0.5 rounded-full uppercase">
                  {config.calendar.theme || 'default'}
                </span>
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
                {CALENDAR_THEMES.map((theme) => {
                  const isSelected = (config.calendar.theme || 'default') === theme.id;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          calendar: { ...prev.calendar, theme: theme.id },
                        }))
                      }
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 border-sky-400 shadow-md ring-1 ring-sky-400/40 text-white'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shadow-sm"
                            style={{ backgroundColor: theme.accent }}
                          />
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-sky-400" />
                          )}
                        </div>
                        <span className="text-xs font-bold block">{theme.name}</span>
                        <span className="text-[10px] text-slate-400 leading-snug mt-1 block">
                          {theme.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Calendar Behavior Controls: Start of Week, View, Max Items, Sync */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800 pt-3 mt-2">
                {/* Start of Week Option */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Start of Week
                  </label>
                  <select
                    value={config.calendar.startOfWeek || 'monday'}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        calendar: {
                          ...prev.calendar,
                          startOfWeek: e.target.value as any,
                        },
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="monday">Monday (Default / Standard)</option>
                    <option value="sunday">Sunday (US / Traditional)</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Sets first column across all calendar grids
                  </span>
                </div>

                {/* Default View Mode */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Default View Mode
                  </label>
                  <select
                    value={config.calendar.view}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        calendar: { ...prev.calendar, view: e.target.value as any },
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="split">Split View (Month Grid + Agenda)</option>
                    <option value="agenda">Agenda List Only</option>
                    <option value="month">Month Grid Only</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Starting view for home dashboard widget
                  </span>
                </div>

                {/* Max Upcoming Events */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Max Upcoming Events
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={25}
                    value={config.calendar.maxAgendaItems}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        calendar: {
                          ...prev.calendar,
                          maxAgendaItems: parseInt(e.target.value, 10) || 8,
                        },
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Items shown in the agenda list
                  </span>
                </div>

                {/* Sync Refresh Interval */}
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Sync Refresh Interval
                  </label>
                  <select
                    value={config.calendar.refreshIntervalMinutes}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        calendar: {
                          ...prev.calendar,
                          refreshIntervalMinutes: parseInt(e.target.value, 10) || 15,
                        },
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value={5}>Every 5 minutes</option>
                    <option value={15}>Every 15 minutes (Standard)</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every 1 hour</option>
                  </select>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Automatic background iCal sync rate
                  </span>
                </div>

                {/* Feeds Legend in Header Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 sm:col-span-3">
                  <div>
                    <span className="text-xs font-semibold text-white block">Show Feeds Legend in Header</span>
                    <span className="text-[11px] text-slate-400">
                      Display feed category colored badges at the top of the Schedule & Events widget (default: Off).
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!config.calendar.showLegend}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        calendar: { ...prev.calendar, showLegend: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                  />
                </div>

                {/* Direct Touch Event Creation Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 sm:col-span-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-white block">Direct Two-Way Touch Event Creation</span>
                      <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono px-1.5 py-0.2 rounded font-bold">
                        v3.0.0
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Allow family members to tap '+' or calendar days on the wall display to create, edit, and delete events directly without an admin computer.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.calendar.allowTouchCreation !== false}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        calendar: { ...prev.calendar, allowTouchCreation: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* 2. National & Regional Holidays Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>National & Regional Holidays</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Toggle official statutory bank and public holiday feeds for your region.
                  </p>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                  {HOLIDAY_PRESETS.filter((p) => isHolidayActive(p)).length} active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {HOLIDAY_PRESETS.map((preset) => {
                  const active = isHolidayActive(preset);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => toggleHolidayPreset(preset)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                        active
                          ? 'bg-slate-800/90 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                          : 'bg-slate-950 border-slate-800/80 hover:bg-slate-900/70 hover:border-slate-700 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xl shrink-0" role="img" aria-label={preset.country}>
                          {preset.flag}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block truncate">
                            {preset.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {preset.country}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          active
                            ? 'bg-emerald-500 text-slate-950 shadow-sm'
                            : 'bg-slate-800 border border-slate-700 text-transparent'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Custom iCal & Webcal Feeds Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span>Connected Calendars ({config.calendar.feeds.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect Google Calendar secret iCal, Apple iCloud public calendars, Outlook, or private ICS links.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addCalendarFeed}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Calendar Feed</span>
                </button>
              </div>

              {/* Feed List */}
              <div className="space-y-3">
                {config.calendar.feeds.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No calendar feeds configured. Click "Add Calendar Feed" or toggle a national holiday above.
                  </div>
                ) : (
                  config.calendar.feeds.map((feed) => (
                    <div
                      key={feed.id}
                      className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-1">
                          <input
                            type="color"
                            value={feed.color}
                            onChange={(e) => updateCalendarFeed(feed.id, { color: e.target.value })}
                            className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                            title="Feed color"
                          />
                          <input
                            type="text"
                            value={feed.name}
                            onChange={(e) => updateCalendarFeed(feed.id, { name: e.target.value })}
                            placeholder="Calendar Name"
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:border-sky-500 w-48"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => testCalendarFeed(feed)}
                            disabled={testingFeedId === feed.id || !feed.url}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-xs font-medium transition-colors border border-slate-700 cursor-pointer disabled:opacity-40"
                          >
                            {testingFeedId === feed.id ? 'Testing...' : 'Test Feed'}
                          </button>

                          <button
                            type="button"
                            onClick={() => removeCalendarFeed(feed.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete feed"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <input
                          type="text"
                          value={feed.url}
                          onChange={(e) => updateCalendarFeed(feed.id, { url: e.target.value })}
                          placeholder="iCal / ICS Feed URL (e.g., https://.../basic.ics or webcal://...)"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      {/* Test result feedback banner */}
                      {feedTestResult && feedTestResult.id === feed.id && (
                        <div
                          className={`text-xs p-2 rounded-lg flex items-center gap-2 ${
                            feedTestResult.ok
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {feedTestResult.ok ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>
                                Feed validated successfully! Found {feedTestResult.count} calendar events.
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span>Feed error: {feedTestResult.error}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Instructions on where to find ICS feeds */}
              <div className="mt-5 p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1.5">
                <span className="font-semibold text-slate-300 block">How to obtain your calendar iCal URL:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong>Google Calendar:</strong> Settings → Click Calendar → Integrate Calendar → Copy <em>"Secret address in iCal format"</em>.</li>
                  <li><strong>Apple iCloud:</strong> iCloud Calendar → Click share icon next to calendar → Check <em>"Public Calendar"</em> → Copy link (starts with webcal://). <em>Lumina Home automatically caches your iCloud calendars to protect against transient morning 503 rate-limits.</em></li>
                  <li><strong>Outlook:</strong> Settings → Calendar → Shared calendars → Publish a calendar → Copy ICS link.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Weather & Location */}
        {activeTab === 'weather' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-sky-400" />
                <span>Weather Location & Units (Powered by Open-Meteo)</span>
              </h3>

              {/* City Search Bar */}
              <form onSubmit={handleCitySearch} className="mb-4">
                <label className="text-xs text-slate-300 font-medium block mb-1">
                  Search City / Town (Instant Geocoding):
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchCityQuery}
                      onChange={(e) => setSearchCityQuery(e.target.value)}
                      placeholder="Type city name (e.g., London, Tokyo, New York, Seattle)..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>
                  <button
                    type="submit"
                    disabled={searchingCity}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {searchingCity ? 'Searching...' : 'Search'}
                  </button>
                </div>

                {/* Autocomplete Results Dropdown */}
                {citySearchResults.length > 0 && (
                  <div className="mt-2 bg-slate-950 border border-slate-700 rounded-lg overflow-hidden divide-y divide-slate-800 shadow-xl">
                    {citySearchResults.map((city, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => selectCity(city)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-sky-600/20 hover:text-white flex items-center justify-between"
                      >
                        <span className="font-medium">{city.label}</span>
                        <span className="font-mono text-[10px] text-slate-500">
                          {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </form>

              {/* Quick Location Presets */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-300 font-medium">
                    Quick Location Presets:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const lat = Number(pos.coords.latitude.toFixed(4));
                          const lon = Number(pos.coords.longitude.toFixed(4));
                          try {
                            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                            const data = await res.json();
                            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || 'My Location';
                            const country = data.address?.country || '';
                            const fullLabel = country ? `${city}, ${country}` : city;
                            setConfig((prev) => ({
                              ...prev,
                              weather: { ...prev.weather, cityName: fullLabel, latitude: lat, longitude: lon },
                            }));
                          } catch {
                            setConfig((prev) => ({
                              ...prev,
                              weather: { ...prev.weather, cityName: 'Detected Location', latitude: lat, longitude: lon },
                            }));
                          }
                        },
                        (err) => {
                          console.warn('Geolocation warning:', err.message);
                        }
                      );
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Auto-Detect My Location</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'London, United Kingdom', latitude: 51.5074, longitude: -0.1278, isDefault: true },
                    { label: 'New York, United States', latitude: 40.7128, longitude: -74.0060 },
                    { label: 'Paris, France', latitude: 48.8566, longitude: 2.3522 },
                    { label: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503 },
                    { label: 'Sydney, Australia', latitude: -33.8688, longitude: 151.2093 },
                    { label: 'Berlin, Germany', latitude: 52.5200, longitude: 13.4050 },
                  ].map((preset) => {
                    const isSelected = config.weather.cityName.toLowerCase().includes(preset.label.split(',')[0].toLowerCase());
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            weather: {
                              ...prev.weather,
                              cityName: preset.label,
                              latitude: preset.latitude,
                              longitude: preset.longitude,
                            },
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-sky-600 border-sky-400 text-white shadow-sm font-semibold'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <MapPin className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                        <span>{preset.label}</span>
                        {preset.isDefault && (
                          <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 py-0.2 rounded font-mono font-bold">
                            Default
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Selected Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 mb-4">
                <div>
                  <span className="text-[11px] text-slate-400 block">Configured Location</span>
                  <span className="text-xs font-semibold text-white">{config.weather.cityName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Latitude</span>
                  <span className="text-xs font-mono text-sky-400">{config.weather.latitude}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Longitude</span>
                  <span className="text-xs font-mono text-sky-400">{config.weather.longitude}</span>
                </div>
              </div>

              {/* Units & Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Temperature & Speed Units</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, weather: { ...prev.weather, units: 'imperial' } }))}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                        config.weather.units === 'imperial'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Fahrenheit (°F, mph)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, weather: { ...prev.weather, units: 'metric' } }))}
                      className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                        config.weather.units === 'metric'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Celsius (°C, km/h)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 self-end">
                  <div>
                    <span className="text-xs font-medium text-white block">Show 5-Day Daily Forecast</span>
                    <span className="text-[11px] text-slate-400">Displays 5-day daily forecast pill row</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.weather.show5Day}
                    onChange={(e) => setConfig(prev => ({ ...prev, weather: { ...prev.weather, show5Day: e.target.checked } }))}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Weather Alert Badges & Simulation */}
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-white">Active Weather Alert Indicator Badges</span>
                      <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono px-2 py-0.5 rounded-full font-bold">
                        Automatic
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 leading-relaxed block">
                      Automatically detects active weather warnings, Met Office gale/flood alerts, or extreme conditions from the forecast data and shows a high-contrast 'Alert' indicator badge.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.weather.showAlertBadge ?? true}
                    onChange={(e) => setConfig(prev => ({ ...prev, weather: { ...prev.weather, showAlertBadge: e.target.checked } }))}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 shrink-0"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-amber-950/20 rounded-xl border border-amber-500/30">
                  <div className="pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-amber-300">Simulate / Preview Active Weather Alert</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        Alert Badge Preview
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-200/80 leading-relaxed block">
                      Force-activates a simulated active severe weather alert so you can test the high-contrast indicator badge and detail drawer right now.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.weather.testAlert ?? false}
                    onChange={(e) => setConfig(prev => ({ ...prev, weather: { ...prev.weather, testAlert: e.target.checked } }))}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 shrink-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Widgets & Content */}
        {activeTab === 'widgets' && (
          <div className="space-y-6">
            {/* Daily Smart Summary Briefing Settings (v3.0.0 Headline Feature) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>Daily Smart Summary Briefings</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono font-bold px-1.5 py-0.5 rounded border border-indigo-400/30">
                        v3.0.0
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Proactive morning and evening household briefings synthesizing weather, schedule, reminders, and countdowns.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Briefing Enabled</span>
                  <input
                    type="checkbox"
                    checked={config.briefing?.enabled !== false}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        briefing: {
                          ...(prev.briefing || {
                            enabled: true,
                            morningStartHour: 5,
                            eveningStartHour: 17,
                            showInHeader: true,
                            enableVoicePlayback: true,
                            useAiSynthesis: true,
                          }),
                          enabled: e.target.checked,
                        },
                      }))
                    }
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>
              </div>

              {config.briefing?.enabled !== false && (
                <div className="space-y-4 pt-1">
                  {/* Mode Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Auto-Popup Overlay */}
                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-xs font-semibold text-white block">Auto-Popup Overlay</span>
                        <span className="text-[10px] text-slate-500">Pop up dismissable summary at scheduled times</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.briefing?.autoPopup !== false}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            briefing: { ...prev.briefing, autoPopup: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                      />
                    </div>

                    {/* Show in Header Banner */}
                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-xs font-semibold text-white block">Header Ambient Widget</span>
                        <span className="text-[10px] text-slate-500">Display summary card at the top of the kiosk</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.briefing?.showInHeader === true}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            briefing: { ...prev.briefing, showInHeader: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                      />
                    </div>

                    {/* Voice Text-to-Speech Playback */}
                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-xs font-semibold text-white block">Voice Read-Aloud (TTS)</span>
                        <span className="text-[10px] text-slate-500">Enable touch 'Listen' button on wall screen</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.briefing?.enableVoicePlayback !== false}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            briefing: { ...prev.briefing, enableVoicePlayback: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                      />
                    </div>

                    {/* Gemini AI Synthesis */}
                    <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-xs font-semibold text-white block">Gemini AI Synthesis</span>
                        <span className="text-[10px] text-slate-500">Natural phrasing with offline template fallback</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.briefing?.useAiSynthesis !== false}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            briefing: { ...prev.briefing, useAiSynthesis: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Scheduled Overlay Popup Times */}
                  <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          <span>Configurable Briefing Popup Schedule</span>
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Configure exact times for the dismissable summary briefing to pop up on the home screen.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowBriefingPreview(true)}
                        className="h-8 px-3 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer shrink-0"
                        title="Test how the Briefing popup appears on screen"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Preview Briefing Popup</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {/* Morning Briefing Time */}
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <label className="text-xs text-amber-300 font-semibold block mb-1">
                          Morning Briefing Time
                        </label>
                        <input
                          type="time"
                          value={config.briefing?.morningTime || '07:00'}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              briefing: {
                                ...prev.briefing,
                                morningTime: e.target.value || '07:00',
                              },
                            }))
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Default: 7:00 AM (07:00)
                        </span>
                      </div>

                      {/* Afternoon Briefing Time */}
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <label className="text-xs text-sky-300 font-semibold block mb-1">
                          Afternoon Briefing Time
                        </label>
                        <input
                          type="time"
                          value={config.briefing?.afternoonTime || '12:00'}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              briefing: {
                                ...prev.briefing,
                                afternoonTime: e.target.value || '12:00',
                              },
                            }))
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400 font-mono"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Default: 12:00 PM (12:00)
                        </span>
                      </div>

                      {/* Evening Briefing Time */}
                      <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <label className="text-xs text-indigo-300 font-semibold block mb-1">
                          Evening Briefing Time
                        </label>
                        <input
                          type="time"
                          value={config.briefing?.eveningTime || '16:30'}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              briefing: {
                                ...prev.briefing,
                                eveningTime: e.target.value || '16:30',
                              },
                            }))
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400 font-mono"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Default: 4:30 PM (16:30)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Clock Widget Settings */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400" />
                <span>Clock & Time Settings</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-xs font-medium text-white">24-Hour Military Format</span>
                  <input
                    type="checkbox"
                    checked={config.clock.format24}
                    onChange={(e) => setConfig(prev => ({ ...prev, clock: { ...prev.clock, format24: e.target.checked } }))}
                    className="w-4 h-4 rounded text-sky-600"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-xs font-medium text-white">Show Live Seconds</span>
                  <input
                    type="checkbox"
                    checked={config.clock.showSeconds}
                    onChange={(e) => setConfig(prev => ({ ...prev, clock: { ...prev.clock, showSeconds: e.target.checked } }))}
                    className="w-4 h-4 rounded text-sky-600"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-xs font-medium text-white">Show Full Date</span>
                  <input
                    type="checkbox"
                    checked={config.clock.showDate}
                    onChange={(e) => setConfig(prev => ({ ...prev, clock: { ...prev.clock, showDate: e.target.checked } }))}
                    className="w-4 h-4 rounded text-sky-600"
                  />
                </div>
              </div>
            </div>

            {/* Countdown Widget Settings */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Hourglass className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <span>Countdown Timers & Annual Reminders</span>
                      <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                        {getCountdownItems().length} active
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Track upcoming vacations, birthdays, anniversaries, and holidays.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {config.countdown.enabled && (
                    <div className="flex items-center gap-2">
                      {getCountdownItems().length > 1 && (
                        <button
                          type="button"
                          onClick={sortCountdownItemsByDate}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/30 transition-colors shadow-sm cursor-pointer"
                          title="Sort countdown items chronologically by closest date"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                          <span>Sort Closest First</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={addCountdownItem}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Countdown</span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                    <span className="text-xs text-slate-400">Enabled</span>
                    <input
                      type="checkbox"
                      checked={config.countdown.enabled}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          countdown: { ...prev.countdown, enabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {config.countdown.enabled && (
                <div className="space-y-4">
                  {/* Countdown Timer Display Mode */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-xs font-semibold text-white block">Countdown Display Format</span>
                      <span className="text-[11px] text-slate-400">
                        Choose whether to show just the number of days (default) or the full countdown timer with hours, minutes, and seconds.
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            countdown: { ...prev.countdown, displayMode: 'days' },
                          }))
                        }
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          (config.countdown.displayMode || 'days') === 'days'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Days Only (Default)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            countdown: { ...prev.countdown, displayMode: 'full' },
                          }))
                        }
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                          config.countdown.displayMode === 'full'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Full (D : H : M : S)
                      </button>
                    </div>
                  </div>

                  {getCountdownItems().length === 0 ? (
                    <div className="p-6 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                      <Hourglass className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-400">
                        No countdown timers configured. Click <strong className="text-amber-400">Add Countdown</strong> to create your first event!
                      </p>
                    </div>
                  ) : (
                    getCountdownItems().map((item, idx) => {
                      const dtValue = item.targetDate ? item.targetDate.slice(0, 16) : '';
                      return (
                        <div
                          key={item.id}
                          className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                #{idx + 1}
                              </span>
                              <span className="text-xs font-bold text-white truncate max-w-xs">
                                {item.title || 'Untitled Event'}
                              </span>
                              {item.annual && (
                                <span className="text-[9px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-1.5 py-0.5 rounded-full font-mono flex items-center gap-1">
                                  <Repeat className="w-2.5 h-2.5" />
                                  <span>Annual</span>
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeCountdownItem(item.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors cursor-pointer"
                              title="Delete countdown"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            {/* Title */}
                            <div className="sm:col-span-5">
                              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                                Event Title
                              </label>
                              <input
                                type="text"
                                value={item.title}
                                onChange={(e) =>
                                  updateCountdownItem(item.id, { title: e.target.value })
                                }
                                placeholder="e.g. Hawaii Vacation, Mum's Birthday"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            {/* Target Date & Time */}
                            <div className="sm:col-span-4">
                              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                                Target Date & Time
                              </label>
                              <input
                                type="datetime-local"
                                value={dtValue}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateCountdownItem(item.id, {
                                    targetDate: val ? new Date(val).toISOString() : '',
                                  });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            {/* Event Icon */}
                            <div className="sm:col-span-3">
                              <label className="text-[11px] text-slate-400 font-medium block mb-1">
                                Event Icon
                              </label>
                              <select
                                value={item.icon}
                                onChange={(e) =>
                                  updateCountdownItem(item.id, { icon: e.target.value })
                                }
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                              >
                                <option value="plane">✈️ Vacation / Plane</option>
                                <option value="gift">🎁 Birthday / Gift</option>
                                <option value="cake">🎂 Birthday Cake</option>
                                <option value="party">🎉 Party / Celebration</option>
                                <option value="heart">❤️ Anniversary / Heart</option>
                                <option value="sun">☀️ Holiday / Summer</option>
                                <option value="trophy">🏆 Milestone / Trophy</option>
                                <option value="graduation">🎓 Graduation</option>
                                <option value="rocket">🚀 Project / Launch</option>
                                <option value="flame">🔥 Fitness / Goal</option>
                                <option value="sparkles">✨ Special Event</option>
                              </select>
                            </div>
                          </div>

                          {/* Annual Recurring Toggle */}
                          <div className="flex items-center justify-between p-2.5 bg-slate-900/70 rounded-lg border border-slate-800">
                            <div className="flex items-center gap-2">
                              <Repeat className={`w-3.5 h-3.5 ${item.annual ? 'text-sky-400' : 'text-slate-500'}`} />
                              <div>
                                <span className="text-xs font-semibold text-slate-200 block">
                                  Annual Recurring Event
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  Displays 'Today' on the event day, then automatically advances to next year.
                                </span>
                              </div>
                            </div>

                            <input
                              type="checkbox"
                              checked={item.annual || false}
                              onChange={(e) =>
                                updateCountdownItem(item.id, { annual: e.target.checked })
                              }
                              className="w-4 h-4 rounded text-sky-600 cursor-pointer"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Information banner */}
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-200/90">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Automatic Chronological Sorting:</strong> Event Countdowns are automatically displayed in order of <strong>closest to furthest away from today</strong> on your wall display (with any events happening today at the very top), regardless of the order they are entered here. When a target date is reached, it displays <strong>'Today'</strong>; once passed, one-off events are cleared while <strong>Annual</strong> events automatically advance to next year.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* News / RSS Feed Settings */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-emerald-400" />
                  <span>News & RSS Feed Ticker</span>
                </h3>
                <input
                  type="checkbox"
                  checked={config.news.enabled}
                  onChange={(e) => setConfig(prev => ({ ...prev, news: { ...prev.news, enabled: e.target.checked } }))}
                  className="w-4 h-4 rounded text-sky-600"
                />
              </div>

              {config.news.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-300 font-medium block mb-1">RSS Feed URL</label>
                    <input
                      type="text"
                      value={config.news.feedUrl}
                      onChange={(e) => setConfig(prev => ({ ...prev, news: { ...prev.news, feedUrl: e.target.value } }))}
                      placeholder="https://feeds.bbci.co.uk/news/world/rss.xml"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Display Mode</label>
                    <select
                      value={config.news.displayMode}
                      onChange={(e) => setConfig(prev => ({ ...prev, news: { ...prev.news, displayMode: e.target.value as any } }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="ticker">Smooth Bottom Marquee Ticker</option>
                      <option value="card">Rotating Headline Card</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Notes / Quote Widget Settings */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  <span>Notes / Quote of the Day Widget</span>
                </h3>
                <input
                  type="checkbox"
                  checked={config.notes.enabled}
                  onChange={(e) => setConfig(prev => ({ ...prev, notes: { ...prev.notes, enabled: e.target.checked } }))}
                  className="w-4 h-4 rounded text-sky-600"
                />
              </div>

              {config.notes.enabled && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, notes: { ...prev.notes, mode: 'quote' } }))}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                        config.notes.mode === 'quote'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Daily Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, notes: { ...prev.notes, mode: 'custom_note' } }))}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                        config.notes.mode === 'custom_note'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Custom Sticky Note
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, notes: { ...prev.notes, mode: 'checklist' } }))}
                      className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                        config.notes.mode === 'checklist'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      Checklist / To-Do
                    </button>
                  </div>

                  {config.notes.mode === 'quote' && (
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1">Quote Category</label>
                      <select
                        value={config.notes.quoteCategory}
                        onChange={(e) => setConfig(prev => ({ ...prev, notes: { ...prev.notes, quoteCategory: e.target.value as any } }))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value="inspirational">Inspirational & Motivation</option>
                        <option value="stoic">Stoic Philosophy</option>
                        <option value="wisdom">Ancient Wisdom</option>
                        <option value="tech">Technology & Engineering</option>
                      </select>
                    </div>
                  )}

                  {config.notes.mode === 'custom_note' && (
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1">Sticky Note Text</label>
                      <textarea
                        rows={3}
                        value={config.notes.customNote}
                        onChange={(e) => setConfig(prev => ({ ...prev, notes: { ...prev.notes, customNote: e.target.value } }))}
                        placeholder="Write family reminders or notes here..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Apple Liquid Glass Screen Saver */}
        {activeTab === 'screensaver' && (
          <div className="space-y-6">
            {/* Header / Preview Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-bold shadow-md">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Apple Liquid Glass Screen Saver
                  </h3>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono px-2 py-0.5 rounded-full uppercase">
                    Ambient StandBy
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Transforms into a distraction-free Apple liquid glass digital clock with live date and current weather. Touching the screen at any point wakes the display and returns directly to the Home dashboard.
                </p>
              </div>

              {onTriggerScreensaver && (
                <button
                  type="button"
                  onClick={onTriggerScreensaver}
                  className="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-500/20 flex items-center gap-2 shrink-0 transition-all active:scale-95 border border-sky-400/30"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Preview Screen Saver Now</span>
                </button>
              )}
            </div>

            {/* General Activation & Idle Timeout */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span>Idle Activation & Behavior</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Controls when the screen saver automatically engages.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.screensaver?.enabled ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        screensaver: {
                          ...prev.screensaver,
                          enabled: e.target.checked,
                        },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-2">
                    Idle Inactivity Timeout
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 1, label: "1 min" },
                      { val: 2, label: "2 min" },
                      { val: 3, label: "3 min", badge: "Default" },
                      { val: 5, label: "5 min" },
                      { val: 10, label: "10 min" },
                      { val: 15, label: "15 min" },
                      { val: 30, label: "30 min" },
                      { val: 0, label: "Never" },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              idleTimeoutMinutes: item.val,
                            },
                          }))
                        }
                        className={`p-2 rounded-lg text-xs font-semibold transition-all border text-center ${
                          (config.screensaver?.idleTimeoutMinutes ?? 3) === item.val
                            ? "bg-sky-600 border-sky-400 text-white shadow-md"
                            : "bg-slate-950/70 border-slate-700/70 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <div>{item.label}</div>
                        {item.badge && (
                          <span className="text-[9px] text-amber-300 block font-normal">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Triggers when no touches or interactions occur for the selected duration.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-2">
                    Wake Gesture
                  </label>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                    <div className="flex items-center gap-2 font-medium text-white">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Instant Wake on Screen Tap</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      Touching the screen at any point instantly dismisses the screensaver and returns cleanly to your active Home dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Color Scheme & Dimming */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Liquid Glass Clock Color Theme</span>
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  Choose the specular liquid glass gradient and ambient breathing backglow.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {[
                    { id: "sunset", label: "Sunset Glow", color: "#f59e0b" },
                    { id: "glacier", label: "Glacier Blue", color: "#38bdf8" },
                    { id: "emerald", label: "Emerald Mint", color: "#34d399" },
                    { id: "white", label: "Pure White", color: "#ffffff" },
                    { id: "crimson", label: "Crimson Red", color: "#ef4444" },
                    { id: "lavender", label: "Lavender", color: "#a855f7" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          screensaver: {
                            ...prev.screensaver,
                            clockColor: c.id as any,
                          },
                        }))
                      }
                      className={`p-3 rounded-xl text-xs font-semibold border flex flex-col items-center gap-2 transition-all ${
                        (config.screensaver?.clockColor || "sunset") === c.id
                          ? "bg-slate-800 border-sky-400 text-white shadow-md ring-1 ring-sky-400/40"
                          : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <span
                        className="w-5 h-5 rounded-full shadow-md"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ambient Dim Level */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-300 font-medium">
                    Screen Saver Ambient Dimming Level
                  </label>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {config.screensaver?.dimLevel ?? 10}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={config.screensaver?.dimLevel ?? 10}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      screensaver: {
                        ...prev.screensaver,
                        dimLevel: parseInt(e.target.value, 10),
                      },
                    }))
                  }
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                  <span>0% (Full Brightness)</span>
                  <span>10% (Subtle Comfort)</span>
                  <span>30% (Living Room)</span>
                  <span>60% (Dark Bedroom)</span>
                </div>
              </div>
            </div>

            {/* Apple Photos iCloud Shared Album Background for ScreenSaver */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Screen Saver Ambient Background Style
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Choose between Apple Liquid Glass ambient caustics or an Apple Photos Shared Album stream.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        screensaver: {
                          ...prev.screensaver,
                          backgroundType: 'liquid-glow',
                        },
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      (config.screensaver?.backgroundType || 'liquid-glow') === 'liquid-glow'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Liquid Glow
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        screensaver: {
                          ...prev.screensaver,
                          backgroundType: 'icloud_album',
                        },
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      config.screensaver?.backgroundType === 'icloud_album'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>iCloud Photos</span>
                  </button>
                </div>
              </div>

              {config.screensaver?.backgroundType === 'icloud_album' && (
                <div className="space-y-4 pt-1">
                  {/* Option to use same album as wallpaper */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Sync with Home Wallpaper Album
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {config.general.icloudAlbumUrl
                          ? `Current wallpaper URL: "${config.general.icloudAlbumUrl.slice(0, 40)}..."`
                          : 'No wallpaper album URL set yet. Enter one below.'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (config.general.icloudAlbumUrl) {
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              icloudAlbumUrl: config.general.icloudAlbumUrl,
                            },
                          }));
                          handleTestICloudAlbum(config.general.icloudAlbumUrl);
                        }
                      }}
                      className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg border border-slate-700 transition-colors"
                    >
                      Copy Wallpaper Album
                    </button>
                  </div>

                  {/* Album URL Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-300 font-medium block">
                      Screensaver iCloud Shared Album URL:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={config.screensaver?.icloudAlbumUrl ?? config.general.icloudAlbumUrl ?? ''}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              icloudAlbumUrl: e.target.value,
                            },
                          }))
                        }
                        placeholder="https://www.icloud.com/sharedalbum/#B0zG6XBubJk..."
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestICloudAlbum(config.screensaver?.icloudAlbumUrl || config.general.icloudAlbumUrl)}
                        disabled={testingICloud}
                        className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm"
                      >
                        {testingICloud ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Fetching...</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3.5 h-3.5" />
                            <span>Verify Album</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Cycling and Appearance controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    {/* Cycling Interval */}
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1">
                        Photo Cycle Interval
                      </label>
                      <select
                        value={config.screensaver?.icloudCycleMinutes ?? 3}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              icloudCycleMinutes: parseInt(e.target.value, 10),
                            },
                          }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                      >
                        <option value={1}>Every 1 Minute</option>
                        <option value={3}>Every 3 Minutes (Recommended)</option>
                        <option value={5}>Every 5 Minutes</option>
                        <option value={10}>Every 10 Minutes</option>
                        <option value={15}>Every 15 Minutes</option>
                        <option value={30}>Every 30 Minutes</option>
                      </select>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Rotates through album photos during screensaver standby.
                      </span>
                    </div>

                    {/* Playback Order */}
                    <div>
                      <label className="text-xs text-slate-300 font-medium block mb-1">
                        Playback Order
                      </label>
                      <div className="flex rounded-lg bg-slate-950 border border-slate-700 p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              screensaver: {
                                ...prev.screensaver,
                                icloudShuffle: true,
                              },
                            }))
                          }
                          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            config.screensaver?.icloudShuffle !== false
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          <span>Smart Shuffle</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              screensaver: {
                                ...prev.screensaver,
                                icloudShuffle: false,
                              },
                            }))
                          }
                          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            config.screensaver?.icloudShuffle === false
                              ? 'bg-sky-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Repeat className="w-3.5 h-3.5" />
                          <span>Sequential</span>
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Prevents repetitive cycles during standby sleep.
                      </span>
                    </div>

                    {/* Screensaver Photo Brightness */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-300 font-medium">Photo Brightness</label>
                        <span className="text-xs font-mono font-bold text-sky-400">
                          {config.screensaver?.photoBrightness ?? 40}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="5"
                        value={config.screensaver?.photoBrightness ?? 40}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              photoBrightness: parseInt(e.target.value, 10),
                            },
                          }))
                        }
                        className="w-full accent-sky-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Subtle brightness ensures the glowing clock remains primary.
                      </span>
                    </div>

                    {/* Screensaver Photo Blur */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs text-slate-300 font-medium">Photo Blur</label>
                        <span className="text-xs font-mono font-bold text-sky-400">
                          {config.screensaver?.photoBlur ?? 4}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="25"
                        step="1"
                        value={config.screensaver?.photoBlur ?? 4}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              photoBlur: parseInt(e.target.value, 10),
                            },
                          }))
                        }
                        className="w-full accent-sky-500"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Softens the photo to avoid visual distraction in standby.
                      </span>
                    </div>
                  </div>

                  {/* Screensaver Photo Framing & Face Focus */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-bold">
                          👤
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-bold text-white">Screensaver Photo Framing & Face Focus</h5>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold px-2 py-0.5 rounded-full">
                              Prevents Cutoff
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Anchors screensaver photo framing to keep family faces clearly in frame during StandBy.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setConfig((prev) => ({
                              ...prev,
                              screensaver: {
                                ...prev.screensaver,
                                photoFocalBias: prev.general.photoFocalBias || 'face_bias',
                                photoFocalOffsetY: prev.general.photoFocalOffsetY ?? 20,
                              },
                            }));
                          }}
                          className="px-2 py-1 text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-sky-300 rounded border border-slate-700 transition-colors cursor-pointer"
                          title="Copy framing setting from Wallpaper tab"
                        >
                          Match Wallpaper
                        </button>
                        <div className="text-[11px] font-mono text-sky-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                          {config.screensaver?.photoFocalBias === 'center' ? 'Center (50%)' : config.screensaver?.photoFocalBias === 'top' ? 'Top (10%)' : `${config.screensaver?.photoFocalOffsetY ?? 20}% Y`}
                        </div>
                      </div>
                    </div>

                    {/* Presets */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              photoFocalBias: 'face_bias',
                              photoFocalOffsetY: 20,
                            },
                          }))
                        }
                        className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                          (config.screensaver?.photoFocalBias || 'face_bias') === 'face_bias'
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/40'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span>Smart Face Bias</span>
                          <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1 py-0.2 rounded font-mono font-bold">
                            Rec
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Upper 20% (Keeps heads & faces visible)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              photoFocalBias: 'top',
                              photoFocalOffsetY: 10,
                            },
                          }))
                        }
                        className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                          config.screensaver?.photoFocalBias === 'top'
                            ? 'border-sky-500 bg-sky-500/10 text-sky-200 ring-1 ring-sky-500/40'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-white">Top Anchor</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Upper 10% (Tightly aligns to top edge)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              photoFocalBias: 'center',
                              photoFocalOffsetY: 50,
                            },
                          }))
                        }
                        className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                          config.screensaver?.photoFocalBias === 'center'
                            ? 'border-sky-500 bg-sky-500/10 text-sky-200 ring-1 ring-sky-500/40'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-white">Center Crop</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Middle 50% (Standard symmetrical zoom)
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              photoFocalBias: 'custom',
                            },
                          }))
                        }
                        className={`p-2.5 rounded-lg border text-xs text-left transition-all ${
                          config.screensaver?.photoFocalBias === 'custom'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-200 ring-1 ring-amber-500/40'
                            : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-semibold text-white">Custom Slider</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Manual vertical focal point (0% - 100%)
                        </div>
                      </button>
                    </div>

                    {/* Fine-Tuning Vertical Slider */}
                    <div className="pt-1">
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <label className="text-slate-300 font-medium flex items-center gap-1.5">
                          <span>Screensaver Vertical Focal Offset</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (0% = Top of photo, 50% = Center, 100% = Bottom)
                          </span>
                        </label>
                        <span className="font-mono font-bold text-sky-400">
                          {config.screensaver?.photoFocalOffsetY ?? 20}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={config.screensaver?.photoFocalOffsetY ?? 20}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              photoFocalOffsetY: val,
                              photoFocalBias: val === 50 ? 'center' : val === 10 ? 'top' : val === 20 ? 'face_bias' : 'custom',
                            },
                          }));
                        }}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                        <span>0% (Top)</span>
                        <span className="text-emerald-400 font-semibold">20% (Face & Head Zone)</span>
                        <span>50% (Center)</span>
                        <span>100% (Bottom)</span>
                      </div>
                    </div>
                  </div>

                  {/* Screensaver StandBy Clock & Photo Live Preview */}
                  <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-2">
                      StandBy Screensaver Simulation (Clock + Photo Background with Face Framing):
                    </span>
                    <div className="relative h-36 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                      <div
                        className="absolute inset-0 bg-cover transition-all duration-300"
                        style={{
                          backgroundImage: `url('https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=1200&q=80')`,
                          backgroundPosition: `center ${
                            config.screensaver?.photoFocalBias === 'center'
                              ? '50%'
                              : config.screensaver?.photoFocalBias === 'top'
                              ? '10%'
                              : `${config.screensaver?.photoFocalOffsetY ?? 20}%`
                          }`,
                          filter: `brightness(${config.screensaver?.photoBrightness ?? 40}%) blur(${config.screensaver?.photoBlur ?? 4}px)`,
                          transform: (config.screensaver?.photoBlur ?? 4) > 0 ? 'scale(1.08)' : undefined,
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/75" />
                      {/* Face Safe-Zone Visual Guide Overlay in Preview */}
                      <div
                        className="absolute left-0 right-0 border-t border-dashed border-emerald-400/60 pointer-events-none transition-all duration-300 z-1"
                        style={{
                          top: `${
                            config.screensaver?.photoFocalBias === 'center'
                              ? 50
                              : config.screensaver?.photoFocalBias === 'top'
                              ? 10
                              : (config.screensaver?.photoFocalOffsetY ?? 20)
                          }%`,
                        }}
                      >
                        <span className="absolute right-2 -top-4 text-[9px] bg-slate-900/90 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/40 shadow">
                          Anchor ({config.screensaver?.photoFocalBias === 'center' ? 50 : config.screensaver?.photoFocalBias === 'top' ? 10 : (config.screensaver?.photoFocalOffsetY ?? 20)}%)
                        </span>
                      </div>
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="text-3xl font-black font-apple-rounded tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-orange-400 to-rose-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.5)]">
                          10:45
                        </div>
                        <div className="mt-1 px-3 py-0.5 rounded-full bg-slate-900/80 border border-white/20 text-[10px] font-bold text-white shadow">
                          Thursday, 18 October • 21°C Sunny
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dedicated Night Mode Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                      <Moon className="w-4 h-4 fill-rose-400/30" />
                    </div>
                    <h4 className="text-sm font-semibold text-white">
                      Night Mode (Ultra-Dim Red StandBy)
                    </h4>
                    <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono px-2 py-0.5 rounded-full uppercase">
                      Circadian Low-Light
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">
                    Turns the screensaver pitch black with deep ruby red typography and ultra-dim brightness. Eliminates blue light to prevent sleep disruption in bedrooms and dark rooms.
                  </p>
                </div>

                {/* Master Night Mode Toggle */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className={`text-xs font-semibold ${config.screensaver?.nightMode ? 'text-rose-400' : 'text-slate-400'}`}>
                    {config.screensaver?.nightMode ? 'Night Mode Active' : 'Off'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.screensaver?.nightMode ?? false}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          screensaver: {
                            ...prev.screensaver,
                            nightMode: e.target.checked,
                          },
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>
              </div>

              {/* Night Mode Live Visual Preview */}
              <div className="rounded-xl border border-red-950/80 bg-black p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className="flex items-baseline font-black font-apple-rounded tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-red-500 via-rose-600 to-red-700 text-3xl sm:text-4xl drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]">
                    <span>10</span>
                    <span className="px-1 text-red-500 animate-pulse">:</span>
                    <span>42</span>
                    <span className="text-xs text-red-900/60 font-bold ml-1.5 self-center">PM</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/30 border border-red-900/30 text-red-300/80 text-[11px] font-semibold">
                    <span>Fri, 16 Oct</span>
                    <span className="text-red-900">•</span>
                    <span className="text-red-400 font-bold">12°C</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-rose-300/80 bg-rose-950/20 px-3 py-1.5 rounded-lg border border-rose-900/30">
                  <Eye className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Preserves night vision & zero melatonin disruption</span>
                </div>
              </div>

              {/* Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Left: Schedule automation */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs text-slate-200 font-semibold block">
                        Automatic Night Schedule
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Automatically engages Night Mode between set hours.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.screensaver?.nightModeScheduleEnabled ?? false}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              nightModeScheduleEnabled: e.target.checked,
                            },
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                    </label>
                  </div>

                  {/* Start & End Time Pickers */}
                  <div className={`grid grid-cols-2 gap-3 transition-opacity ${
                    config.screensaver?.nightModeScheduleEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
                  }`}>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">
                        Turn On At
                      </label>
                      <input
                        type="time"
                        value={config.screensaver?.nightModeStartTime || '22:00'}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              nightModeStartTime: e.target.value,
                            },
                          }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">
                        Turn Off At
                      </label>
                      <input
                        type="time"
                        value={config.screensaver?.nightModeEndTime || '07:00'}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              nightModeEndTime: e.target.value,
                            },
                          }))
                        }
                        className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Anti-Burn-In Pixel Shift */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div>
                      <label className="text-xs text-slate-200 font-semibold block">
                        Anti-Burn-In Micro-Drift
                      </label>
                      <span className="text-[11px] text-slate-400">
                        Subtly shifts numerals by 2-4px every 3 min to protect screens overnight.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.screensaver?.nightModePixelShift ?? true}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              nightModePixelShift: e.target.checked,
                            },
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                    </label>
                  </div>
                </div>

                {/* Right: Night Mode Ultra-Dim Brightness Level */}
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-slate-200 font-semibold">
                        Night Mode Dimming Level
                      </label>
                      <span className="text-xs font-mono font-bold text-rose-400">
                        {config.screensaver?.nightModeDimLevel ?? 80}% Ultra-Dim
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="95"
                      step="5"
                      value={config.screensaver?.nightModeDimLevel ?? 80}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          screensaver: {
                            ...prev.screensaver,
                            nightModeDimLevel: parseInt(e.target.value, 10),
                          },
                        }))
                      }
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                      <span>50% (Soft Dim)</span>
                      <span>70% (Bedside)</span>
                      <span>85% (Ultra-Dim Sleep)</span>
                      <span>95% (Min Lumens)</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                    <div className="flex items-center gap-2 text-rose-300 font-medium">
                      <Moon className="w-3.5 h-3.5" />
                      <span>Direct On-Screen Toggle Available</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      You can also toggle Night Mode directly from the screensaver at any time using the quick moon button in the top right corner without opening Settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Party & Events */}
        {activeTab === 'party' && (
          <PartySettingsTab
            partyConfig={(config.party || DEFAULT_CONFIG.party)!}
            onUpdatePartyConfig={(updater) =>
              setConfig((prev) => ({
                ...prev,
                party: updater((prev.party || DEFAULT_CONFIG.party)!),
              }))
            }
            onTriggerPartyMode={onTriggerPartyMode}
          />
        )}

        {/* Tab: Reward Chart & Star Bank */}
        {activeTab === 'rewards' && (
          <RewardSettingsTab config={config} onChange={setConfig} />
        )}

        {/* Tab: System & Updates */}
        {activeTab === 'system' && <SystemSettings />}

        {/* Tab: About & Release Notes */}
        {activeTab === 'about' && (
          <AboutSection onNavigateToSystem={() => setActiveTab('system')} />
        )}
      </div>

      {/* Briefing Preview Modal */}
      <SmartBriefingModal
        isOpen={showBriefingPreview}
        onClose={() => setShowBriefingPreview(false)}
        slotLabel="Briefing Preview"
      />
    </div>
  );
};
