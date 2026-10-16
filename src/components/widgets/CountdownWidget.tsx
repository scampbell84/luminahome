import React, { useState, useEffect } from 'react';
import { AppConfig } from '../../types/config';
import { Plane, Gift, Sun, Trophy, PartyPopper, Heart, Sparkles, Clock } from 'lucide-react';

interface CountdownWidgetProps {
  config: AppConfig['countdown'];
}

export const CountdownWidget: React.FC<CountdownWidgetProps> = ({ config }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });

  useEffect(() => {
    const calculateTime = () => {
      const target = new Date(config.targetDate).getTime();
      const now = Date.now();
      const difference = target - now;

      if (isNaN(target)) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });
        return;
      }

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [config.targetDate]);

  const renderIcon = () => {
    const className = "w-4 h-4 text-amber-300";
    switch (config.icon) {
      case 'plane': return <Plane className={className} />;
      case 'gift': return <Gift className={className} />;
      case 'sun': return <Sun className={className} />;
      case 'trophy': return <Trophy className={className} />;
      case 'party': return <PartyPopper className={className} />;
      case 'heart': return <Heart className={className} />;
      default: return <Sparkles className={className} />;
    }
  };

  return (
    <div className="bg-black/35 backdrop-blur-md rounded-xl p-3 border border-white/10 text-white select-none text-kiosk-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {renderIcon()}
          <span className="text-xs md:text-sm font-semibold tracking-wide truncate max-w-[200px]">
            {config.title || 'Event Countdown'}
          </span>
        </div>
        <span className="text-[10px] text-white/50 uppercase tracking-widest font-mono">
          {timeLeft.isPast ? 'COMPLETED' : 'COUNTDOWN'}
        </span>
      </div>

      {timeLeft.isPast ? (
        <div className="py-2 text-center text-amber-300 font-semibold text-sm">
          🎉 Target reached! Hope it was wonderful!
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/10 rounded-lg py-1.5 px-1 border border-white/10">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-white block">
              {timeLeft.days}
            </span>
            <span className="text-[10px] font-medium text-white/60 uppercase">Days</span>
          </div>

          <div className="bg-white/10 rounded-lg py-1.5 px-1 border border-white/10">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-white block">
              {timeLeft.hours.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] font-medium text-white/60 uppercase">Hours</span>
          </div>

          <div className="bg-white/10 rounded-lg py-1.5 px-1 border border-white/10">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-white block">
              {timeLeft.minutes.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] font-medium text-white/60 uppercase">Mins</span>
          </div>

          <div className="bg-white/10 rounded-lg py-1.5 px-1 border border-white/10">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-cyan-300 block">
              {timeLeft.seconds.toString().padStart(2, '0')}
            </span>
            <span className="text-[10px] font-medium text-white/60 uppercase">Secs</span>
          </div>
        </div>
      )}
    </div>
  );
};
