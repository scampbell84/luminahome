import React, { useState, useEffect } from 'react';
import {
  PartyConfig,
  PartyAccentColor,
  PartyEffect,
  PartyPhotoSourceType,
  PartyCuratedTheme,
  PartyFont,
  PartyTextAlignment,
} from '../../types/config';
import { PARTY_TEMPLATES, PARTY_CURATED_THEME_COLLECTIONS } from '../../constants/defaultConfig';
import { generateQrDataUrl, formatWifiQrString } from '../../utils/qrCode';
import {
  PartyPopper,
  Sparkles,
  Wifi,
  Music,
  Sliders,
  Image as ImageIcon,
  Check,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Info,
  Palette,
  Camera,
  Globe,
  Cloud,
  Home,
  Upload,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Type,
  Sun,
  Droplets,
} from 'lucide-react';

interface PartySettingsTabProps {
  partyConfig: PartyConfig;
  onUpdatePartyConfig: (updater: (prev: PartyConfig) => PartyConfig) => void;
  onTriggerPartyMode?: () => void;
}

const ACCENT_COLOR_OPTIONS: { id: PartyAccentColor; label: string; previewClass: string }[] = [
  { id: 'gold', label: 'Celebration Gold', previewClass: 'from-amber-400 to-yellow-500' },
  { id: 'neon-pink', label: 'Neon Pink', previewClass: 'from-pink-500 to-rose-500' },
  { id: 'purple', label: 'Royal Purple', previewClass: 'from-purple-500 to-fuchsia-600' },
  { id: 'cyan', label: 'Electric Cyan', previewClass: 'from-cyan-400 to-blue-500' },
  { id: 'emerald', label: 'Emerald Glow', previewClass: 'from-emerald-400 to-teal-500' },
  { id: 'amber', label: 'Sunset Amber', previewClass: 'from-amber-500 to-orange-500' },
];

const FONT_OPTIONS: { id: PartyFont; label: string; previewText: string; desc: string; fontClass: string }[] = [
  { id: 'rounded', label: 'Playful Rounded', previewText: 'Happy Birthday!', desc: 'Bubbly rounded terminals (Fredoka/Nunito) on Pi & all screens', fontClass: 'font-party-rounded font-bold' },
  { id: 'modern', label: 'Bold Modern', previewText: 'Happy Birthday!', desc: 'Punchy contemporary sans-serif (Outfit)', fontClass: 'font-party-modern font-black' },
  { id: 'serif', label: 'Editorial Serif', previewText: 'Happy Birthday!', desc: 'Classy luxury italic serif (Playfair Display)', fontClass: 'font-party-serif font-black italic' },
  { id: 'script', label: 'Festive Script', previewText: 'Happy Birthday!', desc: 'Handwritten celebratory cursive (Caveat)', fontClass: 'font-party-script font-bold text-lg' },
  { id: 'neon', label: 'Retro Neon', previewText: 'HAPPY BIRTHDAY!', desc: 'Arcade synthwave party display (Righteous)', fontClass: 'font-party-neon font-normal' },
];

const TEXT_ALIGNMENT_OPTIONS: { id: PartyTextAlignment; label: string; desc: string; icon: string }[] = [
  { id: 'top', label: 'Top of Screen', desc: 'Leaves center open to see family faces and photos', icon: '⬆️' },
  { id: 'center', label: 'Middle of Screen', desc: 'Classic celebration centerpiece vertically centered', icon: '↕️' },
  { id: 'bottom', label: 'Bottom of Screen', desc: 'Positioned in lower area above the QR cards', icon: '⬇️' },
];

const EMOJI_QUICK_PICKS = ['🎉', '🎂', '🥂', '🍸', '🎈', '🏡', '💖', '✨', '🕺', '🥳'];

export const PartySettingsTab: React.FC<PartySettingsTabProps> = ({
  partyConfig,
  onUpdatePartyConfig,
  onTriggerPartyMode,
}) => {
  const [wifiQrUrl, setWifiQrUrl] = useState<string>('');
  const [musicQrUrl, setMusicQrUrl] = useState<string>('');
  const [guestUploadQrUrl, setGuestUploadQrUrl] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [copiedWifi, setCopiedWifi] = useState<boolean>(false);

  // Dedicated iCloud Album verification state
  const [testingAlbum, setTestingAlbum] = useState<boolean>(false);
  const [testedAlbumData, setTestedAlbumData] = useState<{
    ok: boolean;
    streamName?: string;
    owner?: string;
    count?: number;
    error?: string;
    photos?: any[];
  } | null>(null);

  // Custom URLs textarea state
  const [customUrlsText, setCustomUrlsText] = useState<string>(
    partyConfig.photos?.customUrls?.join('\n') || ''
  );

  // Generate live SVG QR codes for settings preview
  useEffect(() => {
    let isMounted = true;
    if (partyConfig.wifi?.enabled && partyConfig.wifi?.networkName) {
      const wifiString = formatWifiQrString(
        partyConfig.wifi.networkName,
        partyConfig.wifi.password || '',
        partyConfig.wifi.securityType || 'WPA'
      );
      generateQrDataUrl(wifiString, { margin: 1, width: 220 }).then((url) => {
        if (isMounted) setWifiQrUrl(url);
      });
    } else {
      setWifiQrUrl('');
    }

    if (partyConfig.music?.enabled && partyConfig.music?.playlistUrl) {
      generateQrDataUrl(partyConfig.music.playlistUrl, { margin: 1, width: 220 }).then((url) => {
        if (isMounted) setMusicQrUrl(url);
      });
    } else {
      setMusicQrUrl('');
    }

    if (partyConfig.photos?.guestUploadEnabled && partyConfig.photos?.guestUploadUrl) {
      generateQrDataUrl(partyConfig.photos.guestUploadUrl, { margin: 1, width: 220 }).then((url) => {
        if (isMounted) setGuestUploadQrUrl(url);
      });
    } else {
      setGuestUploadQrUrl('');
    }

    return () => {
      isMounted = false;
    };
  }, [
    partyConfig.wifi?.enabled,
    partyConfig.wifi?.networkName,
    partyConfig.wifi?.password,
    partyConfig.wifi?.securityType,
    partyConfig.music?.enabled,
    partyConfig.music?.playlistUrl,
    partyConfig.photos?.guestUploadEnabled,
    partyConfig.photos?.guestUploadUrl,
  ]);

  const applyTemplate = (templateId: string) => {
    const template = PARTY_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    onUpdatePartyConfig((prev) => ({
      ...prev,
      title: template.title,
      subtitle: template.subtitle,
      accentColor: template.accentColor,
      effects: template.effects,
    }));
  };

  const insertEmoji = (emoji: string) => {
    onUpdatePartyConfig((prev) => ({
      ...prev,
      title: `${prev.title.trim()} ${emoji}`.trim(),
    }));
  };

  const copyWifiDetails = () => {
    if (!partyConfig.wifi?.networkName) return;
    const text = `Wi-Fi: ${partyConfig.wifi.networkName}\nPassword: ${partyConfig.wifi.password || '(None)'}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2000);
    });
  };

  const handleTestAlbum = async () => {
    const url = partyConfig.photos?.icloudAlbumUrl?.trim();
    if (!url) return;
    setTestingAlbum(true);
    setTestedAlbumData(null);
    try {
      const res = await fetch(`/api/icloud-album?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setTestedAlbumData(data);
    } catch (err: any) {
      setTestedAlbumData({ ok: false, error: err.message || 'Network request failed' });
    } finally {
      setTestingAlbum(false);
    }
  };

  const handleCustomUrlsChange = (text: string) => {
    setCustomUrlsText(text);
    const urls = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('http://') || line.startsWith('https://'));
    onUpdatePartyConfig((prev) => ({
      ...prev,
      photos: {
        ...prev.photos,
        customUrls: urls,
      },
    }));
  };

  const getTemplateEmoji = (id: string) => {
    switch (id) {
      case 'birthday':
        return '🎂';
      case 'anniversary':
        return '🥂';
      case 'dinner':
        return '🍽️';
      case 'cocktail':
        return '🍸';
      case 'housewarming':
        return '🏡';
      case 'holiday':
        return '🎄';
      default:
        return '🎉';
    }
  };

  const activePhotoSource: PartyPhotoSourceType =
    partyConfig.photos?.sourceType === 'icloud_album'
      ? 'dedicated_icloud'
      : partyConfig.photos?.sourceType || 'dedicated_icloud';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Action Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-fuchsia-950/70 via-purple-950/50 to-slate-900 border border-fuchsia-500/30 p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-300 text-xs font-semibold uppercase tracking-wider">
              <PartyPopper className="w-3.5 h-3.5" />
              <span>Dedicated Celebration Board</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Party & Celebration Mode
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Transform your wall kiosk into an ambient celebration centerpiece during parties and gatherings. Features full-bleed face-centered family photos, animated celebratory effects, guest Wi-Fi QR code scan-to-connect, and party playlist sharing.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto">
            {onTriggerPartyMode && (
              <button
                type="button"
                onClick={onTriggerPartyMode}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-fuchsia-500/30 hover:shadow-fuchsia-500/50 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
              >
                <PartyPopper className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span>Launch Party Mode Now</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Preset Celebration Templates */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Event Preset Templates</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a celebration preset to quickly style the banner headline, colors, and animations.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
          {PARTY_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => applyTemplate(tpl.id)}
              className="p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-fuchsia-500/40 text-left transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div>
                <span className="text-2xl block mb-2">{getTemplateEmoji(tpl.id)}</span>
                <span className="text-xs font-bold text-slate-200 group-hover:text-white block line-clamp-1">
                  {tpl.name}
                </span>
              </div>
              <span className="text-[10px] text-fuchsia-400/80 font-mono mt-2 block">
                Apply Preset &rarr;
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Event Headline & Subtitle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Celebration Message</span>
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-200">
                  Headline Greeting
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {partyConfig.title.length}/60 chars
                </span>
              </div>
              <input
                type="text"
                value={partyConfig.title}
                maxLength={60}
                placeholder="e.g. Happy Birthday Sarah! 🎉"
                onChange={(e) =>
                  onUpdatePartyConfig((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:border-fuchsia-500 focus:outline-none"
              />

              {/* Emoji quick pills */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                <span className="text-[10px] text-slate-500 font-mono shrink-0 mr-1">
                  Add:
                </span>
                {EMOJI_QUICK_PICKS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs transition-colors shrink-0"
                    title={`Add ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-200 block mb-1.5">
                Subtitle / Welcome Note
              </label>
              <textarea
                rows={2}
                value={partyConfig.subtitle || ''}
                maxLength={140}
                placeholder="e.g. Welcome everyone! Grab a drink, scan the Wi-Fi below, and enjoy!"
                onChange={(e) =>
                  onUpdatePartyConfig((prev) => ({
                    ...prev,
                    subtitle: e.target.value,
                  }))
                }
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:border-fuchsia-500 focus:outline-none resize-none"
              />
            </div>

            {/* Typography / Font Style Selection */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span>Celebration Font Style</span>
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Cross-platform (Pi & Mac)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FONT_OPTIONS.map((font) => {
                  const isSelected = (partyConfig.font || 'rounded') === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() =>
                        onUpdatePartyConfig((prev) => ({
                          ...prev,
                          font: font.id,
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{font.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-fuchsia-400" />}
                      </div>
                      <span className={`text-base block truncate text-amber-300 ${font.fontClass}`}>
                        {partyConfig.title || font.previewText}
                      </span>
                      <span className="text-[9px] text-slate-400 block mt-0.5 truncate">
                        {font.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Banner Vertical Positioning / Alignment */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <label className="text-xs font-semibold text-slate-200 block">
                Text Position on Screen
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TEXT_ALIGNMENT_OPTIONS.map((align) => {
                  const isSelected = (partyConfig.textAlignment || 'center') === align.id;
                  return (
                    <button
                      key={align.id}
                      type="button"
                      onClick={() =>
                        onUpdatePartyConfig((prev) => ({
                          ...prev,
                          textAlignment: align.id,
                        }))
                      }
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-sky-400 bg-sky-500/20 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="text-base block mb-0.5">{align.icon}</span>
                      <span className="text-xs font-bold block">{align.label}</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5 line-clamp-1">
                        {align.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Visual Style & Animated Effects */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-fuchsia-400" />
            <span>Theme Color & Animated Effects</span>
          </h3>

          {/* Accent Color Chooser */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 block">
              Accent Color Palette
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACCENT_COLOR_OPTIONS.map((col) => {
                const isSelected = partyConfig.accentColor === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() =>
                      onUpdatePartyConfig((prev) => ({
                        ...prev,
                        accentColor: col.id,
                      }))
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'border-fuchsia-400 bg-fuchsia-500/20 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-gradient-to-tr ${col.previewClass} shrink-0 shadow-sm`}
                    />
                    <span className="text-xs font-medium truncate">{col.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Animated Effects */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <label className="text-xs font-semibold text-slate-200 block">
              Particle Animation
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'confetti', label: 'Confetti Rain', desc: 'Festive physics particles' },
                { id: 'sparkles', label: 'Floating Sparkles', desc: 'Subtle ambient glows' },
                { id: 'none', label: 'None', desc: 'Clean photo focus' },
              ].map((eff) => {
                const isSelected = partyConfig.effects === eff.id;
                return (
                  <button
                    key={eff.id}
                    type="button"
                    onClick={() =>
                      onUpdatePartyConfig((prev) => ({
                        ...prev,
                        effects: eff.id as PartyEffect,
                      }))
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 text-white'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-xs font-bold block">{eff.label}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{eff.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* PHOTO SOURCES & DEDICATED EVENT ICLOUD ALBUM */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Party Photo Slideshow Source</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                  Multi-Source
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Choose where party photos are pulled from, or connect another dedicated iCloud Shared Album for this event.
              </p>
            </div>
          </div>
        </div>

        {/* Source Selection Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Dedicated Event iCloud Album */}
          <button
            type="button"
            onClick={() =>
              onUpdatePartyConfig((prev) => ({
                ...prev,
                photos: {
                  ...prev.photos,
                  sourceType: 'dedicated_icloud',
                },
              }))
            }
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
              activePhotoSource === 'dedicated_icloud'
                ? 'border-sky-400 bg-sky-950/40 text-white shadow-md'
                : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Cloud className={`w-5 h-5 ${activePhotoSource === 'dedicated_icloud' ? 'text-sky-400' : 'text-slate-400'}`} />
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                  Event Album
                </span>
              </div>
              <span className="text-xs font-bold text-white block">
                Dedicated iCloud Album
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Connect a separate iCloud album created specifically for this birthday, party, or family event.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-sky-400 font-semibold">
              <span>{activePhotoSource === 'dedicated_icloud' ? '● Active' : 'Select'}</span>
              <span>iCloud Link &rarr;</span>
            </div>
          </button>

          {/* 2. Sync with Wallpaper / Screensaver Album */}
          <button
            type="button"
            onClick={() =>
              onUpdatePartyConfig((prev) => ({
                ...prev,
                photos: {
                  ...prev.photos,
                  sourceType: 'wallpaper_sync',
                },
              }))
            }
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
              activePhotoSource === 'wallpaper_sync'
                ? 'border-emerald-400 bg-emerald-950/40 text-white shadow-md'
                : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Home className={`w-5 h-5 ${activePhotoSource === 'wallpaper_sync' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                  Zero Setup
                </span>
              </div>
              <span className="text-xs font-bold text-white block">
                Household Family Album
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Seamlessly reuses your household family photo stream configured in Wallpapers & Screensaver.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-emerald-400 font-semibold">
              <span>{activePhotoSource === 'wallpaper_sync' ? '● Active' : 'Select'}</span>
              <span>Syncs &rarr;</span>
            </div>
          </button>

          {/* 3. Curated Event Mood Themes */}
          <button
            type="button"
            onClick={() =>
              onUpdatePartyConfig((prev) => ({
                ...prev,
                photos: {
                  ...prev.photos,
                  sourceType: 'curated_theme',
                  curatedTheme: prev.photos.curatedTheme || 'celebration',
                },
              }))
            }
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
              activePhotoSource === 'curated_theme'
                ? 'border-amber-400 bg-amber-950/40 text-white shadow-md'
                : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Sparkles className={`w-5 h-5 ${activePhotoSource === 'curated_theme' ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                  Curated
                </span>
              </div>
              <span className="text-xs font-bold text-white block">
                Celebration Mood Themes
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                High-definition party photography: Birthday joy, cocktail lounge, disco nightclub, dinner party, or tropical.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-amber-400 font-semibold">
              <span>{activePhotoSource === 'curated_theme' ? '● Active' : 'Select'}</span>
              <span>6 Themes &rarr;</span>
            </div>
          </button>

          {/* 4. Direct Custom Web Image URLs */}
          <button
            type="button"
            onClick={() =>
              onUpdatePartyConfig((prev) => ({
                ...prev,
                photos: {
                  ...prev.photos,
                  sourceType: 'custom_urls',
                },
              }))
            }
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
              activePhotoSource === 'custom_urls'
                ? 'border-purple-400 bg-purple-950/40 text-white shadow-md'
                : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <Globe className={`w-5 h-5 ${activePhotoSource === 'custom_urls' ? 'text-purple-400' : 'text-slate-400'}`} />
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-mono font-semibold">
                  Custom URLs
                </span>
              </div>
              <span className="text-xs font-bold text-white block">
                Direct Web Image Links
              </span>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Paste direct links to images hosted on Google Drive, Imgur, Dropbox, or your own web server.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-purple-400 font-semibold">
              <span>{activePhotoSource === 'custom_urls' ? '● Active' : 'Select'}</span>
              <span>URLs &rarr;</span>
            </div>
          </button>
        </div>

        {/* Source 1 Details: Dedicated Event iCloud Shared Album */}
        {activePhotoSource === 'dedicated_icloud' && (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-sky-500/30 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-sky-400" />
                  <span>Dedicated Event iCloud Shared Album Link</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Paste the public website link from Apple Photos for this specific event or birthday album.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://www.icloud.com/sharedalbum/#B..."
                value={partyConfig.photos?.icloudAlbumUrl || ''}
                onChange={(e) =>
                  onUpdatePartyConfig((prev) => ({
                    ...prev,
                    photos: {
                      ...prev.photos,
                      sourceType: 'dedicated_icloud',
                      icloudAlbumUrl: e.target.value,
                    },
                  }))
                }
                className="flex-1 bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-mono focus:border-sky-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleTestAlbum}
                disabled={testingAlbum || !partyConfig.photos?.icloudAlbumUrl?.trim()}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
              >
                {testingAlbum ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Test Album Connection</span>
                  </>
                )}
              </button>
            </div>

            {/* Verification result feedback */}
            {testedAlbumData && (
              <div
                className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 ${
                  testedAlbumData.ok
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {testedAlbumData.ok ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>
                        Connected: "{testedAlbumData.streamName}" ({testedAlbumData.count} photos found)
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>Connection Error: {testedAlbumData.error}</span>
                    </>
                  )}
                </div>
                {testedAlbumData.ok && testedAlbumData.photos && testedAlbumData.photos.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-0.5">
                    {testedAlbumData.photos.slice(0, 8).map((p: any, idx: number) => (
                      <img
                        key={idx}
                        src={p.thumbnailUrl || p.url}
                        alt={`Preview ${idx}`}
                        className="w-12 h-12 object-cover rounded-lg border border-white/20 shrink-0"
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">How to get an iCloud Shared Album Web Link:</span>
              <p>
                1. On iPhone or iPad, open <strong>Photos</strong> &rarr; <strong>Shared Albums</strong> &rarr; tap your event album.
              </p>
              <p>
                2. Tap the <strong>People</strong> icon at top right &rarr; toggle ON <strong>Public Website</strong> &rarr; tap <strong>Copy Link</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Source 2 Details: Household Sync */}
        {activePhotoSource === 'wallpaper_sync' && (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/30 text-xs text-slate-300 space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Synced with Household Family Album</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Party mode will automatically cycle through the shared family photo album configured in your home display settings. Any new photos added by family members will immediately show on the party screen!
            </p>
          </div>
        )}

        {/* Source 3 Details: Curated Celebration Mood Themes */}
        {activePhotoSource === 'curated_theme' && (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/30 space-y-3 animate-fadeIn">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Select Curated Celebration Visual Theme</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hand-picked high-resolution photography ready to provide instant party ambiance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {Object.values(PARTY_CURATED_THEME_COLLECTIONS).map((theme) => {
                const isSelected = (partyConfig.photos?.curatedTheme || 'celebration') === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() =>
                      onUpdatePartyConfig((prev) => ({
                        ...prev,
                        photos: {
                          ...prev.photos,
                          sourceType: 'curated_theme',
                          curatedTheme: theme.id,
                        },
                      }))
                    }
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{theme.icon}</span>
                        <span className="text-xs font-bold">{theme.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                        {theme.description}
                      </p>
                    </div>

                    {/* Thumbnail previews */}
                    <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800/60">
                      {theme.photos.slice(0, 3).map((p, i) => (
                        <img
                          key={i}
                          src={p.thumbnailUrl}
                          alt="thumb"
                          className="w-10 h-10 object-cover rounded-md border border-white/20 shrink-0"
                        />
                      ))}
                      <span className="text-[10px] text-amber-300 font-mono ml-auto">
                        {theme.photos.length} photos
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Source 4 Details: Direct Custom Web Image URLs */}
        {activePhotoSource === 'custom_urls' && (
          <div className="p-4 rounded-xl bg-slate-950/70 border border-purple-500/30 space-y-3 animate-fadeIn">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-purple-400" />
                  <span>Custom Image Web URLs</span>
                </h4>
                <span className="text-[10px] text-purple-300 font-mono">
                  {partyConfig.photos?.customUrls?.length || 0} valid URLs
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Paste direct links to image files (.jpg, .png, .webp). Enter one URL per line.
              </p>
            </div>

            <textarea
              rows={4}
              placeholder="https://images.unsplash.com/...&#10;https://example.com/family-photo-1.jpg&#10;https://i.imgur.com/...jpg"
              value={customUrlsText}
              onChange={(e) => handleCustomUrlsChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3.5 py-2 text-xs font-mono focus:border-purple-500 focus:outline-none resize-y"
            />
          </div>
        )}

        {/* INTERACTIVE GUEST PHOTO DROP / UPLOAD QR CODE */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Guest Photo Upload QR Card</span>
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-semibold">
                    Interactive
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Display a QR code on the party screen allowing guests to drop their phone photos into your shared album during the event.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={partyConfig.photos?.guestUploadEnabled ?? false}
                onChange={(e) =>
                  onUpdatePartyConfig((prev) => ({
                    ...prev,
                    photos: {
                      ...prev.photos,
                      guestUploadEnabled: e.target.checked,
                    },
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div
            className={`space-y-3 transition-opacity ${
              partyConfig.photos?.guestUploadEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  QR Card Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Drop Photos to Party Album"
                  value={partyConfig.photos?.guestUploadTitle || ''}
                  onChange={(e) =>
                    onUpdatePartyConfig((prev) => ({
                      ...prev,
                      photos: {
                        ...prev.photos,
                        guestUploadTitle: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Upload Destination URL
                </label>
                <input
                  type="url"
                  placeholder="Apple Shared Album invite, Google Photos link, Dropbox File Request"
                  value={partyConfig.photos?.guestUploadUrl || ''}
                  onChange={(e) =>
                    onUpdatePartyConfig((prev) => ({
                      ...prev,
                      photos: {
                        ...prev.photos,
                        guestUploadUrl: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {guestUploadQrUrl && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center">
                    <img src={guestUploadQrUrl} alt="Guest Upload QR Code" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Guest Upload QR Ready
                    </span>
                    <span className="text-[11px] text-slate-400 block font-mono truncate max-w-[200px]">
                      {partyConfig.photos?.guestUploadUrl}
                    </span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Camera className="w-3 h-3" /> Guests scan with phone to contribute photos live
                    </span>
                  </div>
                </div>

                <a
                  href={partyConfig.photos?.guestUploadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Link</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Photo Display Adjustments: Dimming & Blur */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3 border-t border-slate-800/80">
          {/* Photo Dim / Brightness Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Photo Brightness / Dimming</span>
              </label>
              <span className="text-xs font-mono font-bold text-amber-400">
                {partyConfig.photos?.photoBrightness ?? 55}%
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  {(partyConfig.photos?.photoBrightness ?? 55) >= 80
                    ? '(Vivid)'
                    : (partyConfig.photos?.photoBrightness ?? 55) >= 50
                    ? '(Balanced)'
                    : '(Moody Dim)'}
                </span>
              </span>
            </div>

            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={partyConfig.photos?.photoBrightness ?? 55}
              onChange={(e) =>
                onUpdatePartyConfig((prev) => ({
                  ...prev,
                  photos: {
                    ...prev.photos,
                    photoBrightness: parseInt(e.target.value, 10),
                  },
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            {/* Quick preset chips */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {[
                { val: 25, label: 'Dim (25%)' },
                { val: 45, label: 'Soft (45%)' },
                { val: 60, label: 'Default (60%)' },
                { val: 80, label: 'Vivid (80%)' },
                { val: 100, label: 'Max (100%)' },
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() =>
                    onUpdatePartyConfig((prev) => ({
                      ...prev,
                      photos: {
                        ...prev.photos,
                        photoBrightness: chip.val,
                      },
                    }))
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    (partyConfig.photos?.photoBrightness ?? 55) === chip.val
                      ? 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">
              Lower values dim photos so text pops with high contrast; higher values keep photos bright and vivid.
            </p>
          </div>

          {/* Photo Blur / Soft Focus Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-sky-400" />
                <span>Background Photo Blur</span>
              </label>
              <span className="text-xs font-mono font-bold text-sky-400">
                {partyConfig.photos?.photoBlur ?? 2}px
                <span className="text-[10px] text-slate-400 font-normal ml-1">
                  {(partyConfig.photos?.photoBlur ?? 2) === 0
                    ? '(Razor Sharp)'
                    : (partyConfig.photos?.photoBlur ?? 2) <= 3
                    ? '(Subtle)'
                    : (partyConfig.photos?.photoBlur ?? 2) <= 8
                    ? '(Soft Bokeh)'
                    : '(Dreamy Blur)'}
                </span>
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={partyConfig.photos?.photoBlur ?? 2}
              onChange={(e) =>
                onUpdatePartyConfig((prev) => ({
                  ...prev,
                  photos: {
                    ...prev.photos,
                    photoBlur: parseInt(e.target.value, 10),
                  },
                }))
              }
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />

            {/* Quick preset chips */}
            <div className="flex items-center gap-1.5 pt-0.5">
              {[
                { val: 0, label: 'Sharp (0px)' },
                { val: 2, label: 'Subtle (2px)' },
                { val: 6, label: 'Bokeh (6px)' },
                { val: 14, label: 'Dreamy (14px)' },
              ].map((chip) => (
                <button
                  key={chip.val}
                  type="button"
                  onClick={() =>
                    onUpdatePartyConfig((prev) => ({
                      ...prev,
                      photos: {
                        ...prev.photos,
                        photoBlur: chip.val,
                      },
                    }))
                  }
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    (partyConfig.photos?.photoBlur ?? 2) === chip.val
                      ? 'bg-sky-500/30 text-sky-300 border border-sky-500/50'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400">
              Set to 0px for crisp photo viewing, or increase to create an ambient party glow.
            </p>
          </div>
        </div>

        {/* Framing & Timing Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Photo Cycle Interval
            </label>
            <select
              value={partyConfig.photos?.cycleSeconds ?? 10}
              onChange={(e) =>
                onUpdatePartyConfig((prev) => ({
                  ...prev,
                  photos: {
                    ...prev.photos,
                    cycleSeconds: parseInt(e.target.value, 10),
                  },
                }))
              }
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
            >
              <option value={6}>6 seconds (Fast Party Pace)</option>
              <option value={10}>10 seconds (Standard)</option>
              <option value={15}>15 seconds (Relaxed)</option>
              <option value={25}>25 seconds (Slow Ambient)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Face-Safe Framing Bias
            </label>
            <select
              value={partyConfig.photos?.photoFocalOffsetY ?? 20}
              onChange={(e) =>
                onUpdatePartyConfig((prev) => ({
                  ...prev,
                  photos: {
                    ...prev.photos,
                    photoFocalOffsetY: parseInt(e.target.value, 10),
                  },
                }))
              }
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-emerald-500 focus:outline-none"
            >
              <option value={15}>15% (Upper bias - Portrait Shots)</option>
              <option value={20}>20% (Default - Best for Family & Group Faces)</option>
              <option value={30}>30% (Mid-Upper balance)</option>
              <option value={50}>50% (Center anchored)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Guest Wi-Fi & Music Playlist Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Guest Wi-Fi Setting Card */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Guest Wi-Fi QR Card</h3>
                <p className="text-xs text-slate-400">
                  Allow party guests to join your home Wi-Fi instantly by pointing their camera
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={partyConfig.wifi?.enabled ?? false}
                onChange={(e) =>
                  onUpdatePartyConfig((prev) => ({
                    ...prev,
                    wifi: {
                      ...(prev.wifi || { networkName: '', password: '', securityType: 'WPA' }),
                      enabled: e.target.checked,
                    },
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
            </label>
          </div>

          <div
            className={`space-y-4 transition-opacity ${
              partyConfig.wifi?.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Network Name (SSID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lumina-Guest"
                  value={partyConfig.wifi?.networkName || ''}
                  onChange={(e) =>
                    onUpdatePartyConfig((prev) => ({
                      ...prev,
                      wifi: {
                        ...(prev.wifi || { password: '', securityType: 'WPA' }),
                        enabled: prev.wifi?.enabled ?? true,
                        networkName: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-sky-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Wi-Fi Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter Wi-Fi password"
                    value={partyConfig.wifi?.password || ''}
                    onChange={(e) =>
                      onUpdatePartyConfig((prev) => ({
                        ...prev,
                        wifi: {
                          ...(prev.wifi || { networkName: '', securityType: 'WPA' }),
                          enabled: prev.wifi?.enabled ?? true,
                          password: e.target.value,
                        },
                      }))
                    }
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-3 pr-9 py-2 text-xs focus:border-sky-500 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* QR Preview in Admin */}
            {wifiQrUrl && (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center">
                    <img src={wifiQrUrl} alt="Guest Wi-Fi QR Code" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Live QR Code Ready
                    </span>
                    <span className="text-[11px] text-slate-400 block font-mono truncate max-w-[200px]">
                      SSID: {partyConfig.wifi?.networkName}
                    </span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                      <Check className="w-3 h-3" /> Compatible with iOS & Android Camera
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={copyWifiDetails}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {copiedWifi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWifi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Music & Playlist Sharing Card */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Music & Playlist QR Card</h3>
                <p className="text-xs text-slate-400">
                  Share your Spotify, Apple Music, or DJ queue link with guests
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={partyConfig.music?.enabled ?? false}
                onChange={(e) =>
                  onUpdatePartyConfig((prev) => ({
                    ...prev,
                    music: {
                      ...(prev.music || { title: "Tonight's Mix", playlistUrl: '' }),
                      enabled: e.target.checked,
                    },
                  }))
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-fuchsia-600"></div>
            </label>
          </div>

          <div
            className={`space-y-4 transition-opacity ${
              partyConfig.music?.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
            }`}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Card Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Party Playlist"
                  value={partyConfig.music?.title || ''}
                  onChange={(e) =>
                    onUpdatePartyConfig((prev) => ({
                      ...prev,
                      music: {
                        ...(prev.music || { playlistUrl: '' }),
                        enabled: prev.music?.enabled ?? true,
                        title: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-fuchsia-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  DJ Note / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Scan to open playlist & queue songs"
                  value={partyConfig.music?.djNote || ''}
                  onChange={(e) =>
                    onUpdatePartyConfig((prev) => ({
                      ...prev,
                      music: {
                        ...(prev.music || { title: '' }),
                        enabled: prev.music?.enabled ?? true,
                        djNote: e.target.value,
                      },
                    }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-fuchsia-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Playlist URL or Jam Session Link
              </label>
              <input
                type="url"
                placeholder="https://open.spotify.com/playlist/... or Sonos link"
                value={partyConfig.music?.playlistUrl || ''}
                onChange={(e) =>
                  onUpdatePartyConfig((prev) => ({
                    ...prev,
                    music: {
                      ...(prev.music || { title: '' }),
                      enabled: prev.music?.enabled ?? true,
                      playlistUrl: e.target.value,
                    },
                  }))
                }
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:border-fuchsia-500 focus:outline-none font-mono"
              />
            </div>

            {/* QR Preview in Admin */}
            {musicQrUrl && (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center">
                    <img src={musicQrUrl} alt="Music Playlist QR Code" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Playlist QR Ready
                    </span>
                    <span className="text-[11px] text-slate-400 block font-mono truncate max-w-[220px]">
                      {partyConfig.music?.playlistUrl}
                    </span>
                    <span className="text-[10px] text-fuchsia-400 flex items-center gap-1 mt-0.5">
                      <Music className="w-3 h-3" /> Opens music app immediately on scan
                    </span>
                  </div>
                </div>

                <a
                  href={partyConfig.music?.playlistUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test URL</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
