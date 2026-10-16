import React, { useState } from 'react';
import { AppleMusicPlaylist, AppleMusicTrack, AppConfig } from '../../types/config';
import {
  Music,
  Radio,
  Play,
  Check,
  Sparkles,
  X,
  ExternalLink,
  Key,
  ShieldCheck,
  Disc3,
  Heart,
  ListMusic,
  Clock,
  Layers,
} from 'lucide-react';

interface AppleMusicLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlists: AppleMusicPlaylist[];
  tracks: AppleMusicTrack[];
  activePlaylistId?: string;
  currentTrackId?: string;
  onSelectPlaylist: (playlistId: string) => void;
  onSelectTrack: (trackId: string) => void;
  config: AppConfig;
  onUpdateConfig?: (updatedConfig: AppConfig) => void;
}

export const AppleMusicLibraryModal: React.FC<AppleMusicLibraryModalProps> = ({
  isOpen,
  onClose,
  playlists,
  tracks,
  activePlaylistId,
  currentTrackId,
  onSelectPlaylist,
  onSelectTrack,
  config,
  onUpdateConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'playlists' | 'stations' | 'tracks' | 'connect'>('playlists');
  const [developerToken, setDeveloperToken] = useState<string>(config.appleMusic?.developerToken || '');
  const [userToken, setUserToken] = useState<string>(config.appleMusic?.userToken || '');
  const [tokenSaved, setTokenSaved] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveTokens = () => {
    if (!onUpdateConfig) return;
    const updated: AppConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        developerToken,
        userToken,
      },
    };
    onUpdateConfig(updated);
    setTokenSaved(true);
    setTimeout(() => setTokenSaved(false), 3000);
  };

  const stationPlaylists = playlists.filter(p => p.type === 'station');
  const regularPlaylists = playlists.filter(p => p.type !== 'station');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-2xl animate-fade-in">
      <div
        className="w-full max-w-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#fc5c7d] flex items-center justify-center shadow-lg shadow-rose-500/25">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">Apple Music Library</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Cloud Library
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Playlists, live radio stations, and synchronized streaming
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-slate-300 hover:text-white transition-all"
            aria-label="Close Apple Music library"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2.5 bg-white/[0.02] border-b border-white/5 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('playlists')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'playlists'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Playlists ({regularPlaylists.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stations')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'stations'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Apple Music Radio ({stationPlaylists.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tracks')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'tracks'
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>Top Tracks ({tracks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ml-auto whitespace-nowrap ${
              activeTab === 'connect'
                ? 'bg-slate-800 text-white border border-rose-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Account & Keys</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Tab 1: Playlists */}
          {activeTab === 'playlists' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {regularPlaylists.map(playlist => {
                const isSelected = activePlaylistId === playlist.id;

                return (
                  <div
                    key={playlist.id}
                    onClick={() => {
                      onSelectPlaylist(playlist.id);
                      onClose();
                    }}
                    className={`group relative rounded-2xl p-3.5 border transition-all cursor-pointer flex items-center gap-3.5 ${
                      isSelected
                        ? 'bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/30'
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                    }`}
                  >
                    {/* Artwork with hover play button */}
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md">
                      <img
                        src={playlist.artworkUrl}
                        alt={playlist.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-semibold text-white truncate group-hover:text-rose-300 transition-colors">
                          {playlist.title}
                        </h4>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-medium shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{playlist.subtitle}</p>
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                        <span>{playlist.trackCount} tracks</span>
                        <span>·</span>
                        <span>Apple Music</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Apple Music Radio Stations */}
          {activeTab === 'stations' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 to-slate-900 border border-rose-500/20 flex items-center gap-4">
                <Radio className="w-8 h-8 text-rose-400 shrink-0 animate-pulse" />
                <div>
                  <h4 className="text-sm font-semibold text-white">Apple Music Live Broadcasts</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Stream live studio feeds, artist interviews, and curated global radio directly to your HomePods.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stationPlaylists.map(station => {
                  const isSelected = activePlaylistId === station.id;

                  return (
                    <div
                      key={station.id}
                      onClick={() => {
                        onSelectPlaylist(station.id);
                        onClose();
                      }}
                      className={`group relative rounded-2xl p-4 border transition-all cursor-pointer flex items-center gap-4 ${
                        isSelected
                          ? 'bg-rose-500/10 border-rose-500/40 ring-1 ring-rose-500/30'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] hover:border-white/20'
                      }`}
                    >
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-lg">
                        <img
                          src={station.artworkUrl}
                          alt={station.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white truncate group-hover:text-rose-300 transition-colors">
                            {station.title}
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 font-bold shrink-0">
                            LIVE
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{station.subtitle}</p>
                        <p className="text-[11px] text-slate-500 mt-1">24/7 Global Station</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Top Tracks */}
          {activeTab === 'tracks' && (
            <div className="divide-y divide-white/5">
              {tracks.map((track, idx) => {
                const isCurrent = currentTrackId === track.id;

                const formatTime = (secs: number) => {
                  const m = Math.floor(secs / 60);
                  const s = secs % 60;
                  return `${m}:${s < 10 ? '0' : ''}${s}`;
                };

                return (
                  <div
                    key={track.id}
                    onClick={() => {
                      onSelectTrack(track.id);
                      onClose();
                    }}
                    className={`py-3 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                      isCurrent
                        ? 'bg-rose-500/10 text-rose-300'
                        : 'hover:bg-white/[0.04] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 text-center text-xs font-mono text-slate-500 group-hover:hidden">
                        {idx + 1}
                      </span>
                      <Play className="w-4 h-4 text-rose-400 hidden group-hover:inline-block shrink-0 fill-rose-400" />

                      <img
                        src={track.artworkUrl}
                        alt={track.title}
                        className="w-10 h-10 rounded-lg object-cover shadow-sm shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold truncate ${isCurrent ? 'text-rose-300' : 'text-white'}`}>
                            {track.title}
                          </p>
                          {track.audioQuality && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-slate-400 font-medium">
                              {track.audioQuality}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {track.artist} · <span className="text-slate-500">{track.album}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-slate-400">
                        {formatTime(track.duration)}
                      </span>
                      {isCurrent && (
                        <div className="flex items-end gap-0.5 h-3 px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-400">
                          <div className="w-0.5 bg-rose-400 animate-pulse h-2" />
                          <div className="w-0.5 bg-rose-400 animate-pulse delay-75 h-3" />
                          <div className="w-0.5 bg-rose-400 animate-pulse delay-150 h-1.5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 4: Connect Account & MusicKit Tokens */}
          {activeTab === 'connect' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-semibold text-white">Apple Music Integration Options</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your Kiosk can connect to Apple Music in two ways:
                  <br />
                  1. <strong>Direct Home Assistant Integration (Recommended)</strong>: If your Home Assistant has Apple TV / HomeKit / AirPlay configured, your HomePods and active Apple Music playback sync automatically with no token required.
                  <br />
                  2. <strong>MusicKit JS API Token</strong>: Paste an Apple Music developer token and personal user token below to query your complete private cloud library directly.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Apple Music Developer Token (JWT)
                  </label>
                  <input
                    type="password"
                    value={developerToken}
                    onChange={e => setDeveloperToken(e.target.value)}
                    placeholder="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Generated with your Apple Developer Key (ES256) in Apple Developer Portal.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Personal Music User Token (MusicKit User Token)
                  </label>
                  <input
                    type="password"
                    value={userToken}
                    onChange={e => setUserToken(e.target.value)}
                    placeholder="Optional user token for private library access..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-emerald-400 font-medium">
                    {tokenSaved ? '✓ Configuration saved successfully!' : ''}
                  </span>

                  <button
                    type="button"
                    onClick={handleSaveTokens}
                    className="px-4 py-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-medium text-xs rounded-xl shadow-md shadow-rose-600/20 active:scale-95 transition-all"
                  >
                    Save Apple Music Keys
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
