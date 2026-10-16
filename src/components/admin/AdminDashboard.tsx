import React, { useState, useEffect } from 'react';
import { AppConfig, CalendarFeed, HomePodSpeaker } from '../../types/config';
import { WALLPAPER_PRESETS, DEFAULT_CONFIG } from '../../constants/defaultConfig';
import { SystemSettings } from '../system/SystemSettings';
import { GridVisualEditor } from './GridVisualEditor';
import { parseHomeAssistantAddress, decodeHaToken } from '../../utils/homeAssistant';
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
  Music,
  Radio,
  Play,
  Pause,
  Volume2,
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
  const [activeTab, setActiveTab] = useState<'display' | 'layout' | 'calendar' | 'weather' | 'widgets' | 'homeassistant' | 'applemusic' | 'screensaver' | 'kiosk-guide' | 'system'>('layout');
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Home Assistant test state
  const [haTesting, setHaTesting] = useState<boolean>(false);
  const [haTestResult, setHaTestResult] = useState<{
    ok: boolean;
    reachable: boolean;
    message: string;
    statusCode?: number;
    serverUrl?: string;
    status?: string;
    isPrivateLan?: boolean;
    details?: any;
    tokenInfo?: any;
  } | null>(null);
  const [haCopied, setHaCopied] = useState<boolean>(false);
  const [showHaToken, setShowHaToken] = useState<boolean>(false);

  // Apple Music & HomePods state
  const [discoveringHomePods, setDiscoveringHomePods] = useState<boolean>(false);
  const [discoverResult, setDiscoverResult] = useState<{ ok: boolean; message: string; count?: number } | null>(null);
  const [testingAirPlay, setTestingAirPlay] = useState<boolean>(false);
  const [airPlayTestMessage, setAirPlayTestMessage] = useState<string | null>(null);
  const [isAddingSpeaker, setIsAddingSpeaker] = useState<boolean>(false);
  const [newSpeakerName, setNewSpeakerName] = useState<string>('');
  const [newSpeakerRoom, setNewSpeakerRoom] = useState<string>('');
  const [newSpeakerEntityId, setNewSpeakerEntityId] = useState<string>('');
  const [newSpeakerModel, setNewSpeakerModel] = useState<'HomePod' | 'HomePod mini'>('HomePod mini');
  const [newSpeakerStereo, setNewSpeakerStereo] = useState<boolean>(false);

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

  const testHomeAssistant = async () => {
    setHaTesting(true);
    setHaTestResult(null);
    try {
      const parsed = parseHomeAssistantAddress(
        config.homeAssistant?.ipAddress || '192.168.1.100',
        config.homeAssistant?.port || 8123,
        config.homeAssistant?.useHttps || false,
        config.homeAssistant?.customPath || '/lovelace'
      );
      const res = await fetch('/api/homeassistant/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: parsed.host,
          port: parsed.port,
          useHttps: parsed.useHttps,
          customPath: parsed.customPath,
          accessToken: config.homeAssistant?.accessToken || '',
        }),
      });
      const data = await res.json();
      setHaTestResult(data);
    } catch (err: any) {
      setHaTestResult({
        ok: false,
        reachable: false,
        message: `Client test error: ${err.message}`,
      });
    } finally {
      setHaTesting(false);
    }
  };

  const EXAMPLE_SPEAKER_IDS = new Set(['living-room-pair', 'kitchen-mini', 'bedroom-mini', 'office-mini']);

  const handleDiscoverHomePods = async () => {
    setDiscoveringHomePods(true);
    setDiscoverResult(null);
    try {
      const res = await fetch('/api/media/airplay/discover', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.discovered && data.discovered.length > 0) {
        // Automatically prune out dummy example devices so only real devices remain
        const realCurrent = (config.appleMusic?.homePods || []).filter(s => !EXAMPLE_SPEAKER_IDS.has(s.id));
        const existingEntities = new Set(realCurrent.map(s => s.entityId));
        const newOnes = data.discovered.filter((d: any) => !existingEntities.has(d.entityId));
        const updatedHomePods = [...realCurrent, ...newOnes];

        const updatedConfig = {
          ...config,
          appleMusic: {
            ...config.appleMusic,
            homePods: updatedHomePods,
          },
        };
        setConfig(updatedConfig);
        onSave(updatedConfig).catch(console.warn);

        setDiscoverResult({
          ok: true,
          message: `Discovered ${data.discovered.length} media player entities on Home Assistant! Replaced example placeholders with your actual devices.`,
          count: data.discovered.length,
        });
      } else {
        setDiscoverResult({
          ok: false,
          message: data.message || 'No new media player entities found on Home Assistant.',
        });
      }
    } catch (err: any) {
      setDiscoverResult({
        ok: false,
        message: `Network error: ${err.message}`,
      });
    } finally {
      setDiscoveringHomePods(false);
    }
  };

  const handleClearExampleSpeakers = async () => {
    const realCurrent = (config.appleMusic?.homePods || []).filter(s => !EXAMPLE_SPEAKER_IDS.has(s.id));
    const updatedConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        homePods: realCurrent,
      },
    };
    setConfig(updatedConfig);
    await onSave(updatedConfig);
    try {
      await fetch('/api/media/airplay/clean-examples', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    setDiscoverResult({
      ok: true,
      message: 'Example placeholder speakers removed successfully.',
    });
  };

  const handleAddSpeaker = () => {
    if (!newSpeakerName.trim() || !newSpeakerRoom.trim()) return;
    const newSp: HomePodSpeaker = {
      id: `homepod-${Date.now()}`,
      name: newSpeakerName.trim(),
      room: newSpeakerRoom.trim(),
      entityId: newSpeakerEntityId.trim() || `media_player.${newSpeakerRoom.toLowerCase().replace(/\s+/g, '_')}_homepod`,
      isStereoPair: newSpeakerStereo,
      volume: 50,
      muted: false,
      active: true,
      model: newSpeakerModel,
    };
    const updatedConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        homePods: [...(config.appleMusic?.homePods || []), newSp],
      },
    };
    setConfig(updatedConfig);
    onSave(updatedConfig).catch(console.warn);
    setNewSpeakerName('');
    setNewSpeakerRoom('');
    setNewSpeakerEntityId('');
    setIsAddingSpeaker(false);
  };

  const handleDeleteSpeaker = (id: string) => {
    const updatedSpeakers = (config.appleMusic?.homePods || []).filter(s => s.id !== id);
    const updatedConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        homePods: updatedSpeakers,
      },
    };
    setConfig(updatedConfig);
    onSave(updatedConfig).catch(console.warn);
  };

  const handleTestAirPlayAudio = async () => {
    setTestingAirPlay(true);
    setAirPlayTestMessage('Sending playback test command to active HomePods...');
    try {
      const res = await fetch('/api/media/applemusic/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'play' }),
      });
      if (res.ok) {
        setAirPlayTestMessage('Test stream dispatched! Active HomePods are playing.');
        setTimeout(() => setAirPlayTestMessage(null), 5000);
      }
    } catch (err: any) {
      setAirPlayTestMessage(`Test failed: ${err.message}`);
    } finally {
      setTestingAirPlay(false);
    }
  };

  // Real-time parsed Home Assistant configuration and decoded token
  const haParsed = parseHomeAssistantAddress(
    config.homeAssistant?.ipAddress || '192.168.1.100',
    config.homeAssistant?.port || 8123,
    config.homeAssistant?.useHttps || false,
    config.homeAssistant?.customPath || '/lovelace'
  );
  const haTokenDecoded = decodeHaToken(config.homeAssistant?.accessToken || '');

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
            onClick={() => setActiveTab('homeassistant')}
            className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'homeassistant'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Home className="w-4 h-4 text-cyan-400" />
            <span>Home Assistant</span>
            <span className="text-[10px] bg-cyan-400/20 text-cyan-300 font-bold px-1.5 py-0.5 rounded font-mono">
              Server IP
            </span>
          </button>

          <button
            onClick={() => setActiveTab('applemusic')}
            className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'applemusic'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Music className="w-4 h-4 text-rose-400" />
            <span>Apple Music & HomePods</span>
            <span className="text-[10px] bg-rose-400/20 text-rose-300 font-bold px-1.5 py-0.5 rounded font-mono">
              AirPlay 2
            </span>
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
            <span>Apple HomeView & Screen Saver</span>
            <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-1.5 py-0.5 rounded font-mono">
              New
            </span>
          </button>

          <button
            onClick={() => setActiveTab('system')}
            className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${
              activeTab === 'system' || activeTab === 'kiosk-guide'
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

        {/* Tab: Home Assistant Server & Dashboard Configuration */}
        {activeTab === 'homeassistant' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                    <Home className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Home Assistant Integration
                  </h3>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono px-2 py-0.5 rounded-full uppercase">
                    LAN Server & Lovelace
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Connect your smart kiosk directly to your local Home Assistant server. Enter your server's IP address below to embed your Lovelace dashboard, control smart devices, and trigger home automations.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={testHomeAssistant}
                  disabled={haTesting}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/20 flex items-center gap-2 transition-all active:scale-95 border border-cyan-400/30"
                >
                  <Activity className={`w-4 h-4 ${haTesting ? 'animate-spin' : ''}`} />
                  <span>{haTesting ? 'Testing Server...' : 'Test Connection'}</span>
                </button>

                <a
                  href={haParsed.fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Open in Browser</span>
                </a>
              </div>
            </div>

            {/* Test Result Callout */}
            {haTestResult && (
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  haTestResult.ok
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {haTestResult.ok ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{haTestResult.message}</h4>
                        {haTestResult.status === 'lan_verified' && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            LAN Verified
                          </span>
                        )}
                        {haTestResult.status === 'connected' && (
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            Connected
                          </span>
                        )}
                      </div>
                      <a
                        href={haParsed.fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 font-semibold transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Launch in Browser Tab</span>
                      </a>
                    </div>

                    {/* Diagnostic Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-mono">Server Address</span>
                        <span className="font-mono text-cyan-300 font-bold truncate block">{haParsed.host}:{haParsed.port}</span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-mono">Dashboard Path</span>
                        <span className="font-mono text-cyan-300 font-bold truncate block">{haParsed.customPath}</span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-mono">Access Token</span>
                        <span className="font-mono text-emerald-300 font-bold truncate block">
                          {haTokenDecoded.valid ? `Valid (Expires ${haTokenDecoded.expiresAt})` : (config.homeAssistant?.accessToken ? 'Format Unrecognized' : 'Optional')}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block text-[10px] uppercase font-mono">Network Scope</span>
                        <span className="font-mono text-white font-bold truncate block">
                          {haParsed.isPrivateLan ? 'Private Home LAN' : 'Public / Internet'}
                        </span>
                      </div>
                    </div>

                    {/* Local LAN Explanation */}
                    {haParsed.isPrivateLan && (
                      <div className="bg-slate-900/90 rounded-xl p-3 border border-emerald-500/30 text-xs text-slate-300 space-y-1.5">
                        <p className="leading-relaxed">
                          <strong className="text-emerald-300">Why 'Open in Browser' works:</strong> Your browser device is on the same local Wi-Fi / LAN as Home Assistant, so it connects directly to <code className="text-cyan-300 font-mono">{haParsed.host}</code>.
                        </p>
                        <p className="leading-relaxed text-slate-400">
                          <strong className="text-white">Kiosk Deployment:</strong> When this kiosk is installed and run on your Raspberry Pi or wall display (via <code className="text-slate-300 font-mono">npm start</code>), it runs natively on your home LAN with instant direct communication to Home Assistant!
                        </p>
                      </div>
                    )}

                    {!haTestResult.ok && (
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Check that your Home Assistant server is turned on, connected to the same local network, and that port {haParsed.port} is open.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Main Configuration Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-cyan-400" />
                    <span>Server Connection Settings</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Define the network address where your Home Assistant instance is reachable
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs font-semibold text-slate-300">Enable Tab:</span>
                  <input
                    type="checkbox"
                    checked={config.homeAssistant?.enabled ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        homeAssistant: {
                          ...prev.homeAssistant,
                          enabled: e.target.checked,
                        },
                      }))
                    }
                    className="w-4 h-4 rounded text-cyan-600 bg-slate-800 border-slate-700 focus:ring-0"
                  />
                </label>
              </div>

              {/* IP Address & Port */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-slate-300 font-semibold block">
                      Home Assistant IP Address / Hostname <span className="text-cyan-400">*</span>
                    </label>
                    {haParsed.isPrivateLan && (
                      <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/60">
                        Local LAN IP
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={config.homeAssistant?.ipAddress || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.includes('://') || val.includes(':') || val.includes('/')) {
                          const p = parseHomeAssistantAddress(
                            val,
                            config.homeAssistant?.port || 8123,
                            config.homeAssistant?.useHttps || false,
                            config.homeAssistant?.customPath || '/lovelace'
                          );
                          setConfig((prev) => ({
                            ...prev,
                            homeAssistant: {
                              ...prev.homeAssistant,
                              ipAddress: p.host,
                              port: p.port,
                              useHttps: p.useHttps,
                              customPath: p.customPath,
                            },
                          }));
                        } else {
                          setConfig((prev) => ({
                            ...prev,
                            homeAssistant: {
                              ...prev.homeAssistant,
                              ipAddress: val,
                            },
                          }));
                        }
                      }}
                      placeholder="e.g. 192.168.7.236 or homeassistant.local"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Typically your local Raspberry Pi, mini PC, or Home Assistant OS IP address (e.g. 192.168.7.236). Full URLs or Nabu Casa addresses auto-format automatically.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                    Port Number
                  </label>
                  <input
                    type="number"
                    value={config.homeAssistant?.port || 8123}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        homeAssistant: {
                          ...prev.homeAssistant,
                          port: parseInt(e.target.value, 10) || 8123,
                        },
                      }))
                    }
                    placeholder="8123"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Standard Home Assistant port is 8123 (or 443 for HTTPS/Nabu Casa).
                  </p>
                </div>
              </div>

              {/* Protocol & Full URL Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                    Connection Protocol
                  </label>
                  <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          homeAssistant: { ...prev.homeAssistant, useHttps: false },
                        }))
                      }
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        !config.homeAssistant?.useHttps
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      HTTP (Local LAN)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          homeAssistant: { ...prev.homeAssistant, useHttps: true },
                        }))
                      }
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        config.homeAssistant?.useHttps
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      HTTPS (SSL)
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                    Target Full URL Preview
                  </label>
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl">
                    <span className="font-mono text-xs text-cyan-300 truncate flex-1">
                      {haParsed.fullUrl}{config.homeAssistant?.kioskMode ? '?kiosk' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${haParsed.fullUrl}${config.homeAssistant?.kioskMode ? '?kiosk' : ''}`;
                        navigator.clipboard.writeText(url);
                        setHaCopied(true);
                        setTimeout(() => setHaCopied(false), 2000);
                      }}
                      className="text-slate-400 hover:text-white text-xs shrink-0 flex items-center gap-1"
                      title="Copy URL"
                    >
                      {haCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dashboard Path, Kiosk Mode & View Mode */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                    Lovelace Dashboard Path
                  </label>
                  <input
                    type="text"
                    value={config.homeAssistant?.customPath || '/lovelace'}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        homeAssistant: {
                          ...prev.homeAssistant,
                          customPath: e.target.value,
                        },
                      }))
                    }
                    placeholder="/lovelace or /dashboard-home/0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    e.g. /lovelace, /dashboard-home/0, /energy, or /media-browser
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1.5">
                    Default View Mode
                  </label>
                  <select
                    value={config.homeAssistant?.viewMode || 'embed'}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        homeAssistant: {
                          ...prev.homeAssistant,
                          viewMode: e.target.value as any,
                        },
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="embed">🌐 Embedded Lovelace Dashboard (Iframe)</option>
                    <option value="cards">🎛️ Touch-Optimized Device Cards</option>
                    <option value="split">◫ Split Screen (Cards + Embed)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Choose how Home Assistant appears on the kiosk display
                  </p>
                </div>

                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={config.homeAssistant?.kioskMode ?? false}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          homeAssistant: {
                            ...prev.homeAssistant,
                            kioskMode: e.target.checked,
                          },
                        }))
                      }
                      className="w-4 h-4 rounded text-cyan-600 bg-slate-800 border-slate-700 focus:ring-0"
                    />
                    <div>
                      <span className="text-xs font-semibold text-white block">
                        Append ?kiosk Mode
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Hides Lovelace header & sidebar
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Long-Lived Access Token */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Long-Lived Access Token</span>
                    {haTokenDecoded.valid && (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                        Verified Token
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowHaToken(!showHaToken)}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>{showHaToken ? 'Hide Token' : 'Reveal Token'}</span>
                  </button>
                </div>
                <input
                  type={showHaToken ? 'text' : 'password'}
                  value={config.homeAssistant?.accessToken || ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      homeAssistant: {
                        ...prev.homeAssistant,
                        accessToken: e.target.value.trim(),
                      },
                    }))
                  }
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
                {haTokenDecoded.valid ? (
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-400 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>
                      Token Recognized: Issued by Home Assistant ({haTokenDecoded.issuer?.slice(0, 10)}...), Expires {haTokenDecoded.expiresAt} ({haTokenDecoded.daysRemaining ? `${haTokenDecoded.daysRemaining} days remaining` : 'active'}).
                    </span>
                  </div>
                ) : config.homeAssistant?.accessToken ? (
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Token entered but format unrecognized. Ensure the full 3-part JWT token is copied.</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Enables the kiosk to proxy entity states, control devices, and trigger automations without browser CORS blocks. Generated in Home Assistant under <em>Your Profile → Security → Long-Lived Access Tokens</em>.
                  </p>
                )}
              </div>
            </div>

            {/* Lovelace Embedding Troubleshooting Guide */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Home Assistant Iframe Setup & Tips</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                By default, Home Assistant restricts being embedded in iframes unless enabled in its configuration file. To enable seamless embedding on your kiosk screen:
              </p>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-cyan-300 overflow-x-auto">
{`# Add to your Home Assistant configuration.yaml:
http:
  use_x_frame_options: false
  cors_allowed_origins:
    - http://${window.location.host}`}
              </div>
              <p className="text-[11px] text-slate-500">
                After saving <code className="text-slate-300 font-mono">configuration.yaml</code>, restart Home Assistant from Developer Tools → YAML → Restart.
              </p>
            </div>
          </div>
        )}

        {/* Tab: Apple Music & HomePods Configuration */}
        {activeTab === 'applemusic' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#FA243C] to-rose-600 flex items-center justify-center text-white font-bold shadow-md shadow-rose-500/20">
                    <Music className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Apple Music & HomePod AirPlay Media Hub
                  </h3>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono px-2 py-0.5 rounded-full uppercase">
                    AirPlay 2
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Manage your Apple Music library connection, audio format quality, and HomePod speakers across every room. Audio routes seamlessly through your local Home Assistant bridge or native WebKit AirPlay picker.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleTestAirPlayAudio}
                  disabled={testingAirPlay}
                  className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/25 flex items-center gap-2 transition-all active:scale-95 border border-rose-400/30 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{testingAirPlay ? 'Testing...' : 'Test HomePod Playback'}</span>
                </button>
              </div>
            </div>

            {/* Test result message banner */}
            {airPlayTestMessage && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-200 flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{airPlayTestMessage}</span>
              </div>
            )}

            {/* General Media Preferences */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-5">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-rose-400" />
                    <span>Media Player Widget & Playback Options</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Controls widget visibility on the dashboard and ambient complications.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.appleMusic?.enabled ?? true}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        appleMusic: {
                          ...prev.appleMusic,
                          enabled: e.target.checked,
                        },
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600" />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Audio Quality Format */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Audio Quality Stream Format
                  </label>
                  <select
                    value={config.appleMusic?.audioQuality || 'Lossless'}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        appleMusic: {
                          ...prev.appleMusic,
                          audioQuality: e.target.value as any,
                        },
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="Lossless">Lossless (ALAC up to 24-bit/48 kHz)</option>
                    <option value="Dolby Atmos">Dolby Atmos (Spatial Audio Immersive)</option>
                    <option value="Hi-Res Lossless">Hi-Res Lossless (ALAC up to 24-bit/192 kHz)</option>
                    <option value="High Quality">High Quality (AAC 256 kbps)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Lossless and Spatial Audio streams are supported directly on HomePods and compatible AirPlay 2 targets.
                  </p>
                </div>

                {/* Screensaver Now Playing Complication */}
                <div className="flex flex-col justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white">Now Playing Screensaver Capsule</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Displays animated EQ and current track in Apple HomeView screen saver.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                      <input
                        type="checkbox"
                        checked={config.appleMusic?.showNowPlayingInScreensaver ?? true}
                        onChange={e =>
                          setConfig(prev => ({
                            ...prev,
                            appleMusic: {
                              ...prev.appleMusic,
                              showNowPlayingInScreensaver: e.target.checked,
                            },
                          }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* HomePod Multi-Room Speaker Fleet */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Radio className="w-4 h-4 text-rose-400" />
                    <span>HomePod Multi-Room AirPlay Speakers</span>
                    <span className="text-xs font-mono bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                      {(config.appleMusic?.homePods || []).length} Speakers
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Speakers configured for independent volume control, stereo pairing, and synchronized multi-room routing.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {(config.appleMusic?.homePods || []).some(s => EXAMPLE_SPEAKER_IDS.has(s.id)) && (
                    <button
                      type="button"
                      onClick={handleClearExampleSpeakers}
                      className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                      title="Clear dummy/example devices"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Example Devices</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleDiscoverHomePods}
                    disabled={discoveringHomePods}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${discoveringHomePods ? 'animate-spin text-sky-400' : ''}`} />
                    <span>{discoveringHomePods ? 'Scanning...' : 'Scan Home Assistant'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddingSpeaker(!isAddingSpeaker)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm shadow-rose-600/30"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Speaker</span>
                  </button>
                </div>
              </div>

              {/* Example Speakers Warning Banner */}
              {(config.appleMusic?.homePods || []).some(s => EXAMPLE_SPEAKER_IDS.has(s.id)) && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Example placeholder speakers detected (e.g. Bedroom HomePod mini). Clear them to show only your actual devices.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearExampleSpeakers}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shrink-0"
                  >
                    Clear Examples
                  </button>
                </div>
              )}

              {/* Discovery status result banner */}
              {discoverResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    discoverResult.ok
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{discoverResult.message}</span>
                </div>
              )}

              {/* Inline Add Speaker Form */}
              {isAddingSpeaker && (
                <div className="p-4 rounded-xl bg-slate-800/60 border border-rose-500/30 space-y-3 animate-fade-in">
                  <h5 className="text-xs font-bold text-white flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-rose-400" />
                    <span>Add HomePod / AirPlay Speaker</span>
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Speaker Name</label>
                      <input
                        type="text"
                        value={newSpeakerName}
                        onChange={e => setNewSpeakerName(e.target.value)}
                        placeholder="Living Room HomePods"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Room / Location</label>
                      <input
                        type="text"
                        value={newSpeakerRoom}
                        onChange={e => setNewSpeakerRoom(e.target.value)}
                        placeholder="Living Room"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">HA Entity ID</label>
                      <input
                        type="text"
                        value={newSpeakerEntityId}
                        onChange={e => setNewSpeakerEntityId(e.target.value)}
                        placeholder="media_player.living_room_homepod"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Speaker Model</label>
                      <select
                        value={newSpeakerModel}
                        onChange={e => setNewSpeakerModel(e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                      >
                        <option value="HomePod">HomePod (Full Size)</option>
                        <option value="HomePod mini">HomePod mini</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={newSpeakerStereo}
                        onChange={e => setNewSpeakerStereo(e.target.checked)}
                        className="rounded border-slate-700 text-rose-500 focus:ring-0"
                      />
                      <span>Is Stereo Pair (Left + Right configured in Apple Home)</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingSpeaker(false)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAddSpeaker}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
                      >
                        Save Speaker
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Speaker List */}
              <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                {(config.appleMusic?.homePods || []).length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <Radio className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-50" />
                    <p className="text-sm font-medium text-slate-300">No HomePod speakers configured</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click "Scan Home Assistant" to automatically import your speakers or add them manually.
                    </p>
                  </div>
                ) : (
                  (config.appleMusic?.homePods || []).map((sp, idx) => (
                    <div
                      key={sp.id}
                      className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                          <Radio className="w-4 h-4 text-rose-400" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{sp.name}</span>
                            {sp.isStereoPair && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                                Stereo Pair
                              </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {sp.model || 'HomePod'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {sp.room} · <code className="text-slate-500 font-mono text-[10px]">{sp.entityId}</code>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {/* Default Volume preview */}
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={sp.volume || 50}
                            onChange={e => {
                              const newVol = parseInt(e.target.value, 10);
                              setConfig(prev => ({
                                ...prev,
                                appleMusic: {
                                  ...prev.appleMusic,
                                  homePods: (prev.appleMusic?.homePods || []).map(s =>
                                    s.id === sp.id ? { ...s, volume: newVol } : s
                                  ),
                                },
                              }));
                            }}
                            className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                          <span className="text-[11px] font-mono text-slate-400 w-7 text-right">
                            {sp.volume || 50}%
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSpeaker(sp.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove speaker"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Apple Music Cloud Account & API Tokens */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Apple Music Developer & Cloud Account Tokens (Optional)</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Optional keys for loading your private Apple Music playlists and favorited tracks directly via MusicKit JS.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Apple Music Developer Token (JWT)
                  </label>
                  <input
                    type="password"
                    value={config.appleMusic?.developerToken || ''}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        appleMusic: {
                          ...prev.appleMusic,
                          developerToken: e.target.value,
                        },
                      }))
                    }
                    placeholder="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Obtained from Apple Developer account under Keys → MusicKit.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    MusicKit User Token
                  </label>
                  <input
                    type="password"
                    value={config.appleMusic?.userToken || ''}
                    onChange={e =>
                      setConfig(prev => ({
                        ...prev,
                        appleMusic: {
                          ...prev.appleMusic,
                          userToken: e.target.value,
                        },
                      }))
                    }
                    placeholder="Optional personal account token..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-rose-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Allows personal cloud library synchronization.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Apple HomeView & Screen Saver */}
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
                    Apple HomeView & StandBy Screen Saver
                  </h3>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono px-2 py-0.5 rounded-full uppercase">
                    1920 × 1200 Display
                  </span>
                </div>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Automatically transitions to an Apple-inspired ambient standby display when idle. Configurable with curated fine-art photography, oversized typographic clocks, live weather, calendar schedules, and bin reminders. Tapping anywhere immediately returns to the Home dashboard.
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
                    Controls when the screen saver automatically engages and how it wakes.
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
                      { val: 1, label: '1 min' },
                      { val: 2, label: '2 min' },
                      { val: 3, label: '3 min', badge: 'Default' },
                      { val: 5, label: '5 min' },
                      { val: 10, label: '10 min' },
                      { val: 15, label: '15 min' },
                      { val: 30, label: '30 min' },
                      { val: 0, label: 'Never' },
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
                            ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                            : 'bg-slate-950/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
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
                    Triggers when no touches, mouse movements, or clicks occur for the chosen duration.
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-2">
                    Screen Saver Wake Gesture
                  </label>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                    <div className="flex items-center gap-2 font-medium text-white">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Single Tap Anywhere Returns to Home</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Designed for kiosk wall-displays: touching the screen at any point instantly wakes the display and navigates directly back to your primary Home dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preloaded Screen Saver Styles */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Preloaded HomeView Styles (7 Presets)</span>
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Select your active screensaver ambient style. Configured exclusively here in Settings for a clean, distraction-free kiosk display.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  {
                    id: 'standby-duo',
                    name: 'Apple StandBy Duo',
                    tag: 'Recommended',
                    desc: 'Split-screen layout with oversized digital clock on left & interactive Smart Stack (schedule, live weather, bin collections) on right.',
                    bg: 'from-sky-950/40 to-slate-900',
                  },
                  {
                    id: 'weather-focus',
                    name: 'Apple Weather Station',
                    tag: 'Live Weather',
                    desc: 'Dedicated ambient weather hub with oversized clock, live temperature, comfort humidity gauge, and 3-day forecast in liquid glass.',
                    bg: 'from-sky-950/40 to-slate-900',
                  },
                  {
                    id: 'photo-art',
                    name: 'Curated Photo & Art Frame',
                    tag: 'Fine Art',
                    desc: 'Full-bleed high-res landscape and architecture photography with soft Ken Burns pan and translucent Liquid Glass complication capsule.',
                    bg: 'from-amber-950/40 to-slate-900',
                  },
                  {
                    id: 'bold-digital',
                    name: 'Minimalist Bold Digital',
                    tag: 'Typography',
                    desc: 'Apple SF Pro style giant numerals with live date, weather status, and next event pills.',
                    bg: 'from-indigo-950/40 to-slate-900',
                  },
                  {
                    id: 'classic-analog',
                    name: 'Luxury Chronograph Analog',
                    tag: 'Swiss Dial',
                    desc: 'Realistic SVG analog watchface with sweeping seconds hand and 3 complications for date, temperature, and schedule.',
                    bg: 'from-slate-950 to-slate-900',
                  },
                  {
                    id: 'cosmic-glow',
                    name: 'Cosmic Aurora & Nebula',
                    tag: 'Ambient Aura',
                    desc: 'Deep space starry canvas with glowing ambient light orbs and luminous modern numerals.',
                    bg: 'from-purple-950/40 to-slate-900',
                  },
                  {
                    id: 'night-stand',
                    name: 'Night Stand (Red Monochrome)',
                    tag: 'OLED Night',
                    desc: 'Pitch-black OLED background with pure crimson red glow designed to protect night vision during dark hours.',
                    bg: 'from-red-950/30 to-black',
                  },
                ].map((styleItem) => {
                  const isSelected = (config.screensaver?.style || 'standby-duo') === styleItem.id;
                  return (
                    <div
                      key={styleItem.id}
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          screensaver: {
                            ...prev.screensaver,
                            style: styleItem.id as any,
                          },
                        }))
                      }
                      className={`cursor-pointer rounded-xl p-4 transition-all border relative flex flex-col justify-between bg-gradient-to-b ${styleItem.bg} ${
                        isSelected
                          ? 'border-sky-400 ring-2 ring-sky-500/30 shadow-lg'
                          : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-white">
                            {styleItem.name}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                            isSelected ? 'bg-sky-500 text-white' : 'bg-white/10 text-white/70'
                          }`}>
                            {styleItem.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {styleItem.desc}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-semibold">
                        <span className={isSelected ? 'text-sky-300' : 'text-slate-400'}>
                          {isSelected ? 'Active Preset' : 'Click to Select'}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Artwork Gallery & Photography Options */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <span>Curated Fine Art & Photography Collections</span>
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Used in the Photo Frame mode and preloaded gallery transitions.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-2">
                    Artwork Category
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'all', label: 'All Collections' },
                      { id: 'nature', label: 'Nature & Landscapes' },
                      { id: 'architecture', label: 'Modern Architecture' },
                      { id: 'space', label: 'Cosmic & Deep Sky' },
                      { id: 'abstract', label: 'Abstract 3D Art' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() =>
                          setConfig((prev) => ({
                            ...prev,
                            screensaver: {
                              ...prev.screensaver,
                              artworkCategory: cat.id as any,
                            },
                          }))
                        }
                        className={`p-2.5 rounded-lg text-xs font-semibold transition-all border text-left flex items-center justify-between ${
                          (config.screensaver?.artworkCategory || 'nature') === cat.id
                            ? 'bg-sky-600 border-sky-400 text-white shadow-md'
                            : 'bg-slate-950/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <span>{cat.label}</span>
                        {(config.screensaver?.artworkCategory || 'nature') === cat.id && (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-2">
                    Artwork Rotation Interval
                  </label>
                  <select
                    value={config.screensaver?.artCycleSeconds ?? 30}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        screensaver: {
                          ...prev.screensaver,
                          artCycleSeconds: parseInt(e.target.value, 10),
                        },
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 mb-3"
                  >
                    <option value={15}>Every 15 seconds</option>
                    <option value={30}>Every 30 seconds (Recommended)</option>
                    <option value={60}>Every 1 minute</option>
                    <option value={300}>Every 5 minutes</option>
                  </select>

                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Clock Color Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'sunset', label: 'Sunset Glow', color: '#f59e0b' },
                      { id: 'glacier', label: 'Glacier Blue', color: '#38bdf8' },
                      { id: 'emerald', label: 'Emerald Mint', color: '#34d399' },
                      { id: 'white', label: 'Pure White', color: '#ffffff' },
                      { id: 'crimson', label: 'Crimson Red', color: '#ef4444' },
                      { id: 'lavender', label: 'Lavender', color: '#a855f7' },
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
                        className={`p-2 rounded-lg text-xs font-semibold border flex items-center gap-2 transition-all ${
                          (config.screensaver?.clockColor || 'sunset') === c.id
                            ? 'bg-slate-800 border-sky-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="truncate">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Weather Widget Configuration */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                    <CloudSun className="w-4 h-4 text-sky-400" />
                    <span>HomeView Weather Widget Configuration</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Configure the rounded-glass interactive weather widget featured in Apple StandBy Duo and Weather Station screensavers.
                  </p>
                </div>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono px-2 py-0.5 rounded-full border border-sky-400/30">
                  Interactive 3-Way
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-2">
                    Default Initial Weather View Mode:
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      {
                        id: 'current',
                        name: 'Current Temperature',
                        desc: 'Live temperature, condition icon, feels like, and today\'s spectrum high/low range bar.',
                        icon: Thermometer,
                      },
                      {
                        id: 'humidity',
                        name: 'Humidity & Moisture',
                        desc: 'Relative humidity %, comfort assessment, rounded progress bar, and rain chance.',
                        icon: Droplets,
                      },
                      {
                        id: 'forecast',
                        name: '3-Day Forecast',
                        desc: 'Three rounded-glass cards for Today and upcoming 2 days with daily min/max bars and precipitation probability.',
                        icon: CalendarDays,
                      },
                    ].map((mode) => {
                      const isSelected = (config.screensaver?.weatherWidgetView || 'current') === mode.id;
                      const IconComponent = mode.icon;
                      return (
                        <div
                          key={mode.id}
                          onClick={() =>
                            setConfig((prev) => ({
                              ...prev,
                              screensaver: {
                                ...prev.screensaver,
                                weatherWidgetView: mode.id as any,
                              },
                            }))
                          }
                          className={`cursor-pointer rounded-xl p-3.5 border transition-all ${
                            isSelected
                              ? 'bg-sky-500/15 border-sky-400 text-white shadow-md'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 font-bold text-xs text-white">
                              <IconComponent className={`w-4 h-4 ${isSelected ? 'text-sky-400' : 'text-slate-400'}`} />
                              <span>{mode.name}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {mode.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Real-Time On-Screen Toggling</span>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      While the screensaver is running, users can tap directly between the <strong className="text-white">Current Temp</strong>, <strong className="text-white">Humidity</strong>, or <strong className="text-white">3-Day Forecast</strong> pills to switch views dynamically without waking or leaving the screensaver.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Complications & Smart Reminders */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h4 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <span>Smart Complications & Ambient Comfort</span>
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Toggle overlay widgets and low-light behaviors.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Live Weather Complication
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Display temperature and condition in standby corner
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.screensaver?.showWeatherComplication ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        screensaver: {
                          ...prev.screensaver,
                          showWeatherComplication: e.target.checked,
                        },
                      }))
                    }
                    className="w-4 h-4 rounded text-sky-500 bg-slate-800 border-slate-700 focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Upcoming Calendar Schedule
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Show today's and tomorrow's upcoming events
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.screensaver?.showCalendarComplication ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        screensaver: {
                          ...prev.screensaver,
                          showCalendarComplication: e.target.checked,
                        },
                      }))
                    }
                    className="w-4 h-4 rounded text-sky-500 bg-slate-800 border-slate-700 focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Waste & Bin Collection Reminder
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Auto-detect Brown / Black bin collection days
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.screensaver?.showBinReminder ?? true}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        screensaver: {
                          ...prev.screensaver,
                          showBinReminder: e.target.checked,
                        },
                      }))
                    }
                    className="w-4 h-4 rounded text-sky-500 bg-slate-800 border-slate-700 focus:ring-0"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Auto Night Mode (Red Monochrome)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Automatically activate red night vision between 10 PM and 7 AM
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.screensaver?.autoNightMode ?? false}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        screensaver: {
                          ...prev.screensaver,
                          autoNightMode: e.target.checked,
                        },
                      }))
                    }
                    className="w-4 h-4 rounded text-sky-500 bg-slate-800 border-slate-700 focus:ring-0"
                  />
                </label>
              </div>

              {/* Ambient Dim Level */}
              <div className="mt-5 pt-4 border-t border-slate-800">
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
                  <span>10% (Subtle)</span>
                  <span>30% (Living Room)</span>
                  <span>60% (Dark Bedroom)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: System & Updates */}
        {(activeTab === 'system' || activeTab === 'kiosk-guide') && <SystemSettings />}
      </div>
    </div>
  );
};
