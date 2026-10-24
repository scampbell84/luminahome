export interface CalendarFeed {
  id: string;
  name: string;
  url: string;
  color: string;
  enabled: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  allDay: boolean;
  location?: string;
  description?: string;
  calendarId: string;
  calendarName: string;
  color: string;
  isLocal?: boolean;
}

export interface WeatherAlert {
  id: string;
  event: string;
  headline: string;
  severity: 'advisory' | 'watch' | 'warning' | 'extreme';
  description?: string;
  instruction?: string;
  source?: string;
  effective?: string;
  expires?: string;
  color?: 'amber' | 'red' | 'yellow' | 'orange';
}

export interface HourlyPoint {
  time: string; // ISO string e.g. "2026-10-22T14:00"
  hour: number; // 0 to 23
  hourLabel: string; // "14:00" or "2 PM"
  temp: number;
  apparentTemp: number;
  precipitationProb: number; // 0 to 100%
  precipitationAmount: number; // in mm or in
  weatherCode: number;
  condition: string;
  icon: string;
  isDay: boolean;
}

export interface DetailedDailyForecast {
  date: string;
  dayName: string;
  shortDay: string;
  dayInitial: string;
  dayNum: number;
  minTemp: number;
  maxTemp: number;
  weatherCode: number;
  icon: string;
  condition: string;
  precipitationProb: number;
  precipitationAmount?: number;
  yesterdayMinTemp?: number;
  yesterdayMaxTemp?: number;
  summaryText?: string;
  hourly?: HourlyPoint[];
}

export interface WeatherData {
  city: string;
  temp: number;
  apparentTemp: number;
  condition: string;
  weatherCode: number;
  icon: string;
  humidity: number;
  windSpeed: number;
  windUnit: string;
  tempUnit: string;
  uvIndex?: number;
  precipitationProb?: number;
  past24hPrecipitation?: number;
  next24hPrecipitation?: number;
  alerts?: WeatherAlert[];
  activeAlert?: WeatherAlert | null;
  daily: DetailedDailyForecast[];
  lastUpdated: string;
}

export interface NewsItem {
  id: string;
  title: string;
  link?: string;
  pubDate?: string;
  source?: string;
  snippet?: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export type WidgetZone = 
  | 'top-left' 
  | 'top-right' 
  | 'center-left' 
  | 'center-right' 
  | 'bottom-left' 
  | 'bottom-right' 
  | 'bottom-bar'
  | 'sidebar';

export type CalendarTheme = 'default' | 'minimal' | 'glass' | 'vibrant' | 'monochrome' | 'warm' | 'nordic' | 'forest';
export type CalendarStartOfWeek = 'monday' | 'sunday';

export interface CalendarHolidayToggles {
  us?: boolean;
  uk?: boolean;
  scotland?: boolean;
  canada?: boolean;
  australia?: boolean;
  germany?: boolean;
  france?: boolean;
  ireland?: boolean;
  spain?: boolean;
  italy?: boolean;
  netherlands?: boolean;
  newzealand?: boolean;
}

export interface CountdownItem {
  id: string;
  title: string;
  targetDate: string; // ISO date format or YYYY-MM-DD / YYYY-MM-DDTHH:mm
  icon: string;
  annual?: boolean; // Toggles 'Annual' recurring events (birthdays, anniversaries)
}

export interface ICloudPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  caption?: string;
  dateCreated?: string;
}

export interface AppConfig {
  general: {
    orientation: 'landscape' | 'portrait';
    theme: 'dark' | 'midnight' | 'slate' | 'oled-black' | 'woodland';
    backgroundType: 'preset' | 'unsplash' | 'custom_url' | 'solid' | 'icloud_album';
    presetWallpaper: string;
    unsplashKeyword: string;
    customBackgroundUrl: string;
    backgroundDim: number; // 0.0 to 0.9
    backgroundBlur: number; // 0 to 10
    rotateBackgroundInterval: number; // minutes, 0 = disabled
    icloudAlbumUrl?: string; // Apple Photos iCloud Shared Album URL
    icloudCycleMinutes?: number; // 1, 3, 5, 10, 15, 30, etc.
    icloudBrightness?: number; // 10 to 100 percent
    icloudBlur?: number; // 0 to 25 px
    photoFocalBias?: 'face_bias' | 'top' | 'center' | 'custom'; // Smart framing focus point
    photoFocalOffsetY?: number; // 0 to 100 percentage (default: 20 for face bias)
    kioskHideCursor: boolean;
    heartbeatIntervalSeconds: number;
    fontSizeScale: 'sm' | 'md' | 'lg' | 'xl';
  };
  layout: {
    widgetZones: {
      clock: WidgetZone;
      weather: WidgetZone;
      calendar: WidgetZone;
      news: WidgetZone;
      countdown: WidgetZone;
      notes: WidgetZone;
      system: WidgetZone;
    };
    gridColumns: number; // 12 columns by default
    gridItems?: Array<{
      i: string;
      x: number;
      y: number;
      w: number;
      h: number;
      minW?: number;
      minH?: number;
    }>;
  };
  clock: {
    enabled: boolean;
    style: 'digital' | 'analog' | 'minimal';
    format24: boolean;
    showSeconds: boolean;
    showDate: boolean;
    timezone: string;
  };
  weather: {
    enabled: boolean;
    cityName: string;
    latitude: number;
    longitude: number;
    units: 'imperial' | 'metric';
    show5Day: boolean;
    refreshIntervalMinutes: number;
    showAlertBadge?: boolean;
    testAlert?: boolean;
  };
  calendar: {
    enabled: boolean;
    view: 'split' | 'agenda' | 'month';
    theme?: CalendarTheme;
    startOfWeek?: CalendarStartOfWeek;
    holidays?: CalendarHolidayToggles;
    maxAgendaDays: number;
    maxAgendaItems: number;
    showPastEventsToday: boolean;
    feeds: CalendarFeed[];
    refreshIntervalMinutes: number;
    showLegend?: boolean; // Toggles feed badges/type legend in widget header (default: false / off)
    allowTouchCreation?: boolean; // Allows adding events directly via touch screen (default: true)
  };
  news: {
    enabled: boolean;
    feedUrl: string;
    feedName: string;
    displayMode: 'ticker' | 'card';
    maxItems: number;
    cycleSeconds: number;
    refreshIntervalMinutes: number;
  };
  countdown: {
    enabled: boolean;
    title?: string;
    targetDate?: string;
    icon?: string;
    annual?: boolean;
    items?: CountdownItem[];
    displayMode?: 'days' | 'full'; // 'days' = shows only number of days until event (default), 'full' = days, hours, mins, secs
  };
  notes: {
    enabled: boolean;
    mode: 'quote' | 'custom_note' | 'checklist';
    customNote: string;
    checklist: ChecklistItem[];
    quoteCategory: 'inspirational' | 'stoic' | 'wisdom' | 'tech';
  };
  briefing: {
    enabled: boolean;
    morningStartHour?: number; // e.g. 5 (5:00 AM)
    eveningStartHour?: number; // e.g. 17 (5:00 PM)
    showInHeader: boolean;
    enableVoicePlayback: boolean;
    useAiSynthesis: boolean;
    autoPopup?: boolean; // Auto-display briefing overlay at scheduled times (default: true)
    morningTime?: string; // e.g. "07:00" (default: 7:00 AM)
    afternoonTime?: string; // e.g. "12:00" (default: 12:00 PM)
    eveningTime?: string; // e.g. "16:30" (default: 4:30 PM)
  };
  system: {
    enabled: boolean;
    showIp: boolean;
    showUptime: boolean;
  };
  screensaver: {
    enabled: boolean;
    idleTimeoutMinutes: number; // Idle time in minutes before screensaver turns on (e.g. 1, 2, 3, 5, 10, 15, 30; 0 = disabled)
    style: 'standby-duo' | 'weather-focus' | 'photo-art' | 'bold-digital' | 'classic-analog' | 'cosmic-glow' | 'night-stand';
    artworkCategory: 'all' | 'nature' | 'architecture' | 'space' | 'abstract';
    clockColor: 'sunset' | 'glacier' | 'emerald' | 'white' | 'crimson' | 'lavender';
    showWeatherComplication: boolean;
    showCalendarComplication: boolean;
    showBinReminder: boolean;
    autoNightMode: boolean; // Auto-switches to red monochrome night mode after 10 PM
    artCycleSeconds: number; // Frequency to rotate artwork photos
    dimLevel: number; // 0 to 60 percent screen dimming for ambient comfort
    nightMode?: boolean; // Manual toggle: forces ultra-dim red monochrome night mode
    nightModeDimLevel?: number; // 50 to 95 percent ultra-dim brightness level for night mode (default: 80)
    nightModeScheduleEnabled?: boolean; // Enable automatic time-based night mode schedule
    nightModeStartTime?: string; // Time of day to activate night mode (HH:mm, e.g. "22:00")
    nightModeEndTime?: string; // Time of day to deactivate night mode (HH:mm, e.g. "07:00")
    nightModePixelShift?: boolean; // Subtle anti-burn-in micro-drift for OLED/LCD screens
    weatherWidgetView?: 'current' | 'humidity' | 'forecast'; // Default view for HomeView Weather Widget
    showWeatherWidget?: boolean; // Enable/disable dedicated weather widget in screensaver
    backgroundType?: 'liquid-glow' | 'icloud_album' | 'solid'; // Background style for screensaver
    icloudAlbumUrl?: string; // Dedicated screensaver album URL (falls back to general.icloudAlbumUrl)
    icloudCycleMinutes?: number; // 1, 3, 5, 10, 15, 30 min
    photoBrightness?: number; // 10 to 100 percent (default 40%)
    photoBlur?: number; // 0 to 25 px (default 4px)
    photoFocalBias?: 'face_bias' | 'top' | 'center' | 'custom'; // Smart framing focus point
    photoFocalOffsetY?: number; // 0 to 100 percentage (default: 20 for face bias)
  };
  party?: PartyConfig;
}

export type PartyAccentColor = 'gold' | 'neon-pink' | 'emerald' | 'cyan' | 'purple' | 'amber';
export type PartyEffect = 'confetti' | 'sparkles' | 'none';

export interface PartyConfig {
  enabled: boolean;
  active: boolean; // Whether party screen is currently launched
  title: string; // e.g. "Happy 30th Birthday, Sarah!"
  subtitle?: string; // e.g. "Eat, drink, dance & celebrate with us!"
  accentColor: PartyAccentColor;
  effects: PartyEffect;
  photos: {
    sourceType: 'icloud_album' | 'wallpaper_sync' | 'sample';
    icloudAlbumUrl?: string; // Dedicated event photo album or syncs with main album
    cycleSeconds: number; // 5 to 60 seconds
    photoBrightness?: number; // 20% to 100%
    photoBlur?: number; // 0 to 20 px
    photoFocalOffsetY?: number; // Face-bias framing offset (default 20%)
  };
  wifi: {
    enabled: boolean;
    networkName: string;
    password: string;
    securityType?: 'WPA' | 'WEP' | 'nopass';
  };
  music: {
    enabled: boolean;
    title: string; // e.g. "Tonight's House Party Mix"
    playlistUrl?: string; // Spotify / Apple Music / YouTube Music URL
    djNote?: string; // e.g. "Scan to open playlist & queue songs"
  };
}

export type ScreenSaverStyle = 'standby-duo' | 'weather-focus' | 'photo-art' | 'bold-digital' | 'classic-analog' | 'cosmic-glow' | 'night-stand';
export type ScreenSaverArtworkCategory = 'all' | 'nature' | 'architecture' | 'space' | 'abstract';
export type ScreenSaverClockColor = 'sunset' | 'glacier' | 'emerald' | 'white' | 'crimson' | 'lavender';
export type ScreensaverWeatherWidgetView = 'current' | 'humidity' | 'forecast';


export interface SystemInfo {
  hostname: string;
  platform: string;
  uptimeSeconds: number;
  nodeVersion: string;
  appVersion?: string;
  memoryMb: {
    free: number;
    total: number;
    used: number;
    usedPercentage?: number;
  };
  cpu?: {
    model: string;
    cores: number;
    loadAverage: number[];
    temperatureCelsius?: number | null;
  };
  disk?: {
    totalGb: number;
    freeGb: number;
    usedGb: number;
    usedPercentage: number;
  } | null;
  networkInterfaces: Array<{
    name: string;
    address: string;
    family: string;
  }>;
  displayUrl: string;
  adminUrl: string;
  serverTime: string;
  repoUrl?: string;
  repoSlug?: string;
}
