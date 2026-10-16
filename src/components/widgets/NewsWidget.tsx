import React, { useState, useEffect } from 'react';
import { NewsItem, AppConfig } from '../../types/config';
import { Newspaper, ChevronRight } from 'lucide-react';

interface NewsWidgetProps {
  config: AppConfig['news'];
}

export const NewsWidget: React.FC<NewsWidgetProps> = ({ config }) => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [feedTitle, setFeedTitle] = useState<string>(config.feedName || 'News Feed');
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const fetchNews = async () => {
    try {
      const url = `/api/rss?url=${encodeURIComponent(config.feedUrl)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.title) setFeedTitle(data.title);
      }
    } catch (err) {
      console.warn('Failed to fetch news feed:', err);
    }
  };

  useEffect(() => {
    fetchNews();
    const intervalMinutes = Math.max(10, config.refreshIntervalMinutes || 30);
    const interval = setInterval(fetchNews, intervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [config.feedUrl, config.refreshIntervalMinutes]);

  // Rotate headline in card mode
  useEffect(() => {
    if (config.displayMode !== 'card' || items.length === 0) return;
    const cycleSec = Math.max(5, config.cycleSeconds || 12);
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, cycleSec * 1000);
    return () => clearInterval(interval);
  }, [config.displayMode, config.cycleSeconds, items.length]);

  if (items.length === 0) return null;

  // Ticker Mode (Continuous smooth marquee)
  if (config.displayMode === 'ticker') {
    return (
      <div className="w-full bg-black/60 backdrop-blur-md border-t border-white/10 px-4 py-2 flex items-center overflow-hidden text-kiosk-shadow select-none">
        <div className="flex items-center gap-1.5 shrink-0 pr-4 border-r border-white/20 z-10 bg-black/60">
          <Newspaper className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            {feedTitle}
          </span>
        </div>

        <div className="overflow-hidden whitespace-nowrap flex-1 ml-4">
          <div className="animate-marquee flex items-center gap-8">
            {items.concat(items).map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="flex items-center gap-3 text-sm text-white/90">
                <span className="text-white/40">•</span>
                <span className="font-medium hover:text-white transition-colors">{item.title}</span>
                {item.source && (
                  <span className="text-[11px] text-sky-300 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-500/30">
                    {item.source}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Card Mode (Rotating headline card)
  const currentItem = items[currentIndex] || items[0];

  return (
    <div className="bg-black/35 backdrop-blur-md rounded-xl p-3 border border-white/10 text-white select-none text-kiosk-shadow">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Newspaper className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold tracking-wide text-amber-300 uppercase">
            {feedTitle}
          </span>
        </div>
        <span className="text-[10px] text-white/50 font-mono">
          {currentIndex + 1} / {items.length}
        </span>
      </div>

      <p className="text-sm md:text-base font-medium line-clamp-2 text-white/95 leading-snug">
        {currentItem?.title}
      </p>

      {currentItem?.snippet && (
        <p className="text-xs text-white/60 line-clamp-2 mt-1 leading-normal">
          {currentItem.snippet}
        </p>
      )}
    </div>
  );
};
