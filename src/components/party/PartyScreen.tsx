import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppConfig, PartyConfig, ICloudPhoto } from '../../types/config';
import { DEFAULT_ICLOUD_SAMPLE_PHOTOS, PARTY_CURATED_THEME_COLLECTIONS } from '../../constants/defaultConfig';
import { formatWifiQrString, generateQrDataUrl } from '../../utils/qrCode';
import { createShuffledDeck, expandShuffledDeck } from '../../utils/shuffleDeck';
import {
  Wifi,
  Music2,
  X,
  ExternalLink,
  Radio,
  Camera,
  Maximize2,
  Copy,
  Check,
} from 'lucide-react';
import { MediaWallpaper } from '../display/MediaWallpaper';

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
  const [guestUploadQrUrl, setGuestUploadQrUrl] = useState<string>('');

  // Enlarged QR Code Modal state
  interface EnlargedQrModalData {
    type: 'wifi' | 'music' | 'upload';
    title: string;
    badgeTitle: string;
    badgeColor: string;
    badgeIcon: React.ReactNode;
    instruction: string;
    qrUrl: string;
    details?: {
      label: string;
      value: string;
      copyable?: boolean;
      mono?: boolean;
    }[];
    externalUrl?: string;
  }

  const [enlargedQr, setEnlargedQr] = useState<EnlargedQrModalData | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Dismiss enlarged QR modal on Escape key
  useEffect(() => {
    if (!enlargedQr) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEnlargedQr(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enlargedQr]);

  const copyToClipboard = (text: string, key: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }).catch(() => {});
  };

  // Smart Shuffle Deck state
  const isShuffleEnabled = partyConfig.photos?.shuffle !== false && partyConfig.photos?.playbackOrder !== 'sequential';
  const shuffleDeckRef = useRef<number[]>([]);
  const shufflePosRef = useRef<number>(0);

  // Update or expand the shuffle deck whenever photos list changes
  useEffect(() => {
    if (photos.length === 0) {
      shuffleDeckRef.current = [];
      shufflePosRef.current = 0;
      return;
    }

    if (shuffleDeckRef.current.length === 0) {
      // Initialize fresh deck
      const initialDeck = isShuffleEnabled ? createShuffledDeck(photos.length) : Array.from({ length: photos.length }, (_, i) => i);
      shuffleDeckRef.current = initialDeck;
      shufflePosRef.current = 0;
      setPhotoIndex(initialDeck[0] || 0);
    } else if (photos.length > shuffleDeckRef.current.length) {
      // Progressively expand existing deck with newly synced photos
      if (isShuffleEnabled) {
        shuffleDeckRef.current = expandShuffledDeck(shuffleDeckRef.current, shufflePosRef.current, photos.length);
      } else {
        shuffleDeckRef.current = Array.from({ length: photos.length }, (_, i) => i);
      }
    }
  }, [photos.length, isShuffleEnabled]);

  // Fetch photos based on configuration source with progressive background sync polling
  useEffect(() => {
    const photoCfg = partyConfig.photos;
    const sourceType = photoCfg.sourceType || 'dedicated_icloud';
    let isMounted = true;
    let pollTimer: NodeJS.Timeout | null = null;

    if (sourceType === 'dedicated_icloud' || sourceType === 'icloud_album' || sourceType === 'wallpaper_sync') {
      const targetAlbumUrl = (sourceType === 'wallpaper_sync'
        ? (config.general.icloudAlbumUrl || config.screensaver?.icloudAlbumUrl || '')
        : (photoCfg.icloudAlbumUrl || config.general.icloudAlbumUrl || config.screensaver?.icloudAlbumUrl || '')
      ).trim();

      if (targetAlbumUrl) {
        const fetchAlbum = async () => {
          try {
            const res = await fetch(`/api/icloud-album?url=${encodeURIComponent(targetAlbumUrl)}`);
            const data = await res.json();
            if (!isMounted) return;

            if (data.ok && Array.isArray(data.photos) && data.photos.length > 0) {
              setPhotos(data.photos);
            } else if (data.fallbackPhotos) {
              setPhotos(data.fallbackPhotos);
            }

            // If the album is still streaming more photos in the background, poll again soon
            if (data.isSyncing) {
              pollTimer = setTimeout(fetchAlbum, 6000);
            } else {
              // Once fully synced, recheck every 20 minutes for new photos
              pollTimer = setTimeout(fetchAlbum, 20 * 60 * 1000);
            }
          } catch {
            if (isMounted) {
              setPhotos((prev) => (prev.length > 0 ? prev : DEFAULT_ICLOUD_SAMPLE_PHOTOS));
            }
          }
        };

        fetchAlbum();
      } else {
        setPhotos(DEFAULT_ICLOUD_SAMPLE_PHOTOS);
      }
    } else if (sourceType === 'curated_theme') {
      const themeKey = photoCfg.curatedTheme || 'celebration';
      const themeData = PARTY_CURATED_THEME_COLLECTIONS[themeKey];
      if (themeData && themeData.photos.length > 0) {
        setPhotos(themeData.photos);
      } else {
        setPhotos(DEFAULT_ICLOUD_SAMPLE_PHOTOS);
      }
    } else if (sourceType === 'custom_urls') {
      const rawUrls = photoCfg.customUrls || [];
      const validUrls = rawUrls.map((u) => u.trim()).filter((u) => u.startsWith('http://') || u.startsWith('https://'));
      if (validUrls.length > 0) {
        const customPhotos: ICloudPhoto[] = validUrls.map((url, i) => ({
          id: `custom-party-${i}`,
          url,
          thumbnailUrl: url,
          width: 1920,
          height: 1080,
          caption: `Party Photo ${i + 1}`,
        }));
        setPhotos(customPhotos);
      } else {
        setPhotos(DEFAULT_ICLOUD_SAMPLE_PHOTOS);
      }
    } else {
      setPhotos(DEFAULT_ICLOUD_SAMPLE_PHOTOS);
    }

    return () => {
      isMounted = false;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [
    partyConfig.photos.sourceType,
    partyConfig.photos.icloudAlbumUrl,
    partyConfig.photos.curatedTheme,
    JSON.stringify(partyConfig.photos.customUrls || []),
    config.general.icloudAlbumUrl,
    config.screensaver?.icloudAlbumUrl,
  ]);

  // Slideshow rotation timer with Smart Non-Repeating Shuffle Support
  useEffect(() => {
    if (photos.length <= 1) return;
    const intervalSeconds = Math.max(5, partyConfig.photos.cycleSeconds || 10);

    const timer = setInterval(() => {
      if (isShuffleEnabled) {
        const currentDeck = shuffleDeckRef.current;
        if (currentDeck.length === 0) return;

        let nextPos = shufflePosRef.current + 1;
        if (nextPos >= currentDeck.length) {
          // Finished full cycle! Reshuffle deck avoiding back-to-back duplicate with last photo
          const lastPhotoIdx = currentDeck[currentDeck.length - 1];
          const newDeck = createShuffledDeck(photos.length, lastPhotoIdx);
          shuffleDeckRef.current = newDeck;
          shufflePosRef.current = 0;
          setPhotoIndex(newDeck[0] || 0);
        } else {
          shufflePosRef.current = nextPos;
          setPhotoIndex(currentDeck[nextPos] || 0);
        }
      } else {
        // Sequential chronological playback
        setPhotoIndex((prev) => (prev + 1) % photos.length);
      }
    }, intervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [photos.length, partyConfig.photos.cycleSeconds, isShuffleEnabled]);

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

  // Generate Live Guest Photo Upload QR Code
  useEffect(() => {
    if (!partyConfig.photos.guestUploadEnabled || !partyConfig.photos.guestUploadUrl) {
      setGuestUploadQrUrl('');
      return;
    }
    generateQrDataUrl(partyConfig.photos.guestUploadUrl, { width: 220, margin: 1 }).then((url) => {
      setGuestUploadQrUrl(url);
    });
  }, [partyConfig.photos.guestUploadEnabled, partyConfig.photos.guestUploadUrl]);

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
  const photoBrightness = Math.max(10, Math.min(100, partyConfig.photos.photoBrightness ?? 55));
  const photoBlur = Math.max(0, Math.min(30, partyConfig.photos.photoBlur ?? 2));
  const photoFocalY = partyConfig.photos.photoFocalOffsetY ?? 20;

  // Adaptive vignette opacity based on user brightness preference
  const vignetteOpacity = Math.max(0.15, Math.min(0.85, 1 - (photoBrightness / 140)));

  // Font family class based on user selection (works on Raspberry Pi, Linux, Mac, Windows, iOS)
  const fontClass = useMemo(() => {
    switch (partyConfig.font) {
      case 'modern':
        return 'font-party-modern font-black tracking-tight';
      case 'serif':
        return 'font-party-serif font-black italic tracking-normal';
      case 'script':
        return 'font-party-script font-bold tracking-wide text-5xl sm:text-7xl md:text-8xl lg:text-9xl';
      case 'neon':
        return 'font-party-neon font-normal tracking-wider uppercase';
      case 'rounded':
      default:
        return 'font-party-rounded font-bold tracking-tight';
    }
  }, [partyConfig.font]);

  // Text vertical alignment
  const alignmentClass = useMemo(() => {
    switch (partyConfig.textAlignment) {
      case 'top':
        return 'justify-start pt-4 sm:pt-8 my-0';
      case 'bottom':
        return 'justify-end pb-4 sm:pb-8 my-0';
      case 'center':
      default:
        return 'justify-center my-auto';
    }
  }, [partyConfig.textAlignment]);

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

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-hidden bg-slate-950 text-white font-sans select-none flex flex-col justify-between">
      {/* 1. High-Res Photo & Video Slideshow Layer with face-safe focal anchoring */}
      {currentPhoto && (
        <MediaWallpaper
          photo={currentPhoto}
          photoUrl={photoUrl}
          brightness={photoBrightness}
          blur={photoBlur}
          focalOffsetY={photoFocalY}
        />
      )}

      {/* 2. Gradient Vignettes (Adaptive opacity tied to photo brightness) */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/80 pointer-events-none transition-opacity duration-500"
        style={{ opacity: vignetteOpacity }}
      />
      <div
        className="absolute inset-0 bg-radial-gradient from-transparent via-black/20 to-black/75 pointer-events-none transition-opacity duration-500"
        style={{ opacity: vignetteOpacity }}
      />

      {/* 3. Canvas Ambient Particles (Confetti / Sparkles) */}
      {partyConfig.effects !== 'none' && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10"
        />
      )}

      {/* 4. Top Header Strip */}
      <header className="relative z-20 w-full px-6 py-5 flex items-center justify-end shrink-0">
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white/90 hover:text-white border border-white/20 hover:border-white/40 backdrop-blur-xl shadow-2xl transition-all active:scale-95 cursor-pointer font-semibold text-xs group"
          title="Return to Main Home Display"
        >
          <span>Exit Party Mode</span>
          <X className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors" />
        </button>
      </header>

      {/* 5. Centerpiece: Grand Celebratory Greeting Banner with Dynamic Alignment */}
      <main className={`relative z-20 w-full max-w-5xl mx-auto px-4 text-center flex flex-col items-center space-y-4 flex-1 ${alignmentClass}`}>
        {/* Massive Dynamic Event Headline with Chosen Font */}
        <h1
          className={`text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-tight bg-gradient-to-b ${themeStyles.gradientText} bg-clip-text text-transparent drop-shadow-2xl ${fontClass}`}
          style={{
            filter: `drop-shadow(0 0 40px ${themeStyles.glow}) drop-shadow(0 15px 30px rgba(0,0,0,0.9))`,
          }}
        >
          {partyConfig.title}
        </h1>

        {/* Elegant Subtitle */}
        {partyConfig.subtitle && (
          <p className="max-w-2xl text-base sm:text-xl md:text-2xl font-medium text-white/90 drop-shadow-lg tracking-wide leading-relaxed font-party-rounded">
            {partyConfig.subtitle}
          </p>
        )}
      </main>

      {/* 6. Bottom Cards: Guest Wi-Fi, Guest Photo Drop & Party Playlist with Tap to Enlarge */}
      <footer className="relative z-20 w-full px-6 py-6 pb-8 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
        {/* Guest Wi-Fi QR Card */}
        {partyConfig.wifi.enabled && (
          <div
            onClick={() => {
              if (!wifiQrUrl) return;
              setEnlargedQr({
                type: 'wifi',
                title: partyConfig.wifi.networkName,
                badgeTitle: 'Guest Wi-Fi Network',
                badgeColor: 'text-amber-300 bg-amber-500/20 border-amber-400/40',
                badgeIcon: <Wifi className="w-4 h-4 text-amber-300" />,
                instruction: 'Point your smartphone camera at this QR code to connect instantly to guest Wi-Fi',
                qrUrl: wifiQrUrl,
                details: [
                  { label: 'Network Name (SSID)', value: partyConfig.wifi.networkName, copyable: true },
                  { label: 'Password', value: partyConfig.wifi.password || 'None (Open Network)', copyable: Boolean(partyConfig.wifi.password), mono: true },
                  { label: 'Security', value: partyConfig.wifi.securityType || 'WPA/WPA2' },
                ],
              });
            }}
            role="button"
            tabIndex={0}
            className="group relative cursor-pointer w-full sm:w-auto flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/95 border border-white/20 hover:border-amber-400/50 backdrop-blur-2xl shadow-2xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            title="Tap to enlarge Guest Wi-Fi QR code"
          >
            {wifiQrUrl ? (
              <div className="relative w-20 h-20 bg-white p-1.5 rounded-xl shrink-0 shadow-md flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-amber-400/60 transition-all">
                <img
                  src={wifiQrUrl}
                  alt="Guest Wi-Fi QR Code"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity text-white text-[10px] font-bold">
                  <Maximize2 className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>Enlarge</span>
                </div>
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
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-400/15 group-hover:bg-amber-400/25 border border-amber-400/30 px-2 py-0.5 rounded-full mt-1.5 w-fit transition-colors shadow-sm">
                <Maximize2 className="w-3 h-3" />
                <span>Tap to Enlarge</span>
              </div>
            </div>
          </div>
        )}

        {/* Guest Photo Drop / Upload Card */}
        {partyConfig.photos.guestUploadEnabled && partyConfig.photos.guestUploadUrl && (
          <div
            onClick={() => {
              if (!guestUploadQrUrl) return;
              setEnlargedQr({
                type: 'upload',
                title: partyConfig.photos.guestUploadTitle || 'Guest Photo Drop',
                badgeTitle: 'Live Guest Photo Drop',
                badgeColor: 'text-emerald-300 bg-emerald-500/20 border-emerald-400/40',
                badgeIcon: <Camera className="w-4 h-4 text-emerald-300" />,
                instruction: 'Scan with your smartphone camera to upload party photos straight to this slideshow',
                qrUrl: guestUploadQrUrl,
                externalUrl: partyConfig.photos.guestUploadUrl,
                details: [
                  { label: 'Destination', value: partyConfig.photos.guestUploadTitle || 'Shared Party Album' },
                  { label: 'Upload URL', value: partyConfig.photos.guestUploadUrl || '', copyable: true, mono: true },
                ],
              });
            }}
            role="button"
            tabIndex={0}
            className="group relative cursor-pointer w-full sm:w-auto flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/95 border border-white/20 hover:border-emerald-400/50 backdrop-blur-2xl shadow-2xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            title="Tap to enlarge Guest Photo Drop QR code"
          >
            {guestUploadQrUrl ? (
              <div className="relative w-20 h-20 bg-white p-1.5 rounded-xl shrink-0 shadow-md flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-emerald-400/60 transition-all">
                <img
                  src={guestUploadQrUrl}
                  alt="Guest Photo Upload QR"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity text-white text-[10px] font-bold">
                  <Maximize2 className="w-4 h-4 text-emerald-300 animate-pulse" />
                  <span>Enlarge</span>
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 bg-white/10 rounded-xl shrink-0 flex items-center justify-center text-slate-400">
                <Camera className="w-8 h-8 text-emerald-400" />
              </div>
            )}

            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                <Camera className="w-3.5 h-3.5" />
                <span>Guest Photo Drop</span>
              </div>
              <div className="text-sm font-black text-white truncate max-w-[200px] mt-0.5">
                {partyConfig.photos.guestUploadTitle || 'Add Party Photos'}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-400/15 group-hover:bg-emerald-400/25 border border-emerald-400/30 px-2 py-0.5 rounded-full mt-1.5 w-fit transition-colors shadow-sm">
                <Maximize2 className="w-3 h-3" />
                <span>Tap to Enlarge</span>
              </div>
            </div>
          </div>
        )}

        {/* Music Playlist / DJ Card */}
        {partyConfig.music.enabled && (
          <div
            onClick={() => {
              if (!musicQrUrl) return;
              setEnlargedQr({
                type: 'music',
                title: partyConfig.music.title || "Party Soundtrack",
                badgeTitle: 'Party Soundtrack',
                badgeColor: 'text-sky-300 bg-sky-500/20 border-sky-400/40',
                badgeIcon: <Radio className="w-4 h-4 text-sky-300" />,
                instruction: partyConfig.music.djNote || 'Point your smartphone camera to open the playlist on Spotify or Apple Music',
                qrUrl: musicQrUrl,
                externalUrl: partyConfig.music.playlistUrl,
                details: [
                  { label: 'Mix Name', value: partyConfig.music.title || 'Party Mix' },
                  { label: 'Host DJ Note', value: partyConfig.music.djNote || 'Scan to open playlist' },
                  { label: 'Playlist URL', value: partyConfig.music.playlistUrl || '', copyable: true, mono: true },
                ],
              });
            }}
            role="button"
            tabIndex={0}
            className="group relative cursor-pointer w-full sm:w-auto flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800/95 border border-white/20 hover:border-sky-400/50 backdrop-blur-2xl shadow-2xl transition-all duration-200 hover:scale-[1.03] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-400/50"
            title="Tap to enlarge Party Playlist QR code"
          >
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
              <div className="flex items-center sm:justify-end gap-1.5 text-[11px] font-semibold text-sky-300 bg-sky-400/15 group-hover:bg-sky-400/25 border border-sky-400/30 px-2 py-0.5 rounded-full mt-1.5 w-fit sm:ml-auto transition-colors shadow-sm">
                <Maximize2 className="w-3 h-3" />
                <span>Tap to Enlarge</span>
              </div>
            </div>

            {musicQrUrl ? (
              <div className="relative w-20 h-20 bg-white p-1.5 rounded-xl shrink-0 shadow-md flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-sky-400/60 transition-all">
                <img
                  src={musicQrUrl}
                  alt="Playlist QR Code"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity text-white text-[10px] font-bold">
                  <Maximize2 className="w-4 h-4 text-sky-300 animate-pulse" />
                  <span>Enlarge</span>
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 bg-white/10 rounded-xl shrink-0 flex items-center justify-center text-slate-400">
                <Music2 className="w-8 h-8" />
              </div>
            )}
          </div>
        )}
      </footer>

      {/* Enlarged QR Code Overlay Modal */}
      {enlargedQr && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fadeIn transition-opacity select-none"
          onClick={() => setEnlargedQr(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-white/25 rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col items-center text-center max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Corner Close Button */}
            <button
              onClick={() => setEnlargedQr(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Close (or press Esc / tap outside)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Badge Indicator */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border ${enlargedQr.badgeColor}`}
            >
              {enlargedQr.badgeIcon}
              <span>{enlargedQr.badgeTitle}</span>
            </div>

            {/* Main Title */}
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1 mb-1">
              {enlargedQr.title}
            </h2>

            {/* Friendly Scanning Prompt */}
            <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-sm mb-4">
              {enlargedQr.instruction}
            </p>

            {/* Enlarged QR Code Container */}
            <div className="w-64 h-64 sm:w-80 sm:h-80 bg-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border-4 border-white/20 flex items-center justify-center my-1">
              <img
                src={enlargedQr.qrUrl}
                alt={enlargedQr.title}
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>

            {/* Details Table */}
            {enlargedQr.details && enlargedQr.details.length > 0 && (
              <div className="w-full mt-4 bg-white/5 rounded-2xl p-3 border border-white/10 space-y-2 text-left">
                {enlargedQr.details.map((detail, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs gap-3"
                  >
                    <span className="text-slate-400 font-medium shrink-0">
                      {detail.label}:
                    </span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`truncate text-white font-semibold ${
                          detail.mono ? 'font-mono bg-black/40 px-2 py-0.5 rounded border border-white/10 text-amber-200' : ''
                        }`}
                        title={detail.value}
                      >
                        {detail.value}
                      </span>
                      {detail.copyable && (
                        <button
                          onClick={() => copyToClipboard(detail.value, `${enlargedQr.type}-${idx}`)}
                          className="shrink-0 p-1 rounded-md bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                          title={`Copy ${detail.label}`}
                        >
                          {copiedKey === `${enlargedQr.type}-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* External URL action if applicable */}
            {enlargedQr.externalUrl && (
              <a
                href={enlargedQr.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 text-xs font-semibold text-sky-300 hover:text-sky-200 hover:underline"
              >
                <span>Open direct link in browser</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Prominent Dismiss Button */}
            <button
              onClick={() => setEnlargedQr(null)}
              className="mt-5 w-full py-3.5 px-6 rounded-2xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 border border-white/20 cursor-pointer shadow-lg"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>

            {/* Subtle dismiss guidance */}
            <span className="text-[11px] text-slate-400 mt-2">
              Tap anywhere outside this card or press ESC to dismiss
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
