import React, { useState, useEffect } from 'react';
import { AppConfig } from '../../types/config';

interface ClockWidgetProps {
  config: AppConfig['clock'];
  orientation?: 'landscape' | 'portrait';
}

export const ClockWidget: React.FC<ClockWidgetProps> = ({ config, orientation = 'landscape' }) => {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    // Sync to second boundary
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format time components
  let hours = time.getHours();
  const minutes = time.getMinutes().toString().padStart(2, '0');
  const seconds = time.getSeconds().toString().padStart(2, '0');
  let ampm = '';

  if (!config.format24) {
    ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 hour is 12
  }
  const hoursStr = config.format24 ? hours.toString().padStart(2, '0') : hours.toString();

  // Format date
  const dayName = time.toLocaleDateString(undefined, { weekday: 'long' });
  const monthName = time.toLocaleDateString(undefined, { month: 'long' });
  const dayNum = time.getDate();
  const year = time.getFullYear();

  return (
    <div className="flex flex-col text-white select-none">
      {/* Time Display */}
      <div className="flex items-baseline tracking-tight font-extralight text-kiosk-shadow">
        <span className="text-6xl md:text-7xl lg:text-8xl font-medium tracking-tighter">
          {hoursStr}
        </span>
        <span className="text-5xl md:text-6xl lg:text-7xl font-light mx-1 opacity-80 animate-pulse">
          :
        </span>
        <span className="text-6xl md:text-7xl lg:text-8xl font-medium tracking-tighter">
          {minutes}
        </span>

        {config.showSeconds && (
          <span className="text-2xl md:text-3xl lg:text-4xl font-light opacity-75 ml-2 text-cyan-300">
            {seconds}
          </span>
        )}

        {!config.format24 && (
          <span className="text-xl md:text-2xl lg:text-3xl font-normal ml-3 opacity-90 uppercase tracking-widest text-amber-300">
            {ampm}
          </span>
        )}
      </div>

      {/* Date Display */}
      {config.showDate && (
        <div className="mt-1 md:mt-2 text-lg md:text-xl lg:text-2xl font-normal tracking-wide text-white/90 text-kiosk-shadow flex items-center gap-2">
          <span className="text-sky-300 font-semibold">{dayName}</span>
          <span className="opacity-40">•</span>
          <span>{monthName} {dayNum}, {year}</span>
        </div>
      )}
    </div>
  );
};
