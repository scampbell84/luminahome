import { AppConfig } from '../types/config';

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
      { i: 'calendar', x: 0, y: 3, w: 7, h: 6, minW: 4, minH: 3 },
      { i: 'countdown', x: 7, y: 3, w: 5, h: 2, minW: 3, minH: 1 },
      { i: 'notes', x: 7, y: 5, w: 5, h: 4, minW: 3, minH: 2 },
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
        id: 'feed-us-holidays',
        name: 'US Holidays',
        url: 'https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics',
        color: '#34d399', // Emerald
        enabled: true,
      },
    ],
    refreshIntervalMinutes: 15,
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
    title: 'Summer Vacation & Road Trip',
    targetDate: '2026-11-26T00:00:00',
    icon: 'plane',
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
  },
};

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
