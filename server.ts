import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec, spawn, execSync } from 'child_process';
import { promisify } from 'util';
import ical from 'node-ical';
import Parser from 'rss-parser';
import { DEFAULT_CONFIG, DEFAULT_ICLOUD_SAMPLE_PHOTOS } from './src/constants/defaultConfig.js';
import { APP_VERSION } from './src/constants/version.js';
import { AppConfig, CalendarFeed, CalendarEvent, WeatherData, WeatherAlert, NewsItem, SystemInfo, ICloudPhoto, HourlyPoint, DetailedDailyForecast } from './src/types/config.js';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';
const execAsync = promisify(exec);

// Resolve persistent config storage outside the Git repository (~/.luminahome)
function resolveConfigFilePath(): string {
  const customDir = process.env.LUMINA_CONFIG_DIR;
  if (customDir) {
    if (!fs.existsSync(customDir)) fs.mkdirSync(customDir, { recursive: true });
    return path.join(customDir, 'config.json');
  }

  try {
    const homeDir = os.homedir();
    const primaryDir = path.join(homeDir, '.luminahome');
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }

    const primaryFile = path.join(primaryDir, 'config.json');
    const legacyFile = path.resolve(process.cwd(), 'data', 'config.json');

    // Auto-migrate from legacy ./data/config.json if primary file does not exist yet
    if (!fs.existsSync(primaryFile) && fs.existsSync(legacyFile)) {
      try {
        fs.copyFileSync(legacyFile, primaryFile);
        console.log(`[Config] Migrated legacy configuration from ${legacyFile} to ${primaryFile}`);
      } catch (err: any) {
        console.warn(`[Config] Migration warning: ${err.message}`);
      }
    }

    return primaryFile;
  } catch (err: any) {
    console.warn(`[Config] Home directory inaccessible (${err.message}). Using local ./data fallback.`);
    const fallbackDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });
    return path.join(fallbackDir, 'config.json');
  }
}

const CONFIG_FILE = resolveConfigFilePath();
// Load or initialize config
function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      // Merge with default to ensure any missing fields are populated
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        general: { ...DEFAULT_CONFIG.general, ...(parsed.general || {}) },
        layout: { 
          ...DEFAULT_CONFIG.layout, 
          widgetZones: { ...DEFAULT_CONFIG.layout.widgetZones, ...(parsed.layout?.widgetZones || {}) }
        },
        clock: { ...DEFAULT_CONFIG.clock, ...(parsed.clock || {}) },
        weather: { ...DEFAULT_CONFIG.weather, ...(parsed.weather || {}) },
        calendar: { ...DEFAULT_CONFIG.calendar, ...(parsed.calendar || {}) },
        news: { ...DEFAULT_CONFIG.news, ...(parsed.news || {}) },
        countdown: {
          ...DEFAULT_CONFIG.countdown,
          ...(parsed.countdown || {}),
          items: (parsed.countdown?.items && Array.isArray(parsed.countdown.items))
            ? parsed.countdown.items
            : (DEFAULT_CONFIG.countdown.items || []),
        },
        notes: { ...DEFAULT_CONFIG.notes, ...(parsed.notes || {}) },
        briefing: { ...DEFAULT_CONFIG.briefing, ...(parsed.briefing || {}) },
        system: { ...DEFAULT_CONFIG.system, ...(parsed.system || {}) },
        screensaver: { ...DEFAULT_CONFIG.screensaver, ...(parsed.screensaver || {}) },
      };
    }
  } catch (err) {
    console.error('Error reading config file, falling back to defaults:', err);
  }
  
  saveConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

function saveConfig(config: AppConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save config:', err);
  }
}

// -------------------------------------------------------------
// Two-Way Local Calendar Events Storage (~/.luminahome/local_events.json)
// -------------------------------------------------------------
const LOCAL_EVENTS_FILE = path.join(path.dirname(CONFIG_FILE), 'local_events.json');

interface StoredLocalEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  color?: string;
  createdAt: string;
}

function loadLocalEvents(): StoredLocalEvent[] {
  try {
    if (fs.existsSync(LOCAL_EVENTS_FILE)) {
      const data = fs.readFileSync(LOCAL_EVENTS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err: any) {
    console.warn('[Calendar] Error reading local events:', err.message);
  }
  return [];
}

function saveLocalEvents(events: StoredLocalEvent[]): void {
  try {
    fs.writeFileSync(LOCAL_EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
  } catch (err: any) {
    console.error('[Calendar] Failed to save local events:', err.message);
  }
}

// -------------------------------------------------------------
// Persistent Multi-iCal Disk & Memory Cache (~/.luminahome/calendar_cache.json)
// Defends against Apple iCloud morning peak rate limits (HTTP 503) and ensures
// the wall display never shows a blank schedule even when upstream services are down.
// -------------------------------------------------------------
const CALENDAR_CACHE_FILE = path.join(path.dirname(CONFIG_FILE), 'calendar_cache.json');

interface FeedCacheEntry {
  feedId: string;
  url: string;
  timestamp: number;
  etag?: string;
  lastModified?: string;
  events: CalendarEvent[];
  eventCount: number;
}

let calendarMemoryCache: Record<string, FeedCacheEntry> = {};

function loadCalendarCache(): Record<string, FeedCacheEntry> {
  try {
    if (fs.existsSync(CALENDAR_CACHE_FILE)) {
      const data = fs.readFileSync(CALENDAR_CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        const count = Object.keys(parsed).length;
        console.log(`[Calendar Cache] Loaded ${count} cached feeds from ${CALENDAR_CACHE_FILE}`);
        return parsed;
      }
    }
  } catch (err: any) {
    console.warn('[Calendar Cache] Failed to load disk cache:', err.message);
  }
  return {};
}

function saveCalendarCache(cache: Record<string, FeedCacheEntry>): void {
  try {
    fs.writeFileSync(CALENDAR_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[Calendar Cache] Failed to save disk cache:', err.message);
  }
}

// Initialize on boot
calendarMemoryCache = loadCalendarCache();

function getAllCachedCalendarEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const entry of Object.values(calendarMemoryCache)) {
    if (entry && Array.isArray(entry.events)) {
      events.push(...entry.events);
    }
  }
  return events;
}

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

let cachedBriefing: { data: BriefingData; timestamp: number } | null = null;
const BRIEFING_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes fresh

// Middleware
app.use(express.json());

// Helper: Get local network IPs
function getLocalNetworkIps() {
  const interfaces = os.networkInterfaces();
  const addresses: Array<{ name: string; address: string; family: string }> = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({
          name,
          address: net.address,
          family: net.family,
        });
      }
    }
  }

  return addresses;
}

// Map WMO Weather Codes to Human Conditions & Icon Names
function interpretWmoCode(code: number): { condition: string; icon: string } {
  switch (code) {
    case 0:
      return { condition: 'Clear Sky', icon: 'sun' };
    case 1:
      return { condition: 'Mainly Clear', icon: 'sun-dim' };
    case 2:
      return { condition: 'Partly Cloudy', icon: 'cloud-sun' };
    case 3:
      return { condition: 'Overcast', icon: 'cloud' };
    case 45:
    case 48:
      return { condition: 'Fog & Mist', icon: 'cloud-fog' };
    case 51:
    case 53:
    case 55:
      return { condition: 'Drizzle', icon: 'cloud-drizzle' };
    case 56:
    case 57:
      return { condition: 'Freezing Drizzle', icon: 'cloud-snow' };
    case 61:
    case 63:
    case 65:
      return { condition: 'Rain', icon: 'cloud-rain' };
    case 66:
    case 67:
      return { condition: 'Freezing Rain', icon: 'cloud-snow' };
    case 71:
    case 73:
    case 75:
      return { condition: 'Snow Fall', icon: 'snowflake' };
    case 77:
      return { condition: 'Snow Grains', icon: 'snowflake' };
    case 80:
    case 81:
    case 82:
      return { condition: 'Rain Showers', icon: 'cloud-rain' };
    case 85:
    case 86:
      return { condition: 'Snow Showers', icon: 'cloud-snow' };
    case 95:
      return { condition: 'Thunderstorm', icon: 'cloud-lightning' };
    case 96:
    case 99:
      return { condition: 'Thunderstorm with Hail', icon: 'cloud-lightning' };
    default:
      return { condition: 'Partly Cloudy', icon: 'cloud-sun' };
  }
}

function detectWeatherAlerts(
  cityName: string,
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  },
  daily: {
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max?: number[];
  },
  units: string,
  forceTestAlert?: boolean
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  // 1. If test alert is requested or enabled in config for preview/testing
  if (forceTestAlert) {
    alerts.push({
      id: 'alert-met-office-rain',
      event: 'Yellow Warning: Heavy Rain & Local Flooding',
      headline: 'Met Office Weather Warning for Strathclyde',
      severity: 'warning',
      description: 'Persistent heavy rainfall and gusty winds may lead to difficult travel conditions and localized surface flooding across the region.',
      instruction: 'Allow extra travel time. Check transport schedules and secure loose outdoor items.',
      source: 'Met Office',
      effective: 'Active Now',
      expires: 'Today at 21:00',
      color: 'amber',
    });
    return alerts;
  }

  // 2. Severe WMO Weather Codes
  const code = current.weather_code;
  if ([95, 96, 99].includes(code)) {
    alerts.push({
      id: `alert-storm-${code}`,
      event: 'Thunderstorm & Lightning Warning',
      headline: 'Severe Thunderstorm Activity',
      severity: 'extreme',
      description: 'Severe thunderstorms with frequent cloud-to-ground lightning, localized downpours, and potential hail reported.',
      instruction: 'Stay indoors away from windows and unplug sensitive electronics.',
      source: 'Met Office / National Weather Service',
      effective: 'Active Now',
      expires: 'Until storm cell passes',
      color: 'red',
    });
  } else if ([65, 82].includes(code)) {
    alerts.push({
      id: `alert-heavy-rain-${code}`,
      event: 'Heavy Rain & Surface Flood Alert',
      headline: 'Torrential Rainfall & Standing Water',
      severity: 'warning',
      description: 'Persistent heavy downpours leading to spray on roadways and localized water accumulation.',
      instruction: 'Drive with caution and reduce speed on wet roads.',
      source: 'Met Office',
      effective: 'Active Now',
      expires: 'Until rain moderates',
      color: 'amber',
    });
  } else if ([66, 67].includes(code)) {
    alerts.push({
      id: `alert-freezing-rain-${code}`,
      event: 'Freezing Rain & Glaze Ice Hazard',
      headline: 'Black Ice & Freezing Precipitation',
      severity: 'extreme',
      description: 'Rain is freezing upon contact with untreated surfaces creating dangerous black ice.',
      instruction: 'Avoid non-essential travel; walk with extreme caution.',
      source: 'Highways & Meteorological Agency',
      effective: 'Active Now',
      expires: 'Until ground temperatures rise',
      color: 'red',
    });
  } else if ([75, 86].includes(code)) {
    alerts.push({
      id: `alert-snow-${code}`,
      event: 'Heavy Snow & Blizzard Warning',
      headline: 'Accumulating Snowfall & Low Visibility',
      severity: 'warning',
      description: 'Heavy snow bands reducing visibility and creating hazardous driving conditions.',
      instruction: 'Keep emergency supplies handy and salt pedestrian walkways.',
      source: 'National Meteorological Service',
      effective: 'Active Now',
      expires: 'Overnight',
      color: 'amber',
    });
  }

  // 3. High Wind / Gale warnings
  const windKmh = units === 'imperial' ? current.wind_speed_10m * 1.60934 : current.wind_speed_10m;
  if (windKmh >= 55) {
    alerts.push({
      id: 'alert-gale-wind',
      event: 'Severe Gale Force Wind Warning',
      headline: `Damaging Winds of ${Math.round(current.wind_speed_10m)} ${units === 'imperial' ? 'mph' : 'km/h'}`,
      severity: 'extreme',
      description: 'Extremely strong wind gusts capable of causing structural damage, flying debris, and transport delays.',
      instruction: 'Secure outdoor furniture, trampolines, and garden bins.',
      source: 'Met Office',
      effective: 'Active Now',
      expires: 'Until wind speeds subside',
      color: 'red',
    });
  } else if (windKmh >= 40) {
    alerts.push({
      id: 'alert-high-wind',
      event: 'High Wind Advisory',
      headline: `Brisk Wind Gusts up to ${Math.round(current.wind_speed_10m)} ${units === 'imperial' ? 'mph' : 'km/h'}`,
      severity: 'advisory',
      description: 'Strong sustained winds and gusts across open and elevated areas.',
      instruction: 'Take extra care when driving high-sided vehicles.',
      source: 'Local Weather Service',
      effective: 'Active Now',
      expires: 'This evening',
      color: 'amber',
    });
  }

  // 4. Sub-zero Frost / Freezing conditions
  const todayMin = daily.temperature_2m_min && daily.temperature_2m_min[0] !== undefined ? daily.temperature_2m_min[0] : 10;
  const minCelsius = units === 'imperial' ? (todayMin - 32) * (5 / 9) : todayMin;
  if (minCelsius <= -1 && alerts.length === 0) {
    alerts.push({
      id: 'alert-frost',
      event: 'Frost & Freeze Warning',
      headline: 'Sub-Zero Temperatures Overnight',
      severity: 'advisory',
      description: `Temperatures dipping down to ${Math.round(todayMin)}° with widespread overnight frost and risk of black ice.`,
      instruction: 'Protect outdoor garden plants and insulate exposed water pipes.',
      source: 'Met Office',
      effective: 'Overnight through morning',
      expires: '09:00 AM tomorrow',
      color: 'amber',
    });
  }

  // 5. Forecast High Precipitation Chance
  const maxPrecip = daily.precipitation_probability_max ? daily.precipitation_probability_max[0] || 0 : 0;
  if (maxPrecip >= 80 && (current.weather_code >= 61 || (daily.weather_code && daily.weather_code[0] >= 61)) && alerts.length === 0) {
    alerts.push({
      id: 'alert-high-precip',
      event: 'High Precipitation & Rain Warning',
      headline: `${maxPrecip}% Probability of Persistent Rainfall`,
      severity: 'warning',
      description: 'Heavy precipitation expected throughout today with elevated localized flooding risk.',
      instruction: 'Carry waterproof gear and anticipate roadway delays.',
      source: 'Met Office / Flood Alert Network',
      effective: 'Today',
      expires: 'Tonight',
      color: 'amber',
    });
  }

  return alerts;
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Application Version & Build Info Endpoint (reads automated version.json)
app.get(['/api/version', '/version.json'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const versionPath = path.resolve(process.cwd(), 'version.json');
    if (fs.existsSync(versionPath)) {
      const data = fs.readFileSync(versionPath, 'utf-8');
      res.json(JSON.parse(data));
      return;
    }
  } catch (err: any) {
    console.warn('[Version] Error reading version.json:', err.message);
  }

  res.json({
    appName: 'Lumina Home',
    version: APP_VERSION,
    versionTag: `v${APP_VERSION}`,
    buildNumber: 1,
    buildTime: new Date().toISOString(),
    gitCommit: 'latest',
    gitBranch: 'main',
    nodeVersion: process.version,
    releaseNotes: [],
  });
});

// 1. Health Heartbeat
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    node: process.version,
  });
});

// 2. Configuration Read / Write
app.get('/api/config', (_req: Request, res: Response) => {
  const config = loadConfig();
  res.json(config);
});

app.post('/api/config', (req: Request, res: Response) => {
  try {
    const updated = req.body as AppConfig;
    if (!updated || typeof updated !== 'object') {
      res.status(400).json({ error: 'Invalid configuration payload' });
      return;
    }
    saveConfig(updated);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save configuration' });
  }
});

app.post('/api/config/reset', (_req: Request, res: Response) => {
  saveConfig(DEFAULT_CONFIG);
  res.json({ success: true, config: DEFAULT_CONFIG });
});

// Helper: Resolve the Git remote origin URL and repository slug dynamically
async function getGitRemoteInfo(): Promise<{ repoUrl: string; repoSlug: string }> {
  try {
    const { stdout } = await execAsync('git config --get remote.origin.url');
    const raw = stdout.trim();
    if (!raw) {
      return { repoUrl: 'https://github.com/luminahome/luminahome', repoSlug: 'luminahome/luminahome' };
    }
    // Match https://github.com/owner/repo.git or git@github.com:owner/repo.git
    const match = raw.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (match) {
      const owner = match[1];
      const repo = match[2].replace(/\.git$/, '');
      const repoSlug = `${owner}/${repo}`;
      return {
        repoUrl: `https://github.com/${repoSlug}`,
        repoSlug,
      };
    }
    return { repoUrl: raw, repoSlug: raw };
  } catch {
    return { repoUrl: 'https://github.com/luminahome/luminahome', repoSlug: 'luminahome/luminahome' };
  }
}

// 3. System and Network Information
app.get('/api/system', async (_req: Request, res: Response) => {
  const ips = getLocalNetworkIps();
  const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';
  const freeMem = os.freemem();
  const totalMem = os.totalmem();

  // CPU Information
  const cpus = os.cpus() || [];
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'ARM Cortex Processor';
  const cpuCores = cpus.length;
  const loadAvg = os.loadavg().map((l) => Math.round(l * 100) / 100);

  // CPU Temperature (Raspberry Pi thermal zone or vcgencmd)
  let cpuTemp: number | null = null;
  try {
    if (fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
      const rawTemp = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8');
      const parsed = parseInt(rawTemp.trim(), 10);
      if (!isNaN(parsed) && parsed > 0) {
        cpuTemp = Math.round((parsed / 1000) * 10) / 10;
      }
    }
  } catch {
    cpuTemp = null;
  }

  // Disk Storage Info using fs.statfs
  let diskInfo: any = null;
  try {
    if (typeof (fs as any).statfsSync === 'function') {
      const stat = (fs as any).statfsSync(process.cwd());
      const totalBytes = Number(stat.bsize) * Number(stat.blocks);
      const freeBytes = Number(stat.bsize) * Number(stat.bfree);
      const usedBytes = totalBytes - freeBytes;
      if (totalBytes > 0) {
        diskInfo = {
          totalGb: Math.round((totalBytes / (1024 * 1024 * 1024)) * 10) / 10,
          freeGb: Math.round((freeBytes / (1024 * 1024 * 1024)) * 10) / 10,
          usedGb: Math.round((usedBytes / (1024 * 1024 * 1024)) * 10) / 10,
          usedPercentage: Math.round((usedBytes / totalBytes) * 100),
        };
      }
    }
  } catch {
    diskInfo = null;
  }

  const gitRemote = await getGitRemoteInfo();

  const info: SystemInfo = {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    uptimeSeconds: Math.floor(os.uptime()),
    nodeVersion: process.version,
    appVersion: `v${APP_VERSION}`,
    memoryMb: {
      free: Math.round(freeMem / (1024 * 1024)),
      total: Math.round(totalMem / (1024 * 1024)),
      used: Math.round((totalMem - freeMem) / (1024 * 1024)),
      usedPercentage: Math.round(((totalMem - freeMem) / totalMem) * 100),
    },
    cpu: {
      model: cpuModel,
      cores: cpuCores,
      loadAverage: loadAvg,
      temperatureCelsius: cpuTemp,
    },
    disk: diskInfo,
    networkInterfaces: ips,
    displayUrl: `http://${primaryIp}:${PORT}/display`,
    adminUrl: `http://${primaryIp}:${PORT}/admin`,
    serverTime: new Date().toISOString(),
    repoUrl: gitRemote.repoUrl,
    repoSlug: gitRemote.repoSlug,
  };

  res.json(info);
});

// Restart Lumina Home system service
app.post('/api/system/service/restart', (_req: Request, res: Response) => {
  res.json({ ok: true, message: 'Restarting Lumina Home system service...' });
  setTimeout(() => {
    try {
      exec('sudo systemctl restart luminahome || sudo systemctl restart kioskboard', () => {});
    } catch {
      process.exit(0);
    }
  }, 1000);
});

// Reboot Raspberry Pi Host OS
app.post('/api/system/reboot', (_req: Request, res: Response) => {
  res.json({ ok: true, message: 'Initiating Raspberry Pi reboot...' });
  setTimeout(() => {
    try {
      exec('sudo reboot', () => {});
    } catch {}
  }, 1000);
});

// Helper to normalize start and inclusive end for all-day events vs timed events
function formatEventDates(startRaw: Date, endRaw: Date, isAllDay: boolean): { startStr: string; endStr: string } {
  if (isAllDay) {
    // In iCalendar (RFC 5545), DTEND for all-day events (VALUE=DATE) is non-inclusive (exclusive),
    // meaning it specifies the day AFTER the event ends.
    // e.g. a 1-day event on Oct 14 has DTSTART: 20261014 and DTEND: 20261015.
    // A 7-day event Mon Oct 12 to Sun Oct 18 has DTSTART: 20261012 and DTEND: 20261019.
    // We adjust the end date by subtracting 1 day so that 'end' is the true inclusive final day.
    let inclusiveEnd = new Date(endRaw.getTime());
    if (endRaw.getTime() > startRaw.getTime()) {
      inclusiveEnd = new Date(endRaw.getTime() - 24 * 60 * 60 * 1000);
    }
    if (inclusiveEnd.getTime() < startRaw.getTime()) {
      inclusiveEnd = new Date(startRaw.getTime());
    }

    const useUTC = Boolean((startRaw as any)?.dateOnly || (startRaw.getUTCHours() === 0 && startRaw.getUTCMinutes() === 0));
    const sY = useUTC ? startRaw.getUTCFullYear() : startRaw.getFullYear();
    const sM = String((useUTC ? startRaw.getUTCMonth() : startRaw.getMonth()) + 1).padStart(2, '0');
    const sD = String(useUTC ? startRaw.getUTCDate() : startRaw.getDate()).padStart(2, '0');

    const eY = useUTC ? inclusiveEnd.getUTCFullYear() : inclusiveEnd.getFullYear();
    const eM = String((useUTC ? inclusiveEnd.getUTCMonth() : inclusiveEnd.getMonth()) + 1).padStart(2, '0');
    const eD = String(useUTC ? inclusiveEnd.getUTCDate() : inclusiveEnd.getDate()).padStart(2, '0');

    return {
      startStr: `${sY}-${sM}-${sD}T00:00:00`,
      endStr: `${eY}-${eM}-${eD}T23:59:59`,
    };
  }

  return {
    startStr: startRaw.toISOString(),
    endStr: endRaw.toISOString(),
  };
}

// Resilient calendar feed fetcher with Apple CalDAV compatibility headers,
// exponential backoff with jitter, Retry-After compliance, and 503 defense.
async function fetchCalendarFeedWithRetry(
  url: string,
  feedName = 'Calendar Feed',
  customHeaders: Record<string, string> = {},
  maxRetries = 3
): Promise<{ text: string; status: number; etag?: string; lastModified?: string }> {
  let cleanUrl = url.trim();
  if (cleanUrl.startsWith('webcal://')) {
    cleanUrl = 'https://' + cleanUrl.slice(9);
  }

  // Realistic macOS CalendarAgent headers to avoid Apple iCloud edge anti-bot 503s
  const reqHeaders: Record<string, string> = {
    'User-Agent': 'MacCalendar/16.0 (Macintosh; Intel Mac OS X 14.5) CalendarAgent/9.0',
    'Accept': 'text/calendar, text/x-vcalendar, text/plain;q=0.8, */*;q=0.5',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    ...customHeaders,
  };

  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const response = await fetch(cleanUrl, {
        headers: reqHeaders,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const text = await response.text();
        const etag = response.headers.get('etag') || undefined;
        const lastModified = response.headers.get('last-modified') || undefined;
        return { text, status: response.status, etag, lastModified };
      }

      if (response.status === 304) {
        return { text: '', status: 304 };
      }

      // Handle transient upstream overload (HTTP 503, 429, 502, 504)
      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < maxRetries) {
        let delayMs = 1500 * Math.pow(2, attempt) + Math.random() * 800;
        const retryAfter = response.headers.get('retry-after');
        if (retryAfter) {
          const parsed = parseInt(retryAfter, 10);
          if (!isNaN(parsed) && parsed > 0 && parsed <= 10) {
            delayMs = parsed * 1000 + 300;
          }
        }
        console.warn(`[Calendar] Feed [${feedName}] returned HTTP ${response.status}. Retrying in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = 1500 * Math.pow(2, attempt) + Math.random() * 800;
        console.warn(`[Calendar] Feed [${feedName}] fetch error (${err.message}). Retrying in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
    }
  }

  throw lastError || new Error(`Feed fetch failed after ${maxRetries} retries`);
}

// Parse raw iCal text into normalized CalendarEvent models
function parseIcsToEvents(
  rawIcs: string,
  feed: { id: string; name: string; color?: string },
  pastCutoff: Date,
  futureCutoff: Date
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const parsedData = ical.parseICS(rawIcs);

  for (const key of Object.keys(parsedData)) {
    const item: any = parsedData[key];
    if (!item || item.type !== 'VEVENT') continue;

    // 1. Recurring Event with RRULE: expand into individual occurrences
    if (item.rrule) {
      try {
        const instances = (ical as any).expandRecurringEvent(item, {
          from: pastCutoff,
          to: futureCutoff,
        });

        for (const inst of instances) {
          const start = inst.start ? new Date(inst.start) : null;
          if (!start || isNaN(start.getTime())) continue;

          let end = inst.end ? new Date(inst.end) : new Date(start.getTime() + 60 * 60 * 1000);
          if (isNaN(end.getTime())) end = start;

          const isAllDay = Boolean(
            inst.isFullDay ||
            item.datetype === 'date' ||
            (item.start && (item.start as any).dateOnly) ||
            (inst.start && (inst.start as any).dateOnly) ||
            (start.getUTCHours() === 0 && start.getUTCMinutes() === 0 && end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && (end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000))
          );

          const { startStr, endStr } = formatEventDates(start, end, isAllDay);

          events.push({
            id: `${feed.id}-${inst.event?.uid || item.uid || key}-${start.getTime()}`,
            title: String(inst.summary || item.summary || 'Untitled Event'),
            start: startStr,
            end: endStr,
            allDay: isAllDay,
            location: inst.location ? String(inst.location) : (item.location ? String(item.location) : undefined),
            description: inst.description ? String(inst.description) : (item.description ? String(item.description) : undefined),
            calendarId: feed.id,
            calendarName: feed.name,
            color: feed.color || '#38bdf8',
          });
        }
      } catch (recurErr: any) {
        console.warn(`Error expanding recurring event [${item.summary}]:`, recurErr.message);
      }
    } else {
      // 2. Standard Non-recurring Event
      const start = item.start ? new Date(item.start) : null;
      if (!start || isNaN(start.getTime())) continue;

      let end = item.end ? new Date(item.end) : new Date(start.getTime() + 60 * 60 * 1000);
      if (isNaN(end.getTime())) end = start;

      // Check window
      if (end < pastCutoff || start > futureCutoff) {
        continue;
      }

      const isAllDay = Boolean(
        (item.datetype === 'date') ||
        (item.start && (item.start as any).dateOnly) ||
        (start.getUTCHours() === 0 && start.getUTCMinutes() === 0 && end.getUTCHours() === 0 && end.getUTCMinutes() === 0 && (end.getTime() - start.getTime() >= 24 * 60 * 60 * 1000))
      );

      const { startStr, endStr } = formatEventDates(start, end, isAllDay);

      events.push({
        id: `${feed.id}-${item.uid || key}`,
        title: String(item.summary || 'Untitled Event'),
        start: startStr,
        end: endStr,
        allDay: isAllDay,
        location: item.location ? String(item.location) : undefined,
        description: item.description ? String(item.description) : undefined,
        calendarId: feed.id,
        calendarName: feed.name,
        color: feed.color || '#38bdf8',
      });
    }
  }

  return events;
}

const CALENDAR_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes fresh

// 4. Universal Calendar (Multi-iCal Fetch & Parse with Stale-While-Revalidate Protection)
app.get('/api/calendar', async (req: Request, res: Response) => {
  const config = loadConfig();
  const feeds = config.calendar.feeds.filter(f => f.enabled && f.url && f.url.trim().length > 0);
  const forceRefresh = req.query.force === 'true';
  const now = Date.now();

  const pastCutoff = new Date(now - 365 * 24 * 60 * 60 * 1000); // 365 days in past (1 year back for Year View)
  const futureCutoff = new Date(now + 365 * 24 * 60 * 60 * 1000); // 365 days in future (1 year forward for Year View)

  const allEvents: CalendarEvent[] = [];
  const feedResults: Array<{ id: string; name: string; count: number; cached?: boolean; error?: string }> = [];

  // Check if all enabled feeds are fresh in memory cache
  const allFeedsFresh = !forceRefresh && feeds.length > 0 && feeds.every(feed => {
    const cached = calendarMemoryCache[feed.id];
    return cached && (now - cached.timestamp < CALENDAR_CACHE_TTL_MS) && Array.isArray(cached.events);
  });

  if (allFeedsFresh) {
    // Fast path: serve completely from cache in <5ms without hammering upstream Apple/iCal servers
    for (const feed of feeds) {
      const cached = calendarMemoryCache[feed.id];
      if (cached) {
        allEvents.push(...cached.events);
        feedResults.push({ id: feed.id, name: feed.name, count: cached.events.length, cached: true });
      }
    }
  } else {
    // Revalidation path: query feeds with staggering and retry
    let feedIndex = 0;
    for (const feed of feeds) {
      let cleanUrl = feed.url.trim();
      if (cleanUrl.startsWith('webcal://')) {
        cleanUrl = 'https://' + cleanUrl.slice(9);
      }

      const cached = calendarMemoryCache[feed.id];
      const isFeedFresh = !forceRefresh && cached && (now - cached.timestamp < CALENDAR_CACHE_TTL_MS);

      if (isFeedFresh) {
        allEvents.push(...cached.events);
        feedResults.push({ id: feed.id, name: feed.name, count: cached.events.length, cached: true });
        continue;
      }

      // Small polite inter-request delay (350-500ms) to prevent triggering Apple's burst rate limiter
      if (feedIndex > 0) {
        await new Promise((r) => setTimeout(r, 350 + Math.random() * 150));
      }
      feedIndex++;

      const conditionalHeaders: Record<string, string> = {};
      if (cached?.etag) conditionalHeaders['If-None-Match'] = cached.etag;
      if (cached?.lastModified) conditionalHeaders['If-Modified-Since'] = cached.lastModified;

      try {
        const { text, status, etag, lastModified } = await fetchCalendarFeedWithRetry(cleanUrl, feed.name, conditionalHeaders, 2);

        if (status === 304 && cached) {
          // Upstream returned 304 Not Modified -> refresh timestamp and reuse existing cached events
          cached.timestamp = now;
          allEvents.push(...cached.events);
          feedResults.push({ id: feed.id, name: feed.name, count: cached.events.length });
          continue;
        }

        const parsedEvents = parseIcsToEvents(text, feed, pastCutoff, futureCutoff);
        allEvents.push(...parsedEvents);

        // Update persistent memory and disk cache
        calendarMemoryCache[feed.id] = {
          feedId: feed.id,
          url: cleanUrl,
          timestamp: now,
          etag,
          lastModified,
          events: parsedEvents,
          eventCount: parsedEvents.length,
        };
        saveCalendarCache(calendarMemoryCache);

        feedResults.push({ id: feed.id, name: feed.name, count: parsedEvents.length });
      } catch (err: any) {
        // UPSTREAM FAILURE MITIGATION (Defends against Apple 503 morning peak outages):
        // If we have previous cached events for this feed, NEVER leave the user with a blank calendar!
        if (cached && cached.events && cached.events.length > 0) {
          console.warn(`[Calendar] Feed [${feed.name}] upstream unavailable (${err.message}). Safely serving ${cached.events.length} previously cached events.`);
          allEvents.push(...cached.events);
          feedResults.push({
            id: feed.id,
            name: feed.name,
            count: cached.events.length,
            cached: true,
            error: `Upstream temporary 503; serving ${cached.events.length} cached events`,
          });
        } else {
          console.warn(`[Calendar] Feed [${feed.name}] error with no existing cache:`, err.message);
          feedResults.push({ id: feed.id, name: feed.name, count: 0, error: err.message });
        }
      }
    }
  }

  // If no external events loaded AND no feeds are configured, provide sample events for first-run demo
  if (allEvents.length === 0 && feeds.length === 0) {
    const today = new Date();
    const makeDate = (dayOffset: number, hour: number, minute: number = 0) => {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset, hour, minute);
      return d.toISOString();
    };

    allEvents.push(
      {
        id: 'demo-1',
        title: 'Morning Coffee & Weekly Sync',
        start: makeDate(0, 9, 30),
        end: makeDate(0, 10, 30),
        allDay: false,
        location: 'Virtual / Home Office',
        calendarId: 'feed-family',
        calendarName: 'Personal',
        color: '#38bdf8',
      },
      {
        id: 'demo-2',
        title: 'Farmers Market & Grocery Run',
        start: makeDate(0, 14, 0),
        end: makeDate(0, 15, 30),
        allDay: false,
        location: 'Downtown Ferry Plaza',
        calendarId: 'feed-family',
        calendarName: 'Personal',
        color: '#38bdf8',
      },
      {
        id: 'demo-3',
        title: 'Trash & Recycling Curbside',
        start: makeDate(1, 0, 0),
        end: makeDate(1, 23, 59),
        allDay: true,
        calendarId: 'feed-family',
        calendarName: 'Home',
        color: '#34d399',
      },
      {
        id: 'demo-4',
        title: 'Architecture Review & Release',
        start: makeDate(1, 11, 0),
        end: makeDate(1, 12, 30),
        allDay: false,
        calendarId: 'feed-work',
        calendarName: 'Work',
        color: '#a855f7',
      },
      {
        id: 'demo-5',
        title: 'Family Dinner & Game Night',
        start: makeDate(2, 18, 30),
        end: makeDate(2, 21, 0),
        allDay: false,
        location: 'Dining Room',
        calendarId: 'feed-family',
        calendarName: 'Family',
        color: '#f59e0b',
      }
    );
  }

  // Load and merge directly created local events from kiosk touch screen
  const localEvents = loadLocalEvents();
  for (const le of localEvents) {
    allEvents.push({
      id: le.id,
      title: le.title,
      start: le.start,
      end: le.end,
      allDay: Boolean(le.allDay),
      location: le.location,
      description: le.description,
      calendarId: 'feed-local',
      calendarName: 'Household & Kiosk',
      color: le.color || '#38bdf8',
      isLocal: true,
    });
  }

  // Sort chronologically
  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  res.json({
    events: allEvents,
    count: allEvents.length,
    feedsStatus: feedResults,
  });
});

// Create new local event directly from kiosk touch screen
app.post('/api/calendar/events', (req: Request, res: Response) => {
  try {
    const { title, start, end, allDay, location, description, color } = req.body;
    if (!title || !start) {
      res.status(400).json({ ok: false, error: 'Title and start time are required' });
      return;
    }

    const events = loadLocalEvents();
    const newEvent: StoredLocalEvent = {
      id: `local-evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: String(title).trim(),
      start: String(start),
      end: end ? String(end) : String(start),
      allDay: Boolean(allDay),
      location: location ? String(location).trim() : undefined,
      description: description ? String(description).trim() : undefined,
      color: color || '#38bdf8',
      createdAt: new Date().toISOString(),
    };

    events.push(newEvent);
    saveLocalEvents(events);

    // Invalidate briefing cache so new event is reflected immediately
    cachedBriefing = null;

    res.json({ ok: true, event: newEvent });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Update local event
app.put('/api/calendar/events/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, start, end, allDay, location, description, color } = req.body;
    let events = loadLocalEvents();
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: 'Event not found' });
      return;
    }
    events[idx] = {
      ...events[idx],
      title: title !== undefined ? String(title).trim() : events[idx].title,
      start: start !== undefined ? String(start) : events[idx].start,
      end: end !== undefined ? String(end) : events[idx].end,
      allDay: allDay !== undefined ? Boolean(allDay) : events[idx].allDay,
      location: location !== undefined ? String(location).trim() : events[idx].location,
      description: description !== undefined ? String(description).trim() : events[idx].description,
      color: color || events[idx].color,
    };
    saveLocalEvents(events);
    cachedBriefing = null;
    res.json({ ok: true, event: events[idx] });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Delete local event
app.delete('/api/calendar/events/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let events = loadLocalEvents();
    const initialLen = events.length;
    events = events.filter(e => e.id !== id);
    saveLocalEvents(events);
    cachedBriefing = null;
    res.json({ ok: true, deleted: events.length < initialLen });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Toggle checklist item from kiosk touch screen
app.post('/api/notes/toggle', (req: Request, res: Response) => {
  try {
    const { itemId } = req.body;
    const config = loadConfig();
    if (config.notes && Array.isArray(config.notes.checklist)) {
      config.notes.checklist = config.notes.checklist.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );
      saveConfig(config);
      cachedBriefing = null;
      res.json({ ok: true, checklist: config.notes.checklist });
      return;
    }
    res.status(400).json({ ok: false, error: 'Checklist not found' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Add checklist item from kiosk touch screen
app.post('/api/notes/add', (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text || !String(text).trim()) {
      res.status(400).json({ ok: false, error: 'Task text is required' });
      return;
    }
    const config = loadConfig();
    const newItem = {
      id: String(Date.now()),
      text: String(text).trim(),
      completed: false,
    };
    config.notes.checklist = [...(config.notes.checklist || []), newItem];
    saveConfig(config);
    cachedBriefing = null;
    res.json({ ok: true, item: newItem, checklist: config.notes.checklist });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Smart Morning & Evening Circadian Briefing Synthesizer
app.get(['/api/briefing', '/api/briefing/'], async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const forceRefresh = req.query.force === 'true';
    const now = Date.now();

    if (!forceRefresh && cachedBriefing && now - cachedBriefing.timestamp < BRIEFING_CACHE_TTL_MS) {
      res.json(cachedBriefing.data);
      return;
    }

    const config = loadConfig();
    const currentDate = new Date();
    const hour = currentDate.getHours();

    const morningHour = config.briefing?.morningStartHour ?? 5;
    const eveningHour = config.briefing?.eveningStartHour ?? 17;
    let period: 'morning' | 'afternoon' | 'evening' | 'night' = 'morning';
    let greeting = 'Good morning';

    if (hour >= morningHour && hour < 12) {
      period = 'morning';
      greeting = 'Good morning';
    } else if (hour >= 12 && hour < eveningHour) {
      period = 'afternoon';
      greeting = 'Good afternoon';
    } else if (hour >= eveningHour && hour < 22) {
      period = 'evening';
      greeting = 'Good evening';
    } else {
      period = 'night';
      greeting = 'Good night';
    }

    // 1. Weather Info
    let weatherSummary: string | null = null;
    let weatherAlert: string | null = null;
    let currentTemp = config.weather?.units === 'imperial' ? 66 : 18;
    let currentCondition = 'Partly Cloudy';
    let tempUnit = config.weather?.units === 'imperial' ? '°F' : '°C';
    let maxTemp = config.weather?.units === 'imperial' ? 70 : 20;
    let precipProb = 10;

    for (const cached of weatherCache.values()) {
      if (cached?.data) {
        currentTemp = cached.data.temp;
        currentCondition = cached.data.condition;
        tempUnit = cached.data.tempUnit;
        if (cached.data.daily && cached.data.daily.length > 0) {
          maxTemp = cached.data.daily[0].maxTemp;
          precipProb = cached.data.daily[0].precipitationProb;
        }
        if (cached.data.activeAlert) {
          weatherAlert = `${cached.data.activeAlert.headline || cached.data.activeAlert.event}`;
        }
        weatherSummary = `${currentTemp}${tempUnit}, ${currentCondition}`;
        break;
      }
    }

    // 2. Events Today
    const localEvents = loadLocalEvents();
    const cachedEvents = getAllCachedCalendarEvents();
    const todayStr = currentDate.toISOString().slice(0, 10);
    const combinedEvents = [
      ...localEvents.map(le => ({
        title: le.title,
        start: le.start,
        allDay: Boolean(le.allDay),
        location: le.location,
      })),
      ...cachedEvents.map(ce => ({
        title: ce.title,
        start: ce.start,
        allDay: Boolean(ce.allDay),
        location: ce.location,
      })),
    ];
    const todayEvents = combinedEvents.filter(e => e.start.slice(0, 10) === todayStr);

    const todayEventCount = todayEvents.length;
    let firstEvent: { title: string; time: string; location?: string } | null = null;
    if (todayEvents.length > 0) {
      const sorted = [...todayEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      const first = sorted[0];
      const timeStr = first.allDay
        ? 'All Day'
        : new Date(first.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !config.clock?.format24 });
      firstEvent = {
        title: first.title,
        time: timeStr,
        location: first.location,
      };
    }

    // 3. Reminders & Tasks
    const checklist = config.notes?.checklist || [];
    const activeReminders = checklist.filter(item => !item.completed);
    const activeRemindersCount = activeReminders.length;

    // 4. Closest Countdown
    let nearestCountdown: { title: string; days: number } | null = null;
    const countdownItems = config.countdown?.items || [];
    if (countdownItems.length > 0) {
      let minDiffDays = Infinity;
      for (const item of countdownItems) {
        const target = new Date(item.targetDate).getTime();
        const diffDays = Math.ceil((target - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < minDiffDays) {
          minDiffDays = diffDays;
          nearestCountdown = {
            title: item.title,
            days: diffDays,
          };
        }
      }
    }

    // 5. Highlights Array
    const highlights: string[] = [];
    if (weatherAlert) {
      highlights.push(`Advisory: ${weatherAlert}`);
    } else {
      highlights.push(`${currentTemp}${tempUnit} ${currentCondition} (High ${maxTemp}${tempUnit}${precipProb > 30 ? `, ${precipProb}% rain` : ''})`);
    }

    if (todayEventCount > 0 && firstEvent) {
      highlights.push(`${todayEventCount} event${todayEventCount > 1 ? 's' : ''} today • Next: ${firstEvent.title} (${firstEvent.time})`);
    } else {
      highlights.push(`Schedule clear today`);
    }

    if (activeRemindersCount > 0) {
      highlights.push(`${activeRemindersCount} active task${activeRemindersCount > 1 ? 's' : ''}`);
    }

    if (nearestCountdown) {
      highlights.push(`${nearestCountdown.title}: ${nearestCountdown.days === 0 ? 'Today!' : `${nearestCountdown.days}d away`}`);
    }

    // 6. Gemini Synthesis with Template Fallback
    let briefingText = '';
    let isAiGenerated = false;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey && config.briefing?.useAiSynthesis !== false) {
      try {
        const ai = new GoogleGenAI();
        const prompt = `You are Lumina Home, a warm, ambient family display assistant.
Generate a concise, natural daily briefing (2 to 3 sentences maximum, under 50 words) for the household.
Context:
- Period: ${period} (${greeting})
- City: ${config.weather?.cityName || 'Home'}
- Weather: ${currentCondition}, ${currentTemp}${tempUnit}, high ${maxTemp}${tempUnit}, precipitation probability ${precipProb}%
${weatherAlert ? `- Weather alert: ${weatherAlert}` : ''}
- Schedule: ${todayEventCount > 0 && firstEvent ? `${todayEventCount} events today, starting with ${firstEvent.title} at ${firstEvent.time}` : 'No events scheduled on the calendar today'}
- Tasks: ${activeRemindersCount} active reminder(s)${activeReminders.length > 0 ? ` (e.g. ${activeReminders[0].text})` : ''}
- Milestone: ${nearestCountdown ? `${nearestCountdown.title} in ${nearestCountdown.days} days` : 'None'}

Rules:
1. Speak in a warm, welcoming tone.
2. If rain or chill, gently suggest an umbrella or warm layer.
3. Output plain text only (no asterisks, quotes, markdown, or lists) so it reads smoothly via voice text-to-speech.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        const text = response.text?.trim();
        if (text && text.length > 15) {
          briefingText = text;
          isAiGenerated = true;
        }
      } catch (err: any) {
        console.warn('[Briefing] AI synthesis fallback:', err.message);
      }
    }

    if (!briefingText) {
      if (period === 'morning') {
        const weatherBit = precipProb > 40
          ? `Expect ${currentCondition.toLowerCase()} with a high of ${maxTemp}${tempUnit} and rain showers—take an umbrella.`
          : `Clear skies ahead with a comfortable high of ${maxTemp}${tempUnit}.`;
        const scheduleBit = todayEventCount > 0 && firstEvent
          ? `You have ${todayEventCount} event${todayEventCount > 1 ? 's' : ''} today, beginning with ${firstEvent.title} at ${firstEvent.time}.`
          : `Your calendar is open today.`;
        const reminderBit = activeRemindersCount > 0
          ? ` You have ${activeRemindersCount} pending household task${activeRemindersCount > 1 ? 's' : ''}.`
          : '';
        briefingText = `${greeting}! ${weatherBit} ${scheduleBit}${reminderBit}`;
      } else if (period === 'afternoon') {
        const scheduleBit = todayEventCount > 0
          ? `${todayEventCount} event${todayEventCount > 1 ? 's' : ''} scheduled today.`
          : `Everything is smooth on the schedule.`;
        briefingText = `${greeting}! Currently ${currentTemp}${tempUnit} and ${currentCondition.toLowerCase()}. ${scheduleBit}${activeRemindersCount > 0 ? ` ${activeRemindersCount} pending reminder${activeRemindersCount > 1 ? 's' : ''} remaining.` : ''}`;
      } else if (period === 'evening') {
        const reminderBit = activeRemindersCount > 0
          ? `${activeRemindersCount} task${activeRemindersCount > 1 ? 's' : ''} remaining.`
          : `All household tasks are completed.`;
        const countdownBit = nearestCountdown ? ` ${nearestCountdown.title} is coming up in ${nearestCountdown.days} days.` : '';
        briefingText = `${greeting}! Winding down at ${currentTemp}${tempUnit}. ${reminderBit}${countdownBit} Have a wonderful evening.`;
      } else {
        briefingText = `${greeting}! The house is peaceful at ${currentTemp}${tempUnit}. Night mode is active for restful sleep.`;
      }
    }

    const payload: BriefingData = {
      briefing: briefingText,
      greeting,
      period,
      highlights,
      weatherAlert,
      weatherSummary,
      eventCount: todayEventCount,
      firstEvent,
      activeRemindersCount,
      nearestCountdown,
      cachedAt: new Date().toISOString(),
      isAiGenerated,
    };

    cachedBriefing = { data: payload, timestamp: now };
    res.json(payload);
  } catch (err: any) {
    res.status(500).setHeader('Content-Type', 'application/json; charset=utf-8').json({ ok: false, error: err.message });
  }
});

// Test an individual calendar URL from the admin UI
app.post('/api/calendar/test-url', async (req: Request, res: Response) => {
  let { url } = req.body;
  if (!url || typeof url !== 'string') {
    res.status(400).json({ ok: false, error: 'URL is required' });
    return;
  }

  url = url.trim();
  if (url.startsWith('webcal://')) {
    url = 'https://' + url.slice(9);
  }

  try {
    const { text } = await fetchCalendarFeedWithRetry(url, 'Admin Test Feed', {}, 2);
    const parsed = ical.parseICS(text);
    const count = Object.values(parsed).filter((item: any) => item.type === 'VEVENT').length;

    res.json({ ok: true, eventCount: count });
  } catch (err: any) {
    const is503 = String(err.message).includes('503');
    const userFriendlyError = is503
      ? 'Apple iCloud CalDAV is temporarily busy (HTTP 503 morning peak). The app will automatically retry and serve cached events.'
      : (err.message || 'Failed to connect to feed');
    res.json({ ok: false, error: userFriendlyError });
  }
});

// In-memory weather cache to prevent rate-limiting and protect against upstream 503 outages
interface CachedWeather {
  data: WeatherData;
  timestamp: number;
}
const weatherCache = new Map<string, CachedWeather>();
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes fresh

// Helper to fetch Open-Meteo with retry and custom User-Agent to avoid Cloudflare/bot 503s
async function fetchOpenMeteoWithRetry(url: string, maxRetries = 2): Promise<any> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'LuminaHome/1.0 (Smart Wall Display Dashboard; https://github.com/luminahome/luminahome)',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(7000),
      });

      if (response.ok) {
        return await response.json();
      }

      // If upstream is 503, 502, 504, or 429, retry after a short delay
      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }

      throw new Error(`Open-Meteo returned status ${response.status}`);
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError || new Error('Open-Meteo fetch failed after retries');
}

// 5. Open-Meteo Weather Proxy (No API key required)
app.get('/api/weather', async (req: Request, res: Response) => {
  const config = loadConfig();
  const lat = parseFloat((req.query.lat as string) || String(config.weather.latitude));
  const lon = parseFloat((req.query.lon as string) || String(config.weather.longitude));
  const units = (req.query.units as string) || config.weather.units || 'metric';
  const cityName = (req.query.city as string) || config.weather.cityName || 'London, United Kingdom';
  const forceTestAlert = req.query.testAlert === 'true' || Boolean(config.weather.testAlert);

  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)},${units},${cityName},alert=${forceTestAlert}`;
  const now = Date.now();
  const cached = weatherCache.get(cacheKey);

  // Serve fresh cache immediately (prevents hitting Open-Meteo on rapid widget refreshes or multi-screen views)
  if (cached && now - cached.timestamp < WEATHER_CACHE_TTL_MS) {
    res.json(cached.data);
    return;
  }

  const tempUnitParam = units === 'imperial' ? 'fahrenheit' : 'celsius';
  const windUnitParam = units === 'imperial' ? 'mph' : 'kmh';

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max&past_days=1&timezone=auto&temperature_unit=${tempUnitParam}&wind_speed_unit=${windUnitParam}`;

    const data = await fetchOpenMeteoWithRetry(url, 2);
    const current = data.current;
    const daily = data.daily || {};
    const hourly = data.hourly || {};

    const weatherInfo = interpretWmoCode(current.weather_code);

    // Map all raw hourly points from Open-Meteo
    const hourlyTimes: string[] = hourly.time || [];
    const allHourlyPoints: HourlyPoint[] = hourlyTimes.map((timeStr: string, idx: number) => {
      const hourNum = parseInt(timeStr.slice(11, 13), 10) || 0;
      const isDay = hourly.is_day ? Boolean(hourly.is_day[idx]) : hourNum >= 6 && hourNum < 21;
      const code = hourly.weather_code ? hourly.weather_code[idx] : 0;
      const info = interpretWmoCode(code);
      let icon = info.icon;
      if (!isDay) {
        if (icon === 'sun' || icon === 'sun-dim') icon = 'moon';
        else if (icon === 'cloud-sun') icon = 'cloud-moon';
      }

      return {
        time: timeStr,
        hour: hourNum,
        hourLabel: `${String(hourNum).padStart(2, '0')}:00`,
        temp: Math.round(hourly.temperature_2m ? hourly.temperature_2m[idx] : 0),
        apparentTemp: Math.round(hourly.apparent_temperature ? hourly.apparent_temperature[idx] : 0),
        precipitationProb: Math.round(hourly.precipitation_probability ? hourly.precipitation_probability[idx] : 0),
        precipitationAmount: Number(((hourly.precipitation ? hourly.precipitation[idx] : 0) || 0).toFixed(1)),
        weatherCode: code,
        condition: info.condition,
        icon,
        isDay,
      };
    });

    // Compute past 24h and next 24h precipitation sums
    const nowIsoHour = new Date().toISOString().slice(0, 13);
    let currentHourIdx = hourlyTimes.findIndex(t => t.startsWith(nowIsoHour));
    if (currentHourIdx === -1) currentHourIdx = Math.min(24, Math.floor(hourlyTimes.length / 2));

    let past24hPrecip = 0;
    for (let i = Math.max(0, currentHourIdx - 24); i < currentHourIdx; i++) {
      past24hPrecip += (hourly.precipitation ? hourly.precipitation[i] : 0) || 0;
    }

    let next24hPrecip = 0;
    for (let i = currentHourIdx; i < Math.min(hourlyTimes.length, currentHourIdx + 24); i++) {
      next24hPrecip += (hourly.precipitation ? hourly.precipitation[i] : 0) || 0;
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Identify yesterday's temperature extremes (index 0 when past_days=1)
    const yesterdayMin = daily.temperature_2m_min && daily.temperature_2m_min.length > 0 ? Math.round(daily.temperature_2m_min[0]) : undefined;
    const yesterdayMax = daily.temperature_2m_max && daily.temperature_2m_max.length > 0 ? Math.round(daily.temperature_2m_max[0]) : undefined;

    // Daily entries starting from today (index 1 if past_days=1, else index 0)
    const startIndex = daily.time && daily.time.length > 1 ? 1 : 0;
    const daysSlice = (daily.time || []).slice(startIndex, startIndex + 7);

    const formattedDaily: DetailedDailyForecast[] = daysSlice.map((timeStr: string, sliceIdx: number) => {
      const origIdx = startIndex + sliceIdx;
      const date = new Date(timeStr + 'T00:00:00');
      const dayName = sliceIdx === 0 ? 'Today' : dayNames[date.getDay()];
      const shortDay = dayNames[date.getDay()];
      const dayInitial = shortDay[0];
      const dayNum = date.getDate();
      const code = daily.weather_code ? daily.weather_code[origIdx] : 0;
      const info = interpretWmoCode(code);
      const minTemp = Math.round(daily.temperature_2m_min ? daily.temperature_2m_min[origIdx] : 0);
      const maxTemp = Math.round(daily.temperature_2m_max ? daily.temperature_2m_max[origIdx] : 0);
      const pop = daily.precipitation_probability_max ? daily.precipitation_probability_max[origIdx] || 0 : 0;
      const precipAmount = daily.precipitation_sum ? Number((daily.precipitation_sum[origIdx] || 0).toFixed(1)) : 0;

      // Extract 24 hourly points for this specific day
      const dayHourly = allHourlyPoints.filter(p => p.time.startsWith(timeStr));

      // Build Apple Weather style narrative
      const currentTemp = Math.round(current.temperature_2m);
      const apparentTemp = Math.round(current.apparent_temperature);
      const diff = apparentTemp - currentTemp;
      let windNote = '';
      if (diff <= -2) windNote = `Wind is making it feel cooler, about ${apparentTemp}°. `;
      else if (diff >= 2) windNote = `Humidity makes it feel warmer, about ${apparentTemp}°. `;

      let rainNote = '';
      const rainPeak = dayHourly.find(h => h.precipitationProb >= 50);
      if (rainPeak) {
        rainNote = `${rainPeak.condition} expected around ${rainPeak.hourLabel}. `;
      }

      const summaryText = sliceIdx === 0
        ? `${currentTemp}° now and ${info.condition.toLowerCase()}. ${windNote}${rainNote}Today's temperature range is from ${minTemp}° to ${maxTemp}° and feels like ${minTemp + diff}° to ${maxTemp + diff}°.`
        : `${info.condition} throughout the day with temperatures ranging from ${minTemp}° to ${maxTemp}°. Precipitation probability peaks around ${pop}%.`;

      const prevMin = origIdx > 0 && daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[origIdx - 1]) : yesterdayMin;
      const prevMax = origIdx > 0 && daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[origIdx - 1]) : yesterdayMax;

      return {
        date: timeStr,
        dayName,
        shortDay,
        dayInitial,
        dayNum,
        minTemp,
        maxTemp,
        weatherCode: code,
        icon: info.icon,
        condition: info.condition,
        precipitationProb: pop,
        precipitationAmount: precipAmount,
        yesterdayMinTemp: prevMin,
        yesterdayMaxTemp: prevMax,
        summaryText,
        hourly: dayHourly,
      };
    });

    const alerts = detectWeatherAlerts(cityName, current, daily, units, forceTestAlert);

    const weatherData: WeatherData = {
      city: cityName,
      temp: Math.round(current.temperature_2m),
      apparentTemp: Math.round(current.apparent_temperature),
      condition: weatherInfo.condition,
      weatherCode: current.weather_code,
      icon: weatherInfo.icon,
      humidity: Math.round(current.relative_humidity_2m),
      windSpeed: Math.round(current.wind_speed_10m),
      windUnit: units === 'imperial' ? 'mph' : 'km/h',
      tempUnit: units === 'imperial' ? '°F' : '°C',
      alerts,
      activeAlert: alerts[0] || null,
      daily: formattedDaily,
      past24hPrecipitation: Number(past24hPrecip.toFixed(1)),
      next24hPrecipitation: Number(next24hPrecip.toFixed(1)),
      lastUpdated: new Date().toISOString(),
    };

    // Store in cache
    weatherCache.set(cacheKey, { data: weatherData, timestamp: now });

    res.json(weatherData);
  } catch (err: any) {
    // If we have an existing cache (even older than TTL), serve it on upstream error!
    if (cached) {
      console.info(`[Weather] Upstream unavailable (${err.message}), serving previously cached weather data`);
      res.json(cached.data);
      return;
    }

    // Otherwise generate dynamic realistic simulated weather starting from current date
    console.info(`[Weather] Upstream unavailable (${err.message}), using simulated offline weather for ${cityName}`);
    const fallbackAlerts = detectWeatherAlerts(
      cityName,
      {
        temperature_2m: units === 'imperial' ? 68 : 13,
        relative_humidity_2m: 78,
        apparent_temperature: units === 'imperial' ? 67 : 12,
        precipitation: 0.2,
        weather_code: 2,
        wind_speed_10m: units === 'imperial' ? 7 : 14,
      },
      {
        weather_code: [2, 61, 3, 1, 2],
        temperature_2m_max: units === 'imperial' ? [60, 57, 55, 59, 58] : [14, 13, 12, 14, 13],
        temperature_2m_min: units === 'imperial' ? [48, 46, 45, 48, 46] : [8, 7, 6, 8, 7],
        precipitation_probability_max: [15, 60, 25, 10, 20],
      },
      units,
      forceTestAlert
    );

    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const mockDailyTemps = [
      { min: 8, max: 14, code: 2, icon: 'cloud-sun', condition: 'Partly Cloudy', pop: 15, precip: 0.0 },
      { min: 7, max: 13, code: 61, icon: 'cloud-rain', condition: 'Showers', pop: 60, precip: 8.5 },
      { min: 6, max: 12, code: 3, icon: 'cloud', condition: 'Overcast', pop: 25, precip: 0.2 },
      { min: 8, max: 14, code: 1, icon: 'sun-dim', condition: 'Mainly Clear', pop: 10, precip: 0.0 },
      { min: 7, max: 13, code: 2, icon: 'cloud-sun', condition: 'Partly Cloudy', pop: 20, precip: 0.0 },
      { min: 9, max: 15, code: 0, icon: 'sun', condition: 'Clear Sky', pop: 5, precip: 0.0 },
      { min: 8, max: 13, code: 61, icon: 'cloud-rain', condition: 'Showers', pop: 45, precip: 3.2 },
    ];

    const dynamicDaily: DetailedDailyForecast[] = mockDailyTemps.map((item, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() + idx);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = idx === 0 ? 'Today' : dayNames[d.getDay()];
      const shortDay = dayNames[d.getDay()];
      const dayInitial = shortDay[0];
      const dayNum = d.getDate();

      const minTemp = units === 'imperial' ? Math.round(item.min * 1.8 + 32) : item.min;
      const maxTemp = units === 'imperial' ? Math.round(item.max * 1.8 + 32) : item.max;

      // Generate 24 hourly points with natural diurnal curve
      const hourly: HourlyPoint[] = Array.from({ length: 24 }).map((_, h) => {
        const isDay = h >= 6 && h < 21;
        // Natural temperature curve peaking at 15:00 and coolest at 06:00
        const sinFactor = Math.sin(((h - 9) / 24) * 2 * Math.PI);
        const curTemp = Math.round(minTemp + (maxTemp - minTemp) * (0.5 + 0.5 * sinFactor));
        const appTemp = curTemp - 1;

        // Precipitation curve concentrated around afternoon if rainy
        let pop = 0;
        let precipAmt = 0;
        if (item.pop > 30) {
          if (h >= 8 && h <= 18) {
            pop = Math.min(100, Math.round(item.pop * (0.6 + 0.4 * Math.sin(((h - 8) / 10) * Math.PI))));
            precipAmt = Number((item.precip * 0.15).toFixed(1));
          }
        } else {
          pop = Math.round(item.pop * 0.5);
        }

        let icon = item.icon;
        if (!isDay) {
          if (icon === 'sun' || icon === 'sun-dim') icon = 'moon';
          else if (icon === 'cloud-sun') icon = 'cloud-moon';
        }

        return {
          time: `${dateStr}T${String(h).padStart(2, '0')}:00`,
          hour: h,
          hourLabel: `${String(h).padStart(2, '0')}:00`,
          temp: curTemp,
          apparentTemp: appTemp,
          precipitationProb: pop,
          precipitationAmount: precipAmt,
          weatherCode: item.code,
          condition: item.condition,
          icon,
          isDay,
        };
      });

      const prevMin = idx > 0 ? (units === 'imperial' ? Math.round(mockDailyTemps[idx - 1].min * 1.8 + 32) : mockDailyTemps[idx - 1].min) : minTemp - 1;
      const prevMax = idx > 0 ? (units === 'imperial' ? Math.round(mockDailyTemps[idx - 1].max * 1.8 + 32) : mockDailyTemps[idx - 1].max) : maxTemp + 1;

      const summaryText = idx === 0
        ? `${maxTemp - 1}° now and ${item.condition.toLowerCase()}. Wind is making it feel cooler, about ${maxTemp - 2}°. Today's temperature range is from ${minTemp}° to ${maxTemp}° and feels like ${minTemp - 1}° to ${maxTemp - 1}°.`
        : `${item.condition} throughout the day with temperatures from ${minTemp}° to ${maxTemp}°. Precipitation probability peaks around ${item.pop}%.`;

      return {
        date: dateStr,
        dayName,
        shortDay,
        dayInitial,
        dayNum,
        minTemp,
        maxTemp,
        weatherCode: item.code,
        icon: item.icon,
        condition: item.condition,
        precipitationProb: item.pop,
        precipitationAmount: item.precip,
        yesterdayMinTemp: prevMin,
        yesterdayMaxTemp: prevMax,
        summaryText,
        hourly,
      };
    });

    // Fallback data
    const fallback: WeatherData = {
      city: cityName,
      temp: units === 'imperial' ? 68 : 13,
      apparentTemp: units === 'imperial' ? 67 : 12,
      condition: 'Partly Cloudy',
      weatherCode: 2,
      icon: 'cloud-sun',
      humidity: 78,
      windSpeed: units === 'imperial' ? 7 : 14,
      windUnit: units === 'imperial' ? 'mph' : 'km/h',
      tempUnit: units === 'imperial' ? '°F' : '°C',
      alerts: fallbackAlerts,
      activeAlert: fallbackAlerts[0] || null,
      daily: dynamicDaily,
      past24hPrecipitation: 5.0,
      next24hPrecipitation: 23.0,
      lastUpdated: new Date().toISOString(),
    };

    // Cache fallback briefly (3 min) to avoid tight request loops
    weatherCache.set(cacheKey, { data: fallback, timestamp: now - (WEATHER_CACHE_TTL_MS - 3 * 60 * 1000) });
    res.json(fallback);
  }
});

// City Geocoding Search (Powered by Open-Meteo Geocoding)
app.get('/api/weather/geocode', async (req: Request, res: Response) => {
  const query = (req.query.query as string || '').trim();
  if (!query || query.length < 2) {
    res.json({ results: [] });
    return;
  }

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LuminaHome/1.0 (Smart Wall Display Dashboard; https://github.com/luminahome/luminahome)',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) {
      throw new Error(`Geocoding error ${response.status}`);
    }

    const data = (await response.json()) as any;
    const results = (data.results || []).map((item: any) => ({
      name: item.name,
      country: item.country || '',
      admin1: item.admin1 || '',
      latitude: item.latitude,
      longitude: item.longitude,
      label: [item.name, item.admin1, item.country].filter(Boolean).join(', '),
    }));

    res.json({ results });
  } catch (err: any) {
    res.json({ results: [], error: err.message });
  }
});

// ==============================================================================
// Apple Photos iCloud Shared Album Parser & Image Proxy
// ==============================================================================
const BASE_62_CHAR_SET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
function base62ToInt(str: string): number {
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    result = result * 62 + BASE_62_CHAR_SET.indexOf(str[i]);
  }
  return result;
}

function extractICloudToken(urlOrToken: string): string {
  const trimmed = urlOrToken.trim();
  if (trimmed.includes('#')) {
    const afterHash = trimmed.split('#')[1];
    return afterHash.split('?')[0].split(';')[0];
  }
  if (trimmed.includes('/photos/')) {
    const parts = trimmed.split('/photos/')[1];
    return parts.split('/')[0].split('?')[0].split('#')[0].split(';')[0];
  }
  if (trimmed.includes('/sharedalbum/')) {
    const parts = trimmed.split('/sharedalbum/')[1];
    return parts.replace(/^en-[a-z]+\//i, '').replace(/^#/, '').split('?')[0].split(';')[0];
  }
  return trimmed.split(';')[0];
}

function getICloudInitialBaseUrl(token: string): string {
  const firstChar = token[0];
  const partition = firstChar === 'A' ? base62ToInt(token[1]) : base62ToInt(token.substring(1, 3));
  const serverPartition = partition < 10 ? `0${partition}` : `${partition}`;
  return `https://p${serverPartition}-sharedstreams.icloud.com/${token}/sharedstreams/`;
}

interface ICloudCacheEntry {
  timestamp: number;
  data: {
    ok: boolean;
    streamName: string;
    owner: string;
    count: number;
    photos: ICloudPhoto[];
  };
}

const icloudCache = new Map<string, ICloudCacheEntry>();
const ICLOUD_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

app.get('/api/icloud-album', async (req: Request, res: Response) => {
  const rawUrl = (req.query.url as string || '').trim();
  if (!rawUrl) {
    return res.status(400).json({ ok: false, error: 'iCloud Shared Album URL is required' });
  }

  // Check demo album request
  if (rawUrl.toLowerCase() === 'demo' || rawUrl.toLowerCase() === 'sample') {
    return res.json({
      ok: true,
      streamName: 'Family Highlights (Demo Album)',
      owner: 'Apple Photos Demo',
      count: DEFAULT_ICLOUD_SAMPLE_PHOTOS.length,
      photos: DEFAULT_ICLOUD_SAMPLE_PHOTOS,
    });
  }

  const token = extractICloudToken(rawUrl);
  if (!token) {
    return res.status(400).json({ ok: false, error: 'Could not parse token from iCloud Shared Album URL' });
  }

  // Check cache
  const cached = icloudCache.get(token);
  if (cached && Date.now() - cached.timestamp < ICLOUD_CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  try {
    const initialBaseUrl = getICloudInitialBaseUrl(token);
    const icloudHeaders = {
      'Origin': 'https://www.icloud.com',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Content-Type': 'text/plain',
      'Accept': '*/*',
      'Referer': 'https://www.icloud.com/sharedalbum/',
      'Connection': 'keep-alive',
    };

    let effectiveBaseUrl = initialBaseUrl;

    // Step 1: Initial call to webstream (handling 330 redirect)
    let webstreamRes = await fetch(`${initialBaseUrl}webstream`, {
      method: 'POST',
      headers: icloudHeaders,
      body: JSON.stringify({ streamCtag: null }),
    });

    if (webstreamRes.status === 330) {
      let redirectHost = webstreamRes.headers.get('x-apple-mme-host');
      if (!redirectHost) {
        try {
          const body = (await webstreamRes.json()) as any;
          redirectHost = body['X-Apple-MMe-Host'];
        } catch {}
      }
      if (redirectHost) {
        effectiveBaseUrl = `https://${redirectHost}/${token}/sharedstreams/`;
        webstreamRes = await fetch(`${effectiveBaseUrl}webstream`, {
          method: 'POST',
          headers: icloudHeaders,
          body: JSON.stringify({ streamCtag: null }),
        });
      }
    }

    if (!webstreamRes.ok) {
      return res.status(webstreamRes.status).json({
        ok: false,
        error: `iCloud service responded with HTTP ${webstreamRes.status}. Make sure "Public Website" is toggled ON in this shared album.`,
        fallbackPhotos: DEFAULT_ICLOUD_SAMPLE_PHOTOS,
      });
    }

    const streamData = (await webstreamRes.json()) as any;
    const rawPhotos = streamData.photos || [];
    const photoGuids: string[] = rawPhotos.map((p: any) => p.photoGuid).filter(Boolean);

    if (photoGuids.length === 0) {
      const emptyResult = {
        ok: true,
        streamName: streamData.streamName || 'iCloud Shared Album',
        owner: [streamData.userFirstName, streamData.userLastName].filter(Boolean).join(' ') || 'iCloud User',
        count: 0,
        photos: [],
      };
      icloudCache.set(token, { timestamp: Date.now(), data: emptyResult });
      return res.json(emptyResult);
    }

    // Step 2: Fetch asset URLs in batches of 25 photoGuids
    const assetItems: Record<string, { url_location: string; url_path: string }> = {};
    for (let i = 0; i < photoGuids.length; i += 25) {
      const chunk = photoGuids.slice(i, i + 25);
      try {
        const assetRes = await fetch(`${effectiveBaseUrl}webasseturls`, {
          method: 'POST',
          headers: icloudHeaders,
          body: JSON.stringify({ photoGuids: chunk }),
        });
        if (assetRes.ok) {
          const assetData = (await assetRes.json()) as any;
          if (assetData.items) {
            Object.assign(assetItems, assetData.items);
          }
        }
      } catch (err: any) {
        console.warn('[iCloud] Error fetching asset urls batch:', err.message);
      }
    }

    // Step 3: Construct enriched photo list with best derivatives and thumbnail derivatives
    const photos: ICloudPhoto[] = [];
    for (const rawPhoto of rawPhotos) {
      const derivativesObj = rawPhoto.derivatives || {};
      const derivativesList: any[] = Object.values(derivativesObj);

      // Find available derivatives that have URLs
      const matched = derivativesList.filter((d: any) => d && d.checksum && assetItems[d.checksum]);
      if (matched.length === 0) continue;

      // Sort by resolution / fileSize descending
      matched.sort((a, b) => {
        const sizeA = (Number(a.width) || 0) * (Number(a.height) || 0) || Number(a.fileSize) || 0;
        const sizeB = (Number(b.width) || 0) * (Number(b.height) || 0) || Number(b.fileSize) || 0;
        return sizeB - sizeA;
      });

      const best = matched[0];
      const bestAsset = assetItems[best.checksum];
      const fullUrl = `https://${bestAsset.url_location}${bestAsset.url_path}`;

      // Find a smaller derivative for thumbnail
      let thumbUrl = fullUrl;
      const thumbnailCandidate = matched.find((d: any) => Number(d.width) <= 800 && Number(d.width) >= 300) || matched[matched.length - 1];
      if (thumbnailCandidate && assetItems[thumbnailCandidate.checksum]) {
        const thumbAsset = assetItems[thumbnailCandidate.checksum];
        thumbUrl = `https://${thumbAsset.url_location}${thumbAsset.url_path}`;
      }

      photos.push({
        id: rawPhoto.photoGuid,
        url: fullUrl,
        thumbnailUrl: thumbUrl,
        width: Number(best.width) || Number(rawPhoto.width) || 1920,
        height: Number(best.height) || Number(rawPhoto.height) || 1080,
        caption: rawPhoto.caption || undefined,
        dateCreated: rawPhoto.dateCreated ? String(rawPhoto.dateCreated) : undefined,
      });
    }

    const result = {
      ok: true,
      streamName: streamData.streamName || 'iCloud Shared Album',
      owner: [streamData.userFirstName, streamData.userLastName].filter(Boolean).join(' ') || 'iCloud User',
      count: photos.length,
      photos,
    };

    icloudCache.set(token, { timestamp: Date.now(), data: result });
    res.json(result);
  } catch (err: any) {
    console.error('[iCloud] Error parsing shared album:', err);
    res.status(500).json({
      ok: false,
      error: `Failed to load iCloud album: ${err.message}. Ensure the album is set to Public Website.`,
      fallbackPhotos: DEFAULT_ICLOUD_SAMPLE_PHOTOS,
    });
  }
});

// Proxy route to bypass CORS/referrer headers on Apple CDN photos
app.get('/api/icloud-photo-proxy', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || (!targetUrl.startsWith('https://') && !targetUrl.startsWith('http://'))) {
    return res.status(400).send('Valid image URL required');
  }

  try {
    const parsedTarget = new URL(targetUrl);
    const allowed = parsedTarget.hostname.endsWith('.icloud.com') ||
                    parsedTarget.hostname.endsWith('.icloud-content.com') ||
                    parsedTarget.hostname.endsWith('.apple.com') ||
                    parsedTarget.hostname.endsWith('.unsplash.com');
    if (!allowed) {
      return res.status(403).send('Host not permitted for photo proxy');
    }

    const imgRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Referer': 'https://www.icloud.com/',
      },
    });

    if (!imgRes.ok) {
      return res.status(imgRes.status).send('Failed to fetch remote photo');
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    const arrayBuffer = await imgRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(500).send('Image proxy error: ' + err.message);
  }
});

// 6. News / RSS Feed Proxy
const rssParser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LuminaHome/1.0',
    'Accept': 'application/rss+xml, application/atom+xml, text/xml, */*',
  },
  timeout: 8000,
});

app.get('/api/rss', async (req: Request, res: Response) => {
  const config = loadConfig();
  const feedUrl = (req.query.url as string) || config.news.feedUrl;

  try {
    const feed = await rssParser.parseURL(feedUrl);
    const maxItems = config.news.maxItems || 12;

    const items: NewsItem[] = (feed.items || []).slice(0, maxItems).map((item, idx) => ({
      id: item.guid || item.link || String(idx),
      title: (item.title || 'Untitled Story').trim(),
      link: item.link,
      pubDate: item.pubDate,
      source: feed.title || config.news.feedName,
      snippet: item.contentSnippet ? item.contentSnippet.slice(0, 140) + '...' : undefined,
    }));

    res.json({
      title: feed.title || config.news.feedName,
      items,
      count: items.length,
    });
  } catch (err: any) {
    console.warn('RSS parser error, delivering fallback headlines:', err.message);
    const fallbackItems: NewsItem[] = [
      { id: '1', title: 'NASA Webb Telescope unveils unprecedented views of ancient star cluster', source: 'Science & Discovery' },
      { id: '2', title: 'Global renewable energy additions reach record highs according to international report', source: 'World News' },
      { id: '3', title: 'Next-generation solid-state battery technology achieves crucial laboratory milestone', source: 'Technology' },
      { id: '4', title: 'Wild giant panda population rebounds steadily in protected mountain reserves', source: 'Environment' },
      { id: '5', title: 'Local community garden project produces record autumn harvest for food pantries', source: 'Community' },
    ];
    res.json({
      title: config.news.feedName || 'World News',
      items: fallbackItems,
      count: fallbackItems.length,
    });
  }
});

// 7. Daily Quotes Collection
const CURATED_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", category: "inspirational" },
  { text: "We suffer more often in imagination than in reality.", author: "Seneca", category: "stoic" },
  { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman", category: "tech" },
  { text: "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.", author: "Buddha", category: "wisdom" },
  { text: "Make each day your masterpiece.", author: "John Wooden", category: "inspirational" },
  { text: "Waste no more time arguing what a good person should be. Be one.", author: "Marcus Aurelius", category: "stoic" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson", category: "tech" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", category: "wisdom" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James", category: "inspirational" },
  { text: "Happiness is a discipline; you have to practice it every day.", author: "Epictetus", category: "stoic" },
];

app.get('/api/quotes', (req: Request, res: Response) => {
  const category = req.query.category as string;
  const filtered = category ? CURATED_QUOTES.filter(q => q.category === category) : CURATED_QUOTES;
  const todayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % (filtered.length || 1);
  const quote = filtered[todayIndex] || CURATED_QUOTES[0];
  res.json(quote);
});

// ==============================================================================
// 8. In-App One-Click Update Engine & System Maintenance
// ==============================================================================

interface UpdateState {
  status: 'idle' | 'checking' | 'updating' | 'completed' | 'error';
  step: number;
  totalSteps: number;
  message: string;
  logs: string[];
  error?: string;
  lastChecked?: string;
  currentCommit?: { hash: string; date: string; message: string };
  remoteCommit?: { hash: string; date: string; message: string };
  behindCount?: number;
  hasUpdate: boolean;
  isGitRepo: boolean;
  branch: string;
}

const updateState: UpdateState = {
  status: 'idle',
  step: 0,
  totalSteps: 4,
  message: 'System up to date',
  logs: [],
  hasUpdate: false,
  isGitRepo: false,
  branch: 'main',
};

// Check for updates via Git or remote version check
app.get('/api/system/update/check', async (_req: Request, res: Response) => {
  const isGit = fs.existsSync(path.resolve(process.cwd(), '.git'));
  updateState.isGitRepo = isGit;
  updateState.lastChecked = new Date().toISOString();

  if (!isGit) {
    updateState.currentCommit = {
      hash: `v${APP_VERSION}`,
      date: new Date().toLocaleDateString(),
      message: `Lumina Home v${APP_VERSION} (Active Installation)`,
    };
    updateState.hasUpdate = false;
    updateState.message = 'Running in standalone / cloud preview mode. On your Raspberry Pi, install via Git to enable live updates!';
    res.json({ ok: true, state: updateState });
    return;
  }

  try {
    updateState.status = 'checking';
    const { stdout: branchOut } = await execAsync('git rev-parse --abbrev-ref HEAD').catch(() => ({ stdout: 'main' }));
    const branch = branchOut.trim() || 'main';
    updateState.branch = branch;

    const { stdout: headInfo } = await execAsync('git log -1 --format="%h|%cd|%s" --date=relative');
    const [hHash, hDate, hSubject] = headInfo.trim().split('|');
    updateState.currentCommit = { hash: hHash, date: hDate, message: hSubject };

    // Fetch remote branch with proper Node exec timeout (NOT CLI flag)
    await execAsync(`git fetch origin ${branch}`, { timeout: 20000 }).catch(async () => {
      // Fallback: fetch without explicit branch
      await execAsync('git fetch origin', { timeout: 20000 }).catch((e) => {
        console.warn('git fetch fallback warning:', e.message);
      });
    });

    const { stdout: remoteInfo } = await execAsync(`git log -1 origin/${branch} --format="%h|%cd|%s" --date=relative`).catch(() => ({ stdout: headInfo }));
    const [rHash, rDate, rSubject] = remoteInfo.trim().split('|');
    updateState.remoteCommit = { hash: rHash, date: rDate, message: rSubject };

    const { stdout: revCount } = await execAsync(`git rev-list HEAD..origin/${branch} --count`).catch(() => ({ stdout: '0' }));
    const behind = parseInt(revCount.trim(), 10) || 0;
    const isDifferentCommit = Boolean(hHash && rHash && hHash !== rHash);
    const hasUpdate = behind > 0 || isDifferentCommit;

    updateState.behindCount = behind > 0 ? behind : (isDifferentCommit ? 1 : 0);
    updateState.hasUpdate = hasUpdate;
    updateState.status = 'idle';
    updateState.message = hasUpdate
      ? `Update available! ${updateState.behindCount} new commit${updateState.behindCount > 1 ? 's' : ''} ready to install.`
      : 'Lumina Home is running the latest version.';

    res.json({ ok: true, state: updateState });
  } catch (err: any) {
    updateState.status = 'idle';
    updateState.error = err.message;
    res.json({ ok: true, state: updateState });
  }
});

// Trigger One-Click In-App Update
app.post('/api/system/update/execute', async (_req: Request, res: Response) => {
  if (updateState.status === 'updating') {
    res.status(409).json({ ok: false, message: 'An update is already in progress.' });
    return;
  }

  updateState.status = 'updating';
  updateState.step = 1;
  updateState.message = 'Backing up configuration and preparing update...';
  updateState.logs = [`[${new Date().toLocaleTimeString()}] Starting Lumina Home One-Click Update...`];
  updateState.error = undefined;

  // Respond immediately so client can poll progress
  res.json({ ok: true, message: 'Update pipeline initiated!' });

  (async () => {
    try {
      const backupConfigPath = path.resolve(os.tmpdir(), `luminahome-config-${Date.now()}.json`);
      if (fs.existsSync(CONFIG_FILE)) {
        fs.copyFileSync(CONFIG_FILE, backupConfigPath);
        updateState.logs.push(`[${new Date().toLocaleTimeString()}] Backed up user settings to ${backupConfigPath}`);
      }

      const isGit = fs.existsSync(path.resolve(process.cwd(), '.git'));

      if (isGit) {
        updateState.step = 1;
        updateState.message = 'Pulling latest code from repository...';
        updateState.logs.push(`[${new Date().toLocaleTimeString()}] Stashing local edits & syncing with origin/${updateState.branch || 'main'}...`);
        await execAsync('git stash push -m "Pre-update automatic stash"').catch(() => {});
        await execAsync(`git fetch origin ${updateState.branch || 'main'}`).catch(() => {});
        const { stdout: pullOut } = await execAsync(`git reset --hard origin/${updateState.branch || 'main'}`);
        updateState.logs.push(pullOut.trim());

        updateState.step = 2;
        updateState.message = 'Installing and updating packages...';
        updateState.logs.push(`[${new Date().toLocaleTimeString()}] Running npm install...`);
        const { stdout: npmOut } = await execAsync('npm install');
        updateState.logs.push(npmOut.slice(0, 500));
      } else {
        updateState.logs.push(`[${new Date().toLocaleTimeString()}] Non-git environment: skipping git pull, refreshing local bundle.`);
      }

      updateState.step = 3;
      updateState.message = 'Building production frontend assets...';
      updateState.logs.push(`[${new Date().toLocaleTimeString()}] Running npm run build...`);
      const { stdout: buildOut } = await execAsync('npm run build');
      updateState.logs.push(buildOut.slice(0, 500));

      // Restore user config if needed
      if (fs.existsSync(backupConfigPath)) {
        fs.copyFileSync(backupConfigPath, CONFIG_FILE);
        updateState.logs.push(`[${new Date().toLocaleTimeString()}] Verified configuration integrity.`);
      }

      updateState.step = 4;
      updateState.status = 'completed';
      updateState.hasUpdate = false;
      updateState.message = 'Update complete! Lumina Home service restarting...';
      updateState.logs.push(`[${new Date().toLocaleTimeString()}] ✅ Update completed successfully! Reloading service.`);

      // Trigger service restart in detached process after 2 seconds
      setTimeout(() => {
        try {
          spawn('sudo', ['systemctl', 'restart', 'luminahome'], {
            detached: true,
            stdio: 'ignore',
          }).unref();
        } catch {
          // Fallback if not running under systemd
        }
      }, 2000);
    } catch (err: any) {
      updateState.status = 'error';
      updateState.error = err.message;
      updateState.logs.push(`[${new Date().toLocaleTimeString()}] ❌ Error during update: ${err.message}`);
    }
  })();
});

// Query live update status and build logs
app.get('/api/system/update/status', (_req: Request, res: Response) => {
  res.json({ ok: true, state: updateState });
});

// Download ready-to-run project source tarball (for Raspberry Pi direct install without Git/GitHub)
app.get('/api/system/download-app.tar.gz', (_req: Request, res: Response) => {
  try {
    const tmpFile = path.join(os.tmpdir(), `kioskboard-release-${Date.now()}.tar.gz`);
    execSync(
      `tar --exclude='node_modules' --exclude='.git' --exclude='.aistudio' --exclude='dist' --exclude='*.tar.gz' --exclude='*.zip' -czf "${tmpFile}" .`,
      { cwd: process.cwd(), timeout: 20000 }
    );
    res.download(tmpFile, 'kioskboard.tar.gz', (err) => {
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch {}
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Failed to stream project archive' });
      }
    });
  } catch (err: any) {
    console.error('Failed to create project tarball:', err);
    res.status(500).json({ error: 'Failed to create project archive', details: err?.message });
  }
});

// Download ready-to-run project source ZIP archive
app.get('/api/system/download-app.zip', (_req: Request, res: Response) => {
  try {
    const tmpFile = path.join(os.tmpdir(), `kioskboard-release-${Date.now()}.zip`);
    const pyScript = `import zipfile, os, sys
out_file = sys.argv[1]
exclude_dirs = {'node_modules', '.git', '.aistudio', 'dist', '.cache', 'build'}
with zipfile.ZipFile(out_file, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for f in files:
            if f.endswith('.zip') or f.endswith('.tar.gz'):
                continue
            filepath = os.path.join(root, f)
            arcname = os.path.relpath(filepath, '.')
            zipf.write(filepath, arcname)
`;

    execSync(`python3 - "${tmpFile}"`, { cwd: process.cwd(), input: pyScript, timeout: 25000 });
    res.download(tmpFile, 'kioskboard.zip', (err) => {
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch {}
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Failed to stream project zip archive' });
      }
    });
  } catch (err: any) {
    console.error('Failed to create project zip:', err);
    res.status(500).json({ error: 'Failed to create project zip archive', details: err?.message });
  }
});

// Direct 1-Click Push to GitHub endpoint
app.post('/api/system/github/push', (req: Request, res: Response) => {
  const { repoUrl, token, branch = 'main', commitMessage } = req.body || {};
  if (!repoUrl || !token) {
    return res.status(400).json({ error: 'Repository URL and GitHub Personal Access Token are required.' });
  }

  const cleanUrl = String(repoUrl).trim().replace(/\.git$/, '');
  const match = cleanUrl.match(/github\.com[/:]([^/]+)\/([^/]+)/);
  if (!match) {
    return res.status(400).json({ error: 'Invalid GitHub URL. Must be in the format https://github.com/username/repository' });
  }

  const owner = match[1];
  const repo = match[2];
  const sanitizedToken = String(token).trim();
  const targetBranch = String(branch).trim() || 'main';
  const msg = String(commitMessage || 'Update KioskBoard application').trim();

  try {
    // 1. Ensure git repo exists
    if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
      execSync(`git init -b ${targetBranch}`, { cwd: process.cwd() });
    }
    execSync('git config user.name "KioskBoard Deployer"', { cwd: process.cwd() });
    execSync('git config user.email "deploy@kioskboard.local"', { cwd: process.cwd() });

    // 2. Stage all files (respecting .gitignore)
    execSync('git add -A', { cwd: process.cwd() });

    // 3. Commit
    try {
      execSync(`git commit -m ${JSON.stringify(msg)}`, { cwd: process.cwd() });
    } catch {
      // Nothing new to commit is fine
    }

    // 4. Remote setup with token authentication
    const authedRemote = `https://${encodeURIComponent(sanitizedToken)}@github.com/${owner}/${repo}.git`;
    try {
      execSync('git remote remove origin', { cwd: process.cwd() });
    } catch {}
    execSync(`git remote add origin "${authedRemote}"`, { cwd: process.cwd() });

    // 5. Push to GitHub
    execSync(`git push -u origin ${targetBranch} --force`, { cwd: process.cwd(), timeout: 45000 });

    // 6. Clean origin remote to remove token from local config
    try {
      execSync(`git remote set-url origin "https://github.com/${owner}/${repo}.git"`, { cwd: process.cwd() });
    } catch {}

    return res.json({
      ok: true,
      message: `Successfully pushed all code to https://github.com/${owner}/${repo} on branch '${targetBranch}'!`
    });
  } catch (err: any) {
    console.error('GitHub push error:', err);
    // Sanitize any token leakage from error message
    const rawError = (err?.stderr?.toString() || err?.message || 'Failed to push to GitHub').replace(
      new RegExp(sanitizedToken, 'g'),
      '***TOKEN***'
    );
    return res.status(500).json({
      error: rawError.includes('Authentication failed') || rawError.includes('403') || rawError.includes('401')
        ? 'GitHub authentication failed. Please ensure your Personal Access Token has repository read/write ("repo") permissions.'
        : `Git push failed: ${rawError}`
    });
  }
});


// ==============================================================================
// 9. Ready-to-use Raspberry Pi scripts & installation helpers
// ==============================================================================

// Downloadable launcher script (kiosk.sh)
app.get('/api/scripts/kiosk.sh', (_req: Request, res: Response) => {
  const ips = getLocalNetworkIps();
  const host = ips.length > 0 ? ips[0].address : 'localhost';
  const displayUrl = `http://${host}:${PORT}/display`;

  const script = `#!/bin/bash
# ==============================================================================
# KioskBoard - Raspberry Pi Kiosk Launcher Script
# Compatible with Raspberry Pi OS Bookworm (Wayland/Wayfire) & Bullseye (X11)
# ==============================================================================

# Disable screen blanking & DPMS power saving
xset s noblank 2>/dev/null || true
xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true

# Hide mouse cursor when inactive (if unclutter installed)
which unclutter >/dev/null 2>&1 && unclutter -idle 0.5 -root &

# Wait for local server to be responsive
echo "Waiting for KioskBoard server at ${displayUrl}..."
// Wait for local server to be responsive
echo "Waiting for KioskBoard server at ${displayUrl}..."
until curl -s -f "http://localhost:${PORT}/api/health" >/dev/null 2>&1; do
  sleep 1
done

# Reset Chromium crash flags for clean fullscreen launch
mkdir -p ~/.config/chromium/Default
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences 2>/dev/null || true
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences 2>/dev/null || true

# Launch Chromium in Fullscreen Kiosk Mode with anti-crash flags
chromium-browser \\
  --noerrdialogs \\
  --disable-infobars \\
  --kiosk \\
  --disable-dev-shm-usage \\
  --disable-gpu-rasterization \\
  --no-first-run \\
  --fast \\
  --fast-start \\
  --disable-features=Translate \\
  --check-for-update-interval=31536000 \\
  --disable-pinch \\
  --overscroll-history-navigation=0 \\
  --autoplay-policy=no-user-gesture-required \\
  "${displayUrl}"
`;

  res.setHeader('Content-Type', 'text/x-shellscript');
  res.setHeader('Content-Disposition', 'attachment; filename="kioskboard-launch.sh"');
  res.send(script);
});

// Complete One-Liner Installer for Raspberry Pi (install-kiosk.sh)
app.get('/api/scripts/install-kiosk.sh', (req: Request, res: Response) => {
  const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const hostHeader = req.get('host');
  const serverOrigin = hostHeader ? `${protocol}://${hostHeader}` : 'http://localhost:3000';
  const downloadUrl = `${serverOrigin}/api/system/download-app.tar.gz`;

  const script = `#!/bin/bash
# ==============================================================================
# KioskBoard - Automated Raspberry Pi 4/5 Installer
# Run: curl -fsSL ${serverOrigin}/api/scripts/install-kiosk.sh | bash
# ==============================================================================
set -e

echo "=========================================================="
echo "🚀 Installing KioskBoard on Raspberry Pi..."
echo "   Server Origin: ${serverOrigin}"
echo "=========================================================="

USER_HOME="$HOME"
INSTALL_DIR="$USER_HOME/kioskboard"

# 1. Install prerequisites (Node.js 20 LTS, git, unclutter, curl)
echo "📦 Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y curl git unclutter jq tar

if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
  echo "📦 Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "✅ Node.js $(node -v) installed."

# 2. Get source code (downloads archive if not cloned from git)
if [ ! -d "$INSTALL_DIR" ] || [ ! -f "$INSTALL_DIR/package.json" ]; then
  echo "📥 Downloading KioskBoard application bundle..."
  mkdir -p "$INSTALL_DIR"
  curl -fsSL "${downloadUrl}" | tar -xz -C "$INSTALL_DIR"
  echo "✅ Application files downloaded into $INSTALL_DIR"
fi

# 3. Setup systemd service for 24/7 background operation
echo "⚙️  Configuring background systemd service..."
sudo bash -c "cat > /etc/systemd/system/kioskboard.service" <<EOF
[Unit]
Description=KioskBoard Smart Wall Display Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

# 4. Configure passwordless restart for in-app one-click updates
echo "🔑 Enabling passwordless service restart for In-App Updates..."
sudo bash -c "cat > /etc/sudoers.d/kioskboard" <<EOF
$USER ALL=(ALL) NOPASSWD: /bin/systemctl restart kioskboard, /bin/systemctl stop kioskboard, /bin/systemctl start kioskboard
EOF
sudo chmod 0440 /etc/sudoers.d/kioskboard

# 4b. Optimize Swap Memory
if [ -f /etc/dphys-swapfile ]; then
  CURRENT_SWAP=\$(grep -E "^CONF_SWAPSIZE=" /etc/dphys-swapfile | cut -d'=' -f2 | tr -d ' ' || echo "100")
  if [ -n "\$CURRENT_SWAP" ] && [ "\$CURRENT_SWAP" -lt 1024 ]; then
    echo "⚡ Increasing swap size to 1024MB for browser stability..."
    sudo dphys-swapfile swapoff || true
    sudo sed -i 's/^CONF_SWAPSIZE=.*/CONF_SWAPSIZE=1024/' /etc/dphys-swapfile
    sudo dphys-swapfile setup || true
    sudo dphys-swapfile swapon || true
  fi
fi

# 5. Configure Universal Autostart on boot (Labwc, Wayfire, and LXDE)
echo "🖥️  Configuring fullscreen kiosk autostart on boot..."
mkdir -p "$USER_HOME/.config/autostart"
cat > "$USER_HOME/.config/autostart/kioskboard.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=KioskBoard Display
Comment=Fullscreen Kiosk Wall Display
Exec=/bin/bash $INSTALL_DIR/scripts/kiosk-launch.sh
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
EOF

mkdir -p "$USER_HOME/.config/labwc"
if ! grep -q "kiosk-launch.sh" "$USER_HOME/.config/labwc/autostart" 2>/dev/null; then
  echo "/bin/bash $INSTALL_DIR/scripts/kiosk-launch.sh &" >> "$USER_HOME/.config/labwc/autostart"
fi

if [ -f "$USER_HOME/.config/wayfire.ini" ] || [ -d "$USER_HOME/.config/wayfire" ]; then
  if ! grep -q "kioskboard" "$USER_HOME/.config/wayfire.ini" 2>/dev/null; then
    cat >> "$USER_HOME/.config/wayfire.ini" <<EOF

[autostart]
kioskboard = /bin/bash $INSTALL_DIR/scripts/kiosk-launch.sh
screensaver = false
dpms = false
EOF
  fi
fi

# 6. Build and launch
cd "$INSTALL_DIR"
echo "🔨 Building KioskBoard application..."
npm install
npm run build
sudo systemctl daemon-reload
sudo systemctl enable --now kioskboard

echo "=========================================================="
echo "✅ KioskBoard successfully installed and running!"
echo "📺 Display Screen : http://localhost:3000/display"
echo "⚙️  Admin Settings : http://localhost:3000/admin"
echo "=========================================================="
`;

  res.setHeader('Content-Type', 'text/x-shellscript');
  res.setHeader('Content-Disposition', 'attachment; filename="install-kiosk.sh"');
  res.send(script);
});

// Standalone update script (update.sh)
app.get('/api/scripts/update.sh', (_req: Request, res: Response) => {
  const script = `#!/bin/bash
# ==============================================================================
# KioskBoard - Quick Update Script
# ==============================================================================
set -e
cd "$(dirname "$0")"

echo "🔄 Updating KioskBoard to latest release..."
cp data/config.json /tmp/kioskboard-config.bak.json 2>/dev/null || true

git stash save "Auto-update backup" 2>/dev/null || true
git pull origin main || git pull

npm install --omit=dev
npm run build

cp /tmp/kioskboard-config.bak.json data/config.json 2>/dev/null || true

sudo systemctl restart kioskboard || pm2 restart kioskboard 2>/dev/null || true
echo "✅ KioskBoard updated and restarted successfully!"
`;

  res.setHeader('Content-Type', 'text/x-shellscript');
  res.setHeader('Content-Disposition', 'attachment; filename="update.sh"');
  res.send(script);
});

// systemd unit file (kioskboard.service)
app.get('/api/scripts/kioskboard.service', (_req: Request, res: Response) => {
  const unit = `[Unit]
Description=KioskBoard Smart Wall Display Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/kioskboard
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="kioskboard.service"');
  res.send(unit);
});

// -------------------------------------------------------------
// Vite Server Integration (Dev & Production)
// -------------------------------------------------------------
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalNetworkIps();
    console.log(`\n======================================================`);
    console.log(`🚀 Lumina Home server running on port ${PORT}`);
    console.log(`📺 Live Display Screen : http://localhost:${PORT}/display`);
    console.log(`⚙️  Admin Dashboard     : http://localhost:${PORT}/admin`);
    if (ips.length > 0) {
      console.log(`\n📶 Local Network Kiosk URLs (Use on Raspberry Pi):`);
      for (const iface of ips) {
        console.log(`   - http://${iface.address}:${PORT}/display`);
      }
    }
    console.log(`======================================================\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
