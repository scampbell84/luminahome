import React, { useState, useEffect, useRef } from 'react';
import { AppConfig, HomeAssistantConfig } from '../../types/config';
import { parseHomeAssistantAddress, decodeHaToken } from '../../utils/homeAssistant';
import {
  ExternalLink,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Power,
  Sun,
  Thermometer,
  ShieldCheck,
  Tv,
  Layers,
  Sparkles,
  Radio,
  Lock,
  Unlock,
  Maximize2,
  Copy,
  Check,
  Info,
  ChevronRight,
  Wifi,
  Activity,
  Flame,
  Zap,
} from 'lucide-react';

interface HomeAssistantViewProps {
  config: AppConfig;
  onOpenSettings: () => void;
  onUpdateConfig?: (updatedConfig: AppConfig) => Promise<void>;
}

// Built-in touch device models for interactive kiosk control
interface DeviceEntity {
  id: string;
  name: string;
  area: string;
  type: 'light' | 'switch' | 'climate' | 'scene' | 'sensor' | 'lock';
  state: string; // 'on' | 'off' | 'locked' | 'unlocked' | value
  attributes?: Record<string, any>;
  icon?: string;
}

const DEFAULT_DEVICES: DeviceEntity[] = [
  // Living Room
  { id: 'light.living_room_ceiling', name: 'Living Room Ceiling', area: 'Living Room', type: 'light', state: 'on', attributes: { brightness: 80, color_temp: 'warm' } },
  { id: 'light.accent_strip', name: 'TV Backlight LED', area: 'Living Room', type: 'light', state: 'on', attributes: { brightness: 60, rgb_color: [56, 189, 248] } },
  { id: 'switch.media_console', name: 'Home Theater & TV', area: 'Living Room', type: 'switch', state: 'on', attributes: { current_power_w: 142 } },
  { id: 'climate.living_room', name: 'Living Room Climate', area: 'Living Room', type: 'climate', state: 'heat', attributes: { current_temperature: 20.5, temperature: 21.0, hvac_action: 'heating' } },
  
  // Kitchen
  { id: 'light.kitchen_spots', name: 'Kitchen Downlights', area: 'Kitchen', type: 'light', state: 'on', attributes: { brightness: 100 } },
  { id: 'light.cabinet_lighting', name: 'Under-Cabinet LEDs', area: 'Kitchen', type: 'light', state: 'off', attributes: { brightness: 50 } },
  { id: 'switch.coffee_maker', name: 'Espresso Machine', area: 'Kitchen', type: 'switch', state: 'off', attributes: { current_power_w: 0 } },

  // Bedroom & Hallway
  { id: 'light.bedroom_lamps', name: 'Bedside Lamps', area: 'Bedroom', type: 'light', state: 'off', attributes: { brightness: 30 } },
  { id: 'lock.front_door', name: 'Front Door Smart Lock', area: 'Hallway', type: 'lock', state: 'locked' },
  { id: 'sensor.front_motion', name: 'Porch Motion Sensor', area: 'Hallway', type: 'sensor', state: 'Clear' },

  // Climate & Energy
  { id: 'sensor.home_power', name: 'Whole Home Power', area: 'Energy', type: 'sensor', state: '468 W', attributes: { unit_of_measurement: 'W' } },
  { id: 'sensor.indoor_air', name: 'Indoor Air Quality (AQI)', area: 'Sensors', type: 'sensor', state: '18 (Good)' },
];

export const HomeAssistantView: React.FC<HomeAssistantViewProps> = ({
  config,
  onOpenSettings,
  onUpdateConfig,
}) => {
  const ha = config.homeAssistant || {
    enabled: true,
    ipAddress: '192.168.1.100',
    port: 8123,
    useHttps: false,
    customPath: '/lovelace',
    kioskMode: false,
    accessToken: '',
    viewMode: 'embed',
  };

  const [ipAddress, setIpAddress] = useState<string>(ha.ipAddress || '192.168.1.100');
  const [port, setPort] = useState<number>(ha.port || 8123);
  const [useHttps, setUseHttps] = useState<boolean>(ha.useHttps || false);
  const [customPath, setCustomPath] = useState<string>(ha.customPath || '/lovelace');
  const [kioskMode, setKioskMode] = useState<boolean>(ha.kioskMode ?? false);
  const [viewMode, setViewMode] = useState<'embed' | 'cards' | 'split'>(ha.viewMode || 'embed');

  const [iframeKey, setIframeKey] = useState<number>(1);
  const [iframeLoading, setIframeLoading] = useState<boolean>(true);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // Connection testing state
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    reachable: boolean;
    message: string;
    serverUrl?: string;
  } | null>(null);

  // Native devices state for touch controls
  const [devices, setDevices] = useState<DeviceEntity[]>(DEFAULT_DEVICES);
  const [selectedArea, setSelectedArea] = useState<string>('All');
  const [quickStatus, setQuickStatus] = useState<string | null>(null);

  // Keep local form in sync if external config changes
  useEffect(() => {
    if (config.homeAssistant) {
      setIpAddress(config.homeAssistant.ipAddress || '192.168.1.100');
      setPort(config.homeAssistant.port || 8123);
      setUseHttps(config.homeAssistant.useHttps || false);
      setCustomPath(config.homeAssistant.customPath || '/lovelace');
      setKioskMode(config.homeAssistant.kioskMode ?? false);
      if (config.homeAssistant.viewMode) {
        setViewMode(config.homeAssistant.viewMode);
      }
    }
  }, [config.homeAssistant]);

  // Clean Hostname / IP using robust parser
  const parsedServer = parseHomeAssistantAddress(
    ipAddress || ha.ipAddress || '192.168.1.100',
    port || ha.port || 8123,
    useHttps,
    customPath || ha.customPath || '/lovelace'
  );

  const cleanHost = parsedServer.host;
  const protocol = parsedServer.protocol;
  const basePath = parsedServer.customPath.startsWith('/') ? parsedServer.customPath : `/${parsedServer.customPath}`;
  const querySeparator = basePath.includes('?') ? '&' : '?';
  const finalPath = kioskMode ? `${basePath}${querySeparator}kiosk` : basePath;
  const serverBaseUrl = parsedServer.apiUrl.replace(/\/api\/$/, '');
  const fullIframeUrl = `${serverBaseUrl}${finalPath}`;

  // Fetch live entities from Home Assistant if access token is available
  useEffect(() => {
    let isMounted = true;
    async function loadHaStates() {
      if (!ha.accessToken) return;
      try {
        const res = await fetch('/api/homeassistant/states');
        const data = await res.json();
        if (isMounted && data.ok && Array.isArray(data.states) && data.states.length > 0) {
          const validDomains = ['light', 'switch', 'climate', 'lock', 'sensor'];
          const mapped: DeviceEntity[] = data.states
            .filter((s: any) => {
              const dom = s.entity_id.split('.')[0];
              return validDomains.includes(dom);
            })
            .slice(0, 36)
            .map((s: any) => {
              const dom = s.entity_id.split('.')[0] as DeviceEntity['type'];
              return {
                id: s.entity_id,
                name: s.attributes?.friendly_name || s.entity_id,
                area: s.attributes?.area || (s.entity_id.includes('living') ? 'Living Room' : s.entity_id.includes('kitchen') ? 'Kitchen' : 'Home'),
                type: dom,
                state: s.state,
                attributes: s.attributes,
              };
            });
          if (mapped.length > 0) {
            setDevices(mapped);
          }
        }
      } catch {
        // Fallback to built-in device cards
      }
    }
    loadHaStates();
    return () => {
      isMounted = false;
    };
  }, [ha.accessToken, ha.ipAddress]);

  // Call Home Assistant service via proxy
  const callHaService = async (domain: string, service: string, serviceData: Record<string, any>) => {
    try {
      await fetch(`/api/homeassistant/services/${domain}/${service}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData),
      });
    } catch {
      // Non-blocking
    }
  };

  // Check connection status via backend
  const handleTestConnection = async (targetIp?: string, targetPort?: number, targetHttps?: boolean) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const p = parseHomeAssistantAddress(
        targetIp || ipAddress,
        targetPort || port,
        typeof targetHttps === 'boolean' ? targetHttps : useHttps,
        customPath
      );
      const res = await fetch('/api/homeassistant/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipAddress: p.host,
          port: p.port,
          useHttps: p.useHttps,
          customPath: p.customPath,
          accessToken: ha.accessToken,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        ok: false,
        reachable: false,
        message: `Client test error: ${err.message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Quick Save IP & Port directly from this view
  const handleQuickSave = async () => {
    if (!onUpdateConfig) return;
    const p = parseHomeAssistantAddress(ipAddress, port, useHttps, customPath);
    const updatedHaConfig: HomeAssistantConfig = {
      ...ha,
      ipAddress: p.host,
      port: p.port,
      useHttps: p.useHttps,
      customPath: p.customPath,
      kioskMode,
      viewMode,
    };
    const updatedAppConfig: AppConfig = {
      ...config,
      homeAssistant: updatedHaConfig,
    };
    await onUpdateConfig(updatedAppConfig);
    setShowConfigModal(false);
    setIframeKey((k) => k + 1);
    setQuickStatus('Home Assistant server settings saved!');
    setTimeout(() => setQuickStatus(null), 3000);
  };

  // Copy full URL to clipboard
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(fullIframeUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Reload iframe
  const handleReloadIframe = () => {
    setIframeLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  // Native device interactive handlers with live HA service integration
  const handleToggleLight = (id: string) => {
    const dev = devices.find((d) => d.id === id);
    const newState = dev?.state === 'on' ? 'off' : 'on';
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, state: newState } : d))
    );
    const domain = id.split('.')[0] || 'light';
    const service = newState === 'on' ? 'turn_on' : 'turn_off';
    callHaService(domain, service, { entity_id: id });
  };

  const handleAdjustBrightness = (id: string, brightness: number) => {
    setDevices((prev) =>
      prev.map((dev) =>
        dev.id === id
          ? {
              ...dev,
              state: brightness > 0 ? 'on' : 'off',
              attributes: { ...dev.attributes, brightness },
            }
          : dev
      )
    );
    callHaService('light', 'turn_on', {
      entity_id: id,
      brightness_pct: brightness,
    });
  };

  const handleAdjustClimateTemp = (id: string, delta: number) => {
    setDevices((prev) =>
      prev.map((dev) => {
        if (dev.id === id && dev.attributes) {
          const currentTarget = dev.attributes.temperature || 20;
          const newTemp = Math.round((currentTarget + delta) * 10) / 10;
          callHaService('climate', 'set_temperature', {
            entity_id: id,
            temperature: newTemp,
          });
          return {
            ...dev,
            attributes: { ...dev.attributes, temperature: newTemp },
          };
        }
        return dev;
      })
    );
  };

  const handleToggleLock = (id: string) => {
    const dev = devices.find((d) => d.id === id);
    const isLocked = dev?.state === 'locked';
    const newState = isLocked ? 'unlocked' : 'locked';
    setDevices((prev) =>
      prev.map((dev) =>
        dev.id === id
          ? { ...dev, state: newState }
          : dev
      )
    );
    callHaService('lock', isLocked ? 'unlock' : 'lock', { entity_id: id });
  };

  const handleTriggerScene = (sceneName: string) => {
    setQuickStatus(`Triggered scene: "${sceneName}"`);
    setTimeout(() => setQuickStatus(null), 3000);
    if (sceneName === 'All Off') {
      setDevices((prev) =>
        prev.map((d) => (d.type === 'light' || d.type === 'switch' ? { ...d, state: 'off' } : d))
      );
    } else if (sceneName === 'Good Morning') {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === 'light.kitchen_spots' || d.id === 'switch.coffee_maker'
            ? { ...d, state: 'on' }
            : d
        )
      );
    } else if (sceneName === 'Movie Night') {
      setDevices((prev) =>
        prev.map((d) => {
          if (d.id === 'light.living_room_ceiling') return { ...d, state: 'off' };
          if (d.id === 'light.accent_strip') return { ...d, state: 'on', attributes: { ...d.attributes, brightness: 40 } };
          if (d.id === 'switch.media_console') return { ...d, state: 'on' };
          return d;
        })
      );
    }
  };

  // Filtered devices
  const areas = ['All', 'Living Room', 'Kitchen', 'Bedroom', 'Hallway', 'Energy'];
  const filteredDevices =
    selectedArea === 'All'
      ? devices
      : devices.filter((d) => d.area === selectedArea || (selectedArea === 'Energy' && d.type === 'sensor'));

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: Home Assistant Logo & Target Server IP Badge */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10.5L12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-9z" />
              <path d="M9 21v-7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7" />
              <circle cx="12" cy="8.5" r="1.2" fill="currentColor" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Home Assistant
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Lovelace
              </span>
            </div>

            {/* Configured Server IP display */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="inline-flex items-center gap-1.5 font-mono text-cyan-300 font-medium">
                <Wifi className="w-3 h-3 text-cyan-400" />
                {serverBaseUrl}
              </span>
              <button
                onClick={handleCopyUrl}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                title="Copy Full Server URL"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Center: View Mode Toggle */}
        <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 text-xs font-semibold">
          <button
            onClick={() => setViewMode('embed')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'embed'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>🌐 Embedded Dashboard</span>
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'cards'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Touch Controls</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`hidden md:flex px-3 py-1.5 rounded-lg transition-all items-center gap-1.5 ${
              viewMode === 'split'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>
        </div>

        {/* Right: Quick Actions & Settings Trigger */}
        <div className="flex items-center gap-2">
          {viewMode !== 'cards' && (
            <button
              onClick={handleReloadIframe}
              className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all flex items-center gap-1.5 border border-slate-700/60"
              title="Reload Home Assistant iframe"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${iframeLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">Reload</span>
            </button>
          )}

          <a
            href={fullIframeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 rounded-lg transition-all flex items-center gap-1.5 border border-cyan-800/60 font-medium"
            title="Open Home Assistant in a new browser tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Server</span>
          </a>

          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all flex items-center gap-1.5 border border-slate-700 font-semibold"
            title="Edit Server IP & Port"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span>Server IP</span>
          </button>
        </div>
      </header>

      {/* Quick Status Pill */}
      {quickStatus && (
        <div className="bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs px-4 py-2 text-center font-medium flex items-center justify-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{quickStatus}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col">
        {/* VIEW 1: Embedded Dashboard (Lovelace Iframe) */}
        {(viewMode === 'embed' || viewMode === 'split') && (
          <div className={`w-full flex flex-col ${viewMode === 'split' ? 'md:grid md:grid-cols-2 flex-1' : 'flex-1'}`}>
            {/* Split View Left: Native Cards (if in split mode) */}
            {viewMode === 'split' && (
              <div className="border-r border-slate-800 p-4 overflow-y-auto max-h-[calc(100vh-140px)] bg-slate-950/80">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Quick Touch Controls
                  </h2>
                  <span className="text-[11px] text-slate-400">Tap cards to toggle</span>
                </div>
                {renderTouchCards()}
              </div>
            )}

            {/* Iframe View (Full or Right side of split) */}
            <div className="relative flex-1 w-full min-h-[680px] bg-slate-950 flex flex-col">
              {/* Lovelace Sub-navigation bar */}
              <div className="bg-slate-900 border-b border-slate-800/80 px-4 py-2 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                  {[
                    ...(ha.customPath && ha.customPath !== '/lovelace'
                      ? [{ label: `My Dashboard (${ha.customPath})`, path: ha.customPath }]
                      : []),
                    { label: 'Default (/lovelace)', path: '/lovelace' },
                    { label: 'Kiosk Mode', path: '/lovelace?kiosk' },
                    { label: 'Energy', path: '/energy' },
                    { label: 'Media', path: '/media-browser' },
                    { label: 'Settings', path: '/config' },
                  ].map((dash) => {
                    const isCurrent = customPath === dash.path || (dash.path.includes('kiosk') && kioskMode);
                    return (
                      <button
                        key={dash.path}
                        onClick={() => {
                          setCustomPath(dash.path.replace('?kiosk', ''));
                          setKioskMode(dash.path.includes('kiosk'));
                          setIframeKey((k) => k + 1);
                        }}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                          isCurrent
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {dash.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="text-slate-400 hover:text-cyan-300 flex items-center gap-1 text-[11px] shrink-0"
                  title="Troubleshooting tips for Home Assistant embedding"
                >
                  <Info className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Embed Guide</span>
                </button>
              </div>

              {/* Troubleshooting / X-Frame-Options Diagnostics Drawer */}
              {showDiagnostics && (
                <div className="bg-slate-900/95 border-b border-cyan-500/30 p-4 text-xs text-slate-300 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5 text-cyan-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Home Assistant Embedding Guide & Tips
                    </span>
                    <button
                      onClick={() => setShowDiagnostics(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    If your Home Assistant dashboard doesn't appear in the frame below, this is usually due to one of two security policies:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="font-semibold text-white flex items-center gap-1 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-cyan-400" />
                        1. Enable X-Frame Embedding in Home Assistant
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        Add this to your Home Assistant <code className="text-cyan-300 font-mono">configuration.yaml</code> and restart HA:
                      </p>
                      <pre className="bg-slate-900 p-2 rounded text-[10px] font-mono text-cyan-200 overflow-x-auto border border-slate-800">
{`http:
  use_x_frame_options: false
  cors_allowed_origins:
    - http://${window.location.host}`}
                      </pre>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="font-semibold text-white flex items-center gap-1 text-[11px]">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        2. Mixed-Content Security (HTTPS vs HTTP)
                      </div>
                      <p className="text-slate-400 text-[11px]">
                        When using this web preview over HTTPS, browsers block insecure HTTP LAN iframes.
                        On your Raspberry Pi or local device (where you run this kiosk over HTTP), local LAN embedding works seamlessly!
                      </p>
                      <div className="pt-1 flex gap-2">
                        <button
                          onClick={() => setViewMode('cards')}
                          className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium text-[11px]"
                        >
                          Switch to Touch Cards
                        </button>
                        <a
                          href={fullIframeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium text-[11px] inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open Direct URL
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* The Live Home Assistant Iframe */}
              <div className="relative flex-1 w-full h-[calc(100vh-175px)] min-h-[640px] bg-slate-950">
                <iframe
                  key={iframeKey}
                  src={fullIframeUrl}
                  title="Home Assistant Lovelace Dashboard"
                  className="w-full h-full border-0 bg-slate-950"
                  allow="fullscreen; autoplay; camera; microphone"
                  sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-downloads"
                  onLoad={() => setIframeLoading(false)}
                />

                {/* Subdued footer with direct link & fallback switch */}
                <div className="absolute bottom-2 right-3 z-10 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/70 text-[11px] text-slate-400 flex items-center gap-2 shadow-xl">
                  <span>Pointing to: <strong className="text-cyan-300 font-mono">{cleanHost}:{port}</strong></span>
                  <a
                    href={fullIframeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline font-semibold flex items-center gap-0.5"
                  >
                    Open New Window <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Native Touch Cards View */}
        {viewMode === 'cards' && (
          <div className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2.5">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                  Kiosk Smart Home Controls
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Touch-optimized device cards for smart lights, switches, climate and scenes pointing to Home Assistant ({cleanHost})
                </p>
              </div>

              {/* Area Filter Buttons */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                {areas.map((area) => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedArea === area
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Scenes Toolbar */}
            <div className="mb-6 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Quick Scenes:
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { name: 'Good Morning', icon: <Sun className="w-3.5 h-3.5 text-amber-400" /> },
                  { name: 'Movie Night', icon: <Tv className="w-3.5 h-3.5 text-indigo-400" /> },
                  { name: 'Relax / Ambient', icon: <Sparkles className="w-3.5 h-3.5 text-pink-400" /> },
                  { name: 'All Off', icon: <Power className="w-3.5 h-3.5 text-red-400" /> },
                ].map((sc) => (
                  <button
                    key={sc.name}
                    onClick={() => handleTriggerScene(sc.name)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all border border-slate-700 flex items-center gap-1.5 shadow-sm"
                  >
                    {sc.icon}
                    <span>{sc.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Devices Grid */}
            {renderTouchCards()}
          </div>
        )}
      </div>

      {/* MODAL: Quick Home Assistant Server IP & Port Settings */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-500/30">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Home Assistant Server Setup</h3>
                  <p className="text-xs text-slate-400">Configure your Home Assistant IP address & port</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Server IP / Hostname */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Home Assistant IP Address or Hostname <span className="text-cyan-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={ipAddress}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.includes('://') || val.includes(':') || val.includes('/')) {
                        const p = parseHomeAssistantAddress(val, port, useHttps, customPath);
                        setIpAddress(p.host);
                        setPort(p.port);
                        setUseHttps(p.useHttps);
                        setCustomPath(p.customPath);
                      } else {
                        setIpAddress(val);
                      }
                    }}
                    placeholder="e.g. 192.168.7.236 or homeassistant.local"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter the local network IP of your Home Assistant server (e.g. 192.168.7.236). Full URLs or Nabu Casa addresses auto-format automatically.
                </p>
              </div>

              {/* Port & Protocol */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Port</label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value, 10) || 8123)}
                    placeholder="8123"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Default is 8123</p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Protocol</label>
                  <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setUseHttps(false)}
                      className={`flex-1 py-1.5 rounded-lg text-center font-semibold text-xs transition-colors ${
                        !useHttps ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      HTTP
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseHttps(true)}
                      className={`flex-1 py-1.5 rounded-lg text-center font-semibold text-xs transition-colors ${
                        useHttps ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      HTTPS
                    </button>
                  </div>
                </div>
              </div>

              {/* Dashboard Path & Kiosk Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Dashboard Path</label>
                  <input
                    type="text"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder="/lovelace"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                    <input
                      type="checkbox"
                      checked={kioskMode}
                      onChange={(e) => setKioskMode(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-600 text-cyan-500 focus:ring-0"
                    />
                    <span className="text-slate-300 font-medium text-xs">Append ?kiosk</span>
                  </label>
                </div>
              </div>

              {/* Test Connection Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleTestConnection()}
                  disabled={isTesting}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl font-semibold border border-slate-700 flex items-center justify-center gap-2 transition-colors"
                >
                  <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing connection to server...' : 'Test Server Connectivity'}</span>
                </button>

                {testResult && (
                  <div
                    className={`mt-2.5 p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                      testResult.ok
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    }`}
                  >
                    {testResult.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold">{testResult.message}</span>
                        {(testResult as any).status === 'lan_verified' && (
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            LAN Verified
                          </span>
                        )}
                      </div>
                      {testResult.serverUrl && (
                        <div className="text-[10px] text-slate-400 font-mono">Target: {testResult.serverUrl}</div>
                      )}
                      {(testResult as any).status === 'lan_verified' && (
                        <div className="text-[10px] text-slate-300 pt-0.5">
                          Direct browser connection works! When deployed to your local kiosk, connection is instant.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-5 border-t border-slate-800 mt-5">
              <button
                type="button"
                onClick={onOpenSettings}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
              >
                Full Settings Dashboard <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleQuickSave}
                  className="px-5 py-2 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper renderer for interactive touch cards
  function renderTouchCards() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDevices.map((device) => {
          const isLight = device.type === 'light';
          const isSwitch = device.type === 'switch';
          const isClimate = device.type === 'climate';
          const isSensor = device.type === 'sensor';
          const isLock = device.type === 'lock';
          const isOn = device.state === 'on' || device.state === 'heat';
          const isLocked = device.state === 'locked';

          return (
            <div
              key={device.id}
              className={`p-4 rounded-2xl border transition-all select-none shadow-sm flex flex-col justify-between ${
                isOn || isLocked
                  ? 'bg-slate-900/90 border-cyan-500/40 shadow-cyan-500/5'
                  : 'bg-slate-900/40 border-slate-800/80 text-slate-400'
              }`}
            >
              {/* Card Header: Icon & Area & State pill */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    onClick={() => {
                      if (isLight || isSwitch) handleToggleLight(device.id);
                      if (isLock) handleToggleLock(device.id);
                    }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-transform active:scale-90 ${
                      isOn
                        ? 'bg-gradient-to-tr from-cyan-500 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
                        : isLocked
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isLight && <Sun className="w-5 h-5" />}
                    {isSwitch && <Power className="w-5 h-5" />}
                    {isClimate && <Thermometer className="w-5 h-5" />}
                    {isLock && (isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />)}
                    {isSensor && (
                      device.name.includes('Power') ? (
                        <Zap className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Activity className="w-5 h-5 text-cyan-400" />
                      )
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{device.name}</h3>
                    <span className="text-[11px] text-slate-400 font-medium">{device.area}</span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0">
                  {isLight || isSwitch ? (
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase ${
                        isOn ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {device.state}
                    </span>
                  ) : isLock ? (
                    <span
                      className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase ${
                        isLocked ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {device.state}
                    </span>
                  ) : isSensor ? (
                    <span className="text-xs font-mono font-bold text-cyan-300 bg-slate-800 px-2.5 py-1 rounded-lg">
                      {device.state}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Card Body: Interactive controls depending on entity type */}
              {isLight && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Brightness</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {device.attributes?.brightness || (isOn ? 100 : 0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isOn ? device.attributes?.brightness || 100 : 0}
                    onChange={(e) => handleAdjustBrightness(device.id, parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => handleToggleLight(device.id)}
                      className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isOn
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      }`}
                    >
                      {isOn ? 'Turn Off' : 'Turn On'}
                    </button>
                  </div>
                </div>
              )}

              {isSwitch && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {device.attributes?.current_power_w !== undefined && (
                      <span className="font-mono text-cyan-300 font-bold">
                        {isOn ? `${device.attributes.current_power_w} W` : '0 W'}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => handleToggleLight(device.id)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isOn
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                    }`}
                  >
                    {isOn ? 'Turn Off' : 'Turn On'}
                  </button>
                </div>
              )}

              {isClimate && device.attributes && (
                <div className="mt-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current</span>
                    <span className="font-mono text-sm font-bold text-white">
                      {device.attributes.current_temperature}°C
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Target</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAdjustClimateTemp(device.id, -0.5)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-sm"
                      >
                        -
                      </button>
                      <span className="font-mono text-base font-extrabold text-cyan-300 min-w-[50px] text-center">
                        {device.attributes.temperature}°C
                      </span>
                      <button
                        onClick={() => handleAdjustClimateTemp(device.id, 0.5)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isLock && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {isLocked ? 'Door is securely locked' : 'Door is currently unlocked'}
                  </span>
                  <button
                    onClick={() => handleToggleLock(device.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isLocked
                        ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {isLocked ? 'Unlock' : 'Lock'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
};
