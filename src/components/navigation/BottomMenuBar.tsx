import React, { useState, useEffect } from 'react';
import { Home, Calendar, ShoppingCart, Settings, Maximize2, Minimize2, CheckSquare, Sparkles, Music } from 'lucide-react';

export type NavigationTab = 'home' | 'calendar' | 'shopping' | 'media' | 'homeassistant' | 'settings';

interface BottomMenuBarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  shoppingPendingCount?: number;
  format24?: boolean;
  onTriggerScreensaver?: () => void;
}

export const BottomMenuBar: React.FC<BottomMenuBarProps> = ({
  activeTab,
  onSelectTab,
  shoppingPendingCount = 0,
  format24 = false,
  onTriggerScreensaver,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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

  const navItems: Array<{
    id: NavigationTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
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
      id: 'shopping',
      label: 'Shopping',
      icon: <ShoppingCart className="w-5 h-5" />,
      badge: shoppingPendingCount > 0 ? shoppingPendingCount : undefined,
    },
    {
      id: 'media',
      label: 'Media',
      icon: <Music className="w-5 h-5" />,
    },
    {
      id: 'homeassistant',
      label: 'Home Assistant',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5L12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5v-9z" />
          <path d="M9 21v-7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7" />
          <circle cx="12" cy="8.5" r="1" fill="currentColor" />
        </svg>
      ),
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
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className={`absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold font-mono flex items-center justify-center leading-none ${
                    isActive 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-amber-400 text-black'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] md:text-xs uppercase tracking-wider font-bold">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right Side: Live Clock, Screensaver & Fullscreen Toggle */}
      <div className="flex items-center gap-2.5 shrink-0 ml-4 border-l border-white/15 pl-4">
        {onTriggerScreensaver && (
          <button
            onClick={onTriggerScreensaver}
            className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white/90 hover:text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold border border-white/15 shadow-sm active:scale-95"
            title="Display Apple HomeView Screen Saver"
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
