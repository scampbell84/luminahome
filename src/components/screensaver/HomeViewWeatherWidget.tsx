import React, { useState } from 'react';
import { WeatherData, WeatherAlert } from '../../types/config';
import { WeatherIcon } from '../widgets/WeatherIcon';
import {
  Thermometer,
  Droplets,
  CalendarDays,
  Wind,
  MapPin,
  ArrowUp,
  ArrowDown,
  Gauge,
  CloudRain,
  Sparkles,
  AlertTriangle,
  X,
  Info,
} from 'lucide-react';

export type WeatherWidgetTab = 'current' | 'humidity' | 'forecast';

interface HomeViewWeatherWidgetProps {
  weather: WeatherData | null;
  initialTab?: WeatherWidgetTab;
  isNightMode?: boolean;
  onTabChange?: (tab: WeatherWidgetTab) => void;
  className?: string;
  showTitle?: boolean;
}

export const HomeViewWeatherWidget: React.FC<HomeViewWeatherWidgetProps> = ({
  weather,
  initialTab = 'current',
  isNightMode = false,
  onTabChange,
  className = '',
  showTitle = true,
}) => {
  const [activeTab, setActiveTab] = useState<WeatherWidgetTab>(initialTab);
  const [showAlertDetails, setShowAlertDetails] = useState<boolean>(false);

  const handleSelectTab = (tab: WeatherWidgetTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  if (!weather) {
    return (
      <div className={`p-8 rounded-[2rem] apple-glass-card apple-glass-sheen text-center text-white/50 font-apple-rounded ${className}`}>
        <div className="w-10 h-10 mx-auto rounded-full bg-white/10 animate-pulse mb-3" />
        <p className="text-sm font-semibold text-white/80">Updating live weather...</p>
        <p className="text-xs text-white/50 mt-1">Connecting to Open-Meteo forecast station</p>
      </div>
    );
  }

  const activeAlert: WeatherAlert | null =
    weather.activeAlert || (weather.alerts && weather.alerts.length > 0 ? weather.alerts[0] : null);

  // Today and next 3 days forecast data
  const dailyList = weather.daily || [];
  const todayForecast = dailyList[0] || null;
  const threeDayForecast = dailyList.slice(0, 3);

  // Comfort status based on relative humidity
  const getHumidityComfort = (humidity: number) => {
    if (humidity < 35) {
      return { label: 'Dry & Crisp Air', desc: 'Low moisture level', badgeColor: 'text-amber-300 border-amber-400/30 bg-amber-400/10' };
    }
    if (humidity <= 65) {
      return { label: 'Ideal & Comfortable', desc: 'Optimal ambient moisture', badgeColor: 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10' };
    }
    if (humidity <= 80) {
      return { label: 'Humid & Muggy', desc: 'High moisture atmosphere', badgeColor: 'text-sky-300 border-sky-400/30 bg-sky-400/10' };
    }
    return { label: 'Very High Humidity', desc: 'Precipitation likely', badgeColor: 'text-cyan-300 border-cyan-400/30 bg-cyan-400/10' };
  };

  const humidityInfo = getHumidityComfort(weather.humidity);

  // Calculate position percentage of current temp within today's min and max
  const minT = todayForecast ? todayForecast.minTemp : Math.round(weather.temp - 4);
  const maxT = todayForecast ? todayForecast.maxTemp : Math.round(weather.temp + 4);
  const tempRange = Math.max(1, maxT - minT);
  const tempProgress = Math.min(100, Math.max(0, Math.round(((weather.temp - minT) / tempRange) * 100)));

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`rounded-[2rem] apple-glass-card apple-glass-sheen p-6 flex flex-col justify-between transition-all duration-300 select-none ${
        isNightMode ? 'apple-glass-crimson text-red-200' : 'text-white'
      } ${className}`}
    >
      {/* 1. Header with Segmented Toggle Pill Bar & High-Contrast Alert Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        {showTitle && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest font-extrabold font-apple-rounded text-white/50">
              Weather Widget
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-xs font-bold font-apple-rounded text-white/90">
              <MapPin className="w-3 h-3 text-sky-400" />
              <span className="truncate max-w-[140px]">{weather.city}</span>
            </div>

            {/* High-Contrast Alert Indicator Badge */}
            {activeAlert && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAlertDetails(!showAlertDetails);
                }}
                className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs font-apple-rounded uppercase tracking-wider shadow-lg shadow-amber-500/30 border-2 border-amber-200 transition-all active:scale-95 animate-pulse"
                title="Active Weather Alert - Tap to view details"
              >
                <AlertTriangle className="w-3.5 h-3.5 fill-black stroke-amber-400 shrink-0" />
                <span>Alert</span>
                <span className="hidden md:inline font-bold normal-case text-slate-900 text-[11px] truncate max-w-[130px]">
                  : {activeAlert.event}
                </span>
              </button>
            )}
          </div>
        )}

        {/* 3-Way Toggle Pills: Current Temp, Humidity, 3-Day Forecast */}
        <div className="flex items-center gap-1 p-1 rounded-full apple-glass-pill self-end sm:self-auto bg-black/30 border border-white/15">
          <button
            type="button"
            onClick={(e) => handleSelectTab('current', e)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold font-apple-rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'current'
                ? isNightMode
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-white text-slate-950 shadow-md scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title="Current Temperature & Conditions"
          >
            <Thermometer className="w-3.5 h-3.5" />
            <span>Current Temp</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleSelectTab('humidity', e)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold font-apple-rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'humidity'
                ? isNightMode
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-white text-slate-950 shadow-md scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title="Humidity & Moisture Gauge"
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Humidity</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleSelectTab('forecast', e)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold font-apple-rounded transition-all flex items-center gap-1.5 ${
              activeTab === 'forecast'
                ? isNightMode
                  ? 'bg-red-500 text-white shadow-lg'
                  : 'bg-white text-slate-950 shadow-md scale-105'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
            title="3-Day Weather Forecast"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>3-Day Forecast</span>
          </button>
        </div>
      </div>

      {/* Active Alert Details Dropdown Drawer */}
      {activeAlert && showAlertDetails && (
        <div className="mt-3 p-4 rounded-2xl bg-amber-400/20 border-2 border-amber-400/80 text-white animate-in fade-in space-y-2 select-text shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
                {activeAlert.source || 'Met Office'}
              </span>
              <h4 className="text-xs font-black text-amber-300 tracking-wide">{activeAlert.event}</h4>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAlertDetails(false);
              }}
              className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80"
              title="Close Alert Details"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-white/95 leading-relaxed font-apple-rounded">
            {activeAlert.description || activeAlert.headline}
          </p>
          {activeAlert.instruction && (
            <p className="text-[11px] text-emerald-300 font-semibold bg-emerald-950/50 p-2.5 rounded-xl border border-emerald-400/30">
              💡 {activeAlert.instruction}
            </p>
          )}
          <div className="flex items-center justify-between text-[10px] text-white/70 pt-1.5 border-t border-white/10">
            <span>Effective: {activeAlert.effective || 'Active Now'}</span>
            <span>Expires: {activeAlert.expires || 'Until lifted'}</span>
          </div>
        </div>
      )}

      {/* 2. Main Content Body - Tab Switching */}
      <div className="py-5 flex-1 flex flex-col justify-center">
        {/* VIEW 1: CURRENT TEMPERATURE */}
        {activeTab === 'current' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Primary Temp & Condition Banner */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl md:text-7xl font-black font-apple-rounded tracking-tight leading-none bg-gradient-to-b from-white via-white to-slate-200 bg-clip-text text-transparent drop-shadow-md">
                    {Math.round(weather.temp)}°
                  </span>
                  <span className="text-3xl md:text-4xl font-extrabold font-apple-rounded text-white/70">
                    {weather.tempUnit}
                  </span>
                </div>
                <div className="text-base md:text-lg font-bold font-apple-rounded text-white/90 mt-1 capitalize flex items-center gap-2 flex-wrap">
                  <span>{weather.condition}</span>
                  {activeAlert && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAlertDetails(true);
                      }}
                      className="px-2.5 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider shadow-md border border-white/50 flex items-center gap-1 active:scale-95"
                    >
                      <AlertTriangle className="w-3 h-3 fill-slate-950" />
                      <span>Alert</span>
                    </button>
                  )}
                  <span className="text-white/40">•</span>
                  <span className="text-sm font-semibold text-white/70">{weather.city}</span>
                </div>
              </div>

              <div className="p-4 rounded-3xl apple-glass-pill shadow-xl bg-white/10 border border-white/20">
                <WeatherIcon icon={weather.icon || 'sun'} className="w-16 h-16 text-amber-300 drop-shadow-[0_0_16px_rgba(251,191,36,0.5)]" />
              </div>
            </div>

            {/* Apple Weather Style Today's High / Low Range Slider */}
            {todayForecast && (
              <div className="p-3.5 rounded-2xl apple-glass-card border-white/15 bg-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold font-apple-rounded text-white/80">
                  <span className="flex items-center gap-1 text-sky-300">
                    <ArrowDown className="w-3.5 h-3.5" />
                    <span>Low {Math.round(todayForecast.minTemp)}°</span>
                  </span>
                  <span className="text-white/60 uppercase tracking-wider text-[10px]">Today's Spectrum</span>
                  <span className="flex items-center gap-1 text-amber-300">
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span>High {Math.round(todayForecast.maxTemp)}°</span>
                  </span>
                </div>

                {/* Gradient Range Capsule Bar */}
                <div className="relative w-full h-2.5 rounded-full bg-slate-800/80 overflow-hidden shadow-inner border border-white/10">
                  <div className="absolute inset-0 bg-gradient-to-r from-sky-400 via-teal-400 to-amber-400 rounded-full" />
                  {/* Current temp pin indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-2.5 bg-white rounded-full shadow-[0_0_8px_#ffffff] -translate-x-1/2 border border-slate-900"
                    style={{ left: `${tempProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Micro Details Capsule Bar */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-2xl apple-glass-pill flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Feels Like</span>
                <span className="text-sm font-extrabold font-apple-rounded text-white mt-0.5">
                  {Math.round(weather.apparentTemp)}°{weather.tempUnit}
                </span>
              </div>

              <div className="p-2.5 rounded-2xl apple-glass-pill flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Humidity</span>
                <span className="text-sm font-extrabold font-apple-rounded text-sky-300 mt-0.5 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" />
                  <span>{weather.humidity}%</span>
                </span>
              </div>

              <div className="p-2.5 rounded-2xl apple-glass-pill flex flex-col items-center justify-center text-center">
                <span className="text-[10px] uppercase font-bold text-white/50 tracking-wider">Wind</span>
                <span className="text-sm font-extrabold font-apple-rounded text-teal-300 mt-0.5 flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5" />
                  <span>{weather.windSpeed} {weather.windUnit}</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: HUMIDITY & AIR ATMOSPHERE */}
        {activeTab === 'humidity' && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-widest font-extrabold font-apple-rounded text-sky-400 block mb-1">
                  Relative Humidity Level
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl md:text-7xl font-black font-apple-rounded tracking-tight leading-none bg-gradient-to-b from-sky-200 via-cyan-300 to-teal-400 bg-clip-text text-transparent drop-shadow-md">
                    {weather.humidity}%
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-3xl apple-glass-pill bg-sky-500/10 border border-sky-400/30 text-sky-300 shadow-xl">
                <Droplets className="w-14 h-14 drop-shadow-[0_0_20px_rgba(56,189,248,0.5)]" />
              </div>
            </div>

            {/* Humidity Comfort Status Banner */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${humidityInfo.badgeColor}`}>
              <div className="flex items-center gap-2.5">
                <Gauge className="w-5 h-5 shrink-0" />
                <div>
                  <h5 className="text-xs font-extrabold font-apple-rounded">{humidityInfo.label}</h5>
                  <p className="text-[11px] opacity-80 font-medium">{humidityInfo.desc} for {weather.city}</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-black/30 border border-white/10">
                {weather.humidity}%
              </span>
            </div>

            {/* Apple Style Moisture Progress Gauge */}
            <div className="p-3.5 rounded-2xl apple-glass-card border-white/15 bg-white/5 space-y-2">
              <div className="flex justify-between items-center text-[11px] font-bold font-apple-rounded text-white/60">
                <span>0% Dry</span>
                <span>50% Optimal</span>
                <span>100% Saturated</span>
              </div>

              <div className="relative w-full h-3 rounded-full bg-slate-900/80 overflow-hidden border border-white/10 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                  style={{ width: `${Math.min(100, Math.max(0, weather.humidity))}%` }}
                />
              </div>
            </div>

            {/* Atmospheric Insights Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-2xl apple-glass-pill flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0">
                  <CloudRain className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/50 block">Rain Probability</span>
                  <span className="text-xs font-extrabold text-white">
                    {todayForecast?.precipitationProb ?? weather.precipitationProb ?? 0}% Chance
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl apple-glass-pill flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0">
                  <Thermometer className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/50 block">Dew Point / Feel</span>
                  <span className="text-xs font-extrabold text-white">
                    {Math.round(weather.apparentTemp)}°{weather.tempUnit} Perceived
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: 3-DAY FORECAST */}
        {activeTab === 'forecast' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-widest font-extrabold font-apple-rounded text-sky-400 block">
                  3-Day Outlook
                </span>
                <h4 className="text-lg md:text-xl font-bold font-apple-rounded text-white mt-0.5">
                  Daily Forecast for {weather.city}
                </h4>
              </div>
              <div className="apple-glass-pill px-3 py-1 rounded-full text-xs font-bold text-white/80 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-sky-400" />
                <span>Next 3 Days</span>
              </div>
            </div>

            {/* 3 Prominent Rounded-Glass Forecast Cards */}
            <div className="grid grid-cols-3 gap-3">
              {threeDayForecast.map((day, idx) => {
                const isFirst = idx === 0;
                return (
                  <div
                    key={day.date || idx}
                    className={`rounded-2xl p-3.5 flex flex-col items-center text-center justify-between transition-all group ${
                      isFirst
                        ? 'apple-glass-card border-sky-400/40 bg-gradient-to-b from-sky-500/10 to-transparent shadow-lg'
                        : 'apple-glass-card border-white/15 hover:border-white/30'
                    }`}
                  >
                    {/* Day label */}
                    <div className="w-full">
                      <span className="text-xs font-extrabold font-apple-rounded text-white block truncate">
                        {day.dayName}
                      </span>
                      <span className="text-[10px] font-medium font-apple-rounded text-white/50 block">
                        {day.date ? day.date.slice(5) : ''}
                      </span>
                    </div>

                    {/* Weather Icon with glowing backdrop */}
                    <div className="my-2.5 p-2 rounded-2xl apple-glass-pill group-hover:scale-110 transition-transform">
                      <WeatherIcon
                        icon={day.icon || 'sun'}
                        className="w-8 h-8 md:w-10 md:h-10 text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                      />
                    </div>

                    {/* Condition Summary */}
                    <span className="text-[11px] font-semibold font-apple-rounded text-white/80 line-clamp-1 mb-1.5">
                      {day.condition}
                    </span>

                    {/* Rain probability badge */}
                    {day.precipitationProb > 10 ? (
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 mb-2 flex items-center gap-1">
                        <Droplets className="w-2.5 h-2.5" />
                        <span>{day.precipitationProb}%</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-white/40 mb-2 font-mono">0% rain</span>
                    )}

                    {/* Temperature Range Bar */}
                    <div className="w-full pt-2 border-t border-white/10 flex items-center justify-between text-xs font-bold font-apple-rounded">
                      <span className="text-sky-300">{Math.round(day.minTemp)}°</span>
                      <div className="flex-1 mx-2 h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-amber-400" />
                      <span className="text-white">{Math.round(day.maxTemp)}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer Bar */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50 font-apple-rounded">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Tap tabs to switch between Temp, Humidity & 3-Day Forecast</span>
        </span>
        <span className="font-mono text-white/70">
          Metric ({weather.tempUnit})
        </span>
      </div>
    </div>
  );
};
