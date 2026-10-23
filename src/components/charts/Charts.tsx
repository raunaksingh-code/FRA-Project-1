import React, { useState } from 'react';
import { formatINR } from '../../utils/math';

// Color constants conforming to prompt design rules:
// Portfolio A: warm accent (orange / amber #f97316)
// Portfolio B: cool accent (teal #0d9488)
// Benchmark: neutral slate (#64748b)
// Downside: red (#ef4444)
// Upside: green (#10b981)

interface WealthPoint {
  date: string;
  valA: number;
  valB: number;
  benchVal?: number;
}

export function WealthGrowthChart({
  data,
  initialCapital = 1500000,
  activePortfolio = 'All',
}: {
  data: WealthPoint[];
  initialCapital?: number;
  activePortfolio?: 'All' | 'Portfolio A' | 'Portfolio B';
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No series data available
      </div>
    );
  }

  const width = 800;
  const height = 310;
  const padLeft = 75;
  const padRight = 45;
  const padTop = 30;
  const padBottom = 40;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;
  const n = data.length;

  const allVals = data.flatMap((d) => [
    activePortfolio !== 'Portfolio B' ? d.valA : null,
    activePortfolio !== 'Portfolio A' ? d.valB : null,
    d.benchVal || null,
    initialCapital,
  ]).filter((v): v is number => typeof v === 'number' && !isNaN(v));

  const minVal = Math.min(...allVals) * 0.96;
  const maxVal = Math.max(...allVals) * 1.05;
  const valRange = Math.max(1, maxVal - minVal);

  const getX = (i: number) => padLeft + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
  const getY = (v: number) => padTop + chartH - ((v - minVal) / valRange) * chartH;

  const pathA = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.valA)}`).join(' ');
  const pathB = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.valB)}`).join(' ');
  const pathBench = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.benchVal ?? initialCapital)}`).join(' ');

  const initialY = getY(initialCapital);

  // Y-axis ticks (5 ticks)
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, idx) => minVal + (idx / (yTicks - 1)) * valRange);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    if (relX < padLeft - 10 || relX > width - padRight + 10) {
      setHoverIndex(null);
      return;
    }
    const fraction = (relX - padLeft) / chartW;
    const clampedIndex = Math.max(0, Math.min(n - 1, Math.round(fraction * (n - 1))));
    setHoverIndex(clampedIndex);
  };

  const hovered = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : null;

  // Selected date labels evenly sampled to guarantee NO overlapping labels
  const tickCount = 6;
  const tickIndices: number[] = [];
  if (n > 0) {
    for (let k = 0; k < tickCount; k++) {
      const idx = Math.round((k / (tickCount - 1)) * (n - 1));
      if (!tickIndices.includes(idx)) tickIndices.push(idx);
    }
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Horizontal Grid lines */}
        {yTickValues.map((v, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              y1={getY(v)}
              x2={width - padRight}
              y2={getY(v)}
              stroke="#e2e8f0"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <text
              x={padLeft - 10}
              y={getY(v) + 3.5}
              fontSize="10"
              fill="#64748b"
              textAnchor="end"
              fontFamily="monospace"
            >
              {formatINR(v, true)}
            </text>
          </g>
        ))}

        {/* Lines */}
        {/* Benchmark NIFTY 50 */}
        <path
          d={pathBench}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.8"
          strokeDasharray="4 3"
        />

        {/* Portfolio A (Orange) */}
        {(activePortfolio === 'All' || activePortfolio === 'Portfolio A') && (
          <path
            d={pathA}
            fill="none"
            stroke="#f97316"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Portfolio B (Teal) */}
        {(activePortfolio === 'All' || activePortfolio === 'Portfolio B') && (
          <path
            d={pathB}
            fill="none"
            stroke="#0d9488"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Ending dots */}
        {n > 0 && (
          <>
            <circle
              cx={getX(n - 1)}
              cy={getY(data[n - 1].benchVal ?? initialCapital)}
              r={3}
              fill="#94a3b8"
            />
            {(activePortfolio === 'All' || activePortfolio === 'Portfolio A') && (
              <circle
                cx={getX(n - 1)}
                cy={getY(data[n - 1].valA)}
                r={4}
                fill="#f97316"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            )}
            {(activePortfolio === 'All' || activePortfolio === 'Portfolio B') && (
              <circle
                cx={getX(n - 1)}
                cy={getY(data[n - 1].valB)}
                r={4}
                fill="#0d9488"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            )}
          </>
        )}

        {/* Hover vertical crosshair & dots */}
        {hoverIndex !== null && hovered && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padTop}
              x2={getX(hoverIndex)}
              y2={padTop + chartH}
              stroke="#334155"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            {(activePortfolio === 'All' || activePortfolio === 'Portfolio A') && (
              <circle
                cx={getX(hoverIndex)}
                cy={getY(hovered.valA)}
                r={5}
                fill="#f97316"
                stroke="#ffffff"
                strokeWidth="2"
              />
            )}
            {(activePortfolio === 'All' || activePortfolio === 'Portfolio B') && (
              <circle
                cx={getX(hoverIndex)}
                cy={getY(hovered.valB)}
                r={5}
                fill="#0d9488"
                stroke="#ffffff"
                strokeWidth="2"
              />
            )}
            {hovered.benchVal && (
              <circle
                cx={getX(hoverIndex)}
                cy={getY(hovered.benchVal)}
                r={4}
                fill="#64748b"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            )}
          </g>
        )}

        {/* X-axis date labels */}
        {tickIndices.map((idx) => {
          const pt = data[idx];
          if (!pt) return null;
          return (
            <text
              key={idx}
              x={getX(idx)}
              y={height - 12}
              fontSize="10"
              fill="#64748b"
              textAnchor="middle"
              fontFamily="monospace"
            >
              {pt.date}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && hoverIndex !== null && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900/95 text-white px-3.5 py-2.5 rounded-lg text-xs shadow-xl border border-slate-700 backdrop-blur-sm"
          style={{
            left: `${Math.min(75, Math.max(15, (getX(hoverIndex) / width) * 100))}%`,
            top: '15px',
          }}
        >
          <div className="font-semibold text-slate-300 border-b border-slate-700 pb-1 mb-1.5 flex justify-between gap-4">
            <span>Period: {hovered.date}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              Month {hoverIndex} of {n - 1}
            </span>
          </div>
          {(activePortfolio === 'All' || activePortfolio === 'Portfolio A') && (
            <div className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-orange-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                Portfolio A (High Risk):
              </span>
              <span className="font-mono font-bold text-orange-200">
                {formatINR(hovered.valA)} (
                {hovered.valA >= initialCapital ? '+' : ''}
                {(((hovered.valA - initialCapital) / initialCapital) * 100).toFixed(2)}%)
              </span>
            </div>
          )}
          {(activePortfolio === 'All' || activePortfolio === 'Portfolio B') && (
            <div className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-teal-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
                Portfolio B (Low Risk):
              </span>
              <span className="font-mono font-bold text-teal-200">
                {formatINR(hovered.valB)} (
                {hovered.valB >= initialCapital ? '+' : ''}
                {(((hovered.valB - initialCapital) / initialCapital) * 100).toFixed(2)}%)
              </span>
            </div>
          )}
          {typeof hovered.benchVal === 'number' && (
            <div className="flex items-center justify-between gap-4 py-0.5 text-slate-300">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                NIFTY 50 Benchmark:
              </span>
              <span className="font-mono">
                {formatINR(hovered.benchVal)} (
                {hovered.benchVal >= initialCapital ? '+' : ''}
                {(((hovered.benchVal - initialCapital) / initialCapital) * 100).toFixed(2)}%)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-600">
        {(activePortfolio === 'All' || activePortfolio === 'Portfolio A') && (
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 bg-orange-500 rounded-full inline-block" />
            <span className="font-medium text-slate-800">Portfolio A (High Risk)</span>
          </div>
        )}
        {(activePortfolio === 'All' || activePortfolio === 'Portfolio B') && (
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-1 bg-teal-600 rounded-full inline-block" />
            <span className="font-medium text-slate-800">Portfolio B (Low Risk)</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-0.5 bg-slate-400 border-dashed border-b border-slate-400 inline-block" />
          <span className="text-slate-500">NIFTY 50 Benchmark</span>
        </div>
      </div>
    </div>
  );
}

export function DrawdownChart({
  seriesA,
  seriesB,
  dates,
  activePortfolio = 'All',
}: {
  seriesA: number[];
  seriesB: number[];
  dates: string[];
  activePortfolio?: 'All' | 'Portfolio A' | 'Portfolio B';
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const n = dates.length;
  if (!n || seriesA.length === 0 || seriesB.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        No drawdown series data
      </div>
    );
  }

  const width = 800;
  const height = 240;
  const padLeft = 65;
  const padRight = 25;
  const padTop = 25;
  const padBottom = 35;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const minA = Math.min(...seriesA, 0);
  const minB = Math.min(...seriesB, 0);
  const deepest = Math.min(minA, minB);
  // Ensure we show at least down to -30% or 15% below deepest
  const minVal = Math.min(-25, deepest * 1.15); // negative percentage

  const getX = (i: number) => padLeft + (n > 1 ? (i / (n - 1)) * chartW : chartW / 2);
  const getY = (v: number) => padTop + ((0 - v) / (0 - minVal)) * chartH;

  const yZero = getY(0);

  // Area paths
  const areaA =
    `M ${getX(0)} ${yZero} ` +
    seriesA.map((v, i) => `L ${getX(i)} ${getY(v)}`).join(' ') +
    ` L ${getX(seriesA.length - 1)} ${yZero} Z`;

  const areaB =
    `M ${getX(0)} ${yZero} ` +
    seriesB.map((v, i) => `L ${getX(i)} ${getY(v)}`).join(' ') +
    ` L ${getX(seriesB.length - 1)} ${yZero} Z`;

  const pathA = seriesA.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(v)}`).join(' ');
  const pathB = seriesB.map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(v)}`).join(' ');

  const yTicks = [0, -10, -20, -30, -40, -50].filter((v) => v >= minVal);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    if (relX < padLeft - 10 || relX > width - padRight + 10) {
      setHoverIndex(null);
      return;
    }
    const fraction = (relX - padLeft) / chartW;
    const clampedIndex = Math.max(0, Math.min(n - 1, Math.round(fraction * (n - 1))));
    setHoverIndex(clampedIndex);
  };

  // Selected date labels evenly sampled to guarantee NO overlapping labels
  const tickCount = 6;
  const tickIndices: number[] = [];
  if (n > 0) {
    for (let k = 0; k < tickCount; k++) {
      const idx = Math.round((k / (tickCount - 1)) * (n - 1));
      if (!tickIndices.includes(idx)) tickIndices.push(idx);
    }
  }

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* Zero baseline */}
        <line
          x1={padLeft}
          y1={yZero}
          x2={width - padRight}
          y2={yZero}
          stroke="#475569"
          strokeWidth="1.2"
        />

        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              y1={getY(v)}
              x2={width - padRight}
              y2={getY(v)}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <text
              x={padLeft - 8}
              y={getY(v) + 4}
              fontSize="10"
              fill="#64748b"
              textAnchor="end"
              fontFamily="monospace"
            >
              {v}%
            </text>
          </g>
        ))}

        {/* Portfolio A Area */}
        {(activePortfolio === 'All' || activePortfolio === 'Portfolio A') && (
          <>
            <path d={areaA} fill="#f97316" fillOpacity="0.18" />
            <path d={pathA} fill="none" stroke="#f97316" strokeWidth="2.2" />
          </>
        )}

        {/* Portfolio B Area */}
        {(activePortfolio === 'All' || activePortfolio === 'Portfolio B') && (
          <>
            <path d={areaB} fill="#0d9488" fillOpacity="0.20" />
            <path d={pathB} fill="none" stroke="#0d9488" strokeWidth="2.2" />
          </>
        )}

        {/* Hover Crosshair & Dots */}
        {hoverIndex !== null && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padTop}
              x2={getX(hoverIndex)}
              y2={padTop + chartH}
              stroke="#334155"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
            {(activePortfolio === 'All' || activePortfolio === 'Portfolio A') && seriesA[hoverIndex] !== undefined && (
              <circle
                cx={getX(hoverIndex)}
                cy={getY(seriesA[hoverIndex])}
                r={4.5}
                fill="#f97316"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            )}
            {(activePortfolio === 'All' || activePortfolio === 'Portfolio B') && seriesB[hoverIndex] !== undefined && (
              <circle
                cx={getX(hoverIndex)}
                cy={getY(seriesB[hoverIndex])}
                r={4.5}
                fill="#0d9488"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            )}
          </g>
        )}

        {/* X labels */}
        {tickIndices.map((idx) => (
          <text
            key={idx}
            x={getX(idx)}
            y={height - 10}
            fontSize="10"
            fill="#64748b"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {dates[idx]}
          </text>
        ))}
      </svg>

      {hoverIndex !== null && dates[hoverIndex] && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900/95 text-white px-3.5 py-2 rounded-lg text-xs shadow-xl border border-slate-700"
          style={{
            left: `${Math.min(75, Math.max(15, (getX(hoverIndex) / width) * 100))}%`,
            top: '20px',
          }}
        >
          <div className="text-slate-300 font-medium border-b border-slate-700 pb-1 mb-1">
            Month: {dates[hoverIndex]}
          </div>
          {(activePortfolio === 'All' || activePortfolio === 'Portfolio A') && (
            <div className="text-orange-400 font-mono py-0.5">
              Portfolio A Drawdown: {seriesA[hoverIndex]?.toFixed(2)}%
            </div>
          )}
          {(activePortfolio === 'All' || activePortfolio === 'Portfolio B') && (
            <div className="text-teal-400 font-mono py-0.5">
              Portfolio B Drawdown: {seriesB[hoverIndex]?.toFixed(2)}%
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-2 bg-orange-500/25 border border-orange-500 inline-block rounded-xs" />
          <span>Portfolio A Peak Drawdown: {minA.toFixed(2)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-2 bg-teal-500/25 border border-teal-500 inline-block rounded-xs" />
          <span>Portfolio B Peak Drawdown: {minB.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}

export function ReturnHistogram({
  returnsA,
  returnsB,
  var95A,
  var95B,
  es95A,
  es95B,
  portfolio = 'Portfolio A',
}: {
  returnsA: number[];
  returnsB: number[];
  var95A: number;
  var95B: number;
  es95A: number;
  es95B: number;
  portfolio: 'Portfolio A' | 'Portfolio B';
}) {
  const returns = portfolio === 'Portfolio A' ? returnsA : returnsB;
  const var95 = portfolio === 'Portfolio A' ? var95A : var95B;
  const es95 = portfolio === 'Portfolio A' ? es95A : es95B;
  const color = portfolio === 'Portfolio A' ? '#f97316' : '#0d9488';

  const width = 600;
  const height = 250;
  const padLeft = 45;
  const padRight = 25;
  const padTop = 20;
  const padBottom = 35;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const minR = Math.min(...returns) * 100;
  const maxR = Math.max(...returns) * 100;

  // Create 16 bins
  const binCount = 16;
  const binWidth = (maxR - minR) / binCount;
  const bins = new Array(binCount).fill(0);

  returns.forEach((r) => {
    const val = r * 100;
    const idx = Math.min(binCount - 1, Math.max(0, Math.floor((val - minR) / binWidth)));
    bins[idx]++;
  });

  const maxFreq = Math.max(...bins, 1);

  const getX = (pct: number) => padLeft + ((pct - minR) / (maxR - minR)) * chartW;
  const getY = (count: number) => padTop + chartH - (count / maxFreq) * chartH;

  const varX = getX(-var95);
  const esX = getX(-es95);
  const zeroX = getX(0);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
        {/* Zero Return vertical line */}
        <line
          x1={zeroX}
          y1={padTop}
          x2={zeroX}
          y2={padTop + chartH}
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
        <text x={zeroX} y={padTop - 6} fontSize="10" fill="#64748b" textAnchor="middle">
          0% Break-even
        </text>

        {/* VaR Line */}
        <line
          x1={varX}
          y1={padTop}
          x2={varX}
          y2={padTop + chartH}
          stroke="#ef4444"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
        <text
          x={varX < padLeft + 75 ? varX + 4 : varX - 4}
          y={padTop + 14}
          fontSize="9"
          fill="#ef4444"
          fontWeight="700"
          textAnchor={varX < padLeft + 75 ? 'start' : 'end'}
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="2.5"
        >
          95% VaR: -{var95.toFixed(1)}%
        </text>

        {/* ES Line */}
        <line
          x1={esX}
          y1={padTop}
          x2={esX}
          y2={padTop + chartH}
          stroke="#b91c1c"
          strokeWidth="2"
        />
        <text
          x={esX < padLeft + 75 ? esX + 4 : esX - 4}
          y={padTop + 28}
          fontSize="9"
          fill="#b91c1c"
          fontWeight="700"
          textAnchor={esX < padLeft + 75 ? 'start' : 'end'}
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth="2.5"
        >
          95% ES: -{es95.toFixed(1)}%
        </text>

        {/* Histogram Bins */}
        {bins.map((count, i) => {
          const binStart = minR + i * binWidth;
          const x = getX(binStart);
          const nextX = getX(binStart + binWidth);
          const w = Math.max(1, nextX - x - 2);
          const y = getY(count);
          const barH = padTop + chartH - y;
          const isTail = binStart + binWidth <= -var95;

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={w}
              height={barH}
              fill={isTail ? '#ef4444' : color}
              fillOpacity={isTail ? 0.75 : 0.6}
              rx={2}
            />
          );
        })}

        {/* X-axis */}
        <line
          x1={padLeft}
          y1={padTop + chartH}
          x2={width - padRight}
          y2={padTop + chartH}
          stroke="#475569"
        />

        {/* Axis Ticks */}
        {[-40, -20, 0, 20, 40, 60].filter((v) => v >= minR - 5 && v <= maxR + 5).map((v, i) => (
          <g key={i}>
            <line x1={getX(v)} y1={padTop + chartH} x2={getX(v)} y2={padTop + chartH + 4} stroke="#475569" />
            <text x={getX(v)} y={padTop + chartH + 16} fontSize="10" fill="#64748b" textAnchor="middle">
              {v}%
            </text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between items-center text-xs text-slate-500 mt-2 px-4">
        <span>◀ Severe Losses (Left Tail)</span>
        <span>Monthly Return (%)</span>
        <span>Strong Gains (Right Tail) ▶</span>
      </div>
    </div>
  );
}

export function EfficientFrontierPlot({
  summary,
  customPoint,
  rf = 0.06,
}: {
  summary: any;
  customPoint?: { returnPct: number; volPct: number; label: string };
  rf?: number;
}) {
  const [hoverPt, setHoverPt] = useState<any>(null);

  if (!summary) return <div>No frontier data</div>;

  const width = 750;
  const height = 400;
  const padLeft = 65;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 45;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const allVols = [
    ...summary.feasiblePortfolios.map((p: any) => p.volatilityPct),
    ...summary.frontierCurve.map((p: any) => p.volatilityPct),
    summary.minVol.volatilityPct,
    summary.maxSharpe.volatilityPct,
    summary.equalWeight.volatilityPct,
    ...(summary.currentCustom ? [summary.currentCustom.volatilityPct] : []),
    ...(customPoint ? [customPoint.volPct] : []),
  ];

  const allRets = [
    ...summary.feasiblePortfolios.map((p: any) => p.expectedReturnPct),
    ...summary.frontierCurve.map((p: any) => p.expectedReturnPct),
    summary.minVol.expectedReturnPct,
    summary.maxSharpe.expectedReturnPct,
    summary.equalWeight.expectedReturnPct,
    ...(summary.currentCustom ? [summary.currentCustom.expectedReturnPct] : []),
    ...(customPoint ? [customPoint.returnPct] : []),
  ];

  const minX = Math.max(0, Math.min(...allVols) * 0.85);
  const maxX = Math.max(...allVols) * 1.08;
  const minY = Math.min(...allRets) * 0.85;
  const maxY = Math.max(...allRets) * 1.1;

  const getX = (v: number) => padLeft + ((v - minX) / (maxX - minX)) * chartW;
  const getY = (r: number) => padTop + chartH - ((r - minY) / (maxY - minY)) * chartH;

  const frontierPath = summary.frontierCurve
    .map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${getX(p.volatilityPct)} ${getY(p.expectedReturnPct)}`)
    .join(' ');

  // Capital Allocation Line (CAL) from Rf on Y-axis through Max Sharpe point
  const maxSharpeX = getX(summary.maxSharpe.volatilityPct);
  const maxSharpeY = getY(summary.maxSharpe.expectedReturnPct);
  const rfY = getY(rf * 100);

  const customPortfolioPt = summary.currentCustom;
  const customX = customPortfolioPt ? getX(customPortfolioPt.volatilityPct) : null;
  const customY = customPortfolioPt ? getY(customPortfolioPt.expectedReturnPct) : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        onMouseLeave={() => setHoverPt(null)}
      >
        {/* Grid lines */}
        {[10, 20, 30, 40, 50, 60].filter((v) => v >= minX && v <= maxX).map((v, i) => (
          <g key={i}>
            <line x1={getX(v)} y1={padTop} x2={getX(v)} y2={padTop + chartH} stroke="#f1f5f9" strokeWidth="1" />
            <text x={getX(v)} y={height - 24} fontSize="10" fill="#64748b" textAnchor="middle">
              {v}%
            </text>
          </g>
        ))}

        {[0, 10, 20, 30, 40, 50, 60, 70, 80].filter((r) => r >= minY && r <= maxY).map((r, i) => (
          <g key={i}>
            <line x1={padLeft} y1={getY(r)} x2={width - padRight} y2={getY(r)} stroke="#f1f5f9" strokeWidth="1" />
            <text x={padLeft - 8} y={getY(r) + 4} fontSize="10" fill="#64748b" textAnchor="end">
              {r}%
            </text>
          </g>
        ))}

        {/* Axes */}
        <line x1={padLeft} y1={padTop + chartH} x2={width - padRight} y2={padTop + chartH} stroke="#94a3b8" />
        <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + chartH} stroke="#94a3b8" />

        {/* Axis Titles */}
        <text x={padLeft + chartW / 2} y={height - 6} fontSize="11" fill="#475569" fontWeight="500" textAnchor="middle">
          Annualized Volatility (%) → Risk
        </text>
        <text
          x={14}
          y={padTop + chartH / 2}
          fontSize="11"
          fill="#475569"
          fontWeight="500"
          textAnchor="middle"
          transform={`rotate(-90 14 ${padTop + chartH / 2})`}
        >
          Annualized Expected Return (%)
        </text>

        {/* Feasible Portfolio Cloud Points */}
        {summary.feasiblePortfolios.map((p: any, i: number) => {
          // Color cloud by Sharpe ratio: higher = bright cyan/teal, lower = slate
          const sharpeRatio = p.sharpeRatio;
          const hue = Math.max(180, Math.min(270, 200 + sharpeRatio * 40));
          return (
            <circle
              key={i}
              cx={getX(p.volatilityPct)}
              cy={getY(p.expectedReturnPct)}
              r={2}
              fill={`hsl(${hue}, 70%, 55%)`}
              fillOpacity={0.35}
              onMouseEnter={() => setHoverPt({ ...p, label: 'Feasible Portfolio' })}
            />
          );
        })}

        {/* Capital Allocation Line (CAL) */}
        <line
          x1={padLeft}
          y1={rfY}
          x2={maxSharpeX + (maxSharpeX - padLeft) * 0.4}
          y2={maxSharpeY - (rfY - maxSharpeY) * 0.4}
          stroke="#3b82f6"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />

        {/* Frontier Line */}
        <path d={frontierPath} fill="none" stroke="#0284c7" strokeWidth="3" />

        {/* Projections to axes for user's custom portfolio */}
        {customX !== null && customY !== null && (
          <g className="transition-all duration-300">
            <line
              x1={padLeft}
              y1={customY}
              x2={customX}
              y2={customY}
              stroke="#8b5cf6"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeOpacity={0.75}
            />
            <line
              x1={customX}
              y1={customY}
              x2={customX}
              y2={padTop + chartH}
              stroke="#8b5cf6"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              strokeOpacity={0.75}
            />
          </g>
        )}

        {/* Minimum Volatility Marker (Star / Green) */}
        <g
          transform={`translate(${getX(summary.minVol.volatilityPct)}, ${getY(summary.minVol.expectedReturnPct)})`}
          onMouseEnter={() => setHoverPt({ ...summary.minVol, label: 'Minimum Volatility Portfolio' })}
          className="cursor-pointer"
        >
          <circle r={8} fill="#10b981" fillOpacity={0.3} />
          <circle r={5} fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
        </g>

        {/* Maximum Sharpe Marker (Star / Orange) */}
        <g
          transform={`translate(${getX(summary.maxSharpe.volatilityPct)}, ${getY(summary.maxSharpe.expectedReturnPct)})`}
          onMouseEnter={() => setHoverPt({ ...summary.maxSharpe, label: 'Maximum Sharpe Portfolio' })}
          className="cursor-pointer"
        >
          <circle r={9} fill="#f97316" fillOpacity={0.3} />
          <circle r={5.5} fill="#f97316" stroke="#ffffff" strokeWidth="1.5" />
        </g>

        {/* Equal Weight Benchmark Marker (Diamond) */}
        <g
          transform={`translate(${getX(summary.equalWeight.volatilityPct)}, ${getY(summary.equalWeight.expectedReturnPct)})`}
          onMouseEnter={() => setHoverPt({ ...summary.equalWeight, label: 'Equal-Weight Benchmark (10% Each)' })}
          className="cursor-pointer"
        >
          <rect
            x={-5}
            y={-5}
            width={10}
            height={10}
            fill="#6366f1"
            stroke="#ffffff"
            strokeWidth="1.5"
            transform="rotate(45)"
          />
        </g>

        {/* User's Current Custom Portfolio Allocation Marker */}
        {customPortfolioPt && customX !== null && customY !== null && (
          <g
            transform={`translate(${customX}, ${customY})`}
            onMouseEnter={() =>
              setHoverPt({
                ...customPortfolioPt,
                label: 'Your Current Allocation (Custom Weights)',
              })
            }
            className="cursor-pointer"
          >
            {/* Outer animated halo */}
            <circle r={14} fill="#8b5cf6" fillOpacity={0.25} />
            <circle r={8} fill="#7c3aed" stroke="#ffffff" strokeWidth="2.5" />
            <circle r={3} fill="#ffffff" />
            
            {/* Visual Callout Badge Flag */}
            <g transform="translate(0, -26)">
              <rect
                x={-68}
                y={-14}
                width={136}
                height={20}
                rx={10}
                fill="#6d28d9"
                stroke="#ffffff"
                strokeWidth="1.5"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"
              />
              <text
                x={0}
                y={0}
                fontSize="9.5"
                fontWeight="700"
                fill="#ffffff"
                textAnchor="middle"
                dominantBaseline="central"
              >
                ★ Your Current Allocation
              </text>
            </g>
          </g>
        )}

        {/* Custom Point if provided separately */}
        {customPoint && !customPortfolioPt && (
          <g
            transform={`translate(${getX(customPoint.volPct)}, ${getY(customPoint.returnPct)})`}
            onMouseEnter={() =>
              setHoverPt({
                expectedReturnPct: customPoint.returnPct,
                volatilityPct: customPoint.volPct,
                sharpeRatio: ((customPoint.returnPct - rf * 100) / customPoint.volPct).toFixed(2),
                label: customPoint.label,
              })
            }
          >
            <circle r={6} fill="#ec4899" stroke="#ffffff" strokeWidth="2" />
          </g>
        )}
      </svg>

      {/* Hover Card */}
      {hoverPt && (
        <div className="absolute top-4 right-6 z-20 bg-slate-900/95 text-white p-3 rounded-lg text-xs shadow-xl border border-slate-700 min-w-[210px] backdrop-blur-xs">
          <div className="font-semibold text-sky-400 border-b border-slate-700 pb-1 mb-1">
            {hoverPt.label}
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Exp Return:</span>
            <span className="font-mono text-emerald-400 font-bold">{hoverPt.expectedReturnPct}% p.a.</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Volatility:</span>
            <span className="font-mono text-amber-400 font-bold">{hoverPt.volatilityPct}% p.a.</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-400">Sharpe Ratio:</span>
            <span className="font-mono text-cyan-300 font-bold">{hoverPt.sharpeRatio}</span>
          </div>
          {summary.maxSharpe && hoverPt.sharpeRatio !== summary.maxSharpe.sharpeRatio && (
            <div className="mt-1 pt-1 border-t border-slate-800 text-[11px] text-slate-300 flex justify-between">
              <span>Max Sharpe Diff:</span>
              <span className="font-mono text-rose-300">
                {(hoverPt.sharpeRatio - summary.maxSharpe.sharpeRatio).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-slate-700">
        {summary.currentCustom && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-violet-50 rounded-full border border-violet-200">
            <span className="w-3 h-3 rounded-full bg-violet-600 border border-white inline-block shadow-2xs" />
            <span className="font-bold text-violet-900">Your Current Allocation (Custom Weights)</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-sky-600 inline-block" />
          <span>Markowitz Efficient Frontier</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          <span className="font-medium text-emerald-800">Minimum Volatility</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
          <span className="font-medium text-orange-800">Maximum Sharpe</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-indigo-500 rotate-45 inline-block" />
          <span className="font-medium text-indigo-800">Equal Weight (10%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-500 border-dashed border-b border-blue-500 inline-block" />
          <span className="text-slate-500">Capital Allocation Line (Rf={Number(rf * 100).toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  );
}

export function CorrelationHeatmap({
  tickers,
  matrix,
  onSelectCell,
}: {
  tickers: string[];
  matrix: number[][];
  onSelectCell?: (t1: string, t2: string, val: number) => void;
}) {
  const [hoverCell, setHoverCell] = useState<{ i: number; j: number; val: number } | null>(null);

  const n = tickers.length;
  const cellSize = n > 12 ? 30 : 44;

  const getColor = (v: number) => {
    // Diverging color scale:
    // v < 0: red
    // v = 0: slate-50 / white
    // v > 0: emerald green
    if (v < 0) {
      const alpha = Math.min(1, Math.abs(v));
      return `rgba(239, 68, 68, ${alpha * 0.85})`;
    } else {
      const alpha = Math.min(1, v);
      return `rgba(16, 185, 129, ${alpha * 0.85})`;
    }
  };

  return (
    <div className="relative overflow-x-auto pb-4">
      <div className="inline-block min-w-full">
        <table className="border-collapse text-xs select-none">
          <thead>
            <tr>
              <th className="p-1 font-semibold text-slate-500 text-left sticky left-0 bg-white z-10 w-24">
                Ticker
              </th>
              {tickers.map((t, idx) => (
                <th
                  key={idx}
                  style={{ width: cellSize, minWidth: cellSize }}
                  className="p-1 font-mono text-[10px] text-slate-600 h-20 align-bottom overflow-visible relative"
                >
                  <div className="w-5 -rotate-45 origin-bottom-left translate-x-2.5 translate-y-[-6px] whitespace-nowrap font-medium select-none">
                    {t.replace('.NS', '')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickers.map((rowTicker, i) => (
              <tr key={i}>
                <td className="p-1 font-mono text-[11px] font-medium text-slate-700 whitespace-nowrap sticky left-0 bg-white z-10 border-r border-slate-200">
                  {rowTicker.replace('.NS', '')}
                </td>
                {tickers.map((colTicker, j) => {
                  const val = matrix[i] && matrix[i][j] !== undefined ? matrix[i][j] : 0;
                  const isHovered = hoverCell?.i === i && hoverCell?.j === j;

                  return (
                    <td
                      key={j}
                      style={{
                        backgroundColor: getColor(val),
                        width: cellSize,
                        height: cellSize,
                      }}
                      className={`text-center font-mono text-[10px] cursor-pointer transition-all border border-white/40 ${
                        isHovered ? 'ring-2 ring-slate-900 z-10 font-bold' : ''
                      } ${Math.abs(val) > 0.4 ? 'text-white font-semibold' : 'text-slate-800'}`}
                      onMouseEnter={() => setHoverCell({ i, j, val })}
                      onMouseLeave={() => setHoverCell(null)}
                      onClick={() => onSelectCell && onSelectCell(rowTicker, colTicker, val)}
                    >
                      {val.toFixed(2)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hoverCell && (
        <div className="mt-3 p-2 bg-slate-800 text-white text-xs rounded-md inline-flex items-center gap-4">
          <span>
            <strong>{tickers[hoverCell.i]?.replace('.NS', '')}</strong> vs{' '}
            <strong>{tickers[hoverCell.j]?.replace('.NS', '')}</strong>
          </span>
          <span className="font-mono text-emerald-400">
            Pearson Correlation: {hoverCell.val.toFixed(3)}
          </span>
          <span className="text-slate-400 text-[11px]">
            {hoverCell.val > 0.6
              ? 'Strong Co-movement'
              : hoverCell.val > 0.2
              ? 'Moderate Correlation'
              : hoverCell.val > -0.1
              ? 'Low / Independent Movement'
              : 'Negative Diversifying Hedge'}
          </span>
        </div>
      )}
    </div>
  );
}
