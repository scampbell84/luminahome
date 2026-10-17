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
  alerts?: WeatherAlert[];
  activeAlert?: WeatherAlert | null;
  daily: Array<{
    date: string;
    dayName: string;
    minTemp: number;
    maxTemp: number;
    weatherCode: number;
    icon: string;
    condition: string;
    precipitationProb: number;
  }>;
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

export interface AppConfig {
  general: {
    orientation: 'landscape' | 'portrait';
    theme: 'dark' | 'midnight' | 'slate' | 'oled-black' | 'woodland';
    backgroundType: 'preset' | 'unsplash' | 'custom_url' | 'solid';
    presetWallpaper: string;
    unsplashKeyword: string;
    customBackgroundUrl: string;
    backgroundDim: number; // 0.0 to 0.9
    backgroundBlur: number; // 0 to 10
    rotateBackgroundInterval: number; // minutes, 0 = disabled
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
  };
  notes: {
    enabled: boolean;
    mode: 'quote' | 'custom_note' | 'checklist';
    customNote: string;
    checklist: ChecklistItem[];
    quoteCategory: 'inspirational' | 'stoic' | 'wisdom' | 'tech';
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
