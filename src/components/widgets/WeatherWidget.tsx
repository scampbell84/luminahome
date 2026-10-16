import React, { useState, useEffect } from 'react';
import { WeatherData, AppConfig, WeatherAlert } from '../../types/config';
import { WeatherIcon } from './WeatherIcon';
import { Wind, Droplets, ArrowUp, ArrowDown, AlertTriangle, Info, X } from 'lucide-react';

interface WeatherWidgetProps {
  config: AppConfig['weather'];
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ config }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);

  const fetchWeather = async () => {
    try {
      const query = new URLSearchParams({
        lat: String(config.latitude),
        lon: String(config.longitude),
        units: config.units,
        city: config.cityName,
      });
      if (config.testAlert) {
        query.set('testAlert', 'true');
      }
      const res = await fetch(`/api/weather?${query.toString()}`);
      if (!res.ok) throw new Error('Weather fetch failed');
      const data: WeatherData = await res.json();
      setWeather(data);
      setError(null);
    } catch (err: any) {
      console.warn('Weather error:', err);
      setError('Weather currently unavailable');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const intervalMinutes = Math.max(5, config.refreshIntervalMinutes || 30);
    const interval = setInterval(fetchWeather, intervalMinutes * 60 * 1000);
    return () => clearInterval(interval);
  }, [config.latitude, config.longitude, config.units, config.cityName, config.refreshIntervalMinutes, config.testAlert]);

  if (loading && !weather) {
    return (
      <div className="flex items-center gap-3 text-white/70 animate-pulse text-kiosk-shadow">
        <div className="w-10 h-10 rounded-full bg-white/20" />
        <div>
          <div className="w-16 h-6 bg-white/20 rounded" />
          <div className="w-24 h-4 bg-white/10 rounded mt-1" />
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="text-white/60 text-sm text-kiosk-shadow">
        Weather unavailable ({config.cityName})
      </div>
    );
  }

  const activeAlert: WeatherAlert | null =
    weather.activeAlert || (weather.alerts && weather.alerts.length > 0 ? weather.alerts[0] : null);

  return (
    <div className="flex flex-col text-white select-none relative">
      {/* High-Contrast Active Weather Alert Indicator Banner */}
      {activeAlert && (
        <div className="mb-2.5">
          <button
            type="button"
            onClick={() => setShowAlertModal(true)}
            className="w-full group flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 border-2 border-amber-200 transition-all hover:scale-[1.01] active:scale-98 animate-pulse text-left cursor-pointer"
            title="Active Weather Alert - Click to view warning details"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-slate-950 text-amber-300 text-[10px] uppercase font-black tracking-wider shrink-0 shadow flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                Alert
              </span>
              <span className="font-extrabold text-slate-950 text-xs truncate">
                {activeAlert.event}
              </span>
            </div>
            <span className="text-[10px] font-bold bg-slate-950/10 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 text-slate-900 group-hover:bg-slate-950/20">
              <span>View</span>
              <Info className="w-3 h-3" />
            </span>
          </button>
        </div>
      )}

      {/* Current Conditions Block */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <WeatherIcon icon={weather.icon} className="w-12 h-12 md:w-16 md:h-16 drop-shadow-md" />
          <div>
            <div className="flex items-baseline gap-1 text-kiosk-shadow">
              <span className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight">
                {weather.temp}
              </span>
              <span className="text-2xl md:text-3xl font-light text-white/80">
                {weather.tempUnit}
              </span>
            </div>
            <div className="text-sm md:text-base font-medium text-white/90 text-kiosk-shadow flex items-center gap-2">
              <span>{weather.condition}</span>
              {activeAlert && (
                <button
                  type="button"
                  onClick={() => setShowAlertModal(true)}
                  className="px-2 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md border border-white/60 transition-all active:scale-95 flex items-center gap-1"
                >
                  <AlertTriangle className="w-2.5 h-2.5 fill-slate-950" />
                  <span>Alert</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-right text-xs md:text-sm text-white/80 space-y-1 text-kiosk-shadow pt-1">
          <div className="flex items-center justify-end gap-1.5">
            <span className="font-semibold text-white truncate max-w-[130px]">
              {weather.city}
            </span>
            {activeAlert && (
              <span
                onClick={() => setShowAlertModal(true)}
                className="cursor-pointer px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-0.5 shrink-0 hover:bg-amber-300 transition-colors"
                title="Active Weather Alert"
              >
                <AlertTriangle className="w-2.5 h-2.5 fill-black" />
                Alert
              </span>
            )}
          </div>
          <div className="flex items-center justify-end gap-1 text-sky-300">
            <Droplets className="w-3.5 h-3.5" />
            <span>{weather.humidity}%</span>
          </div>
          <div className="flex items-center justify-end gap-1 text-teal-300">
            <Wind className="w-3.5 h-3.5" />
            <span>{weather.windSpeed} {weather.windUnit}</span>
          </div>
        </div>
      </div>

      {/* 5-Day Forecast Row */}
      {config.show5Day && weather.daily && weather.daily.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/15 grid grid-cols-5 gap-2 text-center text-kiosk-shadow">
          {weather.daily.slice(0, 5).map((day, idx) => (
            <div 
              key={day.date || idx} 
              className="flex flex-col items-center bg-black/25 backdrop-blur-sm rounded-lg py-1.5 px-1 border border-white/10"
            >
              <span className="text-xs font-semibold text-white/90">
                {day.dayName}
              </span>
              <div className="my-1">
                <WeatherIcon icon={day.icon} className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="text-xs font-medium text-white flex items-center justify-center gap-1">
                <span>{day.maxTemp}°</span>
                <span className="text-white/50 text-[11px]">{day.minTemp}°</span>
              </div>
              {day.precipitationProb > 15 && (
                <span className="text-[10px] text-sky-300 font-medium mt-0.5">
                  {day.precipitationProb}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Active Weather Alert Detail Modal */}
      {showAlertModal && activeAlert && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-text"
          onClick={() => setShowAlertModal(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 text-white shadow-2xl shadow-amber-500/20"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-black shrink-0">
                  <AlertTriangle className="w-6 h-6 fill-slate-950 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
                      Active Weather Alert
                    </span>
                    <span className="text-xs text-white/60 font-medium">
                      {activeAlert.source || 'Met Office'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-white mt-1 leading-snug">
                    {activeAlert.event}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAlertModal(false)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Details Body */}
            <div className="space-y-4">
              {activeAlert.headline && (
                <div className="p-3.5 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-200 text-xs font-semibold leading-relaxed">
                  {activeAlert.headline}
                </div>
              )}

              {activeAlert.description && (
                <div>
                  <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-white/50 mb-1.5">
                    Warning Details
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed bg-black/40 p-3.5 rounded-2xl border border-white/10">
                    {activeAlert.description}
                  </p>
                </div>
              )}

              {activeAlert.instruction && (
                <div>
                  <h4 className="text-[11px] uppercase tracking-wider font-extrabold text-white/50 mb-1.5">
                    Recommended Action & Safety Advice
                  </h4>
                  <p className="text-xs text-emerald-300 leading-relaxed bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-500/30">
                    {activeAlert.instruction}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 text-[11px]">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-white/40 block text-[10px] uppercase font-bold">Effective</span>
                  <span className="font-semibold text-white">{activeAlert.effective || 'Active Now'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-white/40 block text-[10px] uppercase font-bold">Expires</span>
                  <span className="font-semibold text-white">{activeAlert.expires || 'Until warning lifted'}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-white/50">
                Region: {weather.city}
              </span>
              <button
                type="button"
                onClick={() => setShowAlertModal(false)}
                className="px-5 py-2 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-slate-200 transition-all shadow-md active:scale-95"
              >
                Acknowledge & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
