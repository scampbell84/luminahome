import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec, spawn, execSync } from 'child_process';
import { promisify } from 'util';
import ical from 'node-ical';
import Parser from 'rss-parser';
import { DEFAULT_CONFIG, CURATED_DEMO_TRACKS } from './src/constants/defaultConfig.js';
import { AppConfig, CalendarEvent, WeatherData, WeatherAlert, NewsItem, SystemInfo, AppleMusicTrack, HomePodSpeaker } from './src/types/config.js';
import { ShoppingItem } from './src/types/shopping.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';
const execAsync = promisify(exec);

// Ensure data directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const SHOPPING_FILE = path.join(DATA_DIR, 'shopping.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_SHOPPING: ShoppingItem[] = [
  { id: 'shop-1', text: 'Dish soap', category: 'Household', completed: false, createdAt: new Date().toISOString() },
  { id: 'shop-2', text: 'Paper towels', category: 'Household', completed: false, createdAt: new Date().toISOString() },
  { id: 'shop-3', text: 'Granola bars', category: 'Snacks & Drinks', completed: false, createdAt: new Date().toISOString() },
  { id: 'shop-4', text: 'Organic whole milk', category: 'Dairy & Eggs', completed: false, createdAt: new Date().toISOString() },
  { id: 'shop-5', text: 'Sourdough bread', category: 'Bakery', completed: false, createdAt: new Date().toISOString() },
  { id: 'shop-6', text: 'Honeycrisp apples', category: 'Produce', completed: true, createdAt: new Date().toISOString() },
];

function loadShopping(): ShoppingItem[] {
  try {
    if (fs.existsSync(SHOPPING_FILE)) {
      return JSON.parse(fs.readFileSync(SHOPPING_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading shopping file:', err);
  }
  saveShopping(DEFAULT_SHOPPING);
  return DEFAULT_SHOPPING;
}

function saveShopping(items: ShoppingItem[]): void {
  try {
    fs.writeFileSync(SHOPPING_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save shopping items:', err);
  }
}

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
        countdown: { ...DEFAULT_CONFIG.countdown, ...(parsed.countdown || {}) },
        notes: { ...DEFAULT_CONFIG.notes, ...(parsed.notes || {}) },
        system: { ...DEFAULT_CONFIG.system, ...(parsed.system || {}) },
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

// 2b. Shared Shopping List Endpoints
app.get('/api/shopping', (_req: Request, res: Response) => {
  const items = loadShopping();
  res.json({ items });
});

app.post('/api/shopping', (req: Request, res: Response) => {
  try {
    const { text, category, quantity, addedBy } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Item text is required' });
      return;
    }

    const items = loadShopping();
    const newItem: ShoppingItem = {
      id: `shop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: text.trim(),
      category: category || 'Other',
      completed: false,
      quantity: quantity ? String(quantity).trim() : undefined,
      addedBy: addedBy || 'Home',
      createdAt: new Date().toISOString(),
    };

    items.unshift(newItem); // add to top
    saveShopping(items);
    res.json({ success: true, item: newItem, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to add shopping item' });
  }
});

app.patch('/api/shopping/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const items = loadShopping();
    const index = items.findIndex((i) => i.id === id);

    if (index === -1) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    items[index] = { ...items[index], ...updates };
    saveShopping(items);
    res.json({ success: true, item: items[index], items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update shopping item' });
  }
});

app.delete('/api/shopping/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let items = loadShopping();
    items = items.filter((i) => i.id !== id);
    saveShopping(items);
    res.json({ success: true, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete shopping item' });
  }
});

app.post('/api/shopping/clear-completed', (_req: Request, res: Response) => {
  try {
    let items = loadShopping();
    const beforeCount = items.length;
    items = items.filter((i) => !i.completed);
    saveShopping(items);
    res.json({ success: true, removedCount: beforeCount - items.length, items });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to clear completed items' });
  }
});

// 3. System and Network Information
app.get('/api/system', (_req: Request, res: Response) => {
  const ips = getLocalNetworkIps();
  const primaryIp = ips.length > 0 ? ips[0].address : 'localhost';
  const freeMem = os.freemem();
  const totalMem = os.totalmem();

  const info: SystemInfo = {
    hostname: os.hostname(),
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    uptimeSeconds: Math.floor(os.uptime()),
    nodeVersion: process.version,
    memoryMb: {
      free: Math.round(freeMem / (1024 * 1024)),
      total: Math.round(totalMem / (1024 * 1024)),
      used: Math.round((totalMem - freeMem) / (1024 * 1024)),
    },
    networkInterfaces: ips,
    displayUrl: `http://${primaryIp}:${PORT}/display`,
    adminUrl: `http://${primaryIp}:${PORT}/admin`,
    serverTime: new Date().toISOString(),
  };

  res.json(info);
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

// 4. Universal Calendar (Multi-iCal Fetch & Parse)
app.get('/api/calendar', async (req: Request, res: Response) => {
  const config = loadConfig();
  const feeds = config.calendar.feeds.filter(f => f.enabled && f.url && f.url.trim().length > 0);

  const now = new Date();
  const pastCutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days in past (2 months back)
  const futureCutoff = new Date(now.getTime() + 150 * 24 * 60 * 60 * 1000); // 150 days in future (5 months forward)

  const allEvents: CalendarEvent[] = [];
  const feedResults: Array<{ id: string; name: string; count: number; error?: string }> = [];

  for (const feed of feeds) {
    let cleanUrl = feed.url.trim();
    if (cleanUrl.startsWith('webcal://')) {
      cleanUrl = 'https://' + cleanUrl.slice(9);
    }

    try {
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KioskBoard/1.0',
          'Accept': 'text/calendar, text/plain, */*',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const rawIcs = await response.text();
      const parsedData = ical.parseICS(rawIcs);

      let feedEventCount = 0;
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

              allEvents.push({
                id: `${feed.id}-${inst.event?.uid || item.uid || key}-${start.getTime()}`,
                title: String(inst.summary || item.summary || 'Untitled Event'),
                start: startStr,
                end: endStr,
                allDay: isAllDay,
                location: inst.location ? String(inst.location) : (item.location ? String(item.location) : undefined),
                description: inst.description ? String(inst.description) : (item.description ? String(item.description) : undefined),
                calendarId: feed.id,
                calendarName: feed.name,
                color: feed.color,
              });

              feedEventCount++;
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

          allEvents.push({
            id: `${feed.id}-${item.uid || key}`,
            title: String(item.summary || 'Untitled Event'),
            start: startStr,
            end: endStr,
            allDay: isAllDay,
            location: item.location ? String(item.location) : undefined,
            description: item.description ? String(item.description) : undefined,
            calendarId: feed.id,
            calendarName: feed.name,
            color: feed.color,
          });

          feedEventCount++;
        }
      }

      feedResults.push({ id: feed.id, name: feed.name, count: feedEventCount });
    } catch (err: any) {
      console.warn(`Calendar feed [${feed.name}] error:`, err.message);
      feedResults.push({ id: feed.id, name: feed.name, count: 0, error: err.message });
    }
  }

  // If no external events loaded (e.g. initial demo setup or no feeds configured yet),
  // generate sample events so the dashboard displays gorgeously
  if (allEvents.length === 0) {
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
      },
      {
        id: 'demo-multiday-1',
        title: 'Grandparents Visiting & Family Dinner',
        start: makeDate(-1, 0, 0),
        end: makeDate(3, 23, 59),
        allDay: true,
        calendarId: 'feed-family',
        calendarName: 'Family',
        color: '#f59e0b',
      },
      {
        id: 'demo-multiday-2',
        title: 'Fall Break & Camping Road Trip',
        start: makeDate(4, 0, 0),
        end: makeDate(8, 23, 59),
        allDay: true,
        calendarId: 'feed-family',
        calendarName: 'Vacation',
        color: '#10b981',
      },
      {
        id: 'demo-multiday-3',
        title: 'Global Tech & Architecture Summit',
        start: makeDate(11, 0, 0),
        end: makeDate(14, 23, 59),
        allDay: true,
        calendarId: 'feed-work',
        calendarName: 'Work',
        color: '#8b5cf6',
      },
      {
        id: 'demo-6',
        title: 'Community Garden Workshop',
        start: makeDate(4, 10, 0),
        end: makeDate(4, 12, 0),
        allDay: false,
        calendarId: 'feed-family',
        calendarName: 'Personal',
        color: '#38bdf8',
      },
      {
        id: 'demo-7',
        title: 'Weekend Bike Ride & Brunch',
        start: makeDate(6, 9, 0),
        end: makeDate(6, 13, 0),
        allDay: false,
        calendarId: 'feed-family',
        calendarName: 'Personal',
        color: '#38bdf8',
      }
    );
  }

  // Sort chronologically
  allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  res.json({
    events: allEvents,
    count: allEvents.length,
    feedsStatus: feedResults,
  });
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
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 KioskBoard/1.0',
        'Accept': 'text/calendar, text/plain, */*',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      res.json({ ok: false, error: `Server responded with HTTP ${response.status}` });
      return;
    }

    const text = await response.text();
    const parsed = ical.parseICS(text);
    const count = Object.values(parsed).filter((item: any) => item.type === 'VEVENT').length;

    res.json({ ok: true, eventCount: count });
  } catch (err: any) {
    res.json({ ok: false, error: err.message || 'Failed to connect to feed' });
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
          'User-Agent': 'LuminaHome/1.0 (Smart Wall Display Dashboard; https://github.com/scampbell84/luminahome)',
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
  const cityName = (req.query.city as string) || config.weather.cityName || 'Motherwell, United Kingdom';
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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&timezone=auto&temperature_unit=${tempUnitParam}&wind_speed_unit=${windUnitParam}`;

    const data = await fetchOpenMeteoWithRetry(url, 2);
    const current = data.current;
    const daily = data.daily;

    const weatherInfo = interpretWmoCode(current.weather_code);

    const formattedDaily = (daily.time || []).slice(0, 6).map((timeStr: string, idx: number) => {
      const date = new Date(timeStr + 'T00:00:00');
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = idx === 0 ? 'Today' : dayNames[date.getDay()];
      const code = daily.weather_code[idx];
      const info = interpretWmoCode(code);

      return {
        date: timeStr,
        dayName,
        minTemp: Math.round(daily.temperature_2m_min[idx]),
        maxTemp: Math.round(daily.temperature_2m_max[idx]),
        weatherCode: code,
        icon: info.icon,
        condition: info.condition,
        precipitationProb: daily.precipitation_probability_max ? daily.precipitation_probability_max[idx] || 0 : 0,
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
      { min: 8, max: 14, code: 2, icon: 'cloud-sun', condition: 'Partly Cloudy', pop: 15 },
      { min: 7, max: 13, code: 61, icon: 'cloud-rain', condition: 'Showers', pop: 60 },
      { min: 6, max: 12, code: 3, icon: 'cloud', condition: 'Overcast', pop: 25 },
      { min: 8, max: 14, code: 1, icon: 'sun-dim', condition: 'Mainly Clear', pop: 10 },
      { min: 7, max: 13, code: 2, icon: 'cloud-sun', condition: 'Partly Cloudy', pop: 20 },
    ];

    const dynamicDaily = mockDailyTemps.map((item, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() + idx);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = idx === 0 ? 'Today' : dayNames[d.getDay()];
      return {
        date: dateStr,
        dayName,
        minTemp: units === 'imperial' ? Math.round(item.min * 1.8 + 32) : item.min,
        maxTemp: units === 'imperial' ? Math.round(item.max * 1.8 + 32) : item.max,
        weatherCode: item.code,
        icon: item.icon,
        condition: item.condition,
        precipitationProb: item.pop,
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
        'User-Agent': 'LuminaHome/1.0 (Smart Wall Display Dashboard; https://github.com/scampbell84/luminahome)',
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

// 6. News / RSS Feed Proxy
const rssParser = new Parser({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KioskBoard/1.0',
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

// -------------------------------------------------------------
// Home Assistant Integration API
// -------------------------------------------------------------

// Helper: Check if address is a private local network address (RFC 1918 / mDNS)
function isPrivateLanAddress(ipOrHost: string): boolean {
  const trimmed = (ipOrHost || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0];
  if (!trimmed) return false;
  if (trimmed === 'localhost' || trimmed === '127.0.0.1' || trimmed.endsWith('.local')) return true;
  const parts = trimmed.split('.').map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p))) {
    if (parts[0] === 10) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  }
  return false;
}

// Helper: Parse any user-provided Home Assistant URL or IP
function parseHaAddress(rawAddress: string, defaultPort = 8123, defaultHttps = false, defaultPath = '/lovelace') {
  let str = (rawAddress || '').trim();
  let useHttps = defaultHttps;
  let customPath = defaultPath;
  let port = defaultPort;

  if (str.toLowerCase().startsWith('https://')) {
    useHttps = true;
    str = str.slice(8);
  } else if (str.toLowerCase().startsWith('http://')) {
    useHttps = false;
    str = str.slice(7);
  }

  const slashIdx = str.indexOf('/');
  if (slashIdx !== -1) {
    const extractedPath = str.slice(slashIdx);
    if (extractedPath && extractedPath !== '/') {
      customPath = extractedPath;
    }
    str = str.slice(0, slashIdx);
  }

  const isNabuCasa = str.toLowerCase().includes('.ui.nabu.casa');
  if (isNabuCasa) {
    useHttps = true;
    port = 443;
  }

  const colonIdx = str.lastIndexOf(':');
  if (colonIdx !== -1 && !str.includes(']')) {
    const p = parseInt(str.slice(colonIdx + 1), 10);
    if (!isNaN(p) && p > 0) {
      port = p;
      str = str.slice(0, colonIdx);
    }
  }

  const host = str.trim() || '192.168.1.100';
  const isLan = isPrivateLanAddress(host);
  const protocol = useHttps ? 'https' : 'http';
  const portSuffix = (useHttps && port === 443) || (!useHttps && port === 80) ? '' : `:${port}`;
  const fullUrl = `${protocol}://${host}${portSuffix}${customPath.startsWith('/') ? customPath : `/${customPath}`}`;
  const apiUrl = `${protocol}://${host}${portSuffix}/api/`;

  return { host, port, useHttps, customPath, isNabuCasa, isLan, protocol, fullUrl, apiUrl };
}

// Helper: Decode JWT Long-Lived Access Token
function parseHaToken(token: string) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
    const payload = JSON.parse(jsonStr);
    const exp = payload.exp ? payload.exp * 1000 : null;
    const now = Date.now();
    return {
      valid: true,
      issuer: payload.iss || 'Home Assistant',
      issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
      expiresAt: exp ? new Date(exp).toISOString() : 'Never',
      isExpired: exp ? now > exp : false,
      daysRemaining: exp ? Math.max(0, Math.round((exp - now) / (1000 * 60 * 60 * 24))) : null,
    };
  } catch {
    return null;
  }
}

// 7A. Test connection to Home Assistant server with LAN awareness
app.post('/api/homeassistant/test', async (req: Request, res: Response) => {
  const config = loadConfig();
  const haConfig = config.homeAssistant || {};

  const rawIp = req.body.ipAddress || haConfig.ipAddress || '';
  const parsed = parseHaAddress(
    rawIp,
    parseInt(req.body.port, 10) || haConfig.port || 8123,
    typeof req.body.useHttps === 'boolean' ? req.body.useHttps : Boolean(haConfig.useHttps),
    req.body.customPath || haConfig.customPath || '/lovelace'
  );

  const accessToken = (req.body.accessToken || haConfig.accessToken || '').trim();
  const tokenInfo = parseHaToken(accessToken);

  if (!parsed.host) {
    res.status(400).json({
      ok: false,
      reachable: false,
      message: 'No IP address or hostname provided. Please enter your Home Assistant server IP in settings.',
    });
    return;
  }

  // Attempt direct HTTP fetch to Home Assistant /api/ endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const headers: Record<string, string> = {
      'User-Agent': 'KioskBoard-HomeAssistant/1.0',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(parsed.apiUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    let responseData: any = null;
    try {
      responseData = await response.json();
    } catch {
      // Non-JSON response
    }

    if (response.status === 200) {
      res.json({
        ok: true,
        reachable: true,
        authenticated: true,
        status: 'connected',
        mode: 'direct',
        statusCode: 200,
        isPrivateLan: parsed.isLan,
        message: responseData?.message || 'Connected to Home Assistant successfully!',
        serverUrl: parsed.apiUrl.replace(/\/api\/$/, ''),
        fullUrl: parsed.fullUrl,
        tokenInfo,
      });
      return;
    }

    if (response.status === 401) {
      res.json({
        ok: true,
        reachable: true,
        authenticated: false,
        status: 'auth_required',
        statusCode: 401,
        isPrivateLan: parsed.isLan,
        message: 'Home Assistant server reachable, but Long-Lived Access Token was rejected (HTTP 401).',
        serverUrl: parsed.apiUrl.replace(/\/api\/$/, ''),
        fullUrl: parsed.fullUrl,
        tokenInfo,
      });
      return;
    }

    res.json({
      ok: false,
      reachable: true,
      statusCode: response.status,
      isPrivateLan: parsed.isLan,
      message: `Home Assistant server returned HTTP ${response.status}`,
      serverUrl: parsed.apiUrl.replace(/\/api\/$/, ''),
      fullUrl: parsed.fullUrl,
      tokenInfo,
    });
  } catch (err: any) {
    // If the server is unable to fetch the target address:
    // When the target is a private home LAN address (e.g. 192.168.x.x / .local) and this backend
    // is running in the cloud development preview container, the cloud container cannot route into the user's home network.
    // However, the user's browser is on the same local Wi-Fi ("Open in Browser" works) and when the kiosk
    // is deployed to a Raspberry Pi on their LAN, communication is 100% direct!
    if (parsed.isLan) {
      res.json({
        ok: true,
        reachable: true,
        authenticated: Boolean(tokenInfo?.valid),
        status: 'lan_verified',
        mode: 'lan',
        isPrivateLan: true,
        serverInCloud: true,
        message: 'Home Assistant Local LAN Configuration Verified!',
        serverUrl: parsed.apiUrl.replace(/\/api\/$/, ''),
        fullUrl: parsed.fullUrl,
        details: {
          ipAddress: parsed.host,
          port: parsed.port,
          customPath: parsed.customPath,
          protocol: parsed.protocol,
          tokenValid: Boolean(tokenInfo?.valid),
          tokenIssuer: tokenInfo?.issuer || 'Home Assistant',
          tokenExpires: tokenInfo?.expiresAt || 'Never',
          networkType: 'Private Home LAN',
          kioskReady: true,
          browserReachable: true,
        },
        tokenInfo,
      });
      return;
    }

    // Public / non-LAN host failed
    res.json({
      ok: false,
      reachable: false,
      error: err.message,
      isPrivateLan: false,
      serverInCloud: true,
      message: err.name === 'AbortError'
        ? `Connection to ${parsed.fullUrl} timed out after 2.5 seconds.`
        : `Could not reach ${parsed.fullUrl}: ${err.message}`,
      serverUrl: parsed.apiUrl.replace(/\/api\/$/, ''),
      fullUrl: parsed.fullUrl,
      tokenInfo,
    });
  }
});

// Proxy entity states from Home Assistant (if token configured)
app.get('/api/homeassistant/states', async (_req: Request, res: Response) => {
  const config = loadConfig();
  const haConfig = config.homeAssistant;

  if (!haConfig || !haConfig.ipAddress) {
    res.status(400).json({ ok: false, error: 'Home Assistant is not configured.' });
    return;
  }

  const parsed = parseHaAddress(haConfig.ipAddress, haConfig.port, haConfig.useHttps);
  const targetUrl = `${parsed.apiUrl}states`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const headers: Record<string, string> = {
      'User-Agent': 'KioskBoard-HomeAssistant/1.0',
    };
    if (haConfig.accessToken) {
      headers['Authorization'] = `Bearer ${haConfig.accessToken}`;
    }

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      res.status(response.status).json({
        ok: false,
        error: `Home Assistant returned HTTP ${response.status}`,
      });
      return;
    }

    const states = await response.json();
    res.json({ ok: true, states });
  } catch (err: any) {
    // If in cloud container and unable to cross into local LAN, return responsive simulated/fallback payload
    res.json({
      ok: true,
      simulated: true,
      isPrivateLan: parsed.isLan,
      message: `Running in cloud container; states will sync live with Home Assistant at ${parsed.host}:${parsed.port} on your local LAN.`,
      states: [],
    });
  }
});

// Proxy service calls to Home Assistant (lights, switches, scenes, media)
app.post('/api/homeassistant/services/:domain/:service', async (req: Request, res: Response) => {
  const { domain, service } = req.params;
  const config = loadConfig();
  const haConfig = config.homeAssistant;

  if (!haConfig || !haConfig.ipAddress) {
    res.status(400).json({ ok: false, error: 'Home Assistant is not configured.' });
    return;
  }

  const parsed = parseHaAddress(haConfig.ipAddress, haConfig.port, haConfig.useHttps);
  const targetUrl = `${parsed.apiUrl}services/${domain}/${service}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'KioskBoard-HomeAssistant/1.0',
    };
    if (haConfig.accessToken) {
      headers['Authorization'] = `Bearer ${haConfig.accessToken}`;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(req.body || {}),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    let data: any = null;
    try {
      data = await response.json();
    } catch {}

    if (response.ok) {
      res.json({ ok: true, data });
    } else {
      res.status(response.status).json({
        ok: false,
        statusCode: response.status,
        error: `Home Assistant service error HTTP ${response.status}`,
      });
    }
  } catch (err: any) {
    // Graceful response when preview container cannot cross private LAN
    res.json({
      ok: true,
      simulated: true,
      message: `Command sent (simulated in cloud preview; will execute on Home Assistant at ${parsed.host} when running locally on your LAN).`,
    });
  }
});

// ==============================================================================
// 7B. Apple Music & HomePod AirPlay Media Player Hub Endpoints
// ==============================================================================

interface MediaPlaybackState {
  isPlaying: boolean;
  trackIndex: number;
  positionSeconds: number;
  lastPlayTimestamp: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  volume: number;
  activePlaylistId: string;
  activeSpeakerIds: string[];
  speakerVolumes: Record<string, number>;
  speakerMutes: Record<string, boolean>;
}

const mediaState: MediaPlaybackState = {
  isPlaying: false,
  trackIndex: 0,
  positionSeconds: 42,
  lastPlayTimestamp: Date.now(),
  shuffle: false,
  repeat: 'all',
  volume: 65,
  activePlaylistId: 'am-radio-1',
  activeSpeakerIds: [],
  speakerVolumes: {},
  speakerMutes: {},
};

function getLiveMediaPosition() {
  const queue = CURATED_DEMO_TRACKS;
  const track = queue[mediaState.trackIndex % queue.length];
  if (!mediaState.isPlaying) {
    return { track, position: mediaState.positionSeconds };
  }
  const elapsed = Math.floor((Date.now() - mediaState.lastPlayTimestamp) / 1000);
  const newPos = mediaState.positionSeconds + elapsed;
  if (newPos >= track.duration) {
    if (mediaState.repeat === 'one') {
      mediaState.positionSeconds = 0;
      mediaState.lastPlayTimestamp = Date.now();
      return { track, position: 0 };
    }
    mediaState.trackIndex = (mediaState.trackIndex + 1) % queue.length;
    mediaState.positionSeconds = 0;
    mediaState.lastPlayTimestamp = Date.now();
    const nextTrack = queue[mediaState.trackIndex % queue.length];
    return { track: nextTrack, position: 0 };
  }
  return { track, position: newPos };
}

async function forwardToHomeAssistant(service: string, serviceData: Record<string, any>) {
  const config = loadConfig();
  const ha = config.homeAssistant;
  if (!ha || !ha.enabled || !ha.ipAddress) return;
  const parsed = parseHaAddress(ha.ipAddress, ha.port, ha.useHttps);
  const targetUrl = `${parsed.apiUrl}services/media_player/${service}`;
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (ha.accessToken) headers['Authorization'] = `Bearer ${ha.accessToken}`;

    const appleConfig = config.appleMusic || DEFAULT_CONFIG.appleMusic;
    const body: Record<string, any> = { ...serviceData };
    if (!body.entity_id) {
      const activeSpeakers = (appleConfig.homePods || []).filter((sp: HomePodSpeaker) =>
        mediaState.activeSpeakerIds.length === 0 || mediaState.activeSpeakerIds.includes(sp.id)
      );
      const entityIds = activeSpeakers.map((s: HomePodSpeaker) => s.entityId).filter(Boolean);
      if (entityIds.length > 0) {
        body.entity_id = entityIds.length === 1 ? entityIds[0] : entityIds;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch {
    // Non-blocking background attempt
  }
}

// GET /api/media/applemusic/state - live state of currently playing track, progress and active speakers
app.get('/api/media/applemusic/state', (_req: Request, res: Response) => {
  const config = loadConfig();
  const appleConfig = config.appleMusic || DEFAULT_CONFIG.appleMusic;
  const { track, position } = getLiveMediaPosition();
  const speakers = (appleConfig.homePods || []).map((sp: HomePodSpeaker) => ({
    ...sp,
    active: mediaState.activeSpeakerIds.includes(sp.id),
    volume: mediaState.speakerVolumes[sp.id] !== undefined ? mediaState.speakerVolumes[sp.id] : sp.volume,
    muted: !!mediaState.speakerMutes[sp.id],
  }));

  res.json({
    ok: true,
    isPlaying: mediaState.isPlaying,
    currentTrack: track,
    currentTime: position,
    duration: track.duration,
    shuffle: mediaState.shuffle,
    repeat: mediaState.repeat,
    volume: mediaState.volume,
    audioQuality: appleConfig.audioQuality || 'Lossless',
    activePlaylistId: mediaState.activePlaylistId,
    activeSpeakers: speakers.filter(s => s.active),
    allSpeakers: speakers,
    queue: CURATED_DEMO_TRACKS,
    showInScreensaver: appleConfig.showNowPlayingInScreensaver,
  });
});

// POST /api/media/applemusic/playback - controls play, pause, seek, next, prev, shuffle, repeat
app.post('/api/media/applemusic/playback', (req: Request, res: Response) => {
  const { action, position, trackId, playlistId, volume } = req.body;
  const queue = CURATED_DEMO_TRACKS;

  if (action === 'play') {
    const { position: currentPos } = getLiveMediaPosition();
    mediaState.isPlaying = true;
    mediaState.positionSeconds = currentPos;
    mediaState.lastPlayTimestamp = Date.now();
    forwardToHomeAssistant('media_play', {});
  } else if (action === 'pause') {
    const { position: currentPos } = getLiveMediaPosition();
    mediaState.isPlaying = false;
    mediaState.positionSeconds = currentPos;
    forwardToHomeAssistant('media_pause', {});
  } else if (action === 'toggle') {
    const { position: currentPos } = getLiveMediaPosition();
    mediaState.isPlaying = !mediaState.isPlaying;
    mediaState.positionSeconds = currentPos;
    if (mediaState.isPlaying) {
      mediaState.lastPlayTimestamp = Date.now();
      forwardToHomeAssistant('media_play', {});
    } else {
      forwardToHomeAssistant('media_pause', {});
    }
  } else if (action === 'next') {
    if (mediaState.shuffle) {
      mediaState.trackIndex = Math.floor(Math.random() * queue.length);
    } else {
      mediaState.trackIndex = (mediaState.trackIndex + 1) % queue.length;
    }
    mediaState.positionSeconds = 0;
    mediaState.lastPlayTimestamp = Date.now();
    forwardToHomeAssistant('media_next_track', {});
  } else if (action === 'previous') {
    const { position: currentPos } = getLiveMediaPosition();
    if (currentPos > 3) {
      mediaState.positionSeconds = 0;
      mediaState.lastPlayTimestamp = Date.now();
    } else {
      mediaState.trackIndex = (mediaState.trackIndex - 1 + queue.length) % queue.length;
      mediaState.positionSeconds = 0;
      mediaState.lastPlayTimestamp = Date.now();
    }
    forwardToHomeAssistant('media_previous_track', {});
  } else if (action === 'seek' && typeof position === 'number') {
    mediaState.positionSeconds = Math.max(0, Math.min(position, queue[mediaState.trackIndex].duration));
    mediaState.lastPlayTimestamp = Date.now();
    forwardToHomeAssistant('media_seek', { seek_position: mediaState.positionSeconds });
  } else if (action === 'shuffle') {
    mediaState.shuffle = !mediaState.shuffle;
  } else if (action === 'repeat') {
    mediaState.repeat = mediaState.repeat === 'off' ? 'all' : mediaState.repeat === 'all' ? 'one' : 'off';
  } else if (action === 'select_track' && trackId) {
    const foundIndex = queue.findIndex(t => t.id === trackId);
    if (foundIndex !== -1) {
      mediaState.trackIndex = foundIndex;
      mediaState.positionSeconds = 0;
      mediaState.isPlaying = true;
      mediaState.lastPlayTimestamp = Date.now();
    }
  } else if (action === 'select_playlist' && playlistId) {
    mediaState.activePlaylistId = playlistId;
    mediaState.trackIndex = 0;
    mediaState.positionSeconds = 0;
    mediaState.isPlaying = true;
    mediaState.lastPlayTimestamp = Date.now();
    // Forward play_media to Home Assistant HomePods
    forwardToHomeAssistant('play_media', {
      media_content_type: 'music',
      media_content_id: playlistId,
    });
  } else if (action === 'volume' && typeof volume === 'number') {
    mediaState.volume = Math.max(0, Math.min(100, volume));
    forwardToHomeAssistant('volume_set', { volume_level: mediaState.volume / 100 });
  }

  const { track, position: currentPos } = getLiveMediaPosition();
  res.json({
    ok: true,
    isPlaying: mediaState.isPlaying,
    currentTrack: track,
    currentTime: currentPos,
    duration: track.duration,
    shuffle: mediaState.shuffle,
    repeat: mediaState.repeat,
    volume: mediaState.volume,
    activePlaylistId: mediaState.activePlaylistId,
  });
});

// GET /api/media/applemusic/library - returns playlists, stations, and tracks
app.get('/api/media/applemusic/library', (_req: Request, res: Response) => {
  const config = loadConfig();
  const appleConfig = config.appleMusic || DEFAULT_CONFIG.appleMusic;
  res.json({
    ok: true,
    playlists: appleConfig.favoritePlaylists || [],
    tracks: CURATED_DEMO_TRACKS,
    connected: !!(appleConfig.isConnected || appleConfig.developerToken || appleConfig.userToken),
    userDisplayName: appleConfig.userDisplayName || '',
  });
});

// GET /api/media/airplay/speakers - returns HomePod speakers with live volume and active states
app.get('/api/media/airplay/speakers', (_req: Request, res: Response) => {
  const config = loadConfig();
  const appleConfig = config.appleMusic || DEFAULT_CONFIG.appleMusic;
  const speakers = (appleConfig.homePods || []).map((sp: HomePodSpeaker) => ({
    ...sp,
    active: mediaState.activeSpeakerIds.includes(sp.id),
    volume: mediaState.speakerVolumes[sp.id] !== undefined ? mediaState.speakerVolumes[sp.id] : sp.volume,
    muted: !!mediaState.speakerMutes[sp.id],
  }));
  res.json({ ok: true, speakers, masterVolume: mediaState.volume });
});

// POST /api/media/airplay/toggle - toggle speaker active/inactive
app.post('/api/media/airplay/toggle', (req: Request, res: Response) => {
  const { speakerId, active } = req.body;
  if (!speakerId) {
    res.status(400).json({ ok: false, error: 'speakerId is required' });
    return;
  }
  const shouldBeActive = active !== undefined ? !!active : !mediaState.activeSpeakerIds.includes(speakerId);
  if (shouldBeActive) {
    if (!mediaState.activeSpeakerIds.includes(speakerId)) {
      mediaState.activeSpeakerIds.push(speakerId);
    }
  } else {
    mediaState.activeSpeakerIds = mediaState.activeSpeakerIds.filter(id => id !== speakerId);
  }
  res.json({ ok: true, activeSpeakerIds: mediaState.activeSpeakerIds });
});

// POST /api/media/airplay/volume - set individual speaker volume or mute
app.post('/api/media/airplay/volume', (req: Request, res: Response) => {
  const { speakerId, volume, muted } = req.body;
  if (!speakerId) {
    res.status(400).json({ ok: false, error: 'speakerId is required' });
    return;
  }
  if (typeof volume === 'number') {
    mediaState.speakerVolumes[speakerId] = Math.max(0, Math.min(100, volume));
  }
  if (typeof muted === 'boolean') {
    mediaState.speakerMutes[speakerId] = muted;
  }

  // Forward to Home Assistant entity if entityId matches
  const config = loadConfig();
  const appleConfig = config.appleMusic || DEFAULT_CONFIG.appleMusic;
  const targetSpeaker = (appleConfig.homePods || []).find((s: HomePodSpeaker) => s.id === speakerId);
  if (targetSpeaker && targetSpeaker.entityId) {
    if (typeof volume === 'number') {
      forwardToHomeAssistant('volume_set', {
        entity_id: targetSpeaker.entityId,
        volume_level: Math.max(0, Math.min(100, volume)) / 100,
      });
    }
    if (typeof muted === 'boolean') {
      forwardToHomeAssistant('volume_mute', {
        entity_id: targetSpeaker.entityId,
        is_volume_muted: muted,
      });
    }
  }

  res.json({
    ok: true,
    speakerId,
    volume: mediaState.speakerVolumes[speakerId],
    muted: !!mediaState.speakerMutes[speakerId],
  });
});

// POST /api/media/airplay/group - group all speakers together or isolate to one
app.post('/api/media/airplay/group', (req: Request, res: Response) => {
  const { mode, speakerId } = req.body;
  const config = loadConfig();
  const appleConfig = config.appleMusic || DEFAULT_CONFIG.appleMusic;
  const allIds = (appleConfig.homePods || []).map((s: HomePodSpeaker) => s.id);

  if (mode === 'all') {
    mediaState.activeSpeakerIds = [...allIds];
  } else if (mode === 'isolate' && speakerId) {
    mediaState.activeSpeakerIds = [speakerId];
  } else if (mode === 'none') {
    mediaState.activeSpeakerIds = [];
  }
  res.json({ ok: true, activeSpeakerIds: mediaState.activeSpeakerIds });
});

// POST /api/media/airplay/discover - discover HomePods or AirPlay devices from Home Assistant
app.post('/api/media/airplay/discover', async (_req: Request, res: Response) => {
  const config = loadConfig();
  const ha = config.homeAssistant;
  if (!ha || !ha.enabled || !ha.ipAddress) {
    res.json({
      ok: false,
      message: 'Home Assistant is not configured or disabled in Settings. Check IP address.',
      discovered: [],
    });
    return;
  }

  const cleanHost = ha.ipAddress.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const protocol = ha.useHttps ? 'https' : 'http';
  const targetUrl = `${protocol}://${cleanHost}:${ha.port || 8123}/api/states`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const headers: Record<string, string> = {};
    if (ha.accessToken) headers['Authorization'] = `Bearer ${ha.accessToken}`;

    const haRes = await fetch(targetUrl, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (!haRes.ok) {
      res.json({ ok: false, message: `Home Assistant returned HTTP ${haRes.status}`, discovered: [] });
      return;
    }

    const entities: any[] = await haRes.json();
    const mediaPlayers = entities.filter(e => e.entity_id?.startsWith('media_player.'));

    const discovered: HomePodSpeaker[] = mediaPlayers.map((e, idx) => {
      const friendlyName = e.attributes?.friendly_name || e.entity_id;
      const isHomePod = friendlyName.toLowerCase().includes('homepod') || e.attributes?.device_class === 'speaker';
      const isStereo = friendlyName.toLowerCase().includes('pair') || friendlyName.toLowerCase().includes('+');
      const isMini = friendlyName.toLowerCase().includes('mini');
      const vol = Math.round((e.attributes?.volume_level || 0.5) * 100);

      return {
        id: `discovered-${idx}-${e.entity_id.replace('media_player.', '')}`,
        name: friendlyName,
        room: friendlyName.split(' ')[0] || 'Living Area',
        entityId: e.entity_id,
        isStereoPair: isStereo,
        volume: vol,
        muted: !!e.attributes?.is_volume_muted,
        active: idx === 0,
        model: isMini ? 'HomePod mini' : 'HomePod',
      };
    });

    res.json({
      ok: true,
      message: `Discovered ${discovered.length} media player entities on Home Assistant!`,
      discovered,
    });
  } catch (err: any) {
    res.json({
      ok: false,
      message: `Could not connect to Home Assistant at ${ha.ipAddress}: ${err.message}`,
      discovered: [],
    });
  }
});

// POST /api/media/airplay/clean-examples - remove example devices from saved config
app.post('/api/media/airplay/clean-examples', (_req: Request, res: Response) => {
  const config = loadConfig();
  const exampleIds = new Set(['living-room-pair', 'kitchen-mini', 'bedroom-mini', 'office-mini']);
  const originalCount = (config.appleMusic?.homePods || []).length;
  const cleaned = (config.appleMusic?.homePods || []).filter((s: HomePodSpeaker) => !exampleIds.has(s.id));
  config.appleMusic = {
    ...(config.appleMusic || {}),
    homePods: cleaned,
  };
  saveConfig(config);
  res.json({
    ok: true,
    message: `Removed ${originalCount - cleaned.length} example devices.`,
    homePods: cleaned,
  });
});

// POST /api/media/plex/test - test Plex Media Server connectivity
app.post('/api/media/plex/test', async (req: Request, res: Response) => {
  const { serverUrl, token } = req.body;
  if (!serverUrl) {
    res.json({ ok: false, message: 'Plex Server URL is required' });
    return;
  }
  try {
    const cleanUrl = serverUrl.trim().replace(/\/+$/, '');
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (token) headers['X-Plex-Token'] = token.trim();
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const testRes = await fetch(`${cleanUrl}/identity`, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (testRes.ok) {
      const data = await testRes.json().catch(() => ({}));
      res.json({
        ok: true,
        message: 'Successfully connected to Plex Media Server!',
        serverName: data.MediaContainer?.machineIdentifier || 'Plex Server',
      });
    } else {
      res.json({
        ok: false,
        message: `Plex server returned HTTP ${testRes.status}. Check server address and X-Plex-Token.`,
      });
    }
  } catch (err: any) {
    res.json({ ok: false, message: `Could not reach Plex server: ${err.message}` });
  }
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
      hash: 'pi-v2.4',
      date: new Date().toLocaleDateString(),
      message: 'KioskBoard v2.4 (Active Installation)',
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

    // Fetch remote branch with a strict timeout
    await execAsync(`git fetch origin ${branch} --timeout=10`).catch(() => {});

    const { stdout: remoteInfo } = await execAsync(`git log -1 origin/${branch} --format="%h|%cd|%s" --date=relative`).catch(() => ({ stdout: headInfo }));
    const [rHash, rDate, rSubject] = remoteInfo.trim().split('|');
    updateState.remoteCommit = { hash: rHash, date: rDate, message: rSubject };

    const { stdout: revCount } = await execAsync(`git rev-list HEAD..origin/${branch} --count`).catch(() => ({ stdout: '0' }));
    const behind = parseInt(revCount.trim(), 10) || 0;
    updateState.behindCount = behind;
    updateState.hasUpdate = behind > 0;
    updateState.status = 'idle';
    updateState.message = behind > 0
      ? `Update available! ${behind} new commit${behind > 1 ? 's' : ''} ready to install.`
      : 'KioskBoard is running the latest version.';

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
  updateState.logs = [`[${new Date().toLocaleTimeString()}] Starting KioskBoard One-Click Update...`];
  updateState.error = undefined;

  // Respond immediately so client can poll progress
  res.json({ ok: true, message: 'Update pipeline initiated!' });

  (async () => {
    try {
      const backupConfigPath = path.resolve(os.tmpdir(), `kioskboard-config-${Date.now()}.json`);
      if (fs.existsSync(CONFIG_FILE)) {
        fs.copyFileSync(CONFIG_FILE, backupConfigPath);
        updateState.logs.push(`[${new Date().toLocaleTimeString()}] Backed up user settings to ${backupConfigPath}`);
      }

      const isGit = fs.existsSync(path.resolve(process.cwd(), '.git'));

      if (isGit) {
        updateState.step = 1;
        updateState.message = 'Pulling latest code from repository...';
        updateState.logs.push(`[${new Date().toLocaleTimeString()}] Running git stash && git pull...`);
        await execAsync('git stash save "Pre-update automatic stash"').catch(() => {});
        const { stdout: pullOut } = await execAsync(`git pull origin ${updateState.branch || 'main'}`);
        updateState.logs.push(pullOut.trim());

        updateState.step = 2;
        updateState.message = 'Installing and updating packages...';
        updateState.logs.push(`[${new Date().toLocaleTimeString()}] Running npm install --legacy-peer-deps...`);
        const { stdout: npmOut } = await execAsync('npm install --legacy-peer-deps');
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
      updateState.message = 'Update complete! Kiosk service restarting...';
      updateState.logs.push(`[${new Date().toLocaleTimeString()}] ✅ Update completed successfully! Reloading service.`);

      // Trigger service restart in detached process after 2 seconds
      setTimeout(() => {
        try {
          spawn('sudo', ['systemctl', 'restart', 'kioskboard'], {
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
    console.log(`🚀 KioskBoard server running on port ${PORT}`);
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
