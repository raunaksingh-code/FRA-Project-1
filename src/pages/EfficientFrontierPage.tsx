import React, { useState, useMemo } from 'react';
import {
  MonthlyReturnRow,
  GlobalFilterState,
  FrontierOptimizationSummary,
  PortfolioPerformanceMetrics,
} from '../types';
import {
  runMarkowitzOptimization,
  solveTargetReturnPortfolio,
  computeAnnualizedMuAndCov,
} from '../utils/optimizer';
import { extractReturns, formatINR } from '../utils/math';
import { REAL_YAHOO_MONTHLY_RETURNS } from '../data/realMarketData';
import { PORTFOLIO_A_STOCKS, PORTFOLIO_B_STOCKS, TICKER_TO_STOCK } from '../data/universe';
import { PlotlyChart } from '../components/charts/PlotlyChart';
import {
  TrendingUp,
  Target,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Sliders,
  Check,
  Layers,
  Award,
  Calendar,
  LineChart,
} from 'lucide-react';

interface EfficientFrontierProps {
  filters: GlobalFilterState;
  onChangeFilters: (f: Partial<GlobalFilterState>) => void;
  monthlyReturns?: MonthlyReturnRow[];
  weightsA?: Record<string, number>;
  weightsB?: Record<string, number>;
  onChangeWeightsA?: (w: Record<string, number>) => void;
  onChangeWeightsB?: (w: Record<string, number>) => void;
  metricsA?: PortfolioPerformanceMetrics;
  metricsB?: PortfolioPerformanceMetrics;
}

export function EfficientFrontierPage({
  filters,
  onChangeFilters,
  monthlyReturns = REAL_YAHOO_MONTHLY_RETURNS,
  weightsA = {},
  weightsB = {},
  onChangeWeightsA,
  onChangeWeightsB,
  metricsA,
  metricsB,
}: EfficientFrontierProps) {
  const [viewMode, setViewMode] = useState<'Portfolio A' | 'Portfolio B' | 'Dual Overlay'>('Dual Overlay');
  const [maxStockWeight, setMaxStockWeight] = useState<number>(35); // 35% cap default
  const [targetReturnInput, setTargetReturnInput] = useState<number>(24); // 24% target
  const [activeRegime, setActiveRegime] = useState<'5Year' | 'Calm' | 'Crisis'>('5Year');
  const [notification, setNotification] = useState<string | null>(null);

  const activeFocusPortfolio = viewMode === 'Portfolio B' ? 'Portfolio B' : 'Portfolio A';

  // Extract return series maps for both portfolios
  const tickersA = PORTFOLIO_A_STOCKS.map((s) => s.ticker);
  const tickersB = PORTFOLIO_B_STOCKS.map((s) => s.ticker);

  const stockReturnsMapA = useMemo(() => {
    const map: Record<string, number[]> = {};
    tickersA.forEach((t) => {
      let r = extractReturns(monthlyReturns, t);
      if (activeRegime === 'Calm') r = r.slice(0, 36);
      else if (activeRegime === 'Crisis') r = r.slice(12, 24);
      map[t] = r;
    });
    return map;
  }, [tickersA, activeRegime, monthlyReturns]);

  const stockReturnsMapB = useMemo(() => {
    const map: Record<string, number[]> = {};
    tickersB.forEach((t) => {
      let r = extractReturns(monthlyReturns, t);
      if (activeRegime === 'Calm') r = r.slice(0, 36);
      else if (activeRegime === 'Crisis') r = r.slice(12, 24);
      map[t] = r;
    });
    return map;
  }, [tickersB, activeRegime, monthlyReturns]);

  // Markowitz Optimizations for both portfolios
  const summaryA: FrontierOptimizationSummary = useMemo(() => {
    return runMarkowitzOptimization(
      stockReturnsMapA,
      filters.riskFreeRatePct / 100,
      maxStockWeight / 100,
      800,
      weightsA
    );
  }, [stockReturnsMapA, filters.riskFreeRatePct, maxStockWeight, weightsA]);

  const summaryB: FrontierOptimizationSummary = useMemo(() => {
    return runMarkowitzOptimization(
      stockReturnsMapB,
      filters.riskFreeRatePct / 100,
      maxStockWeight / 100,
      800,
      weightsB
    );
  }, [stockReturnsMapB, filters.riskFreeRatePct, maxStockWeight, weightsB]);

  const activeSummary = activeFocusPortfolio === 'Portfolio A' ? summaryA : summaryB;
  const activeWeights = activeFocusPortfolio === 'Portfolio A' ? weightsA : weightsB;
  const activeOnChangeWeights = activeFocusPortfolio === 'Portfolio A' ? onChangeWeightsA : onChangeWeightsB;

  // Target Return Portfolio Solver
  const targetResult = useMemo(() => {
    const activeMap = activeFocusPortfolio === 'Portfolio A' ? stockReturnsMapA : stockReturnsMapB;
    const { mu, cov } = computeAnnualizedMuAndCov(activeMap);
    return solveTargetReturnPortfolio(mu, cov, targetReturnInput / 100, maxStockWeight / 100);
  }, [activeFocusPortfolio, stockReturnsMapA, stockReturnsMapB, targetReturnInput, maxStockWeight]);

  // MARKOWITZ RESULTS OVER TIME: Historical cumulative price / growth series
  const markowitzTimeSeries = useMemo(() => {
    let runningMaxSharpe = filters.initialCapital;
    let runningMinVol = filters.initialCapital;
    let runningCustom = filters.initialCapital;
    let runningEqual = filters.initialCapital;
    let runningBench = filters.initialCapital;

    const basePoint = {
      date: 'Start',
      valMaxSharpe: filters.initialCapital,
      valMinVol: filters.initialCapital,
      valCustom: filters.initialCapital,
      valEqual: filters.initialCapital,
      benchVal: filters.initialCapital,
    };

    const activeTickers = activeFocusPortfolio === 'Portfolio A' ? tickersA : tickersB;
    const activeMap = activeFocusPortfolio === 'Portfolio A' ? stockReturnsMapA : stockReturnsMapB;
    const maxSharpeWeights = activeSummary.maxSharpe.weights;
    const minVolWeights = activeSummary.minVol.weights;

    const points = monthlyReturns.map((row, idx) => {
      // Monthly return of Max Sharpe
      let retMaxSharpe = 0;
      let retMinVol = 0;
      let retCustom = 0;
      let retEqual = 0;

      activeTickers.forEach((t) => {
        const ret = typeof row[t] === 'number' ? (row[t] as number) : 0;
        retMaxSharpe += ((maxSharpeWeights[t] || 0) / 100) * ret;
        retMinVol += ((minVolWeights[t] || 0) / 100) * ret;
        retCustom += ((activeWeights[t] || 10) / 100) * ret;
        retEqual += 0.1 * ret;
      });

      const retBench = typeof row['NIFTY50.NS'] === 'number' ? (row['NIFTY50.NS'] as number) : 0;

      runningMaxSharpe *= 1 + retMaxSharpe;
      runningMinVol *= 1 + retMinVol;
      runningCustom *= 1 + retCustom;
      runningEqual *= 1 + retEqual;
      runningBench *= 1 + retBench;

      return {
        date: row.date,
        valMaxSharpe: Math.round(runningMaxSharpe),
        valMinVol: Math.round(runningMinVol),
        valCustom: Math.round(runningCustom),
        valEqual: Math.round(runningEqual),
        benchVal: Math.round(runningBench),
      };
    });

    return [basePoint, ...points];
  }, [filters.initialCapital, monthlyReturns, activeFocusPortfolio, activeSummary, activeWeights, tickersA, tickersB, stockReturnsMapA, stockReturnsMapB]);

  const handleApplyOptimalWeights = (targetWeights: Record<string, number>, label: string) => {
    if (activeOnChangeWeights) {
      activeOnChangeWeights(targetWeights);
      setNotification(`✓ Successfully applied ${label} to ${activeFocusPortfolio}. Updated weights are active across all pages!`);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleResetToEqualWeight = () => {
    const eq: Record<string, number> = {};
    const activeTickers = activeFocusPortfolio === 'Portfolio A' ? tickersA : tickersB;
    activeTickers.forEach((t) => {
      eq[t] = 10.0;
    });
    if (activeOnChangeWeights) {
      activeOnChangeWeights(eq);
      setNotification(`✓ Reset ${activeFocusPortfolio} to equal weight (10.0% each).`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-blue-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Modern Portfolio Theory & Mean-Variance Optimization</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Markowitz Efficient Frontier & Optimal Portfolio Showcase
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            Tangency Portfolio (Max Sharpe) · Global Minimum Volatility · Dual Portfolio Distribution Overlay
          </div>
        </div>

        {/* View Mode Switcher: Dual Overlay vs Focus A vs Focus B */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-lg">
          <button
            onClick={() => setViewMode('Dual Overlay')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
              viewMode === 'Dual Overlay'
                ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Dual Frontier Overlay</span>
          </button>
          <button
            onClick={() => setViewMode('Portfolio A')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              viewMode === 'Portfolio A'
                ? 'bg-orange-500 text-white font-semibold shadow-2xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Port A (High Risk)
          </button>
          <button
            onClick={() => setViewMode('Portfolio B')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              viewMode === 'Portfolio B'
                ? 'bg-teal-600 text-white font-semibold shadow-2xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Port B (Low Risk)
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* DEDICATED OPTIMAL PORTFOLIO SHOWCASE CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-700 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400/20 text-amber-300 rounded-xl border border-amber-400/30">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Markowitz Modern Portfolio Theory (1952)
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Focus: {activeFocusPortfolio}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                Optimal Portfolio Showcase: Tangency & Minimum Volatility Solutions
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => handleApplyOptimalWeights(activeSummary.maxSharpe.weights, 'Max Sharpe Portfolio')}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Apply Tangency (Max Sharpe)</span>
            </button>
            <button
              onClick={() => handleApplyOptimalWeights(activeSummary.minVol.weights, 'Minimum Volatility Portfolio')}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg border border-slate-600 transition-colors cursor-pointer"
            >
              Apply Min Vol
            </button>
          </div>
        </div>

        {/* Dual Showcase Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Tangency Max Sharpe */}
          <div className="bg-slate-800/80 rounded-xl p-4 border border-amber-500/30 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Tangency Portfolio (Max Sharpe)
              </span>
              <span className="text-[10px] font-mono bg-amber-400/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/20">
                Rf = {filters.riskFreeRatePct}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-slate-700/60 font-mono">
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Sharpe Ratio</div>
                <div className="text-lg font-bold text-amber-300">{activeSummary.maxSharpe.sharpeRatio.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Exp. Return</div>
                <div className="text-lg font-bold text-emerald-400">{activeSummary.maxSharpe.expectedReturnPct.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Ann. Volatility</div>
                <div className="text-lg font-bold text-slate-200">{activeSummary.maxSharpe.volatilityPct.toFixed(1)}%</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-300">
              <span className="font-semibold text-slate-400">Top Constituent Allocations:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {Object.entries(activeSummary.maxSharpe.weights)
                  .filter(([_, w]) => w > 3)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([ticker, w]) => (
                    <span key={ticker} className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 text-[10px] font-mono">
                      {TICKER_TO_STOCK[ticker]?.name || ticker}: <strong>{w.toFixed(0)}%</strong>
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* 2. Global Minimum Volatility */}
          <div className="bg-slate-800/80 rounded-xl p-4 border border-blue-500/30 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-blue-400 font-bold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                Global Minimum Volatility
              </span>
              <span className="text-[10px] font-mono bg-blue-400/10 text-blue-300 px-1.5 py-0.5 rounded border border-blue-400/20">
                Min Variance
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-slate-700/60 font-mono">
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Sharpe Ratio</div>
                <div className="text-lg font-bold text-blue-300">{activeSummary.minVol.sharpeRatio.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Exp. Return</div>
                <div className="text-lg font-bold text-slate-200">{activeSummary.minVol.expectedReturnPct.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Ann. Volatility</div>
                <div className="text-lg font-bold text-emerald-400">{activeSummary.minVol.volatilityPct.toFixed(1)}%</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-300">
              <span className="font-semibold text-slate-400">Top Constituent Allocations:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {Object.entries(activeSummary.minVol.weights)
                  .filter(([_, w]) => w > 3)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([ticker, w]) => (
                    <span key={ticker} className="bg-slate-900/80 px-2 py-0.5 rounded border border-slate-700 text-[10px] font-mono">
                      {TICKER_TO_STOCK[ticker]?.name || ticker}: <strong>{w.toFixed(0)}%</strong>
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* 3. Current User Custom Portfolio */}
          <div className="bg-slate-800/80 rounded-xl p-4 border border-purple-500/30 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-purple-400 font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Current Custom Allocation
              </span>
              <span className="text-[10px] font-mono bg-purple-400/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-400/20">
                User Defined
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center py-2 border-y border-slate-700/60 font-mono">
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Sharpe Ratio</div>
                <div className="text-lg font-bold text-purple-300">
                  {activeSummary.currentCustom?.sharpeRatio.toFixed(2) || '—'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Exp. Return</div>
                <div className="text-lg font-bold text-slate-200">
                  {activeSummary.currentCustom?.expectedReturnPct.toFixed(1) || '—'}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Ann. Volatility</div>
                <div className="text-lg font-bold text-slate-200">
                  {activeSummary.currentCustom?.volatilityPct.toFixed(1) || '—'}%
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-300">
              <span className="font-semibold text-slate-400">Optimization Efficiency Gap:</span>
              <p className="mt-1 text-slate-300 text-[11px]">
                {activeSummary.currentCustom && activeSummary.maxSharpe
                  ? `Tangency yields +${(activeSummary.maxSharpe.sharpeRatio - activeSummary.currentCustom.sharpeRatio).toFixed(2)} higher Sharpe ratio than current weights.`
                  : 'Slide weights in Portfolio Construction to test efficiency.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MARKOWITZ EFFICIENT FRONTIER PLOT (Dual Overlay or Single Portfolio) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              <span>Mean-Variance Optimization Space</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              {viewMode === 'Dual Overlay'
                ? 'Dual Portfolio Distribution & Markowitz Efficient Frontier Overlay'
                : `Markowitz Efficient Frontier: ${viewMode}`}
            </h3>
            <p className="text-xs text-slate-500">
              Risk (Annualized Volatility σ) vs Reward (Annualized Expected Return E[R])
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Max Stock Cap:</span>
            <select
              value={maxStockWeight}
              onChange={(e) => setMaxStockWeight(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono font-medium text-slate-800 cursor-pointer"
            >
              <option value={20}>20% Cap</option>
              <option value={35}>35% Cap (Default)</option>
              <option value={50}>50% Cap</option>
              <option value={100}>100% (Unconstrained)</option>
            </select>
          </div>
        </div>

        {/* Plotly Dual / Single Frontier Plot */}
        <div className="w-full">
          <PlotlyChart
            data={[
              // 1. Portfolio A Feasible Cloud (if Dual or Port A)
              ...(viewMode === 'Dual Overlay' || viewMode === 'Portfolio A'
                ? [
                    {
                      x: summaryA.feasiblePortfolios.map((p) => p.volatilityPct),
                      y: summaryA.feasiblePortfolios.map((p) => p.expectedReturnPct),
                      mode: 'markers' as const,
                      type: 'scatter' as const,
                      name: 'Port A Feasible Cloud',
                      marker: { color: '#fed7aa', size: 4, opacity: 0.45 },
                      hovertemplate: '<b>Port A Simulation</b><br>Vol: %{x:.1f}%<br>Ret: %{y:.1f}%<extra></extra>',
                    },
                    {
                      x: summaryA.frontierCurve.map((p) => p.volatilityPct),
                      y: summaryA.frontierCurve.map((p) => p.expectedReturnPct),
                      mode: 'lines' as const,
                      type: 'scatter' as const,
                      name: 'Port A Efficient Frontier',
                      line: { color: '#f97316', width: 3 },
                      hovertemplate: '<b>Port A Frontier</b><br>Vol: %{x:.1f}%<br>Ret: %{y:.1f}%<extra></extra>',
                    },
                    {
                      x: [summaryA.maxSharpe.volatilityPct],
                      y: [summaryA.maxSharpe.expectedReturnPct],
                      mode: 'markers+text' as const,
                      type: 'scatter' as const,
                      name: 'Port A Tangency (Max Sharpe)',
                      text: ['Port A Max Sharpe'],
                      textposition: 'top right' as const,
                      marker: { color: '#ea580c', size: 12, symbol: 'star' as any },
                    },
                    {
                      x: [summaryA.minVol.volatilityPct],
                      y: [summaryA.minVol.expectedReturnPct],
                      mode: 'markers+text' as const,
                      type: 'scatter' as const,
                      name: 'Port A Min Vol',
                      text: ['Port A Min Vol'],
                      textposition: 'bottom right' as const,
                      marker: { color: '#c2410c', size: 10, symbol: 'square' as any },
                    },
                    ...(summaryA.currentCustom
                      ? [
                          {
                            x: [summaryA.currentCustom.volatilityPct],
                            y: [summaryA.currentCustom.expectedReturnPct],
                            mode: 'markers+text' as const,
                            type: 'scatter' as const,
                            name: 'Port A Custom Allocation',
                            text: ['Port A Current'],
                            textposition: 'top left' as const,
                            marker: { color: '#f43f5e', size: 11, symbol: 'diamond' as any },
                          },
                        ]
                      : []),
                  ]
                : []),

              // 2. Portfolio B Feasible Cloud (if Dual or Port B)
              ...(viewMode === 'Dual Overlay' || viewMode === 'Portfolio B'
                ? [
                    {
                      x: summaryB.feasiblePortfolios.map((p) => p.volatilityPct),
                      y: summaryB.feasiblePortfolios.map((p) => p.expectedReturnPct),
                      mode: 'markers' as const,
                      type: 'scatter' as const,
                      name: 'Port B Feasible Cloud',
                      marker: { color: '#99f6e4', size: 4, opacity: 0.45 },
                      hovertemplate: '<b>Port B Simulation</b><br>Vol: %{x:.1f}%<br>Ret: %{y:.1f}%<extra></extra>',
                    },
                    {
                      x: summaryB.frontierCurve.map((p) => p.volatilityPct),
                      y: summaryB.frontierCurve.map((p) => p.expectedReturnPct),
                      mode: 'lines' as const,
                      type: 'scatter' as const,
                      name: 'Port B Efficient Frontier',
                      line: { color: '#0d9488', width: 3 },
                      hovertemplate: '<b>Port B Frontier</b><br>Vol: %{x:.1f}%<br>Ret: %{y:.1f}%<extra></extra>',
                    },
                    {
                      x: [summaryB.maxSharpe.volatilityPct],
                      y: [summaryB.maxSharpe.expectedReturnPct],
                      mode: 'markers+text' as const,
                      type: 'scatter' as const,
                      name: 'Port B Tangency (Max Sharpe)',
                      text: ['Port B Max Sharpe'],
                      textposition: 'top left' as const,
                      marker: { color: '#0f766e', size: 12, symbol: 'star' as any },
                    },
                    {
                      x: [summaryB.minVol.volatilityPct],
                      y: [summaryB.minVol.expectedReturnPct],
                      mode: 'markers+text' as const,
                      type: 'scatter' as const,
                      name: 'Port B Min Vol',
                      text: ['Port B Min Vol'],
                      textposition: 'bottom left' as const,
                      marker: { color: '#115e59', size: 10, symbol: 'square' as any },
                    },
                    ...(summaryB.currentCustom
                      ? [
                          {
                            x: [summaryB.currentCustom.volatilityPct],
                            y: [summaryB.currentCustom.expectedReturnPct],
                            mode: 'markers+text' as const,
                            type: 'scatter' as const,
                            name: 'Port B Custom Allocation',
                            text: ['Port B Current'],
                            textposition: 'top right' as const,
                            marker: { color: '#0284c7', size: 11, symbol: 'diamond' as any },
                          },
                        ]
                      : []),
                  ]
                : []),
            ]}
            layout={{
              height: 420,
              xaxis: {
                title: { text: 'Annualized Volatility (%) → Risk' },
                ticksuffix: '%',
                gridcolor: '#f1f5f9',
                zeroline: false,
              },
              yaxis: {
                title: { text: 'Annualized Expected Return (%)' },
                ticksuffix: '%',
                gridcolor: '#f1f5f9',
                zeroline: false,
              },
            }}
          />
        </div>

        {/* Dual Distribution Interpretation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <strong className="text-orange-900 block mb-1">Portfolio A (High Risk Universe):</strong>
            <p className="text-slate-600 leading-relaxed">
              Frontier spans higher expected returns (up to ~{summaryA.frontierCurve[summaryA.frontierCurve.length - 1]?.expectedReturnPct.toFixed(0)}%) but requires bearing substantial volatility (min vol is ~{summaryA.minVol.volatilityPct.toFixed(1)}%). Tangency Sharpe is {summaryA.maxSharpe.sharpeRatio.toFixed(2)}.
            </p>
          </div>
          <div>
            <strong className="text-teal-950 block mb-1">Portfolio B (Low Risk Universe):</strong>
            <p className="text-slate-600 leading-relaxed">
              Frontier is shifted sharply to the left, achieving global minimum volatility of only ~{summaryB.minVol.volatilityPct.toFixed(1)}% with dependable expected return of ~{summaryB.minVol.expectedReturnPct.toFixed(1)}%. Tangency Sharpe reaches {summaryB.maxSharpe.sharpeRatio.toFixed(2)}.
            </p>
          </div>
        </div>
      </div>

      {/* MARKOWITZ RESULTS FOR PRICES / TIME PERIOD GRAPH (Dynamic 5-Year Equity Backtest) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
              <LineChart className="w-3.5 h-3.5" />
              <span>Historical Price & Equity Growth Over Time</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Markowitz Optimal Portfolios Backtest: Cumulative Capital Growth
            </h3>
            <p className="text-xs text-slate-500">
              Tracing ₹15,00,000 capital compounded over the 60-month historical period (2021–2026) across Markowitz allocations
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono bg-slate-100 px-3 py-1.5 rounded-lg text-slate-700">
            <span>Base Capital: <strong>₹15,00,000</strong></span>
            <span>·</span>
            <span>Final Tangency: <strong>{formatINR(markowitzTimeSeries[markowitzTimeSeries.length - 1].valMaxSharpe)}</strong></span>
          </div>
        </div>

        {/* Plotly Markowitz Cumulative Wealth Line Chart */}
        <div className="w-full">
          <PlotlyChart
            data={[
              {
                x: markowitzTimeSeries.map((d) => d.date),
                y: markowitzTimeSeries.map((d) => d.valMaxSharpe),
                type: 'scatter',
                mode: 'lines',
                name: 'Markowitz Max Sharpe (Tangency)',
                line: { color: '#f59e0b', width: 2.8 },
                hovertemplate: '<b>Max Sharpe</b>: %{y:$,.0f}<br>Date: %{x}<extra></extra>',
              },
              {
                x: markowitzTimeSeries.map((d) => d.date),
                y: markowitzTimeSeries.map((d) => d.valMinVol),
                type: 'scatter',
                mode: 'lines',
                name: 'Markowitz Minimum Volatility',
                line: { color: '#0d9488', width: 2.5 },
                hovertemplate: '<b>Min Vol</b>: %{y:$,.0f}<br>Date: %{x}<extra></extra>',
              },
              {
                x: markowitzTimeSeries.map((d) => d.date),
                y: markowitzTimeSeries.map((d) => d.valCustom),
                type: 'scatter',
                mode: 'lines',
                name: 'Current Custom Allocation',
                line: { color: '#6366f1', width: 2.2, dash: 'dash' },
                hovertemplate: '<b>Current Custom</b>: %{y:$,.0f}<br>Date: %{x}<extra></extra>',
              },
              {
                x: markowitzTimeSeries.map((d) => d.date),
                y: markowitzTimeSeries.map((d) => d.valEqual),
                type: 'scatter',
                mode: 'lines',
                name: 'Equal Weight (10% Each)',
                line: { color: '#64748b', width: 1.8 },
                hovertemplate: '<b>Equal Weight</b>: %{y:$,.0f}<br>Date: %{x}<extra></extra>',
              },
              {
                x: markowitzTimeSeries.map((d) => d.date),
                y: markowitzTimeSeries.map((d) => d.benchVal),
                type: 'scatter',
                mode: 'lines',
                name: 'NIFTY 50 Benchmark',
                line: { color: '#94a3b8', width: 1.5, dash: 'dot' },
                hovertemplate: '<b>NIFTY 50</b>: %{y:$,.0f}<br>Date: %{x}<extra></extra>',
              },
            ]}
            layout={{
              height: 350,
              yaxis: {
                title: { text: 'Portfolio Capital Value (INR ₹)' },
                gridcolor: '#f1f5f9',
                zeroline: false,
              },
              xaxis: {
                title: { text: 'Historical Observation Date (Monthly)' },
                gridcolor: '#f8fafc',
                showgrid: true,
              },
            }}
          />
        </div>

        {/* Backtest Findings Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
            <span className="text-[11px] text-amber-900 font-semibold block">Max Sharpe Tangency</span>
            <span className="font-mono text-base font-bold text-amber-950">
              {formatINR(markowitzTimeSeries[markowitzTimeSeries.length - 1].valMaxSharpe)}
            </span>
            <span className="text-[10px] text-amber-700 block mt-0.5">
              +{(((markowitzTimeSeries[markowitzTimeSeries.length - 1].valMaxSharpe - filters.initialCapital) / filters.initialCapital) * 100).toFixed(1)}% Cumulative
            </span>
          </div>

          <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
            <span className="text-[11px] text-teal-900 font-semibold block">Minimum Volatility</span>
            <span className="font-mono text-base font-bold text-teal-950">
              {formatINR(markowitzTimeSeries[markowitzTimeSeries.length - 1].valMinVol)}
            </span>
            <span className="text-[10px] text-teal-700 block mt-0.5">
              +{(((markowitzTimeSeries[markowitzTimeSeries.length - 1].valMinVol - filters.initialCapital) / filters.initialCapital) * 100).toFixed(1)}% Cumulative
            </span>
          </div>

          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
            <span className="text-[11px] text-indigo-900 font-semibold block">Current Custom Weights</span>
            <span className="font-mono text-base font-bold text-indigo-950">
              {formatINR(markowitzTimeSeries[markowitzTimeSeries.length - 1].valCustom)}
            </span>
            <span className="text-[10px] text-indigo-700 block mt-0.5">
              Live weights synced
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-700 font-semibold block">NIFTY 50 Benchmark</span>
            <span className="font-mono text-base font-bold text-slate-900">
              {formatINR(markowitzTimeSeries[markowitzTimeSeries.length - 1].benchVal)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Market baseline growth
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
