import React, { useState, useMemo, useEffect } from 'react';
import { WeatherData, DetailedDailyForecast, HourlyPoint } from '../../types/config';
import { WeatherIcon } from '../widgets/WeatherIcon';
import { X, Cloud, Droplets, ArrowUp, ArrowDown, Info } from 'lucide-react';

interface WeatherDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  weather: WeatherData;
  initialDayIndex?: number;
}

export const WeatherDetailsModal: React.FC<WeatherDetailsModalProps> = ({
  isOpen,
  onClose,
  weather,
  initialDayIndex = 0,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(initialDayIndex);
  const [tempMode, setTempMode] = useState<'actual' | 'feels_like'>('actual');
  const [activeScrubHour, setActiveScrubHour] = useState<number | null>(null);

  // Sync initialDayIndex if changed externally
  useEffect(() => {
    if (isOpen) {
      setSelectedDayIndex(Math.min(initialDayIndex, (weather.daily?.length || 1) - 1));
      setActiveScrubHour(null);
    }
  }, [isOpen, initialDayIndex, weather.daily?.length]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const days: DetailedDailyForecast[] = weather.daily || [];
  const selectedDay: DetailedDailyForecast = days[selectedDayIndex] || days[0];
  const hourlyData: HourlyPoint[] = selectedDay?.hourly || [];

  const isToday = selectedDayIndex === 0;
  const currentHour = new Date().getHours();

  // Day formatted header (e.g. "Thursday, 22 October 2026")
  const fullDateTitle = useMemo(() => {
    if (!selectedDay?.date) return 'Weather Details';
    try {
      const d = new Date(selectedDay.date + 'T00:00:00');
      return d.toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDay.dayName;
    }
  }, [selectedDay?.date, selectedDay?.dayName]);

  // Hourly min & max for temperature chart scaling
  const { minGraphTemp, maxGraphTemp, yTicks } = useMemo(() => {
    if (hourlyData.length === 0) {
      return { minGraphTemp: 0, maxGraphTemp: 25, yTicks: [0, 5, 10, 15, 20] };
    }
    const temps = hourlyData.map((h) => (tempMode === 'actual' ? h.temp : h.apparentTemp));
    const minVal = Math.min(...temps);
    const maxVal = Math.max(...temps);
    // Align to 5-degree increments with margin
    const roundedMin = Math.floor((minVal - 2) / 5) * 5;
    const roundedMax = Math.ceil((maxVal + 3) / 5) * 5;

    const ticks: number[] = [];
    for (let t = roundedMax; t >= roundedMin; t -= 5) {
      ticks.push(t);
    }
    return { minGraphTemp: roundedMin, maxGraphTemp: roundedMax, yTicks: ticks };
  }, [hourlyData, tempMode]);

  // Calculate High (H) and Low (L) hour points for labels
  const { highPoint, lowPoint } = useMemo(() => {
    if (hourlyData.length === 0) return { highPoint: null, lowPoint: null };
    let highIdx = 0;
    let lowIdx = 0;
    hourlyData.forEach((h, idx) => {
      const val = tempMode === 'actual' ? h.temp : h.apparentTemp;
      const curHigh = tempMode === 'actual' ? hourlyData[highIdx].temp : hourlyData[highIdx].apparentTemp;
      const curLow = tempMode === 'actual' ? hourlyData[lowIdx].temp : hourlyData[lowIdx].apparentTemp;
      if (val > curHigh) highIdx = idx;
      if (val < curLow) lowIdx = idx;
    });
    return { highPoint: highIdx, lowPoint: lowIdx };
  }, [hourlyData, tempMode]);

  // SVG Spline Math (ViewBox: 0 0 1000 200)
  const chartWidth = 920;
  const chartHeight = 160;
  const paddingX = 40;
  const paddingTop = 30;
  const paddingBottom = 25;
  const innerHeight = chartHeight - paddingTop - paddingBottom;
  const innerWidth = chartWidth - paddingX * 2;

  const points = useMemo(() => {
    if (hourlyData.length === 0) return [];
    const count = hourlyData.length;
    const tempRange = Math.max(1, maxGraphTemp - minGraphTemp);

    return hourlyData.map((h, i) => {
      const val = tempMode === 'actual' ? h.temp : h.apparentTemp;
      const x = paddingX + (i / (count - 1)) * innerWidth;
      const y = paddingTop + innerHeight - ((val - minGraphTemp) / tempRange) * innerHeight;
      return { x, y, hour: h.hour, val, point: h };
    });
  }, [hourlyData, tempMode, minGraphTemp, maxGraphTemp, innerWidth, innerHeight]);

  // Build SVG cubic spline path
  const { splinePath, areaPath, pastSplinePath, futureSplinePath } = useMemo(() => {
    if (points.length === 0) {
      return { splinePath: '', areaPath: '', pastSplinePath: '', futureSplinePath: '' };
    }

    const dParts: string[] = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      dParts.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
    }

    const fullSpline = dParts.join(' ');
    const lastP = points[points.length - 1];
    const firstP = points[0];
    const baselineY = paddingTop + innerHeight;
    const fullArea = `${fullSpline} L ${lastP.x} ${baselineY} L ${firstP.x} ${baselineY} Z`;

    // If today, split into past (dotted) and future (solid)
    let pastPath = '';
    let futurePath = '';
    if (isToday) {
      const nowIdx = points.findIndex((p) => p.hour >= currentHour);
      if (nowIdx > 0) {
        pastPath = `M ${points[0].x} ${points[0].y}`;
        for (let i = 0; i < nowIdx; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          pastPath += ` L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
        }

        futurePath = `M ${points[nowIdx].x} ${points[nowIdx].y}`;
        for (let i = nowIdx; i < points.length - 1; i++) {
          const p1 = points[i];
          const p2 = points[i + 1];
          futurePath += ` L ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
        }
      } else {
        futurePath = fullSpline;
      }
    } else {
      futurePath = fullSpline;
    }

    return {
      splinePath: fullSpline,
      areaPath: fullArea,
      pastSplinePath: pastPath,
      futureSplinePath: futurePath,
    };
  }, [points, isToday, currentHour]);

  // Precipitation SVG Points & Path
  const precipPoints = useMemo(() => {
    if (hourlyData.length === 0) return [];
    const count = hourlyData.length;
    return hourlyData.map((h, i) => {
      const prob = h.precipitationProb; // 0 to 100
      const x = paddingX + (i / (count - 1)) * innerWidth;
      const y = paddingTop + innerHeight - (prob / 100) * innerHeight;
      return { x, y, prob, h };
    });
  }, [hourlyData, innerWidth, innerHeight]);

  const precipAreaPath = useMemo(() => {
    if (precipPoints.length === 0) return '';
    const dParts: string[] = [`M ${precipPoints[0].x} ${precipPoints[0].y}`];
    for (let i = 0; i < precipPoints.length - 1; i++) {
      const p1 = precipPoints[i];
      const p2 = precipPoints[i + 1];
      const midX = (p1.x + p2.x) / 2;
      dParts.push(`C ${midX.toFixed(1)} ${p1.y.toFixed(1)}, ${midX.toFixed(1)} ${p2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
    }
    const lastP = precipPoints[precipPoints.length - 1];
    const firstP = precipPoints[0];
    const baselineY = paddingTop + innerHeight;
    return `${dParts.join(' ')} L ${lastP.x} ${baselineY} L ${firstP.x} ${baselineY} Z`;
  }, [precipPoints]);

  const hasAnyPrecipitation = useMemo(() => {
    return hourlyData.some((h) => h.precipitationProb > 0);
  }, [hourlyData]);

  // Display temperature for hero header (follows scrub hour if user taps chart)
  const displayPoint = activeScrubHour !== null ? hourlyData[activeScrubHour] : isToday ? hourlyData[currentHour] || hourlyData[0] : hourlyData[12] || hourlyData[0];
  const displayTemp = displayPoint ? (tempMode === 'actual' ? displayPoint.temp : displayPoint.apparentTemp) : selectedDay?.maxTemp;
  const displayIcon = displayPoint?.icon || selectedDay?.icon || 'cloud-sun';

  // Daily Comparison Prose
  const comparisonText = useMemo(() => {
    if (selectedDay?.yesterdayMaxTemp === undefined) {
      return 'Temperature levels are typical for this time of year.';
    }
    const diff = selectedDay.maxTemp - selectedDay.yesterdayMaxTemp;
    if (Math.abs(diff) <= 1) {
      return 'The high temperature today is similar to yesterday.';
    } else if (diff > 1) {
      return `The high temperature today is ${diff}° higher than yesterday.`;
    } else {
      return `The high temperature today is ${Math.abs(diff)}° cooler than yesterday.`;
    }
  }, [selectedDay?.maxTemp, selectedDay?.yesterdayMaxTemp]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detailed Weather Conditions"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-4 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] bg-slate-950/95 text-white rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================ */}
        {/* HEADER BAR                                                  */}
        {/* ============================================================ */}
        <div className="shrink-0 px-4 pt-4 pb-2 border-b border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/80 hover:text-white transition-all flex items-center justify-center cursor-pointer"
            title="Close detailed weather overlay"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-white/90" />
            <h2 className="text-sm font-bold tracking-wide text-white">Conditions</h2>
          </div>

          <div className="w-8" />
        </div>

        {/* ============================================================ */}
        {/* DAY SELECTOR STRIP (Apple Weather Style)                     */}
        {/* ============================================================ */}
        <div className="shrink-0 px-3 pt-3 pb-2 border-b border-white/5 bg-slate-900/40">
          <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none px-1">
            {days.slice(0, 8).map((dayItem, idx) => {
              const isSelected = selectedDayIndex === idx;
              const isCurrentDay = idx === 0;
              return (
                <button
                  key={dayItem.date || idx}
                  type="button"
                  onClick={() => {
                    setSelectedDayIndex(idx);
                    setActiveScrubHour(null);
                  }}
                  className="flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all cursor-pointer group"
                >
                  <span className={`text-[11px] font-medium transition-colors ${
                    isSelected ? 'text-white font-bold' : isCurrentDay ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}>
                    {dayItem.dayInitial || (dayItem.dayName ? dayItem.dayName[0] : '')}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all font-mono ${
                      isSelected
                        ? 'bg-sky-400 text-slate-950 font-black shadow-md shadow-sky-400/30 scale-105'
                        : isCurrentDay
                        ? 'text-sky-400 font-bold border border-sky-400/50 group-hover:bg-white/10'
                        : 'text-slate-300 font-medium group-hover:bg-white/10'
                    }`}
                  >
                    {dayItem.dayNum || (dayItem.date ? parseInt(dayItem.date.slice(-2), 10) : idx + 1)}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs text-slate-300 font-medium mt-1">
            {fullDateTitle}
          </p>
        </div>

        {/* ============================================================ */}
        {/* SCROLLABLE DETAIL BODY                                       */}
        {/* ============================================================ */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4 space-y-5">
          {/* Hero Temperature & Condition */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-4xl sm:text-5xl font-light tracking-tight text-white font-mono">
                  {displayTemp !== undefined ? `${displayTemp}°` : '--'}
                </span>
                <WeatherIcon icon={displayIcon} className="w-10 h-10 sm:w-12 sm:h-12 drop-shadow-md" />
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-medium">
                <span>H:{selectedDay?.maxTemp}°</span>
                <span>L:{selectedDay?.minTemp}°</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300 font-semibold">{displayPoint?.condition || selectedDay?.condition}</span>
                {activeScrubHour !== null && (
                  <span className="text-sky-400 font-mono">({displayPoint?.hourLabel})</span>
                )}
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-mono tracking-wider">
                {weather.tempUnit === '°F' ? 'Fahrenheit (°F)' : 'Celsius (°C)'}
              </span>
              <p className="text-xs text-slate-500 font-medium">{weather.city}</p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* HOURLY TEMPERATURE SPLINE CHART (SVG)                        */}
          {/* ============================================================ */}
          <div className="bg-slate-900/60 rounded-2xl p-3 border border-white/10">
            {/* Hour Condition Icons Row */}
            <div className="grid grid-cols-8 text-center px-6 mb-1">
              {[0, 3, 6, 9, 12, 15, 18, 21].map((hIdx) => {
                const pt = hourlyData[hIdx];
                return (
                  <div key={hIdx} className="flex flex-col items-center gap-0.5">
                    {pt ? (
                      <WeatherIcon icon={pt.icon} className="w-3.5 h-3.5 opacity-80" />
                    ) : (
                      <div className="w-3.5 h-3.5" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Responsive SVG Chart */}
            <div className="relative w-full h-40">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full overflow-visible"
              >
                <defs>
                  <linearGradient id="appleTempGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                    <stop offset="60%" stopColor="#0284c7" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Gridlines & Y-Axis Labels */}
                {yTicks.map((tickVal) => {
                  const tempRange = Math.max(1, maxGraphTemp - minGraphTemp);
                  const y = paddingTop + innerHeight - ((tickVal - minGraphTemp) / tempRange) * innerHeight;
                  return (
                    <g key={tickVal}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray={tickVal === 0 ? '0' : '4 4'}
                        strokeWidth={tickVal === 0 ? '1.5' : '1'}
                      />
                      <text
                        x={chartWidth - paddingX + 8}
                        y={y + 3}
                        fill="rgba(255,255,255,0.4)"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {tickVal}°
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Hour Guidelines at 00, 06, 12, 18 */}
                {[0, 6, 12, 18].map((h) => {
                  const x = paddingX + (h / 23) * innerWidth;
                  return (
                    <line
                      key={h}
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={paddingTop + innerHeight}
                      stroke="rgba(255,255,255,0.06)"
                      strokeDasharray="2 4"
                    />
                  );
                })}

                {/* Gradient Area Fill */}
                {areaPath && (
                  <path d={areaPath} fill="url(#appleTempGradient)" />
                )}

                {/* Dotted Past Segment (if today) */}
                {pastSplinePath && (
                  <path
                    d={pastSplinePath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                )}

                {/* Solid Future / Normal Spline Curve */}
                {futureSplinePath && (
                  <path
                    d={futureSplinePath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="drop-shadow-[0_2px_8px_rgba(56,189,248,0.4)]"
                  />
                )}

                {/* High Point Marker */}
                {highPoint !== null && points[highPoint] && (
                  <g>
                    <circle
                      cx={points[highPoint].x}
                      cy={points[highPoint].y}
                      r="3.5"
                      fill="#ffffff"
                      stroke="#38bdf8"
                      strokeWidth="2"
                    />
                    <text
                      x={points[highPoint].x}
                      y={points[highPoint].y - 8}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      H
                    </text>
                  </g>
                )}

                {/* Low Point Marker */}
                {lowPoint !== null && points[lowPoint] && (
                  <g>
                    <circle
                      cx={points[lowPoint].x}
                      cy={points[lowPoint].y}
                      r="3.5"
                      fill="#ffffff"
                      stroke="#0284c7"
                      strokeWidth="2"
                    />
                    <text
                      x={points[lowPoint].x}
                      y={points[lowPoint].y - 8}
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      L
                    </text>
                  </g>
                )}

                {/* Current Hour Indicator (if today) */}
                {isToday && points[currentHour] && (
                  <g>
                    <circle
                      cx={points[currentHour].x}
                      cy={points[currentHour].y}
                      r="5"
                      fill="#38bdf8"
                      className="animate-pulse"
                    />
                    <circle
                      cx={points[currentHour].x}
                      cy={points[currentHour].y}
                      r="2"
                      fill="#ffffff"
                    />
                  </g>
                )}

                {/* Interactive Scrub Hover Point */}
                {activeScrubHour !== null && points[activeScrubHour] && (
                  <g>
                    <line
                      x1={points[activeScrubHour].x}
                      y1={paddingTop}
                      x2={points[activeScrubHour].x}
                      y2={paddingTop + innerHeight}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={points[activeScrubHour].x}
                      cy={points[activeScrubHour].y}
                      r="6"
                      fill="#38bdf8"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </g>
                )}
              </svg>

              {/* Click / Touch overlay for scrubber */}
              <div className="absolute inset-0 flex">
                {hourlyData.map((_, hIdx) => (
                  <button
                    key={hIdx}
                    type="button"
                    onClick={() => setActiveScrubHour(hIdx)}
                    className="flex-1 h-full cursor-pointer hover:bg-white/5 transition-colors"
                    title={`Hour ${hIdx}:00`}
                  />
                ))}
              </div>
            </div>

            {/* X-Axis Hour Labels */}
            <div className="flex justify-between px-6 pt-1 text-[10px] text-slate-400 font-mono">
              <span>00</span>
              <span>06</span>
              <span>12</span>
              <span>18</span>
              <span>23</span>
            </div>

            {/* Segmented Actual vs Feels Like Toggle */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="w-full max-w-xs mx-auto p-1 bg-white/10 rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTempMode('actual')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    tempMode === 'actual'
                      ? 'bg-white text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Actual
                </button>
                <button
                  type="button"
                  onClick={() => setTempMode('feels_like')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    tempMode === 'feels_like'
                      ? 'bg-white text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Feels Like
                </button>
              </div>

              <p className="text-center text-[11px] text-slate-400 mt-1.5">
                {tempMode === 'actual'
                  ? 'The actual temperature.'
                  : 'What the temperature feels like as a result of humidity, sunlight or wind.'}
              </p>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CHANCE OF PRECIPITATION SECTION                              */}
          {/* ============================================================ */}
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-sky-400" />
                  <span>Chance of Precipitation</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedDay?.dayName}&apos;s chance: <span className="text-sky-300 font-bold">{selectedDay?.precipitationProb}%</span>
                </p>
              </div>
              {selectedDay?.precipitationAmount !== undefined && selectedDay.precipitationAmount > 0 && (
                <span className="text-xs font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded-md border border-white/10">
                  {selectedDay.precipitationAmount} mm total
                </span>
              )}
            </div>

            {/* Precipitation Chart */}
            <div className="relative w-full h-32">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-full overflow-visible"
              >
                <defs>
                  {/* Diagonal hatched stripe pattern for 0% rain (matches Apple Weather screenshot) */}
                  <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  </pattern>

                  <linearGradient id="precipGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.15" />
                  </linearGradient>
                </defs>

                {/* Percentage Ticks (0%, 20%, 40%, 60%, 80%, 100%) */}
                {[0, 20, 40, 60, 80, 100].map((pct) => {
                  const y = paddingTop + innerHeight - (pct / 100) * innerHeight;
                  return (
                    <g key={pct}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="rgba(255,255,255,0.08)"
                        strokeDasharray={pct === 0 ? '0' : '4 4'}
                      />
                      <text
                        x={chartWidth - paddingX + 8}
                        y={y + 3}
                        fill="rgba(255,255,255,0.4)"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {pct}%
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Hour Guidelines at 00, 06, 12, 18 */}
                {[0, 6, 12, 18].map((h) => {
                  const x = paddingX + (h / 23) * innerWidth;
                  return (
                    <line
                      key={h}
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={paddingTop + innerHeight}
                      stroke="rgba(255,255,255,0.06)"
                      strokeDasharray="2 4"
                    />
                  );
                })}

                {/* If no precipitation, render Apple Weather hatched area */}
                {!hasAnyPrecipitation ? (
                  <g>
                    <rect
                      x={paddingX}
                      y={paddingTop}
                      width={innerWidth}
                      height={innerHeight}
                      fill="url(#diagonalHatch)"
                    />
                    <line
                      x1={paddingX}
                      y1={paddingTop + innerHeight}
                      x2={chartWidth - paddingX}
                      y2={paddingTop + innerHeight}
                      stroke="#0ea5e9"
                      strokeWidth="2"
                    />
                  </g>
                ) : (
                  <g>
                    {/* Filled Area Curve */}
                    {precipAreaPath && (
                      <path d={precipAreaPath} fill="url(#precipGradient)" />
                    )}
                    {/* Glowing Top Line */}
                    {precipPoints.length > 0 && (
                      <path
                        d={precipAreaPath.split(' L ')[0]}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                        className="drop-shadow-[0_2px_8px_rgba(14,165,233,0.5)]"
                      />
                    )}
                  </g>
                )}
              </svg>
            </div>

            {/* X-Axis Hour Labels */}
            <div className="flex justify-between px-6 pt-1 text-[10px] text-slate-400 font-mono">
              <span>00</span>
              <span>06</span>
              <span>12</span>
              <span>18</span>
              <span>23</span>
            </div>
          </div>

          {/* ============================================================ */}
          {/* SUMMARY CARDS (Apple Weather Screen 4)                       */}
          {/* ============================================================ */}
          <div className="space-y-3">
            {/* 1. Precipitation Totals Card */}
            <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/10 space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
                Precipitation Totals
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span>LAST 24 HOURS</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {weather.past24hPrecipitation !== undefined ? `${weather.past24hPrecipitation} mm` : '0 mm'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span>NEXT 24 HOURS</span>
                  </div>
                  <span className="font-mono font-bold text-white">
                    {weather.next24hPrecipitation !== undefined ? `${weather.next24hPrecipitation} mm` : `${selectedDay?.precipitationAmount || 0} mm`}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Forecast Summary Prose Card */}
            <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/10 space-y-2">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
                Forecast Narrative
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed">
                {selectedDay?.summaryText ||
                  `${weather.temp}° now and ${weather.condition.toLowerCase()}. Today's temperature range is from ${selectedDay?.minTemp}° to ${selectedDay?.maxTemp}°.`}
              </p>
            </div>

            {/* 3. Daily Comparison Card */}
            <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/10 space-y-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">
                Daily Comparison
              </h4>
              <p className="text-xs text-slate-300">{comparisonText}</p>

              <div className="space-y-2 pt-1">
                {/* Today range bar */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-16 text-slate-400 font-medium">Today</span>
                  <span className="font-mono text-slate-300 w-6 text-right">{selectedDay?.minTemp}°</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-teal-400 rounded-full" />
                  </div>
                  <span className="font-mono text-slate-300 w-6">{selectedDay?.maxTemp}°</span>
                </div>

                {/* Yesterday range bar */}
                {selectedDay?.yesterdayMaxTemp !== undefined && (
                  <div className="flex items-center gap-3 text-xs">
                    <span className="w-16 text-slate-400 font-medium">Yesterday</span>
                    <span className="font-mono text-slate-400 w-6 text-right">
                      {selectedDay.yesterdayMinTemp !== undefined ? `${selectedDay.yesterdayMinTemp}°` : '--'}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500/70 to-sky-500/70 rounded-full" />
                    </div>
                    <span className="font-mono text-slate-400 w-6">{selectedDay.yesterdayMaxTemp}°</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4. About Feels Like Note */}
            <div className="bg-slate-900/40 rounded-2xl p-4 border border-white/5 space-y-1 text-slate-400 text-xs">
              <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>About Feels Like Temperature</span>
              </h4>
              <p className="leading-relaxed text-[11px] text-slate-400">
                Feels Like conveys how warm or cold it feels and can be different from the actual temperature.
                The Feels Like temperature is affected by humidity, sunlight, and wind.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
