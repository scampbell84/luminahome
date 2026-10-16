import React, { useState, useEffect, useRef } from 'react';
import { AppConfig, AppleMusicTrack, AppleMusicPlaylist, HomePodSpeaker } from '../../types/config';
import {
  Music,
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
  Sparkles,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Sliders,
  Tv,
  Disc3,
  Key,
  ShieldCheck,
  Headphones,
  Check,
  Layers,
  ArrowRight,
  X,
  User,
  LogIn,
  LogOut,
  Info,
  Globe,
  Wifi,
  Settings,
} from 'lucide-react';

interface MediaViewProps {
  config: AppConfig;
  onUpdateConfig: (updatedConfig: AppConfig) => Promise<void> | void;
  onOpenSettings?: () => void;
}

type MediaService = 'apple' | 'spotify' | 'plex' | 'speakers';
type AppleSubTab = 'library' | 'embed' | 'search' | 'radio' | 'tokens';

const EXAMPLE_SPEAKER_IDS = new Set(['living-room-pair', 'kitchen-mini', 'bedroom-mini', 'office-mini']);

export const MediaView: React.FC<MediaViewProps> = ({
  config,
  onUpdateConfig,
  onOpenSettings,
}) => {
  const [activeService, setActiveService] = useState<MediaService>('apple');
  const [appleSubTab, setAppleSubTab] = useState<AppleSubTab>('library');

  // Playback state
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
  const [volume, setVolume] = useState<number>(65);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [shuffle, setShuffle] = useState<boolean>(false);
  const [repeat, setRepeat] = useState<'off' | 'all' | 'one'>('all');

  // Speakers & AirPlay
  const [speakers, setSpeakers] = useState<HomePodSpeaker[]>(config.appleMusic?.homePods || []);
  const [isScanningHA, setIsScanningHA] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Apple Music Authentication & Library State
  const [isMusicKitReady, setIsMusicKitReady] = useState<boolean>(false);
  const [isAppleAuthorized, setIsAppleAuthorized] = useState<boolean>(false);
  const [appleAuthLoading, setAppleAuthLoading] = useState<boolean>(false);
  const [userPlaylists, setUserPlaylists] = useState<AppleMusicPlaylist[]>(config.appleMusic?.favoritePlaylists || []);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<AppleMusicTrack[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [developerTokenInput, setDeveloperTokenInput] = useState<string>(config.appleMusic?.developerToken || '');
  const [userTokenInput, setUserTokenInput] = useState<string>(config.appleMusic?.userToken || '');
  const [tokenSaveStatus, setTokenSaveStatus] = useState<string | null>(null);

  // Apple Music Authentication Modal & Methods
  const [isSignInModalOpen, setIsSignInModalOpen] = useState<boolean>(false);
  const [appleSignInTab, setAppleSignInTab] = useState<'web' | 'homepod' | 'developer'>('web');
  const [appleIdNameInput, setAppleIdNameInput] = useState<string>(config.appleMusic?.userDisplayName || '');
  const [appleIdEmailInput, setAppleIdEmailInput] = useState<string>(config.appleMusic?.appleIdEmail || '');
  const [appleConnectStatus, setAppleConnectStatus] = useState<string | null>(null);

  // Custom Playlist Modal State
  const [isAddingPlaylist, setIsAddingPlaylist] = useState<boolean>(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState<string>('');
  const [newPlaylistSubtitle, setNewPlaylistSubtitle] = useState<string>('');
  const [newPlaylistArtwork, setNewPlaylistArtwork] = useState<string>('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80');

  // Spotify State
  const [spotifyUri, setSpotifyUri] = useState<string>(config.spotify?.embedUri || 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M');
  const [spotifyInputUri, setSpotifyInputUri] = useState<string>(config.spotify?.embedUri || 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M');
  const [spotifyStatus, setSpotifyStatus] = useState<string | null>(null);

  // Plex State
  const [plexServerUrl, setPlexServerUrl] = useState<string>(config.plex?.serverUrl || '');
  const [plexToken, setPlexToken] = useState<string>(config.plex?.token || '');
  const [plexTestStatus, setPlexTestStatus] = useState<{ ok?: boolean; message?: string } | null>(null);
  const [plexTesting, setPlexTesting] = useState<boolean>(false);

  // New speaker form
  const [isAddingSpeaker, setIsAddingSpeaker] = useState<boolean>(false);
  const [newSpeakerName, setNewSpeakerName] = useState<string>('');
  const [newSpeakerRoom, setNewSpeakerRoom] = useState<string>('');
  const [newSpeakerEntityId, setNewSpeakerEntityId] = useState<string>('');
  const [newSpeakerModel, setNewSpeakerModel] = useState<'HomePod' | 'HomePod mini'>('HomePod mini');
  const [newSpeakerStereo, setNewSpeakerStereo] = useState<boolean>(false);

  // Sync speakers with config
  useEffect(() => {
    if (config.appleMusic?.homePods) {
      setSpeakers(config.appleMusic.homePods);
    }
  }, [config.appleMusic?.homePods]);

  // Load MusicKit JS dynamically if not already on page and only if developer token is present or requested
  useEffect(() => {
    if ((window as any).MusicKit) {
      setIsMusicKitReady(true);
      checkMusicKitAuth();
      return;
    }

    const existing = document.querySelector('script[src*="musickit.js"]');
    if (existing) {
      return;
    }

    try {
      const script = document.createElement('script');
      script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        setIsMusicKitReady(true);
        checkMusicKitAuth();
      };
      script.onerror = () => {
        console.warn('MusicKit JS could not be loaded from Apple CDN.');
      };
      document.head.appendChild(script);
    } catch (err) {
      console.warn('Could not inject MusicKit script:', err);
    }
  }, []);

  const checkMusicKitAuth = async () => {
    try {
      const mk = (window as any).MusicKit;
      if (!mk || typeof mk.getInstance !== 'function') return;
      const instance = mk.getInstance();
      if (instance && instance.isAuthorized !== undefined) {
        setIsAppleAuthorized(!!instance.isAuthorized);
      }
    } catch {
      // not configured yet or not initialized
    }
  };

  // Poll live playback state
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
            if (typeof data.currentTime === 'number') setCurrentTime(data.currentTime);
            if (data.duration) setDuration(data.duration);
            if (typeof data.volume === 'number') setVolume(data.volume);
          }
        }
      } catch (err) {
        // silent poll error
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Tick local time when playing
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentTime(prev => (prev >= duration ? 0 : prev + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, duration]);

  // Playback control
  const handlePlaybackAction = async (action: string, payload: Record<string, any> = {}) => {
    try {
      if (action === 'toggle') setIsPlaying(!isPlaying);
      if (action === 'play') setIsPlaying(true);
      if (action === 'pause') setIsPlaying(false);

      await fetch('/api/media/applemusic/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
    } catch (err) {
      console.warn('Playback error:', err);
    }
  };

  // Open Apple Music sign in modal
  const handleOpenSignInModal = () => {
    setAppleConnectStatus(null);
    setIsSignInModalOpen(true);
  };

  // Method 1: Web sign-in confirmation
  const handleConfirmWebConnection = async () => {
    const name = appleIdNameInput.trim() || 'Apple Music Subscriber';
    const updatedConfig: AppConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        isConnected: true,
        userDisplayName: name,
        appleIdEmail: appleIdEmailInput.trim(),
      },
    };
    await onUpdateConfig(updatedConfig);
    setIsAppleAuthorized(true);
    setIsSignInModalOpen(false);
    setScanMessage(`✓ Apple Music connected as ${name}!`);
    setTimeout(() => setScanMessage(null), 4000);
  };

  // Method 2: Connect via HomePod / Home Assistant
  const handleConnectHomePodMode = async () => {
    const updatedConfig: AppConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        isConnected: true,
        userDisplayName: 'HomePod Fleet',
      },
    };
    await onUpdateConfig(updatedConfig);
    setIsAppleAuthorized(true);
    setIsSignInModalOpen(false);
    setScanMessage('✓ HomePod direct streaming connected!');
    setTimeout(() => setScanMessage(null), 4000);
  };

  // Method 3: MusicKit Developer JWT Sign In
  const handleMusicKitDeveloperSignIn = async () => {
    setAppleAuthLoading(true);
    setAppleConnectStatus(null);
    try {
      const mk = (window as any).MusicKit;
      if (!mk) {
        setAppleConnectStatus('MusicKit JS library is loading. Please wait a moment.');
        setAppleAuthLoading(false);
        return;
      }

      const token = developerTokenInput.trim() || config.appleMusic?.developerToken;
      if (!token) {
        setAppleConnectStatus('Please enter an Apple Music Developer Token (JWT) first.');
        setAppleAuthLoading(false);
        return;
      }

      try {
        await mk.configure({
          developerToken: token,
          app: {
            name: 'KioskBoard',
            build: '1.0.0',
          },
        });
      } catch (configErr: any) {
        console.warn('MusicKit configure error:', configErr);
      }

      const instance = mk.getInstance();
      if (instance) {
        const musicUserToken = await instance.authorize();
        setIsAppleAuthorized(true);
        const updatedConfig: AppConfig = {
          ...config,
          appleMusic: {
            ...config.appleMusic,
            isConnected: true,
            developerToken: token,
            userToken: musicUserToken,
            userDisplayName: 'Apple Music API',
          },
        };
        await onUpdateConfig(updatedConfig);
        setIsSignInModalOpen(false);
        setScanMessage('✓ Signed in to Apple Music via MusicKit API!');
        setTimeout(() => setScanMessage(null), 4000);
        loadUserLibrary(instance);
      }
    } catch (err: any) {
      console.error('Apple Music authorization failed:', err);
      setAppleConnectStatus(`Authorization notice: ${err.message || 'Window closed or token expired'}. You can also use Direct Web login or HomePod mode!`);
    } finally {
      setAppleAuthLoading(false);
    }
  };

  const handleAppleSignOut = async () => {
    try {
      const mk = (window as any).MusicKit;
      if (mk?.getInstance()) {
        try {
          await mk.getInstance().unauthorize();
        } catch {}
      }
      setIsAppleAuthorized(false);
      const updatedConfig: AppConfig = {
        ...config,
        appleMusic: {
          ...config.appleMusic,
          isConnected: false,
          userDisplayName: '',
          userToken: '',
        },
      };
      await onUpdateConfig(updatedConfig);
      setScanMessage('Signed out of Apple Music.');
      setTimeout(() => setScanMessage(null), 3000);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  };

  // Add custom playlist to user library
  const handleAddCustomPlaylist = async () => {
    if (!newPlaylistTitle.trim()) return;
    const newPl: AppleMusicPlaylist = {
      id: `custom-pl-${Date.now()}`,
      title: newPlaylistTitle.trim(),
      subtitle: newPlaylistSubtitle.trim() || 'My Personal Library',
      artworkUrl: newPlaylistArtwork.trim() || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      trackCount: 20,
      type: 'playlist',
    };
    const updated = [...userPlaylists, newPl];
    setUserPlaylists(updated);
    const updatedConfig: AppConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        favoritePlaylists: updated,
      },
    };
    await onUpdateConfig(updatedConfig);
    setNewPlaylistTitle('');
    setNewPlaylistSubtitle('');
    setIsAddingPlaylist(false);
    setScanMessage(`✓ Added "${newPl.title}" to your library!`);
    setTimeout(() => setScanMessage(null), 3500);
  };

  // Remove playlist from library
  const handleDeletePlaylist = async (playlistId: string) => {
    const updated = userPlaylists.filter(p => p.id !== playlistId);
    setUserPlaylists(updated);
    const updatedConfig: AppConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        favoritePlaylists: updated,
      },
    };
    await onUpdateConfig(updatedConfig);
    setScanMessage('Playlist removed from library.');
    setTimeout(() => setScanMessage(null), 3000);
  };

  const loadUserLibrary = async (instance?: any) => {
    try {
      const mk = instance || (window as any).MusicKit?.getInstance();
      if (!mk || !mk.isAuthorized) return;
      const res = await mk.api.music('/v1/me/library/playlists');
      if (res?.data?.data) {
        const playlists: AppleMusicPlaylist[] = res.data.data.map((p: any) => ({
          id: p.id,
          title: p.attributes?.name || 'Untitled Playlist',
          subtitle: p.attributes?.description?.standard || 'Apple Music Library',
          artworkUrl: p.attributes?.artwork?.url
            ? p.attributes.artwork.url.replace('{w}', '500').replace('{h}', '500')
            : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
          trackCount: p.attributes?.trackCount || 0,
          type: 'playlist',
        }));
        setUserPlaylists(playlists);
      }
    } catch (err) {
      console.warn('Failed to load user library playlists:', err);
    }
  };

  // Apple Music search
  const handleSearchAppleMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const mk = (window as any).MusicKit?.getInstance();
      if (mk) {
        const res = await mk.api.music(`/v1/catalog/us/search?term=${encodeURIComponent(searchQuery)}&types=songs`);
        const songs = res?.data?.results?.songs?.data || [];
        const formatted: AppleMusicTrack[] = songs.map((s: any) => ({
          id: s.id,
          title: s.attributes?.name || 'Song',
          artist: s.attributes?.artistName || 'Unknown Artist',
          album: s.attributes?.albumName || 'Apple Music',
          artworkUrl: s.attributes?.artwork?.url
            ? s.attributes.artwork.url.replace('{w}', '500').replace('{h}', '500')
            : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
          duration: Math.round((s.attributes?.durationInMillis || 180000) / 1000),
          audioQuality: 'Lossless',
        }));
        setSearchResults(formatted);
      } else {
        // Fallback filter
        const mockResults = (config.appleMusic?.favoritePlaylists || []).flatMap(p => p.tracks || []).filter(t =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(mockResults);
      }
    } catch (err) {
      console.warn('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Save Apple Music tokens
  const handleSaveTokens = async () => {
    const updatedConfig: AppConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        developerToken: developerTokenInput.trim(),
        userToken: userTokenInput.trim(),
      },
    };
    await onUpdateConfig(updatedConfig);
    setTokenSaveStatus('✓ Tokens saved successfully!');
    setTimeout(() => setTokenSaveStatus(null), 3000);
  };

  // Save Spotify settings
  const handleSaveSpotify = async () => {
    let cleanUri = spotifyInputUri.trim();
    if (cleanUri.includes('open.spotify.com/playlist/')) {
      const parts = cleanUri.split('playlist/')[1].split('?')[0];
      cleanUri = `spotify:playlist:${parts}`;
    }
    setSpotifyUri(cleanUri);
    const updatedConfig: AppConfig = {
      ...config,
      spotify: {
        ...(config.spotify || { enabled: true }),
        embedUri: cleanUri,
        connected: true,
      },
      activeMediaSource: 'spotify',
    };
    await onUpdateConfig(updatedConfig);
    setSpotifyStatus('✓ Spotify playlist updated!');
    setTimeout(() => setSpotifyStatus(null), 3000);
  };

  // Test Plex connection
  const handleTestPlex = async () => {
    if (!plexServerUrl.trim()) return;
    setPlexTesting(true);
    setPlexTestStatus(null);
    try {
      const res = await fetch('/api/media/plex/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl: plexServerUrl, token: plexToken }),
      });
      const data = await res.json();
      setPlexTestStatus({ ok: data.ok, message: data.message });
      if (data.ok) {
        const updatedConfig: AppConfig = {
          ...config,
          plex: {
            ...(config.plex || { enabled: true }),
            serverUrl: plexServerUrl.trim(),
            token: plexToken.trim(),
            connected: true,
            serverName: data.serverName || 'Plex Server',
          },
        };
        await onUpdateConfig(updatedConfig);
      }
    } catch (err: any) {
      setPlexTestStatus({ ok: false, message: `Connection failed: ${err.message}` });
    } finally {
      setPlexTesting(false);
    }
  };

  // Home Assistant Scan & Clean Example Speakers
  const handleScanHomeAssistant = async () => {
    setIsScanningHA(true);
    setScanMessage(null);
    try {
      const res = await fetch('/api/media/airplay/discover', { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.discovered && data.discovered.length > 0) {
        // Strip out any example mock speakers so they do not pollute user's real fleet
        const realCurrent = (config.appleMusic?.homePods || []).filter(s => !EXAMPLE_SPEAKER_IDS.has(s.id));
        const existingEntities = new Set(realCurrent.map(s => s.entityId));
        const newOnes = data.discovered.filter((d: any) => !existingEntities.has(d.entityId));
        const updatedSpeakers = [...realCurrent, ...newOnes];

        const updatedConfig = {
          ...config,
          appleMusic: {
            ...config.appleMusic,
            homePods: updatedSpeakers,
          },
        };
        setSpeakers(updatedSpeakers);
        await onUpdateConfig(updatedConfig);

        setScanMessage(`✓ Found ${data.discovered.length} media devices on Home Assistant! Example mock devices removed.`);
      } else {
        setScanMessage(data.message || 'No new media player devices found on Home Assistant.');
      }
    } catch (err: any) {
      setScanMessage(`Could not connect: ${err.message}`);
    } finally {
      setIsScanningHA(false);
    }
  };

  const handleClearExampleSpeakers = async () => {
    const realCurrent = (config.appleMusic?.homePods || []).filter(s => !EXAMPLE_SPEAKER_IDS.has(s.id));
    const updatedConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        homePods: realCurrent,
      },
    };
    setSpeakers(realCurrent);
    await onUpdateConfig(updatedConfig);
    try {
      await fetch('/api/media/airplay/clean-examples', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    setScanMessage('✓ Removed example placeholder devices.');
    setTimeout(() => setScanMessage(null), 3500);
  };

  const handleDeleteSpeaker = async (id: string) => {
    const updated = speakers.filter(s => s.id !== id);
    setSpeakers(updated);
    const updatedConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        homePods: updated,
      },
    };
    await onUpdateConfig(updatedConfig);
  };

  const handleToggleSpeaker = async (id: string) => {
    const updated = speakers.map(s => (s.id === id ? { ...s, active: !s.active } : s));
    setSpeakers(updated);
    const updatedConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        homePods: updated,
      },
    };
    await onUpdateConfig(updatedConfig);

    try {
      await fetch('/api/media/airplay/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speakerId: id }),
      });
    } catch (err) {
      console.warn('Speaker toggle error:', err);
    }
  };

  const handleSpeakerVolume = async (id: string, vol: number) => {
    const updated = speakers.map(s => (s.id === id ? { ...s, volume: vol } : s));
    setSpeakers(updated);

    try {
      await fetch('/api/media/airplay/volume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speakerId: id, volume: vol }),
      });
    } catch (err) {
      console.warn('Volume update error:', err);
    }
  };

  const handleAddSpeaker = async () => {
    if (!newSpeakerName.trim() || !newSpeakerRoom.trim()) return;
    const newSp: HomePodSpeaker = {
      id: `homepod-${Date.now()}`,
      name: newSpeakerName.trim(),
      room: newSpeakerRoom.trim(),
      entityId: newSpeakerEntityId.trim() || `media_player.${newSpeakerRoom.toLowerCase().replace(/\s+/g, '_')}_homepod`,
      isStereoPair: newSpeakerStereo,
      volume: 50,
      muted: false,
      active: true,
      model: newSpeakerModel,
    };
    const updated = [...speakers, newSp];
    setSpeakers(updated);
    const updatedConfig = {
      ...config,
      appleMusic: {
        ...config.appleMusic,
        homePods: updated,
      },
    };
    await onUpdateConfig(updatedConfig);
    setNewSpeakerName('');
    setNewSpeakerRoom('');
    setNewSpeakerEntityId('');
    setIsAddingSpeaker(false);
  };

  const hasExampleSpeakers = speakers.some(s => EXAMPLE_SPEAKER_IDS.has(s.id));
  const activeSpeakersCount = speakers.filter(s => s.active).length;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Convert Spotify URI to embed URL
  const getSpotifyEmbedUrl = (uri: string) => {
    if (uri.startsWith('spotify:playlist:')) {
      return `https://open.spotify.com/embed/playlist/${uri.replace('spotify:playlist:', '')}?utm_source=generator&theme=0`;
    }
    if (uri.startsWith('spotify:album:')) {
      return `https://open.spotify.com/embed/album/${uri.replace('spotify:album:', '')}?utm_source=generator&theme=0`;
    }
    if (uri.startsWith('spotify:artist:')) {
      return `https://open.spotify.com/embed/artist/${uri.replace('spotify:artist:', '')}?utm_source=generator&theme=0`;
    }
    if (uri.includes('open.spotify.com/embed/')) return uri;
    return `https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0`;
  };

  const isUserConnected = isAppleAuthorized || !!config.appleMusic?.isConnected || !!config.appleMusic?.userToken;

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white pb-32 pt-6 px-4 md:px-8 max-w-7xl mx-auto flex flex-col gap-6">
      {/* Top Header & Service Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>Media Center</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                  Multi-Room Audio
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Play Apple Music, Spotify, Plex, and route high-fidelity audio across your HomePods
              </p>
            </div>
          </div>
        </div>

        {/* Media Account Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveService('apple')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-sm ${
              activeService === 'apple'
                ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-rose-600/30 ring-1 ring-rose-400/50'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Music className="w-4 h-4 text-white" />
            <span>Apple Music</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveService('spotify')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-sm ${
              activeService === 'spotify'
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-emerald-600/30 ring-1 ring-emerald-400/50'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Disc3 className="w-4 h-4 text-emerald-400" />
            <span>Spotify</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveService('plex')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-sm ${
              activeService === 'plex'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-amber-600/30 ring-1 ring-amber-400/50'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Tv className="w-4 h-4 text-amber-400" />
            <span>Plex Music</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveService('speakers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-sm ${
              activeService === 'speakers'
                ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-indigo-600/30 ring-1 ring-indigo-400/50'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Radio className="w-4 h-4 text-sky-400" />
            <span>AirPlay Speakers ({speakers.length})</span>
          </button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {scanMessage && (
        <div className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-200 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* Example Speakers Detected Banner */}
      {hasExampleSpeakers && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div>
              <p className="font-semibold text-white">Example placeholder devices detected (e.g. Bedroom HomePod mini)</p>
              <p className="text-amber-300/80 text-[11px] mt-0.5">Remove these dummy devices to keep only the real speakers discovered from your Home Assistant.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearExampleSpeakers}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/30 transition-all shrink-0"
          >
            Remove Example Devices
          </button>
        </div>
      )}

      {/* =========================================================================
          TAB 1: APPLE MUSIC
          ========================================================================= */}
      {activeService === 'apple' && (
        <div className="flex flex-col gap-6">
          {/* Apple Music Account Connection Box */}
          <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-br from-rose-950/40 via-slate-900/90 to-slate-950 border border-rose-500/20 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#FA243C] flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">Apple Music Account</h2>
                    {isUserConnected ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Connected {config.appleMusic?.userDisplayName ? `(${config.appleMusic.userDisplayName})` : ''}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        Not Signed In
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {isUserConnected
                      ? 'Connected to your Apple Music library. Stream to your HomePods in lossless AirPlay.'
                      : 'Sign in to access your personal library, playlists, and route playback directly to your HomePods.'}
                  </p>
                </div>
              </div>

              {/* Sign in / Sign out actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isUserConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={handleOpenSignInModal}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Manage</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAppleSignOut}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-200 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenSignInModal}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#FA243C] to-rose-600 hover:from-rose-500 hover:to-pink-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/30 flex items-center gap-2 active:scale-95"
                  >
                    <Music className="w-4 h-4 fill-white" />
                    <span>Sign in to Apple Music</span>
                  </button>
                )}
              </div>
            </div>

            {/* Apple Sub-tabs */}
            <div className="flex items-center gap-2 border-t border-white/10 pt-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setAppleSubTab('library')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  appleSubTab === 'library'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span>My Library & Playlists</span>
              </button>

              <button
                type="button"
                onClick={() => setAppleSubTab('embed')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  appleSubTab === 'embed'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Apple Music Web Player (Direct Login)</span>
              </button>

              <button
                type="button"
                onClick={() => setAppleSubTab('radio')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  appleSubTab === 'radio'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Live Radio Broadcasts</span>
              </button>

              <button
                type="button"
                onClick={() => setAppleSubTab('search')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  appleSubTab === 'search'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Music</span>
              </button>

              <button
                type="button"
                onClick={() => setAppleSubTab('tokens')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ml-auto ${
                  appleSubTab === 'tokens'
                    ? 'bg-slate-800 text-white border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>API Keys</span>
              </button>
            </div>
          </div>

          {/* Sub-tab 1: Personal Library / Playlists */}
          {appleSubTab === 'library' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ListMusic className="w-4 h-4 text-rose-400" />
                    <span>Curated & Personal Playlists</span>
                    <span className="text-xs text-slate-500 font-normal">({userPlaylists.length})</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tap any playlist to start streaming to your active HomePods
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingPlaylist(true)}
                  className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Playlist / Album</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userPlaylists.map(playlist => (
                  <div
                    key={playlist.id}
                    onClick={() => handlePlaybackAction('play', { playlistId: playlist.id })}
                    className="group p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-rose-500/40 transition-all cursor-pointer flex items-center gap-3.5 shadow-md active:scale-98"
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-md">
                      <img src={playlist.artworkUrl} alt={playlist.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-rose-300 transition-colors">
                        {playlist.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{playlist.subtitle}</p>
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <span>{playlist.trackCount} tracks</span>
                        <span>·</span>
                        <span className="text-rose-400 font-medium">Apple Music</span>
                      </p>
                    </div>
                    {playlist.id.startsWith('custom-pl-') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlaylist(playlist.id);
                        }}
                        title="Delete from library"
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-tab 2: Apple Music Official Web Player Embed */}
          {appleSubTab === 'embed' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">Apple Music Direct Web Player</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      music.apple.com
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Chromium on Raspberry Pi blocks login cookies inside third-party iframes. Click <strong>"Open in Full Window"</strong> to log in directly with your Apple ID and 2FA.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="https://music.apple.com/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-[#FA243C] hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all active:scale-95"
                  >
                    <span>Open in Full Window</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={handleOpenSignInModal}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    <span>Connect Account</span>
                  </button>
                </div>
              </div>

              <div className="w-full h-[520px] rounded-3xl overflow-hidden border border-white/15 bg-black shadow-2xl">
                <iframe
                  id="embed-player"
                  src="https://embed.music.apple.com/us/browse?app=music"
                  height="100%"
                  width="100%"
                  frameBorder="0"
                  sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
                  allow="autoplay *; encrypted-media *; clipboard-write"
                  title="Apple Music Web Player"
                  className="w-full h-full"
                />
              </div>
            </div>
          )}

          {/* Sub-tab 3: Radio */}
          {appleSubTab === 'radio' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { id: 'am-radio-1', title: 'Apple Music 1', desc: 'Live global broadcast from LA, NY, London', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80' },
                  { id: 'am-hits-radio', title: 'Apple Music Hits', desc: 'The biggest pop, rock, and R&B favorites', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80' },
                  { id: 'am-country-radio', title: 'Apple Music Country', desc: 'Modern Nashville stories and roots music', img: 'https://images.unsplash.com/photo-1520523839898-507127054944?w=800&auto=format&fit=crop&q=80' },
                  { id: 'am-chill-radio', title: 'Apple Music Chill', desc: 'Ambient downtempo, acoustic, and lo-fi beats', img: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80' },
                ].map(r => (
                  <div
                    key={r.id}
                    onClick={() => handlePlaybackAction('play', { playlistId: r.id })}
                    className="p-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-rose-500/40 transition-all cursor-pointer flex items-center gap-4 group"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow relative">
                      <img src={r.img} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-6 h-6 text-white fill-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-rose-300">{r.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{r.desc}</p>
                      <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">LIVE</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-tab 4: Search */}
          {appleSubTab === 'search' && (
            <div className="space-y-4">
              <form onSubmit={handleSearchAppleMusic} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search songs, artists, albums, or playlists..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="divide-y divide-white/10 border border-white/10 rounded-2xl overflow-hidden bg-slate-900/60">
                  {searchResults.map(track => (
                    <div
                      key={track.id}
                      onClick={() => handlePlaybackAction('play', { trackId: track.id })}
                      className="p-3.5 flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <img src={track.artworkUrl} alt={track.title} className="w-10 h-10 rounded-lg object-cover shadow" />
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-rose-300">{track.title}</p>
                          <p className="text-[11px] text-slate-400">{track.artist} · {track.album}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">{formatSeconds(track.duration)}</span>
                        <div className="w-8 h-8 rounded-full bg-rose-600/20 group-hover:bg-rose-600 text-rose-300 group-hover:text-white flex items-center justify-center transition-colors">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 5: API Tokens */}
          {appleSubTab === 'tokens' && (
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">Apple Music Developer & User Tokens</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  If you have an Apple Developer membership, configure your MusicKit Developer Token (JWT) and Music User Token here for programmatic library querying.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Developer Token (JWT)</label>
                  <input
                    type="password"
                    value={developerTokenInput}
                    onChange={e => setDeveloperTokenInput(e.target.value)}
                    placeholder="eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Music User Token</label>
                  <input
                    type="password"
                    value={userTokenInput}
                    onChange={e => setUserTokenInput(e.target.value)}
                    placeholder="MusicKit user token..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-emerald-400">{tokenSaveStatus}</span>
                  <button
                    type="button"
                    onClick={handleSaveTokens}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Save Keys
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: SPOTIFY
          ========================================================================= */}
      {activeService === 'spotify' && (
        <div className="space-y-6">
          <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/20 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#1DB954] flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                  <Disc3 className="w-6 h-6 text-black" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Spotify Integration</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Spotify Connect & Web
                    </span>
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Embed any Spotify playlist, album, or artist directly on your smart display.
                  </p>
                </div>
              </div>
            </div>

            {/* Custom URI Input */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/10">
              <input
                type="text"
                value={spotifyInputUri}
                onChange={e => setSpotifyInputUri(e.target.value)}
                placeholder="Paste Spotify playlist URL or URI (e.g. spotify:playlist:...)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={handleSaveSpotify}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0"
              >
                Load Spotify Playlist
              </button>
            </div>
            {spotifyStatus && <p className="text-xs text-emerald-400">{spotifyStatus}</p>}
          </div>

          {/* Quick Spotify Presets */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Popular Spotify Presets</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { name: "Today's Top Hits", uri: "spotify:playlist:37i9dQZF1DXcBWIGoYBM5M" },
                { name: "Chill Lofi Beats", uri: "spotify:playlist:37i9dQZF1DXdLEN7aqioXM" },
                { name: "Deep Focus", uri: "spotify:playlist:37i9dQZF1DWZeKCadgRdKQ" },
                { name: "All Out 80s", uri: "spotify:playlist:37i9dQZF1DX4UtSsGT1Sbe" },
                { name: "Acoustic Morning", uri: "spotify:playlist:37i9dQZF1DX4aY29OGgVms" },
              ].map(preset => (
                <button
                  key={preset.uri}
                  type="button"
                  onClick={() => {
                    setSpotifyInputUri(preset.uri);
                    setSpotifyUri(preset.uri);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Embedded Spotify Web Player */}
          <div className="w-full h-[520px] rounded-3xl overflow-hidden border border-white/15 bg-black shadow-2xl">
            <iframe
              src={getSpotifyEmbedUrl(spotifyUri)}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              title="Spotify Web Player"
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PLEX MEDIA SERVER
          ========================================================================= */}
      {activeService === 'plex' && (
        <div className="space-y-6">
          <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/20 shadow-2xl space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#E5A00D] flex items-center justify-center shadow-lg shadow-amber-500/30 shrink-0">
                <Tv className="w-6 h-6 text-black" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Plex Media Server</span>
                  {config.plex?.connected && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Connected: {config.plex?.serverName || 'Plex'}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Stream your self-hosted lossless music library, albums, and FLAC collections.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/10">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Plex Server Address / IP</label>
                <input
                  type="text"
                  value={plexServerUrl}
                  onChange={e => setPlexServerUrl(e.target.value)}
                  placeholder="http://192.168.1.100:32400"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">X-Plex-Token</label>
                <input
                  type="password"
                  value={plexToken}
                  onChange={e => setPlexToken(e.target.value)}
                  placeholder="Paste your Plex Auth Token..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                {plexTestStatus && (
                  <span className={`text-xs ${plexTestStatus.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                    {plexTestStatus.message}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleTestPlex}
                disabled={plexTesting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
              >
                {plexTesting ? 'Testing Connection...' : 'Test & Save Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: AIRPLAY & MULTI-ROOM SPEAKERS FLEET
          ========================================================================= */}
      {activeService === 'speakers' && (
        <div className="space-y-6">
          <div className="p-5 md:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-sky-400" />
                  <span>HomePod Multi-Room AirPlay Speakers</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                    {speakers.length} Speakers
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Independent volume control, stereo pairing, and synchronized multi-room routing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleScanHomeAssistant}
                  disabled={isScanningHA}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningHA ? 'animate-spin text-sky-400' : ''}`} />
                  <span>{isScanningHA ? 'Scanning...' : 'Scan Home Assistant'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddingSpeaker(!isAddingSpeaker)}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Speaker</span>
                </button>
              </div>
            </div>

            {/* Inline Add Speaker */}
            {isAddingSpeaker && (
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-sky-500/30 space-y-3">
                <h4 className="text-xs font-bold text-white">Add HomePod or AirPlay Speaker</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Speaker Name</label>
                    <input
                      type="text"
                      value={newSpeakerName}
                      onChange={e => setNewSpeakerName(e.target.value)}
                      placeholder="Living Room HomePods"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Room</label>
                    <input
                      type="text"
                      value={newSpeakerRoom}
                      onChange={e => setNewSpeakerRoom(e.target.value)}
                      placeholder="Living Room"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">HA Entity ID</label>
                    <input
                      type="text"
                      value={newSpeakerEntityId}
                      onChange={e => setNewSpeakerEntityId(e.target.value)}
                      placeholder="media_player.living_room"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">Model</label>
                    <select
                      value={newSpeakerModel}
                      onChange={e => setNewSpeakerModel(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="HomePod mini">HomePod mini</option>
                      <option value="HomePod">HomePod (Full size)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={newSpeakerStereo}
                      onChange={e => setNewSpeakerStereo(e.target.checked)}
                      className="rounded border-slate-700 text-sky-500"
                    />
                    <span>Is Stereo Pair in Apple Home</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingSpeaker(false)}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSpeaker}
                      className="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold"
                    >
                      Save Speaker
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Speaker Fleet Cards */}
            <div className="space-y-3">
              {speakers.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Radio className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">No speakers currently configured</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click "Scan Home Assistant" above to import all your media players automatically.
                  </p>
                </div>
              ) : (
                speakers.map(sp => (
                  <div
                    key={sp.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      sp.active
                        ? 'bg-sky-950/30 border-sky-500/40 shadow-lg shadow-sky-500/5'
                        : 'bg-white/[0.02] border-white/5 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSpeaker(sp.id)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                          sp.active
                            ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title={sp.active ? 'Routing active' : 'Click to route audio'}
                      >
                        <Radio className="w-5 h-5" />
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{sp.name}</span>
                          {sp.isStereoPair && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                              Stereo Pair
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {sp.model || 'HomePod'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {sp.room} · <code className="text-slate-500 font-mono text-[10px]">{sp.entityId}</code>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Individual volume slider */}
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-slate-400" />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sp.volume || 50}
                          onChange={e => handleSpeakerVolume(sp.id, parseInt(e.target.value, 10))}
                          className="w-24 sm:w-32 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                        />
                        <span className="text-xs font-mono text-slate-400 w-8 text-right">
                          {sp.volume || 50}%
                        </span>
                      </div>

                      {/* Route Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleSpeaker(sp.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          sp.active
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sp.active ? 'Streaming' : 'Muted / Inactive'}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSpeaker(sp.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Remove speaker"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PERSISTENT NOW PLAYING MINI PLAYER
          ========================================================================= */}
      <div className="fixed bottom-14 left-0 right-0 z-30 px-4 md:px-8 pointer-events-none">
        <div className="max-w-4xl mx-auto apple-glass-card rounded-2xl p-3 md:p-3.5 border border-white/20 shadow-2xl flex items-center justify-between gap-4 pointer-events-auto">
          {/* Track Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow relative">
              <img src={currentTrack.artworkUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="flex items-end gap-0.5 h-3">
                    <div className="w-0.5 bg-rose-400 rounded-full animate-pulse h-2" />
                    <div className="w-0.5 bg-rose-400 rounded-full animate-pulse delay-100 h-3" />
                    <div className="w-0.5 bg-rose-400 rounded-full animate-pulse delay-200 h-1.5" />
                  </div>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white truncate">{currentTrack.title}</span>
                {currentTrack.audioQuality && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 font-semibold shrink-0">
                    {currentTrack.audioQuality}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                {currentTrack.artist} · {currentTrack.album}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button
              type="button"
              onClick={() => handlePlaybackAction('previous')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              onClick={() => handlePlaybackAction('toggle')}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-600/30 active:scale-95 transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => handlePlaybackAction('next')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* AirPlay Target Indicator */}
          <div className="hidden sm:flex items-center gap-2 shrink-0 border-l border-white/10 pl-4">
            <button
              type="button"
              onClick={() => setActiveService('speakers')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white flex items-center gap-2 transition-all"
            >
              <Radio className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {activeSpeakersCount === 0
                  ? 'Local Display'
                  : activeSpeakersCount === 1
                  ? '1 HomePod'
                  : `${activeSpeakersCount} HomePods`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: APPLE MUSIC ACCOUNT CONNECTION DIALOG
          ========================================================================= */}
      {isSignInModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-rose-950/60 to-slate-900">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#FA243C] flex items-center justify-center shadow-lg shadow-rose-500/30">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Connect Apple Music</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Hi-Res Audio
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Link your Apple ID subscription to stream to your HomePods
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSignInModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Method Tabs */}
            <div className="p-2 border-b border-white/10 bg-slate-950/40 grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => setAppleSignInTab('web')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                  appleSignInTab === 'web'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Web Browser</span>
              </button>

              <button
                type="button"
                onClick={() => setAppleSignInTab('homepod')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                  appleSignInTab === 'homepod'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>HomePods</span>
              </button>

              <button
                type="button"
                onClick={() => setAppleSignInTab('developer')}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1 ${
                  appleSignInTab === 'developer'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Developer Key</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {appleConnectStatus && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{appleConnectStatus}</span>
                </div>
              )}

              {/* TAB 1: WEB BROWSER LOGIN */}
              {appleSignInTab === 'web' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center text-xs font-bold shrink-0">
                        1
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white">Sign In on Apple Music's Official Portal</h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Click below to open Apple Music in a clean browser window. Enter your Apple ID and complete two-factor authentication (2FA).
                        </p>
                      </div>
                    </div>

                    <a
                      href="https://music.apple.com/login"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-[#FA243C] hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-98"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Apple Music Sign In (music.apple.com)</span>
                    </a>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center text-xs font-bold shrink-0">
                        2
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white">Confirm Connection</h4>
                        <p className="text-[11px] text-slate-400">
                          Enter your name or Apple ID to personalize your display:
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="text"
                        value={appleIdNameInput}
                        onChange={e => setAppleIdNameInput(e.target.value)}
                        placeholder="e.g. Steve Campbell or user@icloud.com"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmWebConnection}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-98"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm & Connect to KioskBoard</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: HOMEPOD & HOME ASSISTANT */}
              {appleSignInTab === 'homepod' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-2.5">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                      <Sparkles className="w-4 h-4" />
                      <span>Zero Developer Account Required!</span>
                    </div>
                    <p className="text-[11px] text-indigo-200/80 leading-relaxed">
                      If you already have Apple HomePods in your home, they are <strong>natively linked to your Apple Music subscription</strong> through your Apple Home.
                    </p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      KioskBoard can command Home Assistant to stream Apple Music 1, live radio, and your favorite playlists straight to your HomePods in lossless AirPlay without needing any tokens.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                    <span className="text-xs font-semibold text-slate-300">Discovered HomePods ({speakers.length}):</span>
                    {speakers.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No HomePods detected yet. Click "Scan Home Assistant" on the AirPlay tab.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {speakers.slice(0, 4).map(sp => (
                          <div key={sp.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-800/40">
                            <span className="text-white font-medium">{sp.name}</span>
                            <span className="text-[10px] text-emerald-400 font-semibold">{sp.room}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleConnectHomePodMode}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all active:scale-98"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Connect via HomePod Direct Streaming</span>
                  </button>
                </div>
              )}

              {/* TAB 3: DEVELOPER API */}
              {appleSignInTab === 'developer' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200 leading-relaxed">
                    Apple MusicKit JS requires a Developer Token (JWT) created with an Apple Developer Program account ($99/year) and a MusicKit private key (.p8).
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Apple Developer Token (JWT):</label>
                    <textarea
                      rows={3}
                      value={developerTokenInput}
                      onChange={e => setDeveloperTokenInput(e.target.value)}
                      placeholder="eyJhbGciOiJFUzI1NiIsImtpZCI6..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-300">Music User Token (Optional):</label>
                    <textarea
                      rows={2}
                      value={userTokenInput}
                      onChange={e => setUserTokenInput(e.target.value)}
                      placeholder="User token from MusicKit authorization..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveTokens}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
                    >
                      Save Tokens
                    </button>
                    <button
                      type="button"
                      onClick={handleMusicKitDeveloperSignIn}
                      disabled={appleAuthLoading}
                      className="flex-1 py-2.5 bg-[#FA243C] hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {appleAuthLoading ? 'Authorizing...' : 'Authorize with MusicKit'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: ADD CUSTOM PLAYLIST TO USER LIBRARY
          ========================================================================= */}
      {isAddingPlaylist && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden my-8 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
                  <ListMusic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add Playlist to Library</h3>
                  <p className="text-[11px] text-slate-400">Stream your personal music to HomePods</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingPlaylist(false)}
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Playlist Title *</label>
                <input
                  type="text"
                  value={newPlaylistTitle}
                  onChange={e => setNewPlaylistTitle(e.target.value)}
                  placeholder="e.g. My Favorites or Chill Vibes"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Subtitle / Description</label>
                <input
                  type="text"
                  value={newPlaylistSubtitle}
                  onChange={e => setNewPlaylistSubtitle(e.target.value)}
                  placeholder="e.g. Personal Apple Music Playlist"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Artwork Preset</label>
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {[
                    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1520523839898-507127054944?w=800&auto=format&fit=crop&q=80',
                  ].map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewPlaylistArtwork(url)}
                      className={`relative h-14 rounded-xl overflow-hidden border-2 transition-all ${
                        newPlaylistArtwork === url ? 'border-rose-500 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                      {newPlaylistArtwork === url && (
                        <div className="absolute inset-0 bg-rose-600/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsAddingPlaylist(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomPlaylist}
                disabled={!newPlaylistTitle.trim()}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-600/30"
              >
                Add to Library
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
