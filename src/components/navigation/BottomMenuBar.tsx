import React, { useState, useEffect } from 'react';
import { Home, Calendar, Settings, Maximize2, Minimize2, Sparkles, RefreshCw, PartyPopper } from 'lucide-react';

export type NavigationTab = 'home' | 'calendar' | 'settings';

interface BottomMenuBarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  format24?: boolean;
  onTriggerScreensaver?: () => void;
  onTriggerPartyMode?: () => void;
  onRefresh?: () => void;
}

export const BottomMenuBar: React.FC<BottomMenuBarProps> = ({
  activeTab,
  onSelectTab,
  format24 = false,
  onTriggerScreensaver,
  onTriggerPartyMode,
  onRefresh,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      if (format24) {
        setTimeStr(now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }));
      } else {
        setTimeStr(now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }));
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [format24]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleRefreshClick = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await Promise.resolve(onRefresh());
      } finally {
        setTimeout(() => setIsRefreshing(false), 700);
      }
    }
  };

  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <nav 
      aria-label="Smart Display Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 border-t border-white/10 px-4 md:px-8 py-2 md:py-2.5 flex items-center justify-between select-none shadow-2xl [transform:translateZ(0)]"
    >
      {/* Navigation Items (Left / Center) */}
      <div className="flex items-center gap-2 md:gap-4 overflow-x-auto scrollbar-none py-0.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col md:flex-row items-center gap-1 md:gap-2.5 px-3.5 md:px-6 py-1.5 md:py-2 rounded-xl transition-all text-xs md:text-sm font-semibold tracking-wide ${
                isActive
                  ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                  : 'text-white/70 hover:text-white hover:bg-white/10 active:scale-95'
              }`}
            >
              {item.icon}
              <span className="text-[11px] md:text-xs uppercase tracking-wider font-bold">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right Side: Live Clock, Refresh, Screensaver, Party Mode & Fullscreen Toggle */}
      <div className="flex items-center gap-2.5 shrink-0 ml-4 border-l border-white/15 pl-4">
        {onTriggerPartyMode && (
          <button
            onClick={onTriggerPartyMode}
            className="px-2.5 py-1.5 bg-gradient-to-r from-amber-500/25 to-pink-500/25 hover:from-amber-500/40 hover:to-pink-500/40 text-amber-200 hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold border border-amber-400/40 shadow-sm active:scale-95 cursor-pointer group"
            title="Launch Celebration & Party Screen"
          >
            <PartyPopper className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Party Mode</span>
          </button>
        )}

        {onTriggerScreensaver && (
          <button
            onClick={onTriggerScreensaver}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white/90 hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold border border-white/15 shadow-sm active:scale-95 cursor-pointer"
            title="Display Screen Saver"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Screen Saver</span>
          </button>
        )}

        {timeStr && (
          <span className="text-sm md:text-base font-bold font-mono text-white/90 tracking-tight text-kiosk-shadow hidden md:inline">
            {timeStr}
          </span>
        )}

        {onRefresh && (
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            title="Refresh Dashboard & Feeds"
            aria-label="Refresh Dashboard & Feeds"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        )}

        <button
          onClick={toggleFullscreen}
          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </nav>
  );
};
