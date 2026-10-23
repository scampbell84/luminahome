import { AppConfig, CalendarTheme } from '../types/config';

export const DEFAULT_CONFIG: AppConfig = {
  general: {
    orientation: 'landscape',
    theme: 'dark',
    backgroundType: 'preset',
    presetWallpaper: 'mountain-lake',
    unsplashKeyword: 'nature,mountain,minimal,dark',
    customBackgroundUrl: '',
    backgroundDim: 0.45,
    backgroundBlur: 0,
    rotateBackgroundInterval: 30,
    icloudAlbumUrl: '',
    icloudCycleMinutes: 3,
    icloudBrightness: 50,
    icloudBlur: 0,
    photoFocalBias: 'face_bias',
    photoFocalOffsetY: 20,
    kioskHideCursor: true,
    heartbeatIntervalSeconds: 30,
    fontSizeScale: 'md',
  },
  layout: {
    widgetZones: {
      clock: 'top-left',
      weather: 'top-right',
      calendar: 'center-left',
      notes: 'center-right',
      countdown: 'bottom-right',
      system: 'bottom-left',
      news: 'bottom-bar',
    },
    gridColumns: 12,
    gridItems: [
      { i: 'clock', x: 0, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
      { i: 'weather', x: 6, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
      { i: 'calendar', x: 0, y: 3, w: 8, h: 6, minW: 4, minH: 3 },
      { i: 'countdown', x: 8, y: 3, w: 4, h: 6, minW: 3, minH: 1 },
      { i: 'notes', x: 8, y: 5, w: 4, h: 4, minW: 3, minH: 2 },
      { i: 'news', x: 0, y: 9, w: 12, h: 2, minW: 4, minH: 1 },
    ],
  },
  clock: {
    enabled: true,
    style: 'digital',
    format24: false,
    showSeconds: true,
    showDate: true,
    timezone: 'auto',
  },
  weather: {
    enabled: true,
    cityName: 'London, United Kingdom',
    latitude: 51.5074,
    longitude: -0.1278,
    units: 'metric',
    show5Day: true,
    refreshIntervalMinutes: 30,
    showAlertBadge: true,
    testAlert: false,
  },
  calendar: {
    enabled: true,
    view: 'split',
    theme: 'default',
    startOfWeek: 'monday',
    holidays: {
      uk: true,
      us: false,
    },
    maxAgendaDays: 14,
    maxAgendaItems: 8,
    showPastEventsToday: false,
    feeds: [
      {
        id: 'feed-family',
        name: 'Family & Home',
        url: '', // User can add Google/iCloud/Outlook URL
        color: '#38bdf8', // Sky blue
        enabled: true,
      },
      {
        id: 'feed-work',
        name: 'Work & Projects',
        url: '',
        color: '#a855f7', // Purple
        enabled: true,
      },
      {
        id: 'feed-uk-holidays',
        name: 'UK Bank Holidays',
        url: 'https://www.gov.uk/bank-holidays/england-and-wales.ics',
        color: '#34d399', // Emerald
        enabled: true,
      },
    ],
    refreshIntervalMinutes: 15,
    showLegend: false,
    allowTouchCreation: true,
  },
  news: {
    enabled: true,
    feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    feedName: 'BBC World News',
    displayMode: 'ticker',
    maxItems: 12,
    cycleSeconds: 15,
    refreshIntervalMinutes: 30,
  },
  countdown: {
    enabled: true,
    displayMode: 'days',
    title: 'Summer Vacation & Road Trip',
    targetDate: '2026-11-26T00:00:00',
    icon: 'plane',
    annual: false,
    items: [
      {
        id: 'countdown-vacation',
        title: 'Summer Vacation & Road Trip',
        targetDate: '2026-11-26T00:00:00',
        icon: 'plane',
        annual: false,
      },
      {
        id: 'countdown-birthday',
        title: "Family Birthday Celebration",
        targetDate: '2026-10-17T00:00:00',
        icon: 'gift',
        annual: true,
      },
      {
        id: 'countdown-anniversary',
        title: 'Wedding Anniversary',
        targetDate: '2026-12-14T00:00:00',
        icon: 'heart',
        annual: true,
      },
      {
        id: 'countdown-newyear',
        title: "New Year's Eve",
        targetDate: '2026-12-31T23:59:59',
        icon: 'party',
        annual: true,
      },
    ],
  },
  notes: {
    enabled: true,
    mode: 'quote',
    customNote: '• Water the indoor plants\n• Groceries: Organic milk, sourdough, apples\n• Family movie night Friday at 7:30 PM',
    checklist: [
      { id: '1', text: 'Water the plants', completed: false },
      { id: '2', text: 'Pick up dry cleaning', completed: false },
      { id: '3', text: 'Trash day tomorrow morning', completed: true },
    ],
    quoteCategory: 'inspirational',
  },
  briefing: {
    enabled: true,
    morningStartHour: 5,
    eveningStartHour: 17,
    showInHeader: false, // Displays as a popup/overlay on the home screen
    enableVoicePlayback: true,
    useAiSynthesis: true,
    autoPopup: true,
    morningTime: '07:00', // 7:00 AM default
    afternoonTime: '12:00', // 12:00 PM default
    eveningTime: '16:30', // 4:30 PM default
  },
  system: {
    enabled: true,
    showIp: true,
    showUptime: true,
  },
  screensaver: {
    enabled: true,
    idleTimeoutMinutes: 3, // Idle after 3 minutes
    style: 'standby-duo',
    artworkCategory: 'nature',
    clockColor: 'sunset',
    showWeatherComplication: true,
    showCalendarComplication: true,
    showBinReminder: true,
    autoNightMode: false,
    artCycleSeconds: 30,
    dimLevel: 10,
    nightMode: false,
    nightModeDimLevel: 80,
    nightModeScheduleEnabled: false,
    nightModeStartTime: '22:00',
    nightModeEndTime: '07:00',
    nightModePixelShift: true,
    weatherWidgetView: 'current',
    showWeatherWidget: true,
    backgroundType: 'liquid-glow',
    icloudAlbumUrl: '',
    icloudCycleMinutes: 3,
    photoBrightness: 40,
    photoBlur: 4,
    photoFocalBias: 'face_bias',
    photoFocalOffsetY: 20,
  },
};

export const DEFAULT_ICLOUD_SAMPLE_PHOTOS: Array<{
  id: string;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  caption: string;
  dateCreated: string;
}> = [
  {
    id: 'demo-photo-1',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2560&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=70',
    width: 2560,
    height: 1440,
    caption: 'Alpine Lake Twilight Reflections',
    dateCreated: '2026-08-15T18:24:00Z',
  },
  {
    id: 'demo-photo-2',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=2560&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=70',
    width: 2560,
    height: 1440,
    caption: 'Emerald Mountain Pass',
    dateCreated: '2026-07-22T11:05:00Z',
  },
  {
    id: 'demo-photo-3',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2560&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=70',
    width: 2560,
    height: 1440,
    caption: 'Misty Redwood Forest Cathedral',
    dateCreated: '2026-09-03T09:40:00Z',
  },
  {
    id: 'demo-photo-4',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=2560&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=400&q=70',
    width: 2560,
    height: 1440,
    caption: 'Sunset Dunes & Whispering Sands',
    dateCreated: '2026-05-18T19:50:00Z',
  },
  {
    id: 'demo-photo-5',
    url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2560&q=85',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=70',
    width: 2560,
    height: 1440,
    caption: 'Starry Mountain Night & Galactic Arc',
    dateCreated: '2026-08-30T23:12:00Z',
  },
];

export interface ScreenSaverArtItem {
  id: string;
  title: string;
  location: string;
  category: 'nature' | 'architecture' | 'space' | 'abstract';
  url: string;
  fallbackGradient: string;
}

export const SCREENSAVER_ARTWORK_PRESETS: ScreenSaverArtItem[] = [
  // Nature & Earth
  {
    id: 'nature-1',
    title: 'Alpine Twilight & Mirror Peaks',
    location: 'Yosemite National Park, California',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-amber-900/60 via-slate-900 to-sky-950',
  },
  {
    id: 'nature-2',
    title: 'Misty Redwood Sanctuary',
    location: 'Pacific Northwest',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-emerald-950 via-teal-950 to-slate-950',
  },
  {
    id: 'nature-3',
    title: 'Golden Horizon & Whispering Dunes',
    location: 'Namib Desert',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-amber-950 via-orange-950 to-stone-950',
  },
  {
    id: 'nature-4',
    title: 'Emerald Moraine Reflections',
    location: 'Banff, Canadian Rockies',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-teal-950 via-cyan-950 to-slate-950',
  },
  {
    id: 'nature-5',
    title: 'Kyoto Bamboo Solitude',
    location: 'Arashiyama, Kyoto',
    category: 'nature',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-emerald-900 via-stone-900 to-slate-950',
  },

  // Modern Architecture & Geometry
  {
    id: 'arch-1',
    title: 'Sculptural Concrete Arches & Shadows',
    location: 'Modernist Pavilion',
    category: 'architecture',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-stone-900 via-neutral-900 to-zinc-950',
  },
  {
    id: 'arch-2',
    title: 'Minimalist Spiral Geometry',
    location: 'Museum of Contemporary Art',
    category: 'architecture',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-slate-900 via-zinc-900 to-stone-950',
  },
  {
    id: 'arch-3',
    title: 'Nordic Warm Interior & Soft Light',
    location: 'Copenhagen Studio',
    category: 'architecture',
    url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-stone-900 via-amber-950 to-neutral-950',
  },

  // Cosmic & Deep Sky
  {
    id: 'space-1',
    title: 'Celestial Aurora Borealis',
    location: 'Tromsø, Northern Norway',
    category: 'space',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-emerald-950 via-teal-950 to-indigo-950',
  },
  {
    id: 'space-2',
    title: 'Starlit Galaxy & Cosmic Horizon',
    location: 'Deep Sky Observatory',
    category: 'space',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-indigo-950 via-purple-950 to-slate-950',
  },
  {
    id: 'space-3',
    title: 'Milky Way Core Over Desert',
    location: 'Atacama Desert, Chile',
    category: 'space',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-blue-950 via-slate-950 to-purple-950',
  },

  // Abstract 3D & Digital Gradient Art
  {
    id: 'abstract-1',
    title: 'Liquid Silk & Prismatic Light',
    location: 'Generative Studio',
    category: 'abstract',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-violet-950 via-fuchsia-950 to-slate-950',
  },
  {
    id: 'abstract-2',
    title: 'Obsidian Monolith & Dark Glass',
    location: 'Digital Sculpture',
    category: 'abstract',
    url: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-zinc-950 via-slate-950 to-neutral-950',
  },
  {
    id: 'abstract-3',
    title: 'Iridescent Waves & Aurora Glow',
    location: 'Chromatic Flow',
    category: 'abstract',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1920&q=80',
    fallbackGradient: 'from-pink-950 via-purple-950 to-sky-950',
  },
];


export const WALLPAPER_PRESETS = [
  {
    id: 'mountain-lake',
    name: 'Alpine Lake & Misty Peaks',
    category: 'Nature',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=75',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'deep-forest',
    name: 'Pacific Northwest Foggy Forest',
    category: 'Nature',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=75',
    thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'aurora-night',
    name: 'Nordic Aurora Borealis',
    category: 'Night Sky',
    url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=1920&q=75',
    thumbnail: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'ocean-sunset',
    name: 'Quiet Ocean Horizon',
    category: 'Nature',
    url: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1920&q=75',
    thumbnail: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'minimal-dark',
    name: 'Minimal Deep Obsidian',
    category: 'Abstract',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=75',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'japanese-zen',
    name: 'Kyoto Bamboo Forest',
    category: 'Nature',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1920&q=75',
    thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'desert-stars',
    name: 'Joshua Tree Milky Way',
    category: 'Night Sky',
    url: 'https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?auto=format&fit=crop&w=1920&q=75',
    thumbnail: 'https://images.unsplash.com/photo-1509773896068-7fd415d91e2e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'autumn-haze',
    name: 'Golden Autumn Mountains',
    category: 'Nature',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=75',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
  },
];

export const RANDOM_FEED_COLORS = [
  '#38bdf8', // Sky Blue
  '#a855f7', // Purple
  '#34d399', // Emerald
  '#f43f5e', // Rose
  '#fb923c', // Orange
  '#eab308', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#10b981', // Mint
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
  '#14b8a6', // Teal
  '#f97316', // Bright Tangerine
];

export interface CalendarThemeOption {
  id: CalendarTheme;
  name: string;
  desc: string;
  accent: string;
  previewBg: string;
}

export const CALENDAR_THEMES: CalendarThemeOption[] = [
  {
    id: 'default',
    name: 'Midnight Studio',
    desc: 'Sleek dark dashboard with balanced slate contrast (Default)',
    accent: '#38bdf8',
    previewBg: 'bg-slate-900 border-slate-700',
  },
  {
    id: 'glass',
    name: 'Frosted Glass',
    desc: 'Heavy liquid glassmorphism with specular reflections and soft blur',
    accent: '#818cf8',
    previewBg: 'bg-white/10 border-white/20 backdrop-blur-md',
  },
  {
    id: 'minimal',
    name: 'Minimal Clean',
    desc: 'Understated distraction-free design with hairline borders and pure focus',
    accent: '#94a3b8',
    previewBg: 'bg-slate-950 border-slate-800/50',
  },
  {
    id: 'vibrant',
    name: 'Vibrant Glow',
    desc: 'Rich saturated highlights and luminous color cards for active family hubs',
    accent: '#ec4899',
    previewBg: 'bg-indigo-950/40 border-sky-500/40',
  },
  {
    id: 'monochrome',
    name: 'Monochrome OLED',
    desc: 'Pitch pure black backdrop with high-contrast monochrome text and colored dots',
    accent: '#f1f5f9',
    previewBg: 'bg-black border-neutral-800',
  },
  {
    id: 'warm',
    name: 'Warm Hearth',
    desc: 'Cozy terracotta and amber card accents for a welcoming home feeling',
    accent: '#f97316',
    previewBg: 'bg-[#181310] border-amber-900/40',
  },
  {
    id: 'nordic',
    name: 'Nordic Frost',
    desc: 'Crisp arctic navy with glacial cyan borders and cool polar luminance',
    accent: '#06b6d4',
    previewBg: 'bg-[#0b1320] border-cyan-800/40',
  },
  {
    id: 'forest',
    name: 'Emerald Forest',
    desc: 'Deep evergreen canopy with luminous mint accents and soothing natural vibe',
    accent: '#10b981',
    previewBg: 'bg-[#081711] border-emerald-900/40',
  },
];

export interface HolidayFeedPreset {
  id: string;
  countryKey: 'uk' | 'scotland' | 'us' | 'canada' | 'australia' | 'germany' | 'france' | 'ireland' | 'spain' | 'italy' | 'netherlands' | 'newzealand';
  name: string;
  country: string;
  flag: string;
  url: string;
  color: string;
}

export const HOLIDAY_PRESETS: HolidayFeedPreset[] = [
  {
    id: 'feed-holiday-uk',
    countryKey: 'uk',
    name: 'UK Bank Holidays',
    country: 'United Kingdom (England & Wales)',
    flag: '🇬🇧',
    url: 'https://www.gov.uk/bank-holidays/england-and-wales.ics',
    color: '#34d399',
  },
  {
    id: 'feed-holiday-scotland',
    countryKey: 'scotland',
    name: 'Scotland Bank Holidays',
    country: 'Scotland',
    flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    url: 'https://www.gov.uk/bank-holidays/scotland.ics',
    color: '#38bdf8',
  },
  {
    id: 'feed-holiday-us',
    countryKey: 'us',
    name: 'US Public Holidays',
    country: 'United States',
    flag: '🇺🇸',
    url: 'https://www.officeholidays.com/ics/usa',
    color: '#f43f5e',
  },
  {
    id: 'feed-holiday-ca',
    countryKey: 'canada',
    name: 'Canada Statutory Holidays',
    country: 'Canada',
    flag: '🇨🇦',
    url: 'https://www.officeholidays.com/ics/canada',
    color: '#fb7185',
  },
  {
    id: 'feed-holiday-au',
    countryKey: 'australia',
    name: 'Australia Public Holidays',
    country: 'Australia',
    flag: '🇦🇺',
    url: 'https://www.officeholidays.com/ics/australia',
    color: '#fbbf24',
  },
  {
    id: 'feed-holiday-de',
    countryKey: 'germany',
    name: 'German Public Holidays',
    country: 'Germany',
    flag: '🇩🇪',
    url: 'https://www.officeholidays.com/ics/germany',
    color: '#f59e0b',
  },
  {
    id: 'feed-holiday-fr',
    countryKey: 'france',
    name: 'French Public Holidays',
    country: 'France',
    flag: '🇫🇷',
    url: 'https://www.officeholidays.com/ics/france',
    color: '#60a5fa',
  },
  {
    id: 'feed-holiday-ie',
    countryKey: 'ireland',
    name: 'Ireland Bank Holidays',
    country: 'Ireland',
    flag: '🇮🇪',
    url: 'https://www.officeholidays.com/ics/ireland',
    color: '#10b981',
  },
  {
    id: 'feed-holiday-es',
    countryKey: 'spain',
    name: 'Spain Public Holidays',
    country: 'Spain',
    flag: '🇪🇸',
    url: 'https://www.officeholidays.com/ics/spain',
    color: '#e11d48',
  },
  {
    id: 'feed-holiday-it',
    countryKey: 'italy',
    name: 'Italy Public Holidays',
    country: 'Italy',
    flag: '🇮🇹',
    url: 'https://www.officeholidays.com/ics/italy',
    color: '#059669',
  },
  {
    id: 'feed-holiday-nl',
    countryKey: 'netherlands',
    name: 'Netherlands Holidays',
    country: 'Netherlands',
    flag: '🇳🇱',
    url: 'https://www.officeholidays.com/ics/netherlands',
    color: '#ea580c',
  },
  {
    id: 'feed-holiday-nz',
    countryKey: 'newzealand',
    name: 'New Zealand Holidays',
    country: 'New Zealand',
    flag: '🇳🇿',
    url: 'https://www.officeholidays.com/ics/new-zealand',
    color: '#0284c7',
  },
];

