import React, { useState, useEffect } from 'react';
import { PartyConfig, PartyAccentColor, PartyEffect } from '../../types/config';
import { PARTY_TEMPLATES } from '../../constants/defaultConfig';
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

const EMOJI_QUICK_PICKS = ['🎉', '🎂', '🥂', '🍸', '🎈', '🏡', '💖', '✨', '🕺', '🥳'];

export const PartySettingsTab: React.FC<PartySettingsTabProps> = ({
  partyConfig,
  onUpdatePartyConfig,
  onTriggerPartyMode,
}) => {
  const [wifiQrUrl, setWifiQrUrl] = useState<string>('');
  const [musicQrUrl, setMusicQrUrl] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [copiedWifi, setCopiedWifi] = useState<boolean>(false);

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

      {/* Photo Slideshow & Face-Safe Framing */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Party Photo Slideshow & Face-Safe Framing</h3>
              <p className="text-xs text-slate-400">
                Pulls photos from your active iCloud shared album feed with smart framing to prevent faces from being cut off
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
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
              <option value={15}>15% (Upper bias - Portraits)</option>
              <option value={20}>20% (Default - Best for Family & Faces)</option>
              <option value={30}>30% (Mid-Upper balance)</option>
              <option value={50}>50% (Center anchored)</option>
            </select>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Photos cycle through your configured iCloud shared album feed. In party mode, photos are displayed edge-to-edge with smart vertical positioning ensuring heads and facial expressions remain clearly visible.
          </span>
        </div>
      </div>
    </div>
  );
};
