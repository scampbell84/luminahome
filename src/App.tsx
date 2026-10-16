import React, { useState, useEffect } from 'react';
import { AppConfig, CalendarEvent } from './types/config';
import { ShoppingItem, ShoppingCategory } from './types/shopping';
import { DEFAULT_CONFIG } from './constants/defaultConfig';
import { DisplayScreen } from './components/display/DisplayScreen';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { BigCalendarView } from './components/calendar/BigCalendarView';
import { ShoppingView } from './components/shopping/ShoppingView';
import { BottomMenuBar, NavigationTab } from './components/navigation/BottomMenuBar';
import { HomeAssistantView } from './components/homeassistant/HomeAssistantView';
import { MediaView } from './components/media/MediaView';
import { ScreenSaver } from './components/screensaver/ScreenSaver';
import { Monitor } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [isScreensaverActive, setIsScreensaverActive] = useState<boolean>(false);
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

    if (path.includes('admin') || path.includes('settings') || viewParam === 'settings' || viewParam === 'admin') {
      setCurrentTab('settings');
    } else if (path.includes('calendar') || viewParam === 'calendar') {
      setCurrentTab('calendar');
    } else if (path.includes('shopping') || viewParam === 'shopping') {
      setCurrentTab('shopping');
    } else if (path.includes('media') || path.includes('music') || viewParam === 'media' || viewParam === 'music') {
      setCurrentTab('media');
    } else if (path.includes('homeassistant') || path.includes('hass') || viewParam === 'homeassistant' || viewParam === 'hass') {
      setCurrentTab('homeassistant');
    } else {
      setCurrentTab('home');
    }

    const handlePopState = () => {
      const p = window.location.pathname.toLowerCase();
      if (p.includes('admin') || p.includes('settings')) {
        setCurrentTab('settings');
      } else if (p.includes('calendar')) {
        setCurrentTab('calendar');
      } else if (p.includes('shopping')) {
        setCurrentTab('shopping');
      } else if (p.includes('media') || p.includes('music')) {
        setCurrentTab('media');
      } else if (p.includes('homeassistant') || p.includes('hass')) {
        setCurrentTab('homeassistant');
      } else {
        setCurrentTab('home');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === '1') navigateTo('home');
      if (e.key === '2') navigateTo('calendar');
      if (e.key === '3') navigateTo('shopping');
      if (e.key === '4' || e.key === 'm' || e.key === 'M') navigateTo('media');
      if (e.key === '5' || e.key === 'h' || e.key === 'H') navigateTo('homeassistant');
      if (e.key === '6' || e.key === 's' || e.key === 'S') navigateTo('settings');
      if (e.key === '0') setIsScreensaverActive(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Idle detection for Apple HomeView Screen Saver
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
      // Throttle timer resets to at most once every 2 seconds during active scrolling/touch
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
      const res = await fetch('/api/config');
      if (res.ok) {
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
      const res = await fetch('/api/calendar');
      if (res.ok) {
        const data = await res.json();
        setCalendarEvents(data.events || []);
      }
    } catch (err) {
      console.warn('Using local fallback calendar events:', err);
    }
  };

  // Fetch shopping list items
  const loadShopping = async () => {
    try {
      const res = await fetch('/api/shopping');
      if (res.ok) {
        const data = await res.json();
        setShoppingItems(data.items || []);
      }
    } catch (err) {
      console.warn('Using local fallback shopping items:', err);
    }
  };

  useEffect(() => {
    Promise.all([loadConfig(), loadCalendar(), loadShopping()]).finally(() => {
      setLoading(false);
    });

    // Auto-refresh calendar and shopping periodically
    const interval = setInterval(() => {
      loadCalendar();
      loadShopping();
    }, 60 * 1000); // every minute

    return () => clearInterval(interval);
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

  // Shopping handlers
  const handleAddShoppingItem = async (text: string, category: ShoppingCategory, quantity?: string) => {
    try {
      const res = await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, category, quantity }),
      });
      if (res.ok) {
        const data = await res.json();
        setShoppingItems(data.items);
        showToast(`Added "${text}" to shopping list`);
      }
    } catch (err) {
      // Optimistic fallback
      const newItem: ShoppingItem = {
        id: `shop-${Date.now()}`,
        text,
        category,
        completed: false,
        quantity,
        createdAt: new Date().toISOString(),
      };
      setShoppingItems((prev) => [newItem, ...prev]);
    }
  };

  const handleToggleShoppingItem = async (id: string, completed: boolean) => {
    // Optimistic UI update
    setShoppingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed } : item))
    );

    try {
      await fetch(`/api/shopping/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
    } catch (err) {
      console.warn('Failed to toggle shopping item on server:', err);
    }
  };

  const handleDeleteShoppingItem = async (id: string) => {
    setShoppingItems((prev) => prev.filter((item) => item.id !== id));
    try {
      await fetch(`/api/shopping/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Failed to delete shopping item on server:', err);
    }
  };

  const handleClearCompletedShopping = async () => {
    setShoppingItems((prev) => prev.filter((item) => !item.completed));
    try {
      await fetch('/api/shopping/clear-completed', { method: 'POST' });
      showToast('Cleared completed shopping items');
    } catch (err) {
      console.warn('Failed to clear completed items on server:', err);
    }
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const navigateTo = (tab: NavigationTab) => {
    setCurrentTab(tab);
    let path = '/display';
    if (tab === 'settings') path = '/admin';
    if (tab === 'calendar') path = '/calendar';
    if (tab === 'shopping') path = '/shopping';
    if (tab === 'media') path = '/media';
    if (tab === 'homeassistant') path = '/homeassistant';
    window.history.pushState({}, '', path);
  };

  const shoppingPendingCount = shoppingItems.filter((i) => !i.completed).length;

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
    <div className="w-full h-full min-h-screen bg-slate-950 flex flex-col relative">
      {/* Main View Area with Zero-Latency Tab Caching */}
      <main className="flex-1 w-full relative">
        {visitedTabs.has('home') && (
          <div className={currentTab === 'home' ? 'w-full h-full' : 'hidden'}>
            <DisplayScreen
              config={config}
              onOpenAdmin={() => navigateTo('settings')}
              onRefreshConfig={loadConfig}
              shoppingItems={shoppingItems}
              onOpenShopping={() => navigateTo('shopping')}
            />
          </div>
        )}

        {visitedTabs.has('calendar') && (
          <div className={currentTab === 'calendar' ? 'w-full h-full' : 'hidden'}>
            <BigCalendarView
              events={calendarEvents}
              feeds={config.calendar.feeds}
              onRefresh={loadCalendar}
            />
          </div>
        )}

        {visitedTabs.has('shopping') && (
          <div className={currentTab === 'shopping' ? 'w-full h-full' : 'hidden'}>
            <ShoppingView
              items={shoppingItems}
              onAddItem={handleAddShoppingItem}
              onToggleItem={handleToggleShoppingItem}
              onDeleteItem={handleDeleteShoppingItem}
              onClearCompleted={handleClearCompletedShopping}
            />
          </div>
        )}

        {visitedTabs.has('media') && (
          <div className={currentTab === 'media' ? 'w-full h-full' : 'hidden'}>
            <MediaView
              config={config}
              onUpdateConfig={handleSaveConfig}
              onOpenSettings={() => navigateTo('settings')}
            />
          </div>
        )}

        {visitedTabs.has('homeassistant') && (
          <div className={currentTab === 'homeassistant' ? 'w-full h-full' : 'hidden'}>
            <HomeAssistantView
              config={config}
              onOpenSettings={() => navigateTo('settings')}
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
            />
          </div>
        )}
      </main>

      {/* Persistent Smart Display Bottom Menu Bar */}
      <BottomMenuBar
        activeTab={currentTab}
        onSelectTab={navigateTo}
        shoppingPendingCount={shoppingPendingCount}
        format24={config.clock.format24}
        onTriggerScreensaver={() => setIsScreensaverActive(true)}
      />

      {/* Full-screen Apple HomeView Screen Saver Overlay */}
      {isScreensaverActive && (
        <ScreenSaver
          config={config}
          calendarEvents={calendarEvents}
          onWake={handleWakeFromScreensaver}
          onUpdateConfig={handleSaveConfig}
        />
      )}

      {/* Floating Toast Notification */}
      {notification && (
        <div className="fixed bottom-20 right-6 z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2 animate-bounce">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
}
