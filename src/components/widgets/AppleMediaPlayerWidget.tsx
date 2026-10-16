import React, { useState, useEffect, useRef } from 'react';
import { AppConfig, AppleMusicTrack, HomePodSpeaker } from '../../types/config';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Volume1,
  Shuffle,
  Repeat,
  Radio,
  ListMusic,
  Share2,
  Music,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { AirPlayRoutingSheet } from './AirPlayRoutingSheet';
import { AppleMusicLibraryModal } from './AppleMusicLibraryModal';

interface AppleMediaPlayerWidgetProps {
  config: AppConfig;
  onUpdateConfig?: (updatedConfig: AppConfig) => void;
}

export const AppleMediaPlayerWidget: React.FC<AppleMediaPlayerWidgetProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<AppleMusicTrack>({
    id: 'track-1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    artworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
    duration: 200,
    audioQuality: 'Lossless',
  });
  const [currentTime, setCurrentTime] = useState<number>(42);
  const [duration, setDuration] = useState<number>(200);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('all');
  const [volume, setVolume] = useState<number>(65);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeSpeakers, setActiveSpeakers] = useState<HomePodSpeaker[]>([]);
  const [allSpeakers, setAllSpeakers] = useState<HomePodSpeaker[]>([]);
  const [isAirPlayOpen, setIsAirPlayOpen] = useState<boolean>(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState<boolean>(false);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);
  const [seekValue, setSeekValue] = useState<number>(42);
  const [isDiscovering, setIsDiscovering] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Poll live playback state from backend
  useEffect(() => {
    let isMounted = true;
    const fetchState = async () => {
      try {
        const res = await fetch('/api/media/applemusic/state');
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.ok) {
            setIsPlaying(data.isPlaying);
            if (data.currentTrack) setCurrentTrack(data.currentTrack);
            if (!isSeeking && typeof data.currentTime === 'number') {
              setCurrentTime(data.currentTime);
              setSeekValue(data.currentTime);
            }
            if (data.duration) setDuration(data.duration);
            if (data.shuffle !== undefined) setShuffle(data.shuffle);
            if (data.repeat) setRepeat(data.repeat);
            if (typeof data.volume === 'number') setVolume(data.volume);
            if (data.activeSpeakers) setActiveSpeakers(data.activeSpeakers);
            if (data.allSpeakers) setAllSpeakers(data.allSpeakers);
          }
        }
      } catch (err) {
        console.warn('Error fetching media state:', err);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isSeeking]);

  // Local second-by-second progress ticker when playing
  useEffect(() => {
    if (!isPlaying || isSeeking) return;
    const timer = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= duration) {
          return 0;
        }
        return prev + 1;
      });
      setSeekValue(prev => (prev >= duration ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, duration, isSeeking]);

  // Handle Playback Actions
  const handlePlaybackAction = async (action: string, payload: Record<string, any> = {}) => {
    try {
      if (action === 'toggle') {
        setIsPlaying(!isPlaying);
      } else if (action === 'play') {
        setIsPlaying(true);
      } else if (action === 'pause') {
        setIsPlaying(false);
      }

      const res = await fetch('/api/media/applemusic/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setIsPlaying(data.isPlaying);
          if (data.currentTrack) setCurrentTrack(data.currentTrack);
          if (typeof data.currentTime === 'number') {
            setCurrentTime(data.currentTime);
            setSeekValue(data.currentTime);
          }
        }
      }
    } catch (err) {
      console.warn('Playback dispatch error:', err);
    }
  };

  // Seek bar handling
  const handleSeekCommit = (pos: number) => {
    setIsSeeking(false);
    setCurrentTime(pos);
    handlePlaybackAction('seek', { position: pos });
  };

  // Speaker Actions
  const handleToggleSpeaker = async (speakerId: string, active?: boolean) => {
    try {
      const res = await fetch('/api/media/airplay/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speakerId, active }),
      });
      if (res.ok) {
        // Refresh speaker list
        const spRes = await fetch('/api/media/airplay/speakers');
        if (spRes.ok) {
          const spData = await spRes.json();
          if (spData.ok) {
            setAllSpeakers(spData.speakers);
            setActiveSpeakers(spData.speakers.filter((s: HomePodSpeaker) => s.active));
          }
        }
      }
    } catch (err) {
      console.warn('Speaker toggle error:', err);
    }
  };

  const handleSpeakerVolume = async (speakerId: string, spVol: number) => {
    try {
      await fetch('/api/media/airplay/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speakerId, volume: spVol }),
      });
      setAllSpeakers(prev =>
        prev.map(s => (s.id === speakerId ? { ...s, volume: spVol, muted: false } : s))
      );
    } catch (err) {
      console.warn('Speaker volume error:', err);
    }
  };

  const handleSpeakerMute = async (speakerId: string, muted: boolean) => {
    try {
      await fetch('/api/media/airplay/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speakerId, muted }),
      });
      setAllSpeakers(prev =>
        prev.map(s => (s.id === speakerId ? { ...s, muted } : s))
      );
    } catch (err) {
      console.warn('Speaker mute error:', err);
    }
  };

  const handleGroupSpeakers = async (mode: 'all' | 'none') => {
    try {
      await fetch('/api/media/airplay/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const spRes = await fetch('/api/media/airplay/speakers');
      if (spRes.ok) {
        const spData = await spRes.json();
        if (spData.ok) {
          setAllSpeakers(spData.speakers);
          setActiveSpeakers(spData.speakers.filter((s: HomePodSpeaker) => s.active));
        }
      }
    } catch (err) {
      console.warn('Speaker grouping error:', err);
    }
  };

  const handleDiscoverSpeakers = async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch('/api/media/airplay/discover', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.discovered && data.discovered.length > 0 && onUpdateConfig) {
          // Merge discovered speakers into config
          const updated: AppConfig = {
            ...config,
            appleMusic: {
              ...config.appleMusic,
              homePods: data.discovered,
            },
          };
          onUpdateConfig(updated);
        }
      }
    } catch (err) {
      console.warn('Discover error:', err);
    } finally {
      setIsDiscovering(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeSpeakerNames = activeSpeakers.map(s => s.name.replace(' HomePods', '').replace(' HomePod', '')).join(' + ');

  return (
    <>
      <div className="relative w-full h-full bg-slate-900/85 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between overflow-hidden group select-none">
        {/* Dynamic Album Ambient Diffusion Glow */}
        <div
          className="absolute -top-10 -left-10 w-44 h-44 rounded-full opacity-40 blur-3xl pointer-events-none transition-all duration-1000 transform scale-125"
          style={{
            backgroundImage: `radial-gradient(circle, #FA243C 0%, #fc5c7d 60%, transparent 100%)`,
          }}
        />

        {/* Top Bar: Apple Music Brand, Audio Format & AirPlay Pill */}
        <div className="relative z-10 flex items-center justify-between gap-2 pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#FA243C] flex items-center justify-center shadow-sm">
              <Music className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-semibold text-white tracking-wide">Apple Music</span>
            {currentTrack.audioQuality && (
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-white/10 text-slate-300 border border-white/10">
                {currentTrack.audioQuality}
              </span>
            )}
          </div>

          {/* AirPlay HomePod Route Pill */}
          <button
            type="button"
            onClick={() => setIsAirPlayOpen(true)}
            className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeSpeakers.length > 0
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 shadow-sm'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Configure HomePod AirPlay output"
          >
            {/* AirPlay Icon */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
              <polygon points="12 15 17 21 7 21 12 15" fill="currentColor" stroke="none" />
            </svg>
            <span className="truncate max-w-[120px] sm:max-w-[160px]">
              {activeSpeakers.length === 0
                ? 'AirPlay'
                : activeSpeakers.length === 1
                ? activeSpeakers[0].name.split(' ')[0]
                : `${activeSpeakers.length} HomePods`}
            </span>
          </button>
        </div>

        {/* Center Section: Album Cover Art & Song Metadata */}
        <div className="relative z-10 flex items-center gap-4 my-auto py-2">
          {/* High-Res Album Cover with drop shadow & vinyl shine */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 shadow-xl border border-white/10 group-hover:shadow-rose-500/10 transition-shadow">
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              className={`w-full h-full object-cover transition-transform duration-700 ${
                isPlaying ? 'scale-105' : 'scale-100'
              }`}
            />
            {isPlaying && (
              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md flex items-end gap-0.5">
                <div className="w-0.5 bg-rose-400 rounded-full animate-pulse h-2" />
                <div className="w-0.5 bg-rose-400 rounded-full animate-pulse delay-100 h-3" />
                <div className="w-0.5 bg-rose-400 rounded-full animate-pulse delay-200 h-1.5" />
              </div>
            )}
          </div>

          {/* Track Details */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate leading-tight">
              {currentTrack.title}
            </h3>
            <p className="text-xs sm:text-sm font-medium text-slate-300 truncate mt-0.5">
              {currentTrack.artist}
            </p>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {currentTrack.album}
            </p>

            {/* Active Output Room Line */}
            {activeSpeakerNames && (
              <p className="text-[11px] text-rose-300 font-medium truncate mt-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block animate-ping" />
                <span>Playing to {activeSpeakerNames}</span>
              </p>
            )}
          </div>
        </div>

        {/* Scrubbable Seek Bar */}
        <div className="relative z-10 space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 100}
            value={isSeeking ? seekValue : currentTime}
            onMouseDown={() => setIsSeeking(true)}
            onTouchStart={() => setIsSeeking(true)}
            onChange={e => setSeekValue(parseInt(e.target.value, 10))}
            onMouseUp={e => handleSeekCommit(parseInt((e.target as HTMLInputElement).value, 10))}
            onTouchEnd={e => handleSeekCommit(parseInt((e.target as HTMLInputElement).value, 10))}
            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FA243C] hover:accent-rose-400 focus:outline-none transition-all"
            aria-label="Track progress seek bar"
          />
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
            <span>{formatTime(isSeeking ? seekValue : currentTime)}</span>
            <span>-{formatTime(Math.max(0, duration - (isSeeking ? seekValue : currentTime)))}</span>
          </div>
        </div>

        {/* Media Transport Controls */}
        <div className="relative z-10 flex items-center justify-between pt-2">
          {/* Shuffle Toggle */}
          <button
            type="button"
            onClick={() => handlePlaybackAction('shuffle')}
            className={`p-2 rounded-xl transition-all ${
              shuffle ? 'text-rose-400 bg-rose-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title={shuffle ? 'Shuffle On' : 'Shuffle Off'}
            aria-label="Toggle Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Previous Track ($48px touch target) */}
          <button
            type="button"
            onClick={() => handlePlaybackAction('previous')}
            className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-200 hover:text-white flex items-center justify-center transition-all"
            title="Previous track"
            aria-label="Previous track"
          >
            <SkipBack className="w-5 h-5 fill-current" />
          </button>

          {/* Primary Play / Pause Button ($56px touch target with Apple red gradient) */}
          <button
            type="button"
            onClick={() => handlePlaybackAction('toggle')}
            className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FA243C] to-[#fc5c7d] hover:brightness-110 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 transition-all"
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-white" />
            ) : (
              <Play className="w-7 h-7 fill-white translate-x-0.5" />
            )}
          </button>

          {/* Next Track ($48px touch target) */}
          <button
            type="button"
            onClick={() => handlePlaybackAction('next')}
            className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 text-slate-200 hover:text-white flex items-center justify-center transition-all"
            title="Next track"
            aria-label="Next track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>

          {/* Repeat Toggle */}
          <button
            type="button"
            onClick={() => handlePlaybackAction('repeat')}
            className={`p-2 rounded-xl transition-all ${
              repeat !== 'off' ? 'text-rose-400 bg-rose-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title={`Repeat: ${repeat}`}
            aria-label="Toggle Repeat"
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Bar: Volume & Drawer Quick-Launchers */}
        <div className="relative z-10 pt-3 border-t border-white/5 flex items-center justify-between gap-3">
          {/* Quick Master Volume */}
          <div className="flex items-center gap-2 flex-1 max-w-[150px]">
            <button
              type="button"
              onClick={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                handlePlaybackAction('volume', { volume: nextMuted ? 0 : volume });
              }}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Mute toggle"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : volume > 50 ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <Volume1 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={e => {
                const newVol = parseInt(e.target.value, 10);
                setVolume(newVol);
                setIsMuted(false);
                handlePlaybackAction('volume', { volume: newVol });
              }}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#FA243C] hover:accent-rose-400 focus:outline-none"
              aria-label="Master volume"
            />
          </div>

          {/* Library and AirPlay Drawer Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 font-medium"
            >
              <ListMusic className="w-3.5 h-3.5 text-rose-400" />
              <span>Library</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAirPlayOpen(true)}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 font-medium"
            >
              <Share2 className="w-3.5 h-3.5 text-rose-400" />
              <span>HomePods</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide-Over AirPlay Routing Sheet */}
      <AirPlayRoutingSheet
        isOpen={isAirPlayOpen}
        onClose={() => setIsAirPlayOpen(false)}
        speakers={allSpeakers}
        isPlaying={isPlaying}
        onToggleSpeaker={handleToggleSpeaker}
        onVolumeChange={handleSpeakerVolume}
        onMuteToggle={handleSpeakerMute}
        onGroupSpeakers={handleGroupSpeakers}
        onDiscoverSpeakers={handleDiscoverSpeakers}
        isDiscovering={isDiscovering}
      />

      {/* Apple Music Library Modal */}
      <AppleMusicLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        playlists={config.appleMusic?.favoritePlaylists || []}
        tracks={[]}
        activePlaylistId={undefined}
        currentTrackId={currentTrack.id}
        onSelectPlaylist={playlistId => handlePlaybackAction('select_playlist', { playlistId })}
        onSelectTrack={trackId => handlePlaybackAction('select_track', { trackId })}
        config={config}
        onUpdateConfig={onUpdateConfig}
      />
    </>
  );
};
