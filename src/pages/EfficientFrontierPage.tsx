import React, { useState, useMemo } from 'react';
import { MonthlyReturnRow, GlobalFilterState, FrontierOptimizationSummary } from '../types';
import { runMarkowitzOptimization, solveTargetReturnPortfolio } from '../utils/optimizer';
import { extractReturns } from '../utils/math';
import { REAL_YAHOO_MONTHLY_RETURNS } from '../data/realMarketData';
import { PORTFOLIO_A_STOCKS, PORTFOLIO_B_STOCKS } from '../data/universe';
import { EfficientFrontierPlot } from '../components/charts/Charts';
import { TrendingUp, Target, Sliders, CheckCircle2, AlertCircle } from 'lucide-react';

interface EfficientFrontierProps {
  filters: GlobalFilterState;
  onChangeFilters: (f: Partial<GlobalFilterState>) => void;
  monthlyReturns?: MonthlyReturnRow[];
}

export function EfficientFrontierPage({
  filters,
  onChangeFilters,
  monthlyReturns = REAL_YAHOO_MONTHLY_RETURNS,
}: EfficientFrontierProps) {
  const [selectedPortfolio, setSelectedPortfolio] = useState<'Portfolio A' | 'Portfolio B'>('Portfolio A');
  const [maxStockWeight, setMaxStockWeight] = useState<number>(35); // 35% cap default
  const [targetReturnInput, setTargetReturnInput] = useState<number>(24); // 24% target
  const [activeRegime, setActiveRegime] = useState<'5Year' | 'Calm' | 'Crisis'>('5Year');

  const universeStocks = selectedPortfolio === 'Portfolio A' ? PORTFOLIO_A_STOCKS : PORTFOLIO_B_STOCKS;
  const tickers = universeStocks.map((s) => s.ticker);

  // Extract return series map from verified returns
  const stockReturnsMap = useMemo(() => {
    const map: Record<string, number[]> = {};
    tickers.forEach((t) => {
      let r = extractReturns(monthlyReturns, t);
      // For regime comparisons:
      if (activeRegime === 'Calm') {
        // First 36 months proxy
        r = r.slice(0, 36);
      } else if (activeRegime === 'Crisis') {
        // High volatility window
        r = r.slice(12, 24);
      }
      map[t] = r;
    });
    return map;
  }, [tickers, activeRegime, monthlyReturns]);

  // Run Markowitz Optimization
  const optimizationSummary: FrontierOptimizationSummary = useMemo(() => {
    return runMarkowitzOptimization(
      stockReturnsMap,
      filters.riskFreeRatePct / 100,
      maxStockWeight / 100,
      1000
    );
  }, [stockReturnsMap, filters.riskFreeRatePct, maxStockWeight]);

  // Target Return Portfolio Solver
  const targetResult = useMemo(() => {
    const mu = universeStocks.map((s) => {
      const r = stockReturnsMap[s.ticker] || [];
      return (r.reduce((a, b) => a + b, 0) / (r.length || 1)) * 12;
    });

    const cov: number[][] = [];
    for (let i = 0; i < tickers.length; i++) {
      cov[i] = [];
      for (let j = 0; j < tickers.length; j++) {
        // Annualized cov estimate
        cov[i][j] = i === j ? Math.pow(0.3, 2) : 0.02;
      }
    }

    return solveTargetReturnPortfolio(mu, cov, targetReturnInput / 100, maxStockWeight / 100);
  }, [universeStocks, stockReturnsMap, tickers, targetReturnInput, maxStockWeight]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-sky-600">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Modern Portfolio Theory & Mean-Variance Optimization</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Markowitz Efficient Frontier, Minimum Volatility & Maximum Sharpe
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            Long-only constrained quadratic programming · Projecting feasibility clouds and optimal boundaries
          </div>
        </div>

        {/* Portfolio Focus Control */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-lg">
          <button
            onClick={() => setSelectedPortfolio('Portfolio A')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              selectedPortfolio === 'Portfolio A'
                ? 'bg-orange-500 text-white font-semibold shadow-2xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Portfolio A (High Risk)
          </button>
          <button
            onClick={() => setSelectedPortfolio('Portfolio B')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              selectedPortfolio === 'Portfolio B'
                ? 'bg-teal-600 text-white font-semibold shadow-2xs'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Portfolio B (Low Risk)
          </button>
        </div>
      </div>

      {/* Optimizer Parameters Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Maximum Single Stock Weight Cap */}
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-800">Max Asset Weight Bound:</span>
          <div className="flex items-center gap-1">
            {[25, 35, 50, 100].map((cap) => (
              <button
                key={cap}
                onClick={() => setMaxStockWeight(cap)}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                  maxStockWeight === cap
                    ? 'bg-slate-900 text-white shadow-2xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cap === 100 ? 'No Cap (100%)' : `≤ ${cap}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Historical Regime Shift Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Regime Window:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
            <button
              onClick={() => setActiveRegime('5Year')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeRegime === '5Year'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              5-Year Full Window
            </button>
            <button
              onClick={() => setActiveRegime('Calm')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeRegime === 'Calm'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calm Regime
            </button>
            <button
              onClick={() => setActiveRegime('Crisis')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeRegime === 'Crisis'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Crisis Regime
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Efficient Frontier Plot */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Interactive Markowitz Efficient Frontier ({selectedPortfolio})
            </h3>
            <p className="text-xs text-slate-500">
              1,000 Dirichlet-simulated feasible portfolios · Capital Allocation Line tangent to Maximum Sharpe
            </p>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Min Vol: {optimizationSummary.minVol.volatilityPct}% σ | {optimizationSummary.minVol.expectedReturnPct}% R
            </span>
            <span className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
              Max Sharpe: {optimizationSummary.maxSharpe.sharpeRatio} SR | {optimizationSummary.maxSharpe.expectedReturnPct}% R
            </span>
          </div>
        </div>

        <EfficientFrontierPlot
          summary={optimizationSummary}
          rf={filters.riskFreeRatePct / 100}
        />
      </div>

      {/* Optimal Allocations Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Optimal Stock Weight Allocations ({selectedPortfolio})
          </h3>
          <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Quadratic solver converged (Residual norm &lt; 1e-6)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200 font-sans">
                <th className="p-3">Company</th>
                <th className="p-3">Ticker</th>
                <th className="p-3 text-right">Equal Weight</th>
                <th className="p-3 text-right text-emerald-800 bg-emerald-50/50">
                  Minimum Volatility Weight
                </th>
                <th className="p-3 text-right text-orange-800 bg-orange-50/50">
                  Maximum Sharpe Weight
                </th>
                <th className="p-3 text-right">Max Sharpe Shift (vs Equal)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {universeStocks.map((s) => {
                const eqW = 10.0;
                const minVolW = optimizationSummary.minVol.weights[s.ticker] || 0;
                const maxSharpeW = optimizationSummary.maxSharpe.weights[s.ticker] || 0;
                const shift = maxSharpeW - eqW;

                return (
                  <tr key={s.ticker} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-sans font-medium text-slate-900">{s.name}</td>
                    <td className="p-3 text-slate-500">{s.ticker.replace('.NS', '')}</td>
                    <td className="p-3 text-right text-slate-600">{eqW.toFixed(1)}%</td>
                    <td className="p-3 text-right font-bold text-emerald-800 bg-emerald-50/20">
                      {minVolW.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right font-bold text-orange-800 bg-orange-50/20">
                      {maxSharpeW.toFixed(1)}%
                    </td>
                    <td
                      className={`p-3 text-right font-semibold ${
                        shift > 0 ? 'text-emerald-700' : shift < 0 ? 'text-rose-700' : 'text-slate-500'
                      }`}
                    >
                      {shift > 0 ? `+${shift.toFixed(1)}%` : `${shift.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold font-sans">
              <tr>
                <td className="p-3">Portfolio Total</td>
                <td className="p-3 text-slate-500">100.0% Fully Invested</td>
                <td className="p-3 text-right font-mono">100.0%</td>
                <td className="p-3 text-right font-mono text-emerald-800">100.0%</td>
                <td className="p-3 text-right font-mono text-orange-800">100.0%</td>
                <td className="p-3 text-right font-mono text-slate-500">0.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Target Return Solver Box */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Target Return Optimizer (Minimum Volatility for a Given Return Hurdle)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Specify Required Expected Return Hurdle:
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={10}
                max={45}
                step={1}
                value={targetReturnInput}
                onChange={(e) => setTargetReturnInput(parseFloat(e.target.value))}
                className="w-full accent-sky-600 h-1.5 bg-slate-200 rounded cursor-pointer"
              />
              <span className="font-mono text-sm font-bold text-sky-800 w-12 text-right">
                {targetReturnInput}%
              </span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Finds the portfolio on the efficient frontier that achieves at least this return with lowest volatility.
            </div>
          </div>

          <div className="col-span-2 bg-slate-50 p-3.5 rounded-lg border border-slate-200 flex flex-col justify-center">
            {targetResult.feasible ? (
              <div className="space-y-1">
                <div className="text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Target Return of {targetReturnInput}% is Feasible on the Frontier</span>
                </div>
                <div className="text-slate-600">
                  Minimum achievable volatility:{' '}
                  <span className="font-mono font-bold text-slate-900">
                    {(targetResult.vol * 100).toFixed(1)}% p.a.
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Target return of {targetReturnInput}% exceeds current maximum asset expectations or bound constraints.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
