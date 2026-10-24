import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppConfig, PartyConfig, ICloudPhoto, WeatherData } from '../../types/config';
import { DEFAULT_ICLOUD_SAMPLE_PHOTOS } from '../../constants/defaultConfig';
import { formatWifiQrString, generateQrDataUrl } from '../../utils/qrCode';
import {
  Wifi,
  Music2,
  X,
  Sparkles,
  PartyPopper,
  Clock,
  ExternalLink,
  ChevronRight,
  Radio,
  Volume2
} from 'lucide-react';

interface PartyScreenProps {
  config: AppConfig;
  onExit: () => void;
  onUpdateConfig?: (updatedConfig: AppConfig) => void;
}

export const PartyScreen: React.FC<PartyScreenProps> = ({
  config,
  onExit,
}) => {
  const partyConfig: PartyConfig = config.party || {
    enabled: true,
    active: true,
    title: 'Happy Birthday!',
    subtitle: 'Eat, drink, dance & celebrate with us tonight!',
    accentColor: 'gold',
    effects: 'confetti',
    photos: {
      sourceType: 'wallpaper_sync',
      cycleSeconds: 10,
      photoBrightness: 55,
      photoBlur: 2,
      photoFocalOffsetY: 20,
    },
    wifi: {
      enabled: true,
      networkName: 'Home-Guest-WiFi',
      password: 'celebratewithus',
      securityType: 'WPA',
    },
    music: {
      enabled: true,
      title: "Tonight's House Party Mix",
      playlistUrl: 'https://open.spotify.com',
      djNote: 'Scan to open playlist & request tunes',
    },
  };

  // 1. Photo Slideshow State
  const [photos, setPhotos] = useState<ICloudPhoto[]>(DEFAULT_ICLOUD_SAMPLE_PHOTOS);
  const [photoIndex, setPhotoIndex] = useState<number>(0);
  const [wifiQrUrl, setWifiQrUrl] = useState<string>('');
  const [musicQrUrl, setMusicQrUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // Time ticker
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch weather for subtle corner complication
  useEffect(() => {
    fetch('/api/weather')
      .then((res) => res.json())
      .then((data) => setWeather(data))
      .catch(() => {});
  }, []);

  // Fetch photos based on configuration source
  useEffect(() => {
    let targetAlbumUrl = '';
    if (partyConfig.photos.sourceType === 'icloud_album' && partyConfig.photos.icloudAlbumUrl) {
      targetAlbumUrl = partyConfig.photos.icloudAlbumUrl;
    } else if (partyConfig.photos.sourceType === 'wallpaper_sync') {
      targetAlbumUrl = config.general.icloudAlbumUrl || config.screensaver?.icloudAlbumUrl || '';
    }

    if (targetAlbumUrl) {
      fetch(`/api/icloud-album?url=${encodeURIComponent(targetAlbumUrl)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && Array.isArray(data.photos) && data.photos.length > 0) {
            setPhotos(data.photos);
          }
        })
        .catch(() => {});
    }
  }, [partyConfig.photos.sourceType, partyConfig.photos.icloudAlbumUrl, config.general.icloudAlbumUrl, config.screensaver?.icloudAlbumUrl]);

  // Slideshow rotation timer
  useEffect(() => {
    if (photos.length <= 1) return;
    const intervalSeconds = Math.max(5, partyConfig.photos.cycleSeconds || 10);
    const timer = setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % photos.length);
    }, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [photos, partyConfig.photos.cycleSeconds]);

  // Generate Wi-Fi QR Code
  useEffect(() => {
    if (!partyConfig.wifi.enabled || !partyConfig.wifi.networkName) {
      setWifiQrUrl('');
      return;
    }
    const wifiString = formatWifiQrString(
      partyConfig.wifi.networkName,
      partyConfig.wifi.password,
      partyConfig.wifi.securityType || 'WPA'
    );
    generateQrDataUrl(wifiString, { width: 220, margin: 1 }).then((url) => {
      setWifiQrUrl(url);
    });
  }, [partyConfig.wifi]);

  // Generate Music / Playlist QR Code
  useEffect(() => {
    if (!partyConfig.music.enabled || !partyConfig.music.playlistUrl) {
      setMusicQrUrl('');
      return;
    }
    generateQrDataUrl(partyConfig.music.playlistUrl, { width: 220, margin: 1 }).then((url) => {
      setMusicQrUrl(url);
    });
  }, [partyConfig.music]);

  // 2. Canvas Particle System for Confetti / Sparkles
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || partyConfig.effects === 'none') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const isConfetti = partyConfig.effects === 'confetti';
    const particleCount = isConfetti ? 70 : 60;
    const colors = isConfetti
      ? ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#fbbf24', '#06b6d4']
      : ['#fbbf24', '#fef08a', '#ffffff', '#fde047', '#f59e0b'];

    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedY: number;
      speedX: number;
      rotation: number;
      rotationSpeed: number;
      opacity: number;
      oscillationSpeed: number;
      shape: 'rect' | 'circle' | 'star';
    }

    const particles: Particle[] = Array.from({ length: particleCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: isConfetti ? Math.random() * 8 + 6 : Math.random() * 4 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: isConfetti ? Math.random() * 1.8 + 1.2 : -(Math.random() * 0.8 + 0.3),
      speedX: Math.random() * 1.5 - 0.75,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 4,
      opacity: Math.random() * 0.7 + 0.3,
      oscillationSpeed: Math.random() * 0.03 + 0.01,
      shape: isConfetti ? (Math.random() > 0.4 ? 'rect' : 'circle') : (Math.random() > 0.3 ? 'star' : 'circle'),
    }));

    let step = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      step += 1;

      for (const p of particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'star') {
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            ctx.lineTo(Math.cos(((18 + i * 90) * Math.PI) / 180) * p.size, -Math.sin(((18 + i * 90) * Math.PI) / 180) * p.size);
            ctx.lineTo(Math.cos(((54 + i * 90) * Math.PI) / 180) * (p.size * 0.3), -Math.sin(((54 + i * 90) * Math.PI) / 180) * (p.size * 0.3));
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        p.y += p.speedY;
        p.x += Math.sin(step * p.oscillationSpeed) * 0.8 + p.speedX;
        p.rotation += p.rotationSpeed;

        if (isConfetti && p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        } else if (!isConfetti && p.y < -20) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [partyConfig.effects]);

  // Current active photo URL & properties
  const currentPhoto = photos.length > 0 ? photos[photoIndex % photos.length] : null;
  const photoUrl = currentPhoto ? `/api/icloud-photo-proxy?url=${encodeURIComponent(currentPhoto.url)}` : '';
  const photoBrightness = Math.max(20, Math.min(100, partyConfig.photos.photoBrightness ?? 55));
  const photoBlur = partyConfig.photos.photoBlur ?? 2;
  const photoFocalY = partyConfig.photos.photoFocalOffsetY ?? 20;

  // Theme Accent Styling
  const themeStyles = useMemo(() => {
    switch (partyConfig.accentColor) {
      case 'neon-pink':
        return {
          gradientText: 'from-pink-300 via-rose-400 to-fuchsia-500',
          glow: 'rgba(244, 63, 94, 0.45)',
          pillBorder: 'border-pink-500/40',
          pillBg: 'bg-pink-950/40',
          accentColorText: 'text-pink-300',
        };
      case 'emerald':
        return {
          gradientText: 'from-emerald-200 via-teal-300 to-green-400',
          glow: 'rgba(16, 185, 129, 0.45)',
          pillBorder: 'border-emerald-500/40',
          pillBg: 'bg-emerald-950/40',
          accentColorText: 'text-emerald-300',
        };
      case 'cyan':
        return {
          gradientText: 'from-cyan-200 via-sky-300 to-blue-400',
          glow: 'rgba(6, 182, 212, 0.45)',
          pillBorder: 'border-cyan-500/40',
          pillBg: 'bg-cyan-950/40',
          accentColorText: 'text-cyan-300',
        };
      case 'purple':
        return {
          gradientText: 'from-purple-200 via-violet-300 to-indigo-400',
          glow: 'rgba(168, 85, 247, 0.45)',
          pillBorder: 'border-purple-500/40',
          pillBg: 'bg-purple-950/40',
          accentColorText: 'text-purple-300',
        };
      case 'amber':
        return {
          gradientText: 'from-amber-200 via-orange-300 to-rose-400',
          glow: 'rgba(245, 158, 11, 0.45)',
          pillBorder: 'border-amber-500/40',
          pillBg: 'bg-amber-950/40',
          accentColorText: 'text-amber-300',
        };
      case 'gold':
      default:
        return {
          gradientText: 'from-amber-100 via-yellow-300 to-amber-500',
          glow: 'rgba(251, 191, 36, 0.45)',
          pillBorder: 'border-amber-400/40',
          pillBg: 'bg-amber-950/40',
          accentColorText: 'text-amber-300',
        };
    }
  }, [partyConfig.accentColor]);

  const formattedTime = currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-slate-950 text-white font-sans select-none flex flex-col justify-between">
      {/* 1. High-Res Photo Slideshow Layer with face-safe focal anchoring */}
      {photoUrl && (
        <div
          className="absolute inset-0 bg-cover transition-all duration-1000 ease-in-out pointer-events-none"
          style={{
            backgroundImage: `url('${photoUrl}')`,
            backgroundPosition: `center ${photoFocalY}%`,
            filter: `brightness(${photoBrightness}%) blur(${photoBlur}px)`,
            transform: photoBlur > 0 ? 'scale(1.05)' : undefined,
          }}
        />
      )}

      {/* 2. Gradient Vignettes (Ensures cards and banners pop with exceptional contrast) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/80 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/25 to-black/75 pointer-events-none" />

      {/* 3. Canvas Ambient Particles (Confetti / Sparkles) */}
      {partyConfig.effects !== 'none' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10"
        />
      )}

      {/* 4. Top Header Strip */}
      <header className="relative z-20 w-full px-6 py-5 flex items-center justify-between">
        {/* Subtle Ambient Time & Weather Badge */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-900/75 border border-white/15 backdrop-blur-xl shadow-lg">
          <Clock className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="text-sm font-bold tracking-wide font-mono text-white">
            {formattedTime}
          </span>
          <span className="text-xs text-white/50 border-l border-white/20 pl-2">
            {formattedDate}
          </span>
          {weather && (
            <span className="text-xs font-semibold text-white/80 border-l border-white/20 pl-2 hidden sm:inline">
              {Math.round(weather.temp)}° {weather.condition}
            </span>
          )}
        </div>

        {/* Celebration Badge & Exit Button */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/60 border border-white/10 backdrop-blur-md text-xs font-semibold text-white/75">
            <PartyPopper className="w-3.5 h-3.5 text-amber-300" />
            <span>Party Mode Active</span>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white/90 hover:text-white border border-white/20 hover:border-white/40 backdrop-blur-xl shadow-2xl transition-all active:scale-95 cursor-pointer font-semibold text-xs group"
            title="Return to Main Home Display"
          >
            <span>Exit Party Mode</span>
            <X className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors" />
          </button>
        </div>
      </header>

      {/* 5. Centerpiece: Grand Celebratory Greeting Banner */}
      <main className="relative z-20 w-full max-w-5xl mx-auto px-4 my-auto text-center flex flex-col items-center justify-center space-y-4">
        {/* Decorative Top Sparkle Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-white/20 backdrop-blur-2xl shadow-xl animate-pulse">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-white/90 font-mono">
            Celebration
          </span>
          <Sparkles className="w-4 h-4 text-amber-300" />
        </div>

        {/* Massive Dynamic Event Headline */}
        <h1
          className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-tight bg-gradient-to-b ${themeStyles.gradientText} bg-clip-text text-transparent drop-shadow-2xl font-apple-rounded`}
          style={{
            filter: `drop-shadow(0 0 40px ${themeStyles.glow}) drop-shadow(0 15px 30px rgba(0,0,0,0.9))`,
          }}
        >
          {partyConfig.title}
        </h1>

        {/* Elegant Subtitle */}
        {partyConfig.subtitle && (
          <p className="max-w-2xl text-base sm:text-xl md:text-2xl font-medium text-white/90 drop-shadow-lg tracking-wide leading-relaxed">
            {partyConfig.subtitle}
          </p>
        )}

        {/* Photo Counter Indicator Pill */}
        {photos.length > 1 && (
          <div className="pt-2 text-xs text-white/50 font-mono flex items-center gap-2">
            <span>Photo {photoIndex + 1} of {photos.length}</span>
            <span>•</span>
            <span>Changes every {partyConfig.photos.cycleSeconds || 10}s</span>
          </div>
        )}
      </main>

      {/* 6. Bottom Cards: Guest Wi-Fi & Party Playlist Music Card */}
      <footer className="relative z-20 w-full px-6 py-6 pb-8 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
        {/* Guest Wi-Fi QR Card */}
        {partyConfig.wifi.enabled && (
          <div className="w-full sm:w-auto flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/85 border border-white/20 backdrop-blur-2xl shadow-2xl transition-transform hover:scale-[1.02]">
            {wifiQrUrl ? (
              <div className="w-20 h-20 bg-white p-1.5 rounded-xl shrink-0 shadow-md flex items-center justify-center">
                <img
                  src={wifiQrUrl}
                  alt="Guest Wi-Fi QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-white/10 rounded-xl shrink-0 flex items-center justify-center text-slate-400">
                <Wifi className="w-8 h-8" />
              </div>
            )}

            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Wifi className="w-3.5 h-3.5" />
                <span>Guest Wi-Fi</span>
              </div>
              <div className="text-sm font-black text-white truncate max-w-[200px] mt-0.5">
                {partyConfig.wifi.networkName}
              </div>
              <div className="text-xs text-slate-300 font-mono mt-0.5">
                Password:{' '}
                <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded">
                  {partyConfig.wifi.password || 'None'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Scan with phone camera to connect
              </div>
            </div>
          </div>
        )}

        {/* Music Playlist / DJ Card */}
        {partyConfig.music.enabled && (
          <div className="w-full sm:w-auto flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/85 border border-white/20 backdrop-blur-2xl shadow-2xl transition-transform hover:scale-[1.02]">
            <div className="min-w-0 text-left sm:text-right pl-2">
              <div className="flex items-center sm:justify-end gap-1.5 text-xs font-bold text-sky-300 uppercase tracking-wider">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Party Playlist</span>
              </div>
              <div className="text-sm font-black text-white truncate max-w-[220px] mt-0.5">
                {partyConfig.music.title}
              </div>
              <div className="text-xs text-slate-300 mt-0.5">
                {partyConfig.music.djNote || 'Scan to open playlist'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Point camera to open music mix
              </div>
            </div>

            {musicQrUrl ? (
              <div className="w-20 h-20 bg-white p-1.5 rounded-xl shrink-0 shadow-md flex items-center justify-center">
                <img
                  src={musicQrUrl}
                  alt="Playlist QR Code"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-20 h-20 bg-white/10 rounded-xl shrink-0 flex items-center justify-center text-slate-400">
                <Music2 className="w-8 h-8" />
              </div>
            )}
          </div>
        )}
      </footer>
    </div>
  );
};
