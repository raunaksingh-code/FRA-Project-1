import React, { useState, useMemo } from 'react';
import { MONTHLY_RETURNS_DATA } from '../data/historicalData';
import { PORTFOLIO_A_STOCKS, PORTFOLIO_B_STOCKS, ALL_UNIVERSE_STOCKS } from '../data/universe';
import { extractReturns, calculateCorrelation, calculateCovariance } from '../utils/math';
import { CorrelationHeatmap } from '../components/charts/Charts';
import { Grid, Sparkles, Info, Layers } from 'lucide-react';

export function CorrelationPage() {
  const [activeUniverse, setActiveUniverse] = useState<'Portfolio A' | 'Portfolio B' | 'Full Universe'>('Portfolio A');
  const [metricMode, setMetricMode] = useState<'correlation' | 'covariance'>('correlation');

  const tickersA = PORTFOLIO_A_STOCKS.map((s) => s.ticker);
  const tickersB = PORTFOLIO_B_STOCKS.map((s) => s.ticker);
  const tickersAll = ALL_UNIVERSE_STOCKS.map((s) => s.ticker);

  const activeTickers =
    activeUniverse === 'Portfolio A'
      ? tickersA
      : activeUniverse === 'Portfolio B'
      ? tickersB
      : tickersAll;

  // Compute correlation and covariance matrices
  const { matrix, highestPairs, lowestPairs, avgCorrelation } = useMemo(() => {
    const n = activeTickers.length;
    const mat: number[][] = [];
    const pairs: { t1: string; t2: string; val: number }[] = [];

    const returnsMap: Record<string, number[]> = {};
    activeTickers.forEach((t) => {
      returnsMap[t] = extractReturns(MONTHLY_RETURNS_DATA, t);
    });

    let sumOffDiag = 0;
    let countOffDiag = 0;

    for (let i = 0; i < n; i++) {
      mat[i] = [];
      for (let j = 0; j < n; j++) {
        const t1 = activeTickers[i];
        const t2 = activeTickers[j];
        if (metricMode === 'correlation') {
          const c = i === j ? 1.0 : calculateCorrelation(returnsMap[t1], returnsMap[t2]);
          mat[i][j] = c;
          if (i < j) {
            pairs.push({ t1, t2, val: c });
            sumOffDiag += c;
            countOffDiag++;
          }
        } else {
          // Annualized covariance
          const cov = calculateCovariance(returnsMap[t1], returnsMap[t2]) * 12;
          mat[i][j] = cov;
          if (i < j) {
            pairs.push({ t1, t2, val: cov });
          }
        }
      }
    }

    pairs.sort((a, b) => b.val - a.val);

    return {
      matrix: mat,
      highestPairs: pairs.slice(0, 5),
      lowestPairs: [...pairs].reverse().slice(0, 5),
      avgCorrelation: countOffDiag > 0 ? sumOffDiag / countOffDiag : 0,
    };
  }, [activeTickers, metricMode]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-indigo-600">
            <Grid className="w-3.5 h-3.5" />
            <span>Co-Movement & Diversification Analytics</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Inter-Asset Correlation & Annualized Covariance Heatmaps
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            Diverging scale centered at zero · Quantifying portfolio diversification benefits and linear dependencies
          </div>
        </div>

        {/* Universe & Matrix Type Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-lg">
            {(['Portfolio A', 'Portfolio B', 'Full Universe'] as const).map((u) => (
              <button
                key={u}
                onClick={() => setActiveUniverse(u)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeUniverse === u
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Control Bar & Average Correlation Indicator */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800">Analytical Metric:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
            <button
              onClick={() => setMetricMode('correlation')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                metricMode === 'correlation'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pearson Correlation Matrix ([-1, +1])
            </button>
            <button
              onClick={() => setMetricMode('covariance')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                metricMode === 'covariance'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annualized Covariance (σ_ij × 12)
            </button>
          </div>
        </div>

        {metricMode === 'correlation' && (
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Average Intra-Universe Correlation:</span>
            <span className="font-mono text-sm font-bold bg-slate-100 text-slate-900 px-2.5 py-0.5 rounded">
              {avgCorrelation.toFixed(2)}
            </span>
            <span className="text-[11px] text-slate-500">
              ({avgCorrelation < 0.35 ? 'High Diversification Potential' : 'Moderate Co-movement'})
            </span>
          </div>
        )}
      </div>

      {/* Interactive Matrix Display */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {activeUniverse} {metricMode === 'correlation' ? 'Correlation Matrix' : 'Covariance Matrix'}
            </h3>
            <p className="text-xs text-slate-500">
              Hover over cells to inspect exact pair coefficients and directional co-movement
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-red-500 inline-block" />
              Negative / Hedging ([-1, 0))
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-slate-200 inline-block" />
              Zero / Uncorrelated
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
              Positive Co-movement ((0, +1])
            </span>
          </div>
        </div>

        <CorrelationHeatmap tickers={activeTickers} matrix={matrix} />
      </div>

      {/* Extreme Pairwise Relationships Table */}
      {metricMode === 'correlation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Highest Correlation Pairs */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Top 5 Highest Pairwise Correlations (High Co-movement)
              </h4>
            </div>
            <div className="space-y-2 font-mono">
              {highestPairs.map((pair, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100"
                >
                  <span className="font-sans font-medium text-slate-800">
                    {pair.t1.replace('.NS', '')} ↔ {pair.t2.replace('.NS', '')}
                  </span>
                  <span className="font-bold text-emerald-700">
                    +{pair.val.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lowest / Negative Correlation Pairs */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Top 5 Lowest Pairwise Correlations (Diversifying Hedges)
              </h4>
            </div>
            <div className="space-y-2 font-mono">
              {lowestPairs.map((pair, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100"
                >
                  <span className="font-sans font-medium text-slate-800">
                    {pair.t1.replace('.NS', '')} ↔ {pair.t2.replace('.NS', '')}
                  </span>
                  <span className={`font-bold ${pair.val < 0 ? 'text-red-700' : 'text-slate-800'}`}>
                    {pair.val > 0 ? `+${pair.val.toFixed(2)}` : pair.val.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Academic Diversification Insight */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-1.5">
        <div className="font-bold text-slate-900 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-slate-500" />
          Academic Finding on Diversification & Linear Correlation
        </div>
        <p className="leading-relaxed">
          While Portfolio B exhibits lower average pairwise correlation (~0.28) due to multi-sector distribution across pharmaceuticals, IT, utilities, and consumer goods, Portfolio A equities display localized momentum clustering during bull runs. Crucially, empirical financial literature demonstrates that correlation is a linear metric that tends to increase during liquidity crashes (&quot;correlations go to 1 during a panic&quot;), making stress testing and Expected Shortfall essential supplements to correlation matrices.
        </p>
      </div>
    </div>
  );
}
