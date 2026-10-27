import React, { useState, useEffect } from 'react';
import { AppConfig, CalendarEvent } from './types/config';
import { DEFAULT_CONFIG } from './constants/defaultConfig';
import { DisplayScreen } from './components/display/DisplayScreen';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { BigCalendarView } from './components/calendar/BigCalendarView';
import { BottomMenuBar, NavigationTab } from './components/navigation/BottomMenuBar';
import { ScreenSaver } from './components/screensaver/ScreenSaver';
import { PartyScreen } from './components/party/PartyScreen';
import { RewardScreen } from './components/rewards/RewardScreen';
import { VirtualKeyboard } from './components/keyboard/VirtualKeyboard';
import { Monitor } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [isScreensaverActive, setIsScreensaverActive] = useState<boolean>(false);
  const [isPartyActive, setIsPartyActive] = useState<boolean>(false);
  const [visitedTabs, setVisitedTabs] = useState<Set<NavigationTab>>(() => new Set([currentTab]));

  // Keep visited tabs in DOM to eliminate re-mount stutter and network re-fetching
  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(currentTab)) return prev;
      const next = new Set(prev);
      next.add(currentTab);
      return next;
    });
  }, [currentTab]);

  // Initialize active tab from URL path or query params
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view')?.toLowerCase();

    if (path.includes('party') || viewParam === 'party') {
      setIsPartyActive(true);
      setCurrentTab('home');
    } else if (path.includes('admin') || path.includes('settings') || viewParam === 'settings' || viewParam === 'admin') {
      setCurrentTab('settings');
    } else if (path.includes('calendar') || viewParam === 'calendar') {
      setCurrentTab('calendar');
    } else if (path.includes('reward') || viewParam === 'rewards' || viewParam === 'reward') {
      setCurrentTab('rewards');
    } else {
      setCurrentTab('home');
    }

    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase();
      if (p.includes('party')) {
        setIsPartyActive(true);
      } else if (p.includes('admin') || p.includes('settings')) {
        setIsPartyActive(false);
        setCurrentTab('settings');
      } else if (p.includes('calendar')) {
        setIsPartyActive(false);
        setCurrentTab('calendar');
      } else if (p.includes('reward')) {
        setIsPartyActive(false);
        setCurrentTab('rewards');
      } else {
        setIsPartyActive(false);
        setCurrentTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === '1') navigateTo('home');
      if (e.key === '2') navigateTo('calendar');
      if (e.key === '3' || e.key === 'r' || e.key === 'R') navigateTo('rewards');
      if (e.key === '4' || e.key === 's' || e.key === 'S') navigateTo('settings');
      if (e.key === '0') setIsScreensaverActive(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Idle detection for Screen Saver
  useEffect(() => {
    const timeoutMinutes = config.screensaver?.idleTimeoutMinutes ?? 3;
    const enabled = config.screensaver?.enabled ?? true;

    if (!enabled || timeoutMinutes <= 0) {
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    let timer: NodeJS.Timeout | undefined;
    let lastActivity = 0;

    const resetIdleTimer = () => {
      const now = Date.now();
      if (now - lastActivity < 2000) {
        return;
      }
      lastActivity = now;

      if (timer) clearTimeout(timer);
      if (!isScreensaverActive) {
        timer = setTimeout(() => {
          setIsScreensaverActive(true);
        }, timeoutMs);
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'pointerdown'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetIdleTimer, { passive: true });
    });

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      setIsScreensaverActive(true);
    }, timeoutMs);

    return () => {
      clearTimeout(timer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [config.screensaver?.idleTimeoutMinutes, config.screensaver?.enabled, isScreensaverActive]);

  const handleWakeFromScreensaver = () => {
    setIsScreensaverActive(false);
    navigateTo('home');
  };

  // Fetch initial config from backend
  const loadConfig = async () => {
    try {
      const res = await fetch('/api/config', {
        headers: { Accept: 'application/json' },
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setConfig(data);
      }
    } catch (err) {
      console.warn('Using local fallback config:', err);
    }
  };

  // Fetch calendar events
  const loadCalendar = async () => {
    try {
      const res = await fetch('/api/calendar', {
        headers: { Accept: 'application/json' },
      });
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setCalendarEvents(data.events || []);
      }
    } catch (err) {
      console.warn('Using local fallback calendar events:', err);
    }
  };

  useEffect(() => {
    Promise.all([loadConfig(), loadCalendar()]).finally(() => {
      setLoading(false);
    });

    // Auto-refresh calendar periodically and strictly on midnight date turnover
    let lastDateStr = new Date().toDateString();
    const interval = setInterval(() => {
      const nowDateStr = new Date().toDateString();
      if (nowDateStr !== lastDateStr) {
        lastDateStr = nowDateStr;
      }
      loadCalendar();
    }, 60 * 1000);

    // Instant midnight detector to reload calendar at 00:00:00 sharp
    const midnightInterval = setInterval(() => {
      const nowDateStr = new Date().toDateString();
      if (nowDateStr !== lastDateStr) {
        lastDateStr = nowDateStr;
        loadCalendar();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(midnightInterval);
    };
  }, []);

  // Save updated config to backend
  const handleSaveConfig = async (updatedConfig: AppConfig) => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
      });

      if (!res.ok) {
        throw new Error('Failed to save to server');
      }

      const data = await res.json();
      setConfig(data.config || updatedConfig);
      showToast('Configuration saved successfully');
    } catch (err: any) {
      showToast(err.message || 'Error saving configuration');
      throw err;
    }
  };

  // Reset config to defaults
  const handleResetConfig = async () => {
    try {
      const res = await fetch('/api/config/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || DEFAULT_CONFIG);
        showToast('Configuration reset to factory defaults');
      }
    } catch (err) {
      setConfig(DEFAULT_CONFIG);
      showToast('Reset to local defaults');
    }
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([loadConfig(), loadCalendar()]);
      showToast('Dashboard refreshed');
    } catch {
      showToast('Refresh complete');
    }
  };

  const navigateTo = (tab: NavigationTab) => {
    setCurrentTab(tab);
    let path = '/display';
    if (tab === 'settings') path = '/admin';
    if (tab === 'calendar') path = '/calendar';
    if (tab === 'rewards') path = '/rewards';
    window.history.pushState({}, '', path);
  };

  if (loading) {
    return (
      <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center animate-pulse mb-4 shadow-xl">
          <Monitor className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-lg font-semibold tracking-wide">Lumina Home</h1>
        <p className="text-xs text-slate-400 mt-1">Initializing smart display...</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${currentTab === 'settings' ? 'min-h-screen' : 'h-screen overflow-hidden'} bg-slate-950 flex flex-col relative`}>
      {/* Main View Area with Zero-Latency Tab Caching */}
      <main className={`flex-1 w-full ${currentTab === 'settings' ? 'relative' : 'h-full overflow-hidden relative'}`}>
        {visitedTabs.has('home') && (
          <div className={currentTab === 'home' ? 'w-full h-full overflow-hidden' : 'hidden'}>
            <DisplayScreen
              config={config}
              onOpenAdmin={() => navigateTo('settings')}
              onOpenRewards={() => navigateTo('rewards')}
              onRefreshConfig={loadConfig}
              onUpdateConfig={handleSaveConfig}
              onTriggerPartyMode={() => setIsPartyActive(true)}
            />
          </div>
        )}

        {visitedTabs.has('calendar') && (
          <div className={currentTab === 'calendar' ? 'w-full h-full overflow-hidden pb-14 md:pb-16' : 'hidden'}>
            <BigCalendarView
              events={calendarEvents}
              feeds={config.calendar.feeds}
              config={config.calendar}
              onRefresh={loadCalendar}
            />
          </div>
        )}

        {visitedTabs.has('rewards') && (
          <div className={currentTab === 'rewards' ? 'w-full h-full overflow-hidden pb-14 md:pb-16' : 'hidden'}>
            <RewardScreen
              config={config}
              onUpdateConfig={handleSaveConfig}
            />
          </div>
        )}

        {visitedTabs.has('settings') && (
          <div className={currentTab === 'settings' ? 'w-full h-full' : 'hidden'}>
            <AdminDashboard
              initialConfig={config}
              onSave={handleSaveConfig}
              onReset={handleResetConfig}
              onOpenDisplay={() => navigateTo('home')}
              onTriggerScreensaver={() => setIsScreensaverActive(true)}
              onTriggerPartyMode={() => setIsPartyActive(true)}
            />
          </div>
        )}
      </main>

      {/* Persistent Smart Display Bottom Menu Bar */}
      <BottomMenuBar
        activeTab={currentTab}
        onSelectTab={navigateTo}
        format24={config.clock.format24}
        onTriggerPartyMode={() => setIsPartyActive(true)}
        onTriggerScreensaver={() => setIsScreensaverActive(true)}
        onRefresh={handleRefresh}
      />

      {/* Full-screen Dedicated Party & Celebration Screen Overlay */}
      {isPartyActive && (
        <PartyScreen
          config={config}
          onExit={() => setIsPartyActive(false)}
          onUpdateConfig={handleSaveConfig}
        />
      )}

      {/* Full-screen Apple HomeView Screen Saver Overlay */}
      {isScreensaverActive && (
        <ScreenSaver
          config={config}
          calendarEvents={calendarEvents}
          onWake={handleWakeFromScreensaver}
          onUpdateConfig={handleSaveConfig}
        />
      )}

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-xl border border-slate-700 text-xs animate-bounce">
          {notification}
        </div>
      )}

      {/* Built-in On-Screen Virtual Keyboard for Raspberry Pi Touchscreen */}
      <VirtualKeyboard
        enabled={config.system?.virtualKeyboard ?? true}
        soundEnabled={config.system?.virtualKeyboardSound ?? true}
      />
    </div>
  );
}
