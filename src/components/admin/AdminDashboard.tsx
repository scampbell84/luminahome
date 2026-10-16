import React, { useState, useEffect } from 'react';
import { AppConfig, CalendarFeed } from '../../types/config';
import { WALLPAPER_PRESETS, DEFAULT_CONFIG } from '../../constants/defaultConfig';
import { SystemSettings } from '../system/SystemSettings';
import { GridVisualEditor } from './GridVisualEditor';
import {
  Save,
  RotateCcw,
  Monitor,
  Calendar,
  CloudSun,
  Clock,
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
  Eye,
  LayoutGrid,
  Moon,
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
} from 'lucide-react';

interface AdminDashboardProps {
  initialConfig: AppConfig;
  onSave: (config: AppConfig) => Promise<void>;
  onReset: () => Promise<void>;
  onOpenDisplay: () => void;
  onTriggerScreensaver?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialConfig,
  onSave,
  onReset,
  onOpenDisplay,
  onTriggerScreensaver,
}) => {
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<'display' | 'layout' | 'calendar' | 'weather' | 'widgets' | 'screensaver' | 'system'>('layout');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggleWidget = (key: keyof AppConfig) => {
    setConfig((prev) => {
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
    const newFeed: CalendarFeed = {
      id: `feed-${Date.now()}`,
      name: 'New Calendar',
      url: '',
      color: '#38bdf8',
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
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('display')}
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
            onClick={() => setActiveTab('layout')}
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
            onClick={() => setActiveTab('calendar')}
            className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'calendar'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendar Feeds</span>
            <span className="text-[10px] bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded-full font-mono border border-sky-400/30">
              {config.calendar.feeds.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('weather')}
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
            onClick={() => setActiveTab('widgets')}
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
            onClick={() => setActiveTab('screensaver')}
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
            onClick={() => setActiveTab('system')}
            className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'system'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>System & Updates</span>
            <span className="text-[10px] bg-emerald-400/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded font-mono">
              v2.5
            </span>
          </button>
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
              <div className="grid grid-cols-3 gap-2 mb-4">
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

        {/* Tab 2: Calendar Feeds */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-400" />
                    <span>Universal Multi-iCal Calendar Feeds</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect Google Calendar secret iCal, Apple iCloud public calendars, Outlook, or holiday feeds.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addCalendarFeed}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Calendar Feed</span>
                </button>
              </div>

              {/* Calendar Display Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 mb-5">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Default View Mode</label>
                  <select
                    value={config.calendar.view}
                    onChange={(e) => setConfig(prev => ({ ...prev, calendar: { ...prev.calendar, view: e.target.value as any } }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="split">Split View (Month Grid + Agenda)</option>
                    <option value="agenda">Agenda List Only</option>
                    <option value="month">Month Grid Only</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Max Upcoming Events</label>
                  <input
                    type="number"
                    min={3}
                    max={20}
                    value={config.calendar.maxAgendaItems}
                    onChange={(e) => setConfig(prev => ({ ...prev, calendar: { ...prev.calendar, maxAgendaItems: parseInt(e.target.value) || 8 } }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Sync Refresh Interval</label>
                  <select
                    value={config.calendar.refreshIntervalMinutes}
                    onChange={(e) => setConfig(prev => ({ ...prev, calendar: { ...prev.calendar, refreshIntervalMinutes: parseInt(e.target.value) || 15 } }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value={5}>Every 5 minutes</option>
                    <option value={15}>Every 15 minutes (Standard)</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every 1 hour</option>
                  </select>
                </div>
              </div>

              {/* Feed List */}
              <div className="space-y-3">
                {config.calendar.feeds.map((feed) => (
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
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-medium focus:outline-none focus:border-sky-500 w-44"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => testCalendarFeed(feed)}
                          disabled={testingFeedId === feed.id || !feed.url}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-xs font-medium transition-colors border border-slate-700"
                        >
                          {testingFeedId === feed.id ? 'Testing...' : 'Test Feed'}
                        </button>

                        <button
                          type="button"
                          onClick={() => removeCalendarFeed(feed.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
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
                      <div className={`text-xs p-2 rounded-lg flex items-center gap-2 ${
                        feedTestResult.ok
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                      }`}>
                        {feedTestResult.ok ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>Feed validated successfully! Found {feedTestResult.count} calendar events.</span>
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
                ))}
              </div>

              {/* Instructions on where to find ICS feeds */}
              <div className="mt-5 p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg text-xs text-slate-400 space-y-1.5">
                <span className="font-semibold text-slate-300 block">How to obtain your calendar iCal URL:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-400">
                  <li><strong>Google Calendar:</strong> Settings → Click Calendar → Integrate Calendar → Copy <em>"Secret address in iCal format"</em>.</li>
                  <li><strong>Apple iCloud:</strong> iCloud Calendar → Click share icon next to calendar → Check <em>"Public Calendar"</em> → Copy link (starts with webcal://).</li>
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
                <span className="text-xs text-slate-300 font-medium block mb-2">
                  Quick Location Presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Motherwell, United Kingdom', latitude: 55.7925, longitude: -3.9875, isDefault: true },
                    { label: 'Edinburgh, United Kingdom', latitude: 55.9533, longitude: -3.1883 },
                    { label: 'Glasgow, United Kingdom', latitude: 55.8642, longitude: -4.2518 },
                    { label: 'London, United Kingdom', latitude: 51.5074, longitude: -0.1278 },
                    { label: 'Manchester, United Kingdom', latitude: 53.4808, longitude: -2.2426 },
                    { label: 'New York, United States', latitude: 40.7128, longitude: -74.0060 },
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
                      Force-activates a simulated active Met Office Yellow Rain & Flooding warning for Motherwell, UK so you can test the high-contrast indicator badge and detail drawer right now.
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
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Hourglass className="w-4 h-4 text-amber-400" />
                  <span>Countdown Timer Widget</span>
                </h3>
                <input
                  type="checkbox"
                  checked={config.countdown.enabled}
                  onChange={(e) => setConfig(prev => ({ ...prev, countdown: { ...prev.countdown, enabled: e.target.checked } }))}
                  className="w-4 h-4 rounded text-sky-600"
                />
              </div>

              {config.countdown.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Event Title</label>
                    <input
                      type="text"
                      value={config.countdown.title}
                      onChange={(e) => setConfig(prev => ({ ...prev, countdown: { ...prev.countdown, title: e.target.value } }))}
                      placeholder="e.g. Hawaii Vacation"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Target Date & Time</label>
                    <input
                      type="datetime-local"
                      value={config.countdown.targetDate ? config.countdown.targetDate.slice(0, 16) : ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, countdown: { ...prev.countdown, targetDate: new Date(e.target.value).toISOString() } }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium block mb-1">Event Icon</label>
                    <select
                      value={config.countdown.icon}
                      onChange={(e) => setConfig(prev => ({ ...prev, countdown: { ...prev.countdown, icon: e.target.value } }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="plane">✈️ Vacation / Plane</option>
                      <option value="gift">🎁 Birthday / Gift</option>
                      <option value="party">🎉 Party / Celebration</option>
                      <option value="sun">☀️ Summer / Sun</option>
                      <option value="trophy">🏆 Milestone / Trophy</option>
                      <option value="heart">❤️ Anniversary / Heart</option>
                    </select>
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
          </div>
        )}

        {/* Tab: System & Updates */}
        {activeTab === 'system' && <SystemSettings />}
      </div>
    </div>
  );
};
