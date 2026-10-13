import React, { useState } from 'react';
import {
  StockStatistics,
  PortfolioPerformanceMetrics,
  GlobalFilterState,
} from '../types';
import { formatINR } from '../utils/math';
import { RotateCcw, PieChart, Info, ShieldCheck, Check } from 'lucide-react';

interface PortfolioConstructionProps {
  stockStats: StockStatistics[];
  metricsA: PortfolioPerformanceMetrics;
  metricsB: PortfolioPerformanceMetrics;
  weightsA: Record<string, number>;
  weightsB: Record<string, number>;
  onChangeWeightsA: (w: Record<string, number>) => void;
  onChangeWeightsB: (w: Record<string, number>) => void;
  filters: GlobalFilterState;
  rolling12A: { date: string; rollingReturnPct: number; rollingVolPct: number }[];
  rolling12B: { date: string; rollingReturnPct: number; rollingVolPct: number }[];
}

export function PortfolioConstructionPage({
  stockStats,
  metricsA,
  metricsB,
  weightsA,
  weightsB,
  onChangeWeightsA,
  onChangeWeightsB,
  filters,
  rolling12A,
  rolling12B,
}: PortfolioConstructionProps) {
  const [activePortfolioTab, setActivePortfolioTab] = useState<'Portfolio A' | 'Portfolio B'>('Portfolio A');

  const stocksA = stockStats.filter((s) => s.portfolio === 'Portfolio A');
  const stocksB = stockStats.filter((s) => s.portfolio === 'Portfolio B');

  const currentStocks = activePortfolioTab === 'Portfolio A' ? stocksA : stocksB;
  const currentWeights = activePortfolioTab === 'Portfolio A' ? weightsA : weightsB;
  const currentMetrics = activePortfolioTab === 'Portfolio A' ? metricsA : metricsB;
  const setWeights = activePortfolioTab === 'Portfolio A' ? onChangeWeightsA : onChangeWeightsB;

  // Weight sum check
  const totalWeight = Object.values(currentWeights).reduce((sum, w) => sum + w, 0);

  const handleWeightChange = (ticker: string, val: number) => {
    setWeights({
      ...currentWeights,
      [ticker]: Math.max(0, Math.min(100, val)),
    });
  };

  const handleResetEqualWeight = () => {
    const eqWeights: Record<string, number> = {};
    currentStocks.forEach((s) => {
      eqWeights[s.ticker] = 10.0;
    });
    setWeights(eqWeights);
  };

  const handleNormalizeWeights = () => {
    if (totalWeight <= 0) return;
    const norm: Record<string, number> = {};
    currentStocks.forEach((s) => {
      const w = currentWeights[s.ticker] || 0;
      norm[s.ticker] = Number(((w / totalWeight) * 100).toFixed(2));
    });
    setWeights(norm);
  };

  // Sector Exposure aggregation
  const sectorExposure: Record<string, number> = {};
  currentStocks.forEach((s) => {
    const w = currentWeights[s.ticker] || 0;
    sectorExposure[s.sector] = (sectorExposure[s.sector] || 0) + w;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Portfolio Construction & Dynamic Weighting
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Constituent Equities, Sector Allocation & Capital Sizing
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            Initial Allocation: 10 Equities · Equal Weight 10.0% (₹1,50,000 per stock) · Total ₹15 Lakh
          </div>
        </div>

        {/* Portfolio Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-lg">
          <button
            onClick={() => setActivePortfolioTab('Portfolio A')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activePortfolioTab === 'Portfolio A'
                ? 'bg-orange-500 text-white shadow-2xs font-semibold'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Portfolio A (High Risk)
          </button>
          <button
            onClick={() => setActivePortfolioTab('Portfolio B')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              activePortfolioTab === 'Portfolio B'
                ? 'bg-teal-600 text-white shadow-2xs font-semibold'
                : 'text-slate-700 hover:text-slate-900'
            }`}
          >
            Portfolio B (Low Risk)
          </button>
        </div>
      </div>

      {/* Allocation Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-semibold text-slate-800">
            Total Allocated Weight:
          </span>
          <span
            className={`font-mono text-sm font-bold px-2.5 py-0.5 rounded ${
              Math.abs(totalWeight - 100) < 0.1
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {totalWeight.toFixed(1)}% / 100.0%
          </span>
          {Math.abs(totalWeight - 100) > 0.1 && (
            <span className="text-amber-700 text-xs">
              Weights will be normalized to 100% for metric calculations.
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetEqualWeight}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Equal Weight (10% Each)</span>
          </button>
          {Math.abs(totalWeight - 100) > 0.1 && (
            <button
              onClick={handleNormalizeWeights}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Normalize to 100%</span>
            </button>
          )}
        </div>
      </div>

      {/* Constituents Table with Weight Sliders */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            {activePortfolioTab} Constituents (10 Indian Equities)
          </h3>
          <span className="text-[11px] text-slate-500">
            Use sliders to adjust individual allocations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-3">Company</th>
                <th className="p-3">Ticker</th>
                <th className="p-3">Sector</th>
                <th className="p-3 w-48">Weight Allocation</th>
                <th className="p-3 text-right">Capital Allocated</th>
                <th className="p-3 text-right">CAGR Return</th>
                <th className="p-3 text-right">Ann. Volatility</th>
                <th className="p-3 text-right">Nifty Beta</th>
                <th className="p-3 text-right">95% VaR</th>
                <th className="p-3 text-right">95% ES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {currentStocks.map((s) => {
                const w = currentWeights[s.ticker] || 0;
                const allocatedRupees = (w / 100) * filters.initialCapital;

                return (
                  <tr key={s.ticker} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-sans font-medium text-slate-900 whitespace-nowrap">
                      {s.name}
                    </td>
                    <td className="p-3 text-slate-500">{s.ticker.replace('.NS', '')}</td>
                    <td className="p-3 font-sans text-slate-600 whitespace-nowrap">{s.sector}</td>
                    <td className="p-3 font-sans">
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={0}
                          max={40}
                          step={1}
                          value={w}
                          onChange={(e) => handleWeightChange(s.ticker, parseFloat(e.target.value))}
                          className={`w-28 accent-slate-800 h-1.5 bg-slate-200 rounded cursor-pointer ${
                            activePortfolioTab === 'Portfolio A' ? 'accent-orange-500' : 'accent-teal-600'
                          }`}
                        />
                        <span className="font-mono text-xs font-semibold text-slate-900 w-10 text-right">
                          {w.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right text-slate-900">
                      {formatINR(allocatedRupees)}
                    </td>
                    <td
                      className={`p-3 text-right font-semibold ${
                        s.annualizedReturnPct >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {s.annualizedReturnPct.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right text-slate-800">
                      {s.annualizedVolPct.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right text-slate-600">
                      {s.beta.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-rose-700">
                      {s.var95Pct.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right text-rose-800">
                      {s.es95Pct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sector Breakdown & Rebalancing Mechanics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sector Exposure Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Sector Exposure Breakdown ({activePortfolioTab})
              </h3>
              <p className="text-xs text-slate-500">
                Sum of constituent weights grouped by industrial sector
              </p>
            </div>
            <PieChart className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-2.5">
            {Object.entries(sectorExposure)
              .sort((a, b) => b[1] - a[1])
              .map(([sector, pct]) => {
                const effectivePct = totalWeight > 0 ? (pct / totalWeight) * 100 : 0;
                return (
                  <div key={sector}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{sector}</span>
                      <span className="font-mono text-slate-900 font-semibold">
                        {effectivePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          activePortfolioTab === 'Portfolio A' ? 'bg-orange-500' : 'bg-teal-600'
                        }`}
                        style={{ width: `${Math.min(100, effectivePct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Rolling 12-Month Performance Dynamics */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Rolling 12-Month Performance Comparison
              </h3>
              <p className="text-xs text-slate-500">
                Rolling 1-year cumulative returns over time (Portfolio A vs Portfolio B)
              </p>
            </div>
          </div>

          {/* Rolling SVG Chart */}
          <div className="relative w-full">
            <svg viewBox="0 0 450 180" className="w-full h-auto select-none">
              <line x1={40} y1={20} x2={40} y2={150} stroke="#cbd5e1" />
              <line x1={40} y1={90} x2={440} y2={90} stroke="#94a3b8" strokeDasharray="3 3" />
              <text x={35} y={93} fontSize="9" fill="#64748b" textAnchor="end">0%</text>
              <text x={35} y={25} fontSize="9" fill="#64748b" textAnchor="end">+60%</text>
              <text x={35} y={150} fontSize="9" fill="#64748b" textAnchor="end">-30%</text>

              {/* Lines */}
              {rolling12A.length > 0 && (
                <path
                  d={rolling12A.map((d, i) => {
                    const x = 45 + (i / (rolling12A.length - 1)) * 390;
                    const y = 90 - (d.rollingReturnPct / 70) * 60;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${Math.max(15, Math.min(160, y))}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2"
                />
              )}
              {rolling12B.length > 0 && (
                <path
                  d={rolling12B.map((d, i) => {
                    const x = 45 + (i / (rolling12B.length - 1)) * 390;
                    const y = 90 - (d.rollingReturnPct / 70) * 60;
                    return `${i === 0 ? 'M' : 'L'} ${x} ${Math.max(15, Math.min(160, y))}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="2"
                />
              )}
            </svg>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-600 mt-2">
              <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                <span className="w-2.5 h-0.5 bg-orange-500 inline-block" />
                Portfolio A Rolling 1-Yr Return
              </span>
              <span className="flex items-center gap-1.5 text-teal-700 font-medium">
                <span className="w-2.5 h-0.5 bg-teal-600 inline-block" />
                Portfolio B Rolling 1-Yr Return
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="font-medium text-slate-700 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              Rebalancing Assumption:
            </div>
            <p>
              Current mode: <strong>{filters.rebalanceFrequency}</strong>.
              Under monthly rebalancing, target weights are restored at the beginning of each calendar month. Under Buy & Hold, allocations drift proportionally to cumulative price appreciation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
