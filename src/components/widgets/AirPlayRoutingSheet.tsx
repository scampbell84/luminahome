import React, { useState } from 'react';
import { HomePodSpeaker } from '../../types/config';
import {
  Volume2,
  VolumeX,
  Volume1,
  Check,
  Radio,
  Sparkles,
  RefreshCw,
  X,
  Maximize2,
  Share2,
} from 'lucide-react';

interface AirPlayRoutingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  speakers: HomePodSpeaker[];
  isPlaying: boolean;
  onToggleSpeaker: (speakerId: string, active?: boolean) => void;
  onVolumeChange: (speakerId: string, volume: number) => void;
  onMuteToggle: (speakerId: string, muted: boolean) => void;
  onGroupSpeakers: (mode: 'all' | 'none') => void;
  onDiscoverSpeakers?: () => Promise<void>;
  isDiscovering?: boolean;
}

export const AirPlayRoutingSheet: React.FC<AirPlayRoutingSheetProps> = ({
  isOpen,
  onClose,
  speakers,
  isPlaying,
  onToggleSpeaker,
  onVolumeChange,
  onMuteToggle,
  onGroupSpeakers,
  onDiscoverSpeakers,
  isDiscovering = false,
}) => {
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeCount = speakers.filter(s => s.active).length;

  const triggerNativeAirPlayPicker = () => {
    // Check for native Safari WebKit AirPlay target picker on an audio element
    const audioEl = document.querySelector('audio') as any;
    if (audioEl && typeof audioEl.webkitShowPlaybackTargetPicker === 'function') {
      try {
        audioEl.webkitShowPlaybackTargetPicker();
        setLocalMessage('Opening native Apple AirPlay device picker...');
        setTimeout(() => setLocalMessage(null), 3000);
        return;
      } catch (err) {
        console.warn('WebKit AirPlay picker failed:', err);
      }
    }
    setLocalMessage('Multi-room AirPlay is routing directly over your local network to HomePods!');
    setTimeout(() => setLocalMessage(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in">
      <div
        className="w-full max-w-lg bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Apple AirPlay Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              {/* Apple AirPlay SVG Glyph */}
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 17H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1" />
                <polygon points="12 15 17 21 7 21 12 15" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">AirPlay & HomePods</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  AirPlay 2
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeCount === 0
                  ? 'No speakers selected (audio paused)'
                  : activeCount === 1
                  ? 'Streaming to 1 HomePod'
                  : `Multi-Room synchronized across ${activeCount} HomePods`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-slate-300 hover:text-white transition-all"
            aria-label="Close AirPlay selector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Multi-Room Actions Bar */}
        <div className="px-6 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onGroupSpeakers('all')}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors active:scale-95 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Everywhere</span>
            </button>
            <button
              onClick={() => onGroupSpeakers('none')}
              className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
            >
              Deselect All
            </button>
          </div>

          {onDiscoverSpeakers && (
            <button
              onClick={onDiscoverSpeakers}
              disabled={isDiscovering}
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Rescan local Home Assistant network for HomePods"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDiscovering ? 'animate-spin text-sky-400' : ''}`} />
              <span>{isDiscovering ? 'Scanning...' : 'Scan Network'}</span>
            </button>
          )}
        </div>

        {/* Informational Message Banner */}
        {localMessage && (
          <div className="mx-6 mt-3 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-200 animate-fade-in flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{localMessage}</span>
          </div>
        )}

        {/* Speaker List Container */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1 divide-y divide-white/5">
          {speakers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Radio className="w-8 h-8 mx-auto mb-2 text-slate-500 opacity-60" />
              <p className="text-sm font-medium text-slate-300">No HomePods Configured</p>
              <p className="text-xs mt-1 text-slate-500">
                Add HomePods in Admin Settings or click "Scan Network" to discover them.
              </p>
            </div>
          ) : (
            speakers.map(speaker => {
              const isActive = !!speaker.active;
              const isMuted = !!speaker.muted;
              const currentVol = speaker.volume !== undefined ? speaker.volume : 50;

              return (
                <div
                  key={speaker.id}
                  className={`pt-3.5 first:pt-0 transition-all rounded-2xl p-3 ${
                    isActive ? 'bg-white/[0.04] border border-white/10 shadow-sm' : 'opacity-70 hover:opacity-90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Speaker Header & Activation Button */}
                    <button
                      type="button"
                      onClick={() => onToggleSpeaker(speaker.id)}
                      className="flex items-center gap-3 text-left flex-1 group"
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                            : 'border-2 border-slate-600 group-hover:border-slate-400'
                        }`}
                      >
                        {isActive && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                            {speaker.name}
                          </span>
                          {speaker.isStereoPair && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              Stereo Pair
                            </span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400 shrink-0">
                            {speaker.model || 'HomePod'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{speaker.room}</span>
                          {speaker.entityId && (
                            <>
                              <span>·</span>
                              <span className="font-mono text-[11px] text-slate-500 truncate max-w-[150px]">
                                {speaker.entityId}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </button>

                    {/* Playing animated indicator if active */}
                    {isActive && isPlaying && (
                      <div className="flex items-end gap-0.5 h-4 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 shrink-0">
                        <div className="w-1 bg-rose-400 rounded-full animate-pulse h-3" />
                        <div className="w-1 bg-rose-400 rounded-full animate-pulse delay-100 h-4" />
                        <div className="w-1 bg-rose-400 rounded-full animate-pulse delay-200 h-2" />
                      </div>
                    )}
                  </div>

                  {/* Volume Slider & Mute Button (Shown if speaker is active) */}
                  {isActive && (
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onMuteToggle(speaker.id, !isMuted)}
                        className={`p-2 rounded-xl transition-colors ${
                          isMuted ? 'bg-rose-500/20 text-rose-400' : 'hover:bg-white/10 text-slate-400 hover:text-white'
                        }`}
                        title={isMuted ? 'Unmute' : 'Mute'}
                        aria-label={`Mute ${speaker.name}`}
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : currentVol > 50 ? (
                          <Volume2 className="w-4 h-4" />
                        ) : (
                          <Volume1 className="w-4 h-4" />
                        )}
                      </button>

                      {/* Touch-Friendly Volume Slider */}
                      <div className="flex-1 flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={isMuted ? 0 : currentVol}
                          onChange={e => onVolumeChange(speaker.id, parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 hover:accent-rose-400 focus:outline-none"
                        />
                        <span className="text-xs font-mono font-medium text-slate-300 w-9 text-right shrink-0">
                          {isMuted ? '0%' : `${currentVol}%`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer with WebKit AirPlay Trigger & Guidance */}
        <div className="px-6 py-4 bg-slate-950 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span>Local Home Assistant AirPlay 2 Active</span>
          </div>

          <button
            type="button"
            onClick={triggerNativeAirPlayPicker}
            className="text-xs px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 active:scale-95 text-white font-medium shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>AirPlay Options</span>
          </button>
        </div>
      </div>
    </div>
  );
};
