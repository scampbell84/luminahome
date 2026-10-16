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
      mediaPlayer?: WidgetZone;
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
    title: string;
    targetDate: string; // ISO date format
    icon: string;
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
    weatherWidgetView?: 'current' | 'humidity' | 'forecast'; // Default view for HomeView Weather Widget
    showWeatherWidget?: boolean; // Enable/disable dedicated weather widget in screensaver
  };
  homeAssistant: HomeAssistantConfig;
  appleMusic: AppleMusicConfig;
  spotify?: SpotifyConfig;
  plex?: PlexConfig;
  activeMediaSource?: 'apple' | 'spotify' | 'plex';
}

export interface SpotifyConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  connected?: boolean;
  username?: string;
  embedUri?: string; // Spotify URI e.g. spotify:playlist:...
}

export interface PlexConfig {
  enabled: boolean;
  serverUrl?: string; // e.g. http://192.168.1.100:32400
  token?: string;     // X-Plex-Token
  connected?: boolean;
  serverName?: string;
  musicSectionId?: string;
}

export interface HomePodSpeaker {
  id: string;
  name: string;
  room: string;
  entityId: string; // e.g. media_player.living_room_homepod
  isStereoPair?: boolean;
  volume: number; // 0 - 100
  muted: boolean;
  active: boolean; // currently routing audio to this speaker
  ipAddress?: string;
  model?: 'HomePod' | 'HomePod mini';
}

export interface AppleMusicTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
  duration: number; // in seconds
  audioQuality?: 'Lossless' | 'Dolby Atmos' | 'Hi-Res Lossless' | 'High Quality';
  streamUrl?: string;
}

export interface AppleMusicPlaylist {
  id: string;
  title: string;
  subtitle: string;
  artworkUrl: string;
  trackCount: number;
  type: 'playlist' | 'station' | 'album';
  tracks?: AppleMusicTrack[];
}

export interface AppleMusicConfig {
  enabled: boolean;
  developerToken?: string;
  userToken?: string;
  isConnected?: boolean;
  userDisplayName?: string;
  appleIdEmail?: string;
  defaultSpeakerId?: string;
  homePods: HomePodSpeaker[];
  favoritePlaylists: AppleMusicPlaylist[];
  audioQuality: 'Lossless' | 'Dolby Atmos' | 'Hi-Res Lossless' | 'High Quality';
  showNowPlayingInScreensaver: boolean;
}

export interface HomeAssistantConfig {
  enabled: boolean;
  ipAddress: string; // IP or hostname, e.g. "192.168.1.100" or "homeassistant.local"
  port: number; // default: 8123
  useHttps: boolean; // default: false
  customPath: string; // e.g. "/lovelace" or "/lovelace-kiosk"
  kioskMode: boolean; // whether to append ?kiosk query param
  accessToken?: string; // Long-Lived Access Token for REST/WebSocket
  viewMode?: 'embed' | 'cards' | 'split'; // Iframe embed, native touch cards, or split view
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
  memoryMb: {
    free: number;
    total: number;
    used: number;
  };
  networkInterfaces: Array<{
    name: string;
    address: string;
    family: string;
  }>;
  displayUrl: string;
  adminUrl: string;
  serverTime: string;
}
