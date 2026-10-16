import React, { useRef } from 'react';
import GridLayout, { Layout, useContainerWidth } from 'react-grid-layout';
import { AppConfig } from '../../types/config';
import {
  Clock,
  CloudSun,
  Calendar,
  Hourglass,
  CheckSquare,
  Newspaper,
  Cpu,
  GripVertical,
  RotateCcw,
  LayoutGrid,
  Check,
  Eye,
  EyeOff,
  Maximize2,
  Music,
} from 'lucide-react';

interface GridVisualEditorProps {
  config: AppConfig;
  onChangeLayout: (newGridItems: AppConfig['layout']['gridItems']) => void;
  onToggleWidget: (widgetKey: keyof AppConfig) => void;
}

export const GridVisualEditor: React.FC<GridVisualEditorProps> = ({
  config,
  onChangeLayout,
  onToggleWidget,
}) => {
  const { containerRef, width } = useContainerWidth();

  // Current items or default fallback
  const currentItems = config.layout.gridItems || [
    { i: 'clock', x: 0, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
    { i: 'weather', x: 6, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
    { i: 'calendar', x: 0, y: 3, w: 8, h: 6, minW: 4, minH: 3 },
    { i: 'countdown', x: 8, y: 3, w: 4, h: 2, minW: 3, minH: 2 },
    { i: 'notes', x: 8, y: 5, w: 4, h: 3, minW: 3, minH: 2 },
    { i: 'system', x: 8, y: 8, w: 4, h: 1, minW: 2, minH: 1 },
    { i: 'news', x: 0, y: 9, w: 12, h: 2, minW: 4, minH: 1 },
  ];

  // Map to react-grid-layout LayoutItem format
  const rglLayout: Layout = currentItems.map((item) => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW || 2,
    minH: item.minH || 1,
  }));

  const handleLayoutChange = (newLayout: Layout) => {
    const updated = newLayout.map((item) => {
      const original = currentItems.find((ci) => ci.i === item.i);
      return {
        i: item.i,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: original?.minW || 2,
        minH: original?.minH || 1,
      };
    });
    onChangeLayout(updated);
  };

  // Layout preset templates
  const applyPreset = (preset: 'balanced' | 'calendar-focus' | 'split' | 'minimal') => {
    if (preset === 'balanced') {
      onChangeLayout([
        { i: 'clock', x: 0, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
        { i: 'weather', x: 6, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
        { i: 'calendar', x: 0, y: 3, w: 8, h: 6, minW: 4, minH: 3 },
        { i: 'countdown', x: 8, y: 3, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'notes', x: 8, y: 5, w: 4, h: 3, minW: 3, minH: 2 },
        { i: 'system', x: 8, y: 8, w: 4, h: 1, minW: 2, minH: 1 },
        { i: 'news', x: 0, y: 9, w: 12, h: 2, minW: 4, minH: 1 },
      ]);
    } else if (preset === 'calendar-focus') {
      onChangeLayout([
        { i: 'clock', x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'weather', x: 4, y: 0, w: 5, h: 2, minW: 3, minH: 2 },
        { i: 'countdown', x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
        { i: 'calendar', x: 0, y: 2, w: 9, h: 7, minW: 4, minH: 3 },
        { i: 'notes', x: 9, y: 2, w: 3, h: 4, minW: 2, minH: 2 },
        { i: 'system', x: 9, y: 6, w: 3, h: 1, minW: 2, minH: 1 },
        { i: 'news', x: 0, y: 9, w: 12, h: 2, minW: 4, minH: 1 },
      ]);
    } else if (preset === 'split') {
      onChangeLayout([
        { i: 'clock', x: 0, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
        { i: 'weather', x: 0, y: 3, w: 6, h: 3, minW: 3, minH: 2 },
        { i: 'countdown', x: 0, y: 6, w: 6, h: 2, minW: 3, minH: 2 },
        { i: 'notes', x: 0, y: 8, w: 6, h: 3, minW: 3, minH: 2 },
        { i: 'calendar', x: 6, y: 0, w: 6, h: 9, minW: 4, minH: 3 },
        { i: 'system', x: 6, y: 9, w: 6, h: 1, minW: 2, minH: 1 },
        { i: 'news', x: 0, y: 11, w: 12, h: 2, minW: 4, minH: 1 },
      ]);
    } else if (preset === 'minimal') {
      onChangeLayout([
        { i: 'clock', x: 0, y: 0, w: 7, h: 4, minW: 3, minH: 2 },
        { i: 'weather', x: 7, y: 0, w: 5, h: 4, minW: 3, minH: 2 },
        { i: 'calendar', x: 0, y: 4, w: 12, h: 6, minW: 4, minH: 3 },
        { i: 'news', x: 0, y: 10, w: 12, h: 2, minW: 4, minH: 1 },
        { i: 'countdown', x: 0, y: 12, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'notes', x: 4, y: 12, w: 4, h: 2, minW: 3, minH: 2 },
        { i: 'system', x: 8, y: 12, w: 4, h: 2, minW: 2, minH: 1 },
      ]);
    }
  };

  // Helper to render widget card details inside grid
  const getWidgetInfo = (id: string) => {
    switch (id) {
      case 'clock':
        return {
          title: 'Digital Clock & Date',
          icon: <Clock className="w-4 h-4 text-sky-400" />,
          enabled: config.clock.enabled,
          configKey: 'clock' as keyof AppConfig,
          badge: config.clock.format24 ? '24h' : '12h AM/PM',
          desc: 'High-contrast digital time & full date display',
        };
      case 'weather':
        return {
          title: 'Weather & Forecast',
          icon: <CloudSun className="w-4 h-4 text-amber-400" />,
          enabled: config.weather.enabled,
          configKey: 'weather' as keyof AppConfig,
          badge: config.weather.units === 'imperial' ? '°F' : '°C',
          desc: `${config.weather.cityName || 'Local'} • 5-day strip`,
        };
      case 'calendar':
        return {
          title: 'Universal Calendar',
          icon: <Calendar className="w-4 h-4 text-emerald-400" />,
          enabled: config.calendar.enabled,
          configKey: 'calendar' as keyof AppConfig,
          badge: `${config.calendar.feeds.length} feeds`,
          desc: 'Month Grid & Upcoming Agenda Schedule',
        };
      case 'countdown':
        return {
          title: 'Event Countdown',
          icon: <Hourglass className="w-4 h-4 text-orange-400" />,
          enabled: config.countdown.enabled,
          configKey: 'countdown' as keyof AppConfig,
          badge: 'Live Timer',
          desc: config.countdown.title || 'Vacation Countdown',
        };
      case 'notes':
        return {
          title: 'Daily Notes & Quotes',
          icon: <CheckSquare className="w-4 h-4 text-purple-400" />,
          enabled: config.notes.enabled,
          configKey: 'notes' as keyof AppConfig,
          badge: config.notes.mode,
          desc: 'Inspirational quotes or sticky reminders',
        };
      case 'news':
        return {
          title: 'News / RSS Ticker',
          icon: <Newspaper className="w-4 h-4 text-cyan-400" />,
          enabled: config.news.enabled,
          configKey: 'news' as keyof AppConfig,
          badge: config.news.displayMode,
          desc: 'Live headline ticker feed proxy',
        };
      case 'system':
        return {
          title: 'System & Pi Health',
          icon: <Cpu className="w-4 h-4 text-teal-400" />,
          enabled: config.system.enabled,
          configKey: 'system' as keyof AppConfig,
          badge: 'Heartbeat',
          desc: 'Local IP, online heartbeat & host uptime',
        };
      case 'mediaPlayer':
        return {
          title: 'Apple Music & HomePods',
          icon: <Music className="w-4 h-4 text-rose-400" />,
          enabled: config.appleMusic?.enabled ?? true,
          configKey: 'appleMusic' as keyof AppConfig,
          badge: 'AirPlay 2',
          desc: 'Touch player, Apple Music library & HomePod multi-room audio',
        };
      default:
        return {
          title: id,
          icon: <LayoutGrid className="w-4 h-4 text-white" />,
          enabled: true,
          configKey: 'clock' as keyof AppConfig,
          badge: '',
          desc: '',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-xl shadow-md">
        <div>
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-sky-400" />
            <span>Visual Drag & Drop Grid Layout Builder</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Drag widgets by their top handle to reposition. Drag the bottom-right corner to resize.
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset('balanced')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-medium border border-slate-700 transition-colors"
          >
            Balanced
          </button>
          <button
            type="button"
            onClick={() => applyPreset('calendar-focus')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-medium border border-slate-700 transition-colors"
          >
            Calendar Focus
          </button>
          <button
            type="button"
            onClick={() => applyPreset('split')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-medium border border-slate-700 transition-colors"
          >
            50/50 Split
          </button>
          <button
            type="button"
            onClick={() => applyPreset('minimal')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs font-medium border border-slate-700 transition-colors"
          >
            Full Width
          </button>
        </div>
      </div>

      {/* Visual Canvas Area */}
      <div
        ref={containerRef}
        className="w-full bg-slate-950/90 border-2 border-dashed border-slate-800 rounded-2xl p-4 shadow-inner relative overflow-hidden"
        style={{ minHeight: '620px' }}
      >
        {/* Aspect Ratio Badge & Grid Guide */}
        <div className="absolute top-3 right-4 z-10 flex items-center gap-2">
          <span className="text-[10px] bg-slate-900/90 text-sky-400 border border-sky-500/30 font-mono px-2 py-0.5 rounded-full uppercase font-medium shadow-sm">
            {config.general.orientation === 'landscape' ? 'Target: 1920×1200 (16:10 • 12 Columns)' : 'Target: 1200×1920 Portrait'}
          </span>
        </div>

        {/* The Grid Component */}
        {width > 0 && (
          <GridLayout
            className="layout"
            layout={rglLayout}
            width={width - 32} // account for padding
            onLayoutChange={handleLayoutChange}
            gridConfig={{
              cols: 12,
              rowHeight: 72,
              margin: [12, 12],
            }}
            dragConfig={{
              handle: '.drag-handle',
            }}
            resizeConfig={{
              handles: ['se'],
            }}
          >
            {currentItems.map((item) => {
              const info = getWidgetInfo(item.i);
              const isEnabled = info.enabled;

              return (
                <div
                  key={item.i}
                  className={`rounded-xl border transition-shadow shadow-md flex flex-col justify-between overflow-hidden select-none ${
                    isEnabled
                      ? 'bg-slate-900/95 border-slate-700/80 hover:border-sky-500/80 text-white'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-500 opacity-60'
                  }`}
                >
                  {/* Card Header (Drag Handle) */}
                  <div className="drag-handle px-3 py-2 bg-slate-800/80 hover:bg-slate-800 border-b border-slate-700/60 flex items-center justify-between cursor-move">
                    <div className="flex items-center gap-2 min-w-0">
                      <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <div className="shrink-0">{info.icon}</div>
                      <span className="text-xs font-semibold truncate text-white">
                        {info.title}
                      </span>
                    </div>

                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                        {item.w}×{item.h}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWidget(info.configKey);
                        }}
                        className={`p-1 rounded text-xs transition-colors ${
                          isEnabled
                            ? 'text-sky-400 hover:text-sky-300 hover:bg-sky-500/20'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                        }`}
                        title={isEnabled ? 'Disable Widget' : 'Enable Widget'}
                      >
                        {isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Card Body (Widget Preview Miniature) */}
                  <div className="p-3 flex-1 flex flex-col justify-center items-center text-center">
                    <span className="text-xs font-medium text-slate-300">
                      {info.desc}
                    </span>
                    {info.badge && (
                      <span className="mt-1 text-[10px] bg-slate-800/90 text-slate-400 font-mono px-2 py-0.5 rounded border border-slate-700/60">
                        {info.badge}
                      </span>
                    )}
                  </div>

                  {/* Card Footer (Resize indicator helper) */}
                  <div className="px-3 py-1 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>col {item.x + 1} - {item.x + item.w}</span>
                    <span className="text-slate-400 font-medium">Drag corner ↘ to resize</span>
                  </div>
                </div>
              );
            })}
          </GridLayout>
        )}
      </div>
    </div>
  );
};
