export interface ReleaseNote {
  version: string;
  releaseDate: string;
  title: string;
  isCurrent?: boolean;
  highlights: string[];
  details: string[];
}

export const APP_VERSION = '3.3.3';

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: 'v3.3.3',
    releaseDate: 'October 2026',
    title: 'Tap to Enlarge QR Codes for Instant Guest Scanning',
    isCurrent: true,
    highlights: [
      'Interactive "Tap to Enlarge" badge and thumbnail overlay on all Party Screen QR cards',
      'High-contrast enlarged QR modal (up to 320px) easily scannable from across the room',
      'Simple, natural dismissal: tap the "Close" button, click anywhere outside the modal, or press ESC',
      'One-tap copy button for Wi-Fi passwords and direct browser launch for playlists/albums',
    ],
    details: [
      'Tap to Enlarge QR Cards: All three celebratory footer cards—Guest Wi-Fi, Party Playlist, and Guest Photo Drop—now feature clear, touch-friendly "Tap to Enlarge" buttons and responsive interactive thumbnails.',
      'Jumbo QR Scanning Overlay: Tapping opens an enlarged, high-contrast QR code rendered crisp via vector SVG up to 320px wide, allowing guests to scan effortlessly from across the living room or kitchen counter without crowding the display.',
      'Flexible Dismissal: The enlarged overlay can be instantly dismissed by tapping the prominent "Close" button, clicking anywhere on the darkened backdrop around the modal, or pressing the Escape key.',
      'Quick Copy & Direct Links: The enlarged modal displays clear network credentials with a one-tap copy button for guest Wi-Fi passwords and clickable browser links for playlist and photo drop URLs.',
    ],
  },
  {
    version: 'v3.3.2',
    releaseDate: 'October 2026',
    title: 'Party Typography on Raspberry Pi, Text Alignment & Photo Dim/Blur Controls',
    isCurrent: false,
    highlights: [
      'Loaded cross-platform Fredoka & Nunito web fonts so Raspberry Pi kiosks render the exact bubbly rounded letters seen in preview',
      'Added 5 celebratory font styles: Playful Rounded, Bold Modern, Editorial Serif, Festive Script, and Retro Neon',
      'Added Text Position selector: Center Screen, Top of Screen (unobstructed faces), or Bottom Aligned',
      'Added interactive Photo Brightness / Dimming slider (10% to 100%) with quick presets',
      'Added interactive Background Photo Blur slider (0px to 25px) for sharp photos or dreamy ambient bokeh',
    ],
    details: [
      'Raspberry Pi Rounded Typography: Integrated Fredoka and Nunito web fonts from Google Fonts directly into the kiosk build. Because Linux and Chromium lack Apple system fonts, this guarantees that Raspberry Pi displays render the authentic soft bubble terminals seen in macOS previews.',
      'Font Style Palette: Hosts can choose between 5 distinct typography personalities: Playful Rounded (bubbly & joyful), Bold Modern (sleek sans-serif), Editorial Serif (classy & formal), Festive Script (celebration handwriting), and Retro Neon (arcade/synthwave).',
      'Vertical Alignment Control: You can position celebratory greetings at the top of the screen (leaving the central area completely unobstructed for family faces in photos), vertically centered as a classic centerpiece, or aligned towards the bottom above the QR cards.',
      'Photo Dimming & Brightness Slider: Fine-tune the brightness of background photos from 10% (moody dim) to 100% (raw vivid photos) with adaptive dark vignettes.',
      'Photo Blur & Soft Focus: Adjust photo blur from 0px (razor sharp for viewing memories) to 25px (soft ambient bokeh that spotlights the celebratory headline).',
    ],
  },
  {
    version: 'v3.3.1',
    releaseDate: 'October 2026',
    title: 'Multi-Source Party Photos & Dedicated Event iCloud Albums',
    isCurrent: false,
    highlights: [
      'Option to connect a separate dedicated iCloud Shared Album specifically for this event or birthday',
      'Test Album Connection tool in settings with real-time photo count, album title, and thumbnail strip',
      'Curated celebration visual themes (Birthday Joy, Cocktail Lounge, Disco, Dinner, Tropical, Starry)',
      'Direct custom web image URLs input with automatic link parsing',
      'Interactive Guest Photo Drop QR code card allowing guests to upload photos from their phones live',
    ],
    details: [
      'Dedicated Event iCloud Albums: Hosts can now paste a dedicated public iCloud Shared Album link specifically created for a birthday, anniversary, or gathering, keeping the party slideshow focused on the guest of honor without altering the everyday family album.',
      'Live Album Verification: Settings includes a real-time "Test Album Connection" button verifying the album link, displaying the stream name, photo count, and thumbnail previews.',
      'Curated Party Themes: Added 6 high-definition ambient photography collections (Celebration & Birthday Joy, Cocktail Lounge, Disco Night, Dinner Gathering, Tropical Luau, Starry Ambient) providing instant festive visuals even when no custom album is available.',
      'Direct Web URLs: Support for pasting direct image URLs from cloud storage, personal photo servers, or web links.',
      'Guest Photo Drop QR Card: Optional on-screen QR card enabling guests to point their phones and drop their photos into the host’s shared album in real-time during the party.',
    ],
  },
  {
    version: 'v3.3.0',
    releaseDate: 'October 2026',
    title: 'Party & Celebration Mode Screen',
    isCurrent: false,
    highlights: [
      'Dedicated celebration screen for parties, birthdays, anniversaries, and family gatherings',
      'Edge-to-edge photo slideshow with smart face-safe framing preventing heads from being cut off',
      'Ambient physics-based confetti or floating starlight sparkles (zero-overhead canvas engine)',
      'Customizable celebration banner with fast presets (Birthday, Cocktails, Dinner, Housewarming)',
      'Instant Guest Wi-Fi QR code card for seamless camera scan-to-connect',
      'Music & party playlist sharing card with direct scan link to Spotify, Apple Music, or Sonos',
      'Quick-access Party Mode triggers in the bottom dock, header bar, and Admin Settings',
    ],
    details: [
      'Dedicated Celebration Screen: One tap transforms the wall kiosk into an ambient celebration display featuring celebratory headlines, guest Wi-Fi QR access, and shared photo streams.',
      'Face-Safe Framing Inherited: Family photos automatically maintain face-safe upper-third framing so guests and loved ones remain clearly visible in every slideshow crossfade.',
      'Guest Wi-Fi Instant Scan: Guests can connect immediately to home Wi-Fi simply by aiming their smartphone camera at the crisp SVG QR code—no manual password typing needed.',
      'Party Playlist QR Code: Displays a live QR card linking directly to Spotify, Apple Music, or your DJ queue so guests can view what is playing or add songs to the party mix.',
      'Celebration Presets & Theme Colors: Six celebration themes (Gold, Neon Pink, Emerald, Cyan, Purple, Sunset Orange) and animated effects (Confetti, Sparkles, None) configurable in the new Party & Events settings tab.',
      'Frictionless Access: Switch into Party Mode instantly via the bottom dock or settings, and tap "Exit Party Mode" to seamlessly return to your dashboard.',
    ],
  },
  {
    version: 'v3.2.1',
    releaseDate: 'October 2026',
    title: 'Automatic Chronological Sorting for Event Countdowns',
    isCurrent: false,
    highlights: [
      'Event Countdowns now automatically sort from closest to furthest away from today',
      'Eliminates arbitrary manual order so immediate birthdays and holidays appear at the top',
      'Events occurring Today are always pinned at the very top with celebratory badge',
      'Added "Sort Closest First" quick action button in Admin Settings',
    ],
    details: [
      'Automatic Chronological Ordering: Event countdowns on the wall display are now dynamically ordered from nearest to furthest away from today based on their next occurrence, regardless of the order they were entered into settings.',
      'Annual Event Intelligence: Accurately computes upcoming occurrences for annual recurring milestones, ensuring they slot into their proper chronological sequence before distant future events.',
      'Today Pinning: Events whose target day is today are given top priority with celebratory animated accents.',
      'Settings Quick Sort: Added a "Sort Closest First" button in the Admin Settings Countdown manager to synchronize the saved configuration order with the live display.',
    ],
  },
  {
    version: 'v3.2.0',
    releaseDate: 'October 2026',
    title: 'Smart Face & Head Framing for iCloud Family Photos',
    isCurrent: false,
    highlights: [
      'Smart face & head focal bias (top 20%) preventing family faces from being cut off on widescreen displays',
      'Applied seamlessly across both the main Home wallpaper and StandBy screen saver',
      'Photo Framing & Face Focus controls in Admin Settings with 4 quick presets and fine-tuning slider',
      'Live interactive preview with dynamic focal anchor line and real-time safe-zone feedback',
      'Smooth 1000ms crossfade transitions between photos with 0ms latency and zero hardware thermal overhead',
    ],
    details: [
      'Smart Face & Head Anchoring: Eliminated symmetrical center-cropping on widescreen displays by introducing intelligent focal anchoring biased towards the upper 20% safe-band where heads and faces naturally reside in portrait and family group shots.',
      'Comprehensive Home & Screensaver Coverage: Both the active dashboard wallpaper and the ambient StandBy screen saver now automatically frame photos to keep family members completely visible.',
      'Admin Framing Controls: Added dedicated framing selectors to both Wallpaper and Screen Saver tabs in Admin Settings, offering Smart Face Bias (20%), Top Anchor (10%), Center Crop (50%), and a Custom Focal Offset slider.',
      'Live Safe-Zone Simulation: Live preview cards in Admin Settings render photos with your exact vertical focal offset and a dashed guide showing where the focal anchor sits.',
      'Zero Kiosk Thermal Overhead: Pure CSS background-position calculations avoid heavy client-side ML bundle sizes, ensuring silky smooth 60fps operation on low-power Raspberry Pi kiosks.',
    ],
  },
  {
    version: 'v3.1.0',
    releaseDate: 'October 2026',
    title: 'Resilient Multi-iCal Sync & Enhanced Weather Legibility',
    isCurrent: false,
    highlights: [
      'Fault-tolerant iCloud & iCal sync with automatic retry backoff and rate-limit defense',
      'Persistent disk & memory caching (stale-while-revalidate) preventing blank schedule displays',
      'Staggered feed pacing to eliminate Apple CalDAV morning peak 503 throttling',
      'Enlarged high-contrast temperature and precipitation indicators on weather trend graphs',
      'Circadian Smart Briefing fused with both local touch events and cached external iCal feeds',
      'Weather modal React Hook ordering and JSON content-type negotiation safeguards',
    ],
    details: [
      'iCloud & CalDAV Fault Tolerance: Implemented automatic exponential backoff with jitter and Retry-After header compliance for Apple CalDAV edge clusters, defending against high-volume morning 503 rate limits.',
      'Persistent Stale-While-Revalidate Caching: Added persistent storage (~/.luminahome/calendar_cache.json) and memory caching so wall displays seamlessly retain and serve family schedules even during upstream cloud outages.',
      'Staggered Multi-Feed Pacing: Automatically staggers requests across multiple calendar feeds with polite 350-500ms pacing, preventing burst firewall flags on Apple servers.',
      'Weather Graph Legibility: Redesigned the temperature and precipitation complication indicators on the right side of the 24-hour weather trend graphs with enlarged typography and high-contrast pill styling for effortless readability from across the room.',
      'Briefing Schedule Fusion: Unified the daily smart circadian briefing engine to aggregate both direct kiosk touch events and cached external iCal subscriptions for accurate morning and evening summaries.',
      'Engine Stability: Resolved React Hook rendering order in weather details modals and hardened backend API proxy routing.',
    ],
  },
  {
    version: 'v3.0.0',
    releaseDate: 'October 2026',
    title: 'Daily Smart Briefings & Interactive Two-Way Kiosk',
    highlights: [
      'Daily morning and evening smart summary briefings synthesized from weather, schedule, reminders, and countdowns',
      'Web Speech API audio voice narration with real-time waveform visualizer',
      'Direct two-way calendar event creation and editing right on the wall touch screen',
      'Interactive household checklist tasks with tap-to-complete check-off',
      'Touch-friendly 48px+ targets and quick event category presets (School Run, Dinner, Doctor, Chores)',
      'Gemini AI-powered circadian synthesis with offline local template engine',
    ],
    details: [
      'Daily Circadian Briefings: Proactively greets the household with contextual morning and evening summaries. Morning mode highlights high temperatures, rain alerts, and the first event of the day; evening mode provides tomorrow preparation and milestone countdowns.',
      'Voice Read-Aloud Narration: Tap the "Listen" button on any wall screen to hear the day\'s briefing read aloud with friendly natural speech synthesis and an animated audio waveform indicator.',
      'Direct Two-Way Event Creation: Create, modify, and delete calendar events directly from the kiosk display without needing a smartphone or computer. Tap any day on the month grid or the header "+" button to open the touch-friendly event sheet.',
      'Interactive Household Reminders: Tap any checklist item directly on the dashboard to toggle task completion with instant server synchronization. Add new reminders with the quick-entry bar.',
      'Gemini AI & Offline Synthesizer: Powered by Google GenAI (gemini-3.8-flash) for warm, natural phrasing, with an ultra-reliable local template engine when offline.',
    ],
  },
  {
    version: 'v2.9.2',
    releaseDate: 'October 2026',
    title: 'Kiosk Navigation Streamline & System Tray Refresh',
    highlights: [
      'Removed redundant floating Admin Settings, Full Screen, and Refresh buttons from top right',
      'Added dedicated Refresh button down next to live clock in bottom system tray area',
      'Completely unobstructed display view preventing widget overlap',
    ],
    details: [
      'Streamlined Controls: Eliminated redundant floating top-right buttons, preventing overlap with weather complications and location banners.',
      'System Tray Refresh: Added a responsive refresh button next to the bottom live clock that syncs dashboard config and calendar feeds on demand with smooth spin feedback.',
    ],
  },
  {
    version: 'v2.9.1',
    releaseDate: 'October 2026',
    title: 'Streamlined Event Countdowns & Expanded Agenda Schedule',
    highlights: [
      'Event Countdowns by default show clean number-of-days counter',
      'Agenda Schedule expands into freed space with fixed calendar size',
      'Calendar feed badges/legend hidden by default in header for distraction-free view',
      'Configurable countdown display format toggle in Admin Dashboard (Days vs Full)',
    ],
    details: [
      'Days-Only Default: Countdown cards now feature a compact, high-contrast days-to-go pill counter by default, removing cluttered hours, minutes, and seconds while preserving annual rollover and celebratory completion banners.',
      'Expanded Agenda Grid: Freed horizontal space is redirected into the Agenda Schedule list, allowing event titles and time ranges to render with exceptional clarity.',
      'Fixed Month Calendar Width: The mini-month calendar grid maintains its ideal fixed compact width, ensuring no disproportionate stretching occurs.',
      'Distraction-Free Header: Removed static feed category tags from the Schedule & Events widget header by default, with an optional toggle in Calendar settings.',
    ],
  },
  {
    version: 'v2.9.0',
    releaseDate: 'October 2026',
    title: 'Apple Photos iCloud Shared Stream & Centralized Release Sync',
    highlights: [
      'Apple Photos iCloud Shared Album background & screensaver live stream',
      'Real-time Apple webstream/webasseturls handshake & high-res image proxy',
      'Configurable photo cycle timer (1–60 mins) with custom backdrop brightness & blur',
      'Unified single-source-of-truth versioning and synchronized changelog system',
      'Admin album tester, thumbnail gallery preview, and instant background sync',
    ],
    details: [
      'iCloud Shared Album Stream: Connect any public Apple Photos iCloud Shared Album URL to turn your smart kiosk into an ambient digital photo frame. Works across both wallpaper background and screensaver modes.',
      'Server-Side Handshake & Proxy: Automatically decodes Apple base62 token redirects, discovers the closest cluster base URL, queries webasseturls for the highest-resolution derivative, and proxies image assets securely with in-memory caching.',
      'Legibility Backdrop Controls: Fine-tune photo brightness (10% to 100%) and gaussian blur (0px to 20px) independently for wallpaper and screensaver, keeping clocks and calendar widgets razor sharp.',
      'Centralized Release Sync: Single source of truth for version number and changelog history across package.json, server hardware telemetry, admin navigation badges, and system update states.',
      'Interactive Album Inspector: Validate iCloud shared album URLs directly within the Admin Dashboard with instant photo count readout and responsive thumbnail preview grid.',
    ],
  },
  {
    version: 'v2.8.0',
    releaseDate: 'October 2026',
    title: 'Calendar Month Grid & High-Contrast Visual Indicators',
    highlights: [
      'High-contrast day-cell active date rings & today emphasis',
      'Multi-feed event indicators and colored dot complication tags',
      'Expanded responsive month view grid navigation and agenda sync',
      'Micro-animations for calendar month transitions and quick-jump picker',
    ],
    details: [
      'Visual Day Markers: Distinct high-contrast rings and background fills for current day, active events, and multi-day spans across Month, Agenda, and Year views.',
      'Multi-Feed Legend: Clearly identify event sources with configurable color tags and category markers across family calendars.',
      'Rapid Navigation: Seamlessly navigate between months and jump back to Today with one tap from any screen mode.',
    ],
  },
  {
    version: 'v2.7.0',
    releaseDate: 'October 2026',
    title: 'Multi-Item Countdown Widget & Milestone Celebrations',
    highlights: [
      'Multiple concurrent scrollable event countdowns in a single widget',
      'Automatic celebratory completion message upon reaching milestone date/time',
      'Custom icon selector and color accents per countdown item',
      'High-visibility pill timers with days, hours, and minutes breakdown',
    ],
    details: [
      'Multi-Countdown Grid: Track birthdays, vacations, holidays, and family milestones concurrently in an elegant scrollable agenda container.',
      'Milestone Completion Banner: When the target time is reached, the widget dynamically displays your personalized celebration banner (e.g. "🎉 Happy Birthday!", "🌴 Vacation Time!").',
      'Custom Iconography & Accents: Assign dedicated Lucide icons and vibrant color accents to distinct countdown cards.',
      'Compact & Dense Options: Smooth scrollbar styling and touch-friendly controls optimized for wall-mounted kiosks.',
    ],
  },
  {
    version: 'v2.6.0',
    releaseDate: 'October 2026',
    title: 'Core Kiosk Streamline & Liquid Glass Ambient Screen Saver',
    highlights: [
      'Ultra-Dim Red Night Mode for screensaver with on-screen & scheduled toggle',
      'Anti-burn-in micro-drift pixel shift for all-night displays',
      'Apple Liquid Glass screensaver with pulsing seconds colon',
      'Weather single-degree symbol fix & dynamic location auto-detect',
      'Git update engine & remote fetch fix',
    ],
    details: [
      'Night Mode StandBy: Ultra-dim pure crimson red monochrome night clock on pitch black background to eliminate blue light, preserve night vision, and prevent sleep disruption in bedrooms.',
      'Circadian Schedule & Quick Toggle: Includes an unobtrusive on-screen Moon toggle button and optional time-based schedule (e.g. 10 PM to 7 AM) with customizable dimming (50% to 95%).',
      'Anti-Burn-In Micro-Drift: Automatic 2-4px pixel shifting every 3 minutes prevents OLED burn-in and LCD image retention during overnight displays.',
      'Core Streamline: Streamlined UI down to essential kiosk features (Calendar, Weather, Clock, Notes, Countdown, News, and Hardware Telemetry) for maximum speed and rock-solid stability.',
      'Liquid Glass Screen Saver: Minimalist full-screen Apple liquid glass digital clock with rhythmic seconds-pulsing colon and compact date/weather complication.',
      'Weather Accuracy: Resolved duplicate degree symbol formatting glitch, ensuring consistent single-degree readout.',
    ],
  },
  {
    version: 'v2.5.0',
    releaseDate: 'October 2026',
    title: 'Lumina Home Core Streamline & System Health Monitor',
    highlights: [
      'Core display streamline & performance optimization',
      'Hardware & device telemetry dashboard',
      'Smart weather caching & 503 fault tolerance',
      'Automated divergent-branch updater',
    ],
    details: [
      'Streamlined Core: Focused on essential wall kiosk functions — clock, high-contrast weather, multi-feed calendar, notes, event countdowns, and news ticker.',
      'New System Menu: Added real-time CPU load, CPU temperature thermal monitoring, RAM utilization, root storage breakdown, and system uptime.',
      'One-Click Update Engine: Modernized with automated Git stash, fetch, and hard-reset sync, preventing divergent branch pull locks.',
      'Weather Resilience: In-memory stale-while-revalidate caching and custom user-agent headers to prevent Open-Meteo 503 and rate limit disruptions.',
      'Service Management: Added one-click service restart and Raspberry Pi host reboot triggers directly from the web interface.',
    ],
  },
  {
    version: 'v2.4.0',
    releaseDate: 'October 2026',
    title: 'Apple HomeView Ambient StandBy & Typography',
    highlights: [
      'Ambient StandBy dual-panel screensaver',
      'Curated 4K wallpaper presets & Unsplash rotation',
      'Automated red night mode and touch wake',
    ],
    details: [
      'Ambient StandBy Mode: Apple-style dual widget clocks, weather dials, and photo complications with night-mode red tint.',
      'Touch Wake: Instant responsiveness when touching anywhere on screen to return to the active kiosk display.',
      'Dynamic Wallpapers: Ultra-wide landscape presets with custom dimming and blur controls for optimal text legibility.',
    ],
  },
  {
    version: 'v2.3.0',
    releaseDate: 'October 2026',
    title: 'Drag-and-Drop Visual Grid & Multi-Feed Calendar',
    highlights: [
      'Interactive 12-column widget grid layout',
      'Multi-feed iCal / ICS calendar aggregator',
      'Live news ticker & sticky family reminders',
    ],
    details: [
      'Visual Grid Customizer: Resize and position clock, weather, calendar, countdown, and news widgets freely.',
      'Multi-Feed Calendar: Aggregate family iCloud, Google, Outlook, and webcal feeds with recurring event expansion.',
      'Notes & Reminders: Inspirational daily quotes and interactive household reminders widget.',
    ],
  },
];

export function getCurrentRelease(): ReleaseNote {
  return RELEASE_NOTES[0];
}

export function getAppVersion(): string {
  return APP_VERSION;
}
