import React, { useState } from 'react';
import { GlobalFilterState, HistoricalRiskComparisonPeriod } from '../types';
import { HISTORICAL_RISK_COMPARISON } from '../data/dailyRiskData';
import { PlotlyChart } from '../components/charts/PlotlyChart';
import { exportToCSV } from '../utils/excel';
import {
  Flame,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Info,
  Download,
  Calendar,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

interface StressTestingProps {
  filters: GlobalFilterState;
}

export function StressTestingPage({ filters }: StressTestingProps) {
  const [comparableMode, setComparableMode] = useState<boolean>(true);
  const [activeMetricTab, setActiveMetricTab] = useState<'downsideBeta' | 'volatility' | 'sortino' | 'drawdown'>('downsideBeta');

  const comparisonData = HISTORICAL_RISK_COMPARISON;

  const handleDownloadHistoricalComparison = () => {
    const csvRows = comparisonData.map((row) => ({
      Period: row.periodName,
      Portfolio: row.portfolio,
      'Start Date': row.startDate,
      'End Date': row.endDate,
      'Aligned Observations': row.alignedObsCount,
      'Negative Market Days': row.negativeMarketObsCount,
      'Included Equities': `${row.includedStocksCount}/10`,
      'Included Tickers': row.includedTickers.join(', '),
      'Excluded Tickers': row.excludedTickers.length > 0 ? row.excludedTickers.join(', ') : 'None',
      'Annualized Volatility (%)': row.annualizedVolPct,
      'Ordinary Beta (β)': row.ordinaryBeta,
      'Downside Beta (β-)': row.downsideBeta,
      'Sortino Ratio': row.sortinoRatio,
      '95% Historical VaR (%)': row.var95Pct,
      '95% Expected Shortfall (%)': row.es95Pct,
      'Maximum Drawdown (%)': row.maxDrawdownPct,
      'Cumulative Return (%)': row.cumulativeReturnPct,
      'CAGR Return (%)': row.cagrReturnPct,
    }));
    exportToCSV(csvRows, 'historical_risk_comparison');
  };

  // Group by period
  const periods = ['calm', 'covid', 'recent'] as const;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-rose-600">
            <Flame className="w-3.5 h-3.5" />
            <span>Macroeconomic Stress Testing & Historical Regime Shifts</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Historical Risk Comparison: Calm (2017–19), COVID Crisis (2020) & Recent Sample
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            Cross-regime invariance testing · Downside Beta, Sortino, VaR, ES & Drawdown across 3 distinct market regimes
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadHistoricalComparison}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Download full 3-period comparison table in CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>historical_risk_comparison.csv</span>
          </button>
        </div>
      </div>

      {/* Survivorship Disclosure Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold text-amber-950 block">
            Academic Governance Disclosure: Heterogeneous Listing Dates & Survivorship Bias Governance
          </strong>
          <p className="leading-relaxed">
            Equities in Portfolio A possess differing listing histories. In particular,{' '}
            <strong>Mazagon Dock (listed Oct 2020), Zomato (listed Jul 2021), and Paytm (listed Nov 2021)</strong>{' '}
            did not trade during the Calm (2017–2019) or COVID Crisis (Feb–May 2020) windows.
          </p>
          <p className="leading-relaxed text-amber-800">
            To prevent survivorship bias and avoid zero-imputation distortions:
            (1) Unlisted equities are strictly excluded from historical periods prior to their IPO date.
            (2) Portfolio weights in each historical period remain uniform across available traded equities.
            (3) The Recent Sample (2021–2026) incorporates all 10 equities across both portfolios for a complete contemporary comparison.
          </p>
        </div>
      </div>

      {/* MASTER 3-PERIOD HISTORICAL RISK COMPARISON TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Table 1: 3-Period Historical Risk & Downside Performance Master Matrix
            </h3>
            <span className="text-[11px] text-slate-500">
              Calm Reference Period vs COVID-19 Acute Crisis vs Recent 5-Year Sample
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
            Target Return: {filters.riskFreeRatePct}% p.a. · Factor: √252 (Daily)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 font-sans">
                <th className="p-3">Market Regime Window</th>
                <th className="p-3">Portfolio</th>
                <th className="p-3">Traded Equities</th>
                <th className="p-3 text-right">Aligned Obs</th>
                <th className="p-3 text-right">Down Days</th>
                <th className="p-3 text-right font-bold text-slate-900">Ann. Volatility</th>
                <th className="p-3 text-right font-bold text-slate-900">Ordinary β</th>
                <th className="p-3 text-right font-bold text-rose-700">Downside β⁻</th>
                <th className="p-3 text-right font-bold text-slate-900">Sortino</th>
                <th className="p-3 text-right text-rose-700">95% VaR</th>
                <th className="p-3 text-right text-rose-800">95% ES</th>
                <th className="p-3 text-right font-bold text-red-700">Max Drawdown</th>
                <th className="p-3 text-right">Cumulative</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comparisonData.map((row, i) => {
                const isCrisis = row.periodKey === 'covid';
                const isPortA = row.portfolio === 'Portfolio A';

                return (
                  <tr
                    key={i}
                    className={`hover:bg-slate-50 transition-colors ${
                      isCrisis ? 'bg-red-50/20' : ''
                    } ${i % 2 === 0 ? 'border-t-2 border-slate-200' : ''}`}
                  >
                    <td className="p-3 font-sans font-medium text-slate-800 whitespace-nowrap">
                      <div>{row.periodName}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">{row.dateRange}</div>
                    </td>
                    <td className="p-3 font-sans font-bold">
                      <span className={isPortA ? 'text-orange-600' : 'text-teal-700'}>
                        {row.portfolio}
                      </span>
                    </td>
                    <td className="p-3 font-sans">
                      <span className="font-semibold text-slate-900">{row.includedStocksCount} / 10</span>
                      {row.excludedTickers.length > 0 && (
                        <div
                          className="text-[10px] text-amber-700 mt-0.5 truncate max-w-xs"
                          title={row.excludedTickers.join(', ')}
                        >
                          Excl: {row.excludedTickers.map((t) => t.split(' ')[0].replace('.NS', '')).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right text-slate-700">{row.alignedObsCount} d</td>
                    <td className="p-3 text-right text-slate-600">{row.negativeMarketObsCount} d</td>
                    <td className="p-3 text-right font-bold text-slate-900">{row.annualizedVolPct}%</td>
                    <td className="p-3 text-right text-slate-800">{row.ordinaryBeta.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-rose-700">{row.downsideBeta.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-slate-900">{row.sortinoRatio.toFixed(2)}</td>
                    <td className="p-3 text-right text-rose-700">{row.var95Pct}%</td>
                    <td className="p-3 text-right text-rose-800">{row.es95Pct}%</td>
                    <td className="p-3 text-right font-bold text-red-700">{row.maxDrawdownPct}%</td>
                    <td
                      className={`p-3 text-right font-bold ${
                        row.cumulativeReturnPct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {row.cumulativeReturnPct > 0 ? `+${row.cumulativeReturnPct}%` : `${row.cumulativeReturnPct}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PLOTLY REGIME COMPARISON INTERACTIVE VISUAL */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Cross-Regime Comparative Bar Analytics (Plotly Interactive)
            </h3>
            <p className="text-xs text-slate-500">
              Compare risk measures across Calm, COVID Shock, and Recent periods
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg self-start sm:self-auto text-xs">
            <button
              onClick={() => setActiveMetricTab('downsideBeta')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeMetricTab === 'downsideBeta'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Downside Beta (β⁻)
            </button>
            <button
              onClick={() => setActiveMetricTab('volatility')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeMetricTab === 'volatility'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual Volatility (%)
            </button>
            <button
              onClick={() => setActiveMetricTab('sortino')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeMetricTab === 'sortino'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sortino Ratio
            </button>
            <button
              onClick={() => setActiveMetricTab('drawdown')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                activeMetricTab === 'drawdown'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Max Drawdown (%)
            </button>
          </div>
        </div>

        {/* Plotly Grouped Bar Chart */}
        <div>
          <PlotlyChart
            data={[
              {
                x: ['Calm Period (2017–19)', 'COVID Crisis (2020)', 'Recent Sample (2021–26)'],
                y: [
                  activeMetricTab === 'downsideBeta'
                    ? 1.34
                    : activeMetricTab === 'volatility'
                    ? 29.84
                    : activeMetricTab === 'sortino'
                    ? 1.48
                    : -27.42,
                  activeMetricTab === 'downsideBeta'
                    ? 1.54
                    : activeMetricTab === 'volatility'
                    ? 56.78
                    : activeMetricTab === 'sortino'
                    ? -0.84
                    : -48.16,
                  activeMetricTab === 'downsideBeta'
                    ? 1.48
                    : activeMetricTab === 'volatility'
                    ? 31.42
                    : activeMetricTab === 'sortino'
                    ? 1.68
                    : -34.82,
                ],
                name: 'Portfolio A (High Risk)',
                type: 'bar',
                marker: { color: '#f97316' },
                hovertemplate: '<b>Portfolio A</b><br>Period: %{x}<br>Value: %{y}<extra></extra>',
              },
              {
                x: ['Calm Period (2017–19)', 'COVID Crisis (2020)', 'Recent Sample (2021–26)'],
                y: [
                  activeMetricTab === 'downsideBeta'
                    ? 0.67
                    : activeMetricTab === 'volatility'
                    ? 13.42
                    : activeMetricTab === 'sortino'
                    ? 2.14
                    : -11.85,
                  activeMetricTab === 'downsideBeta'
                    ? 0.69
                    : activeMetricTab === 'volatility'
                    ? 28.15
                    : activeMetricTab === 'sortino'
                    ? -0.38
                    : -27.34,
                  activeMetricTab === 'downsideBeta'
                    ? 0.63
                    : activeMetricTab === 'volatility'
                    ? 12.84
                    : activeMetricTab === 'sortino'
                    ? 2.06
                    : -14.28,
                ],
                name: 'Portfolio B (Low Risk)',
                type: 'bar',
                marker: { color: '#0d9488' },
                hovertemplate: '<b>Portfolio B</b><br>Period: %{x}<br>Value: %{y}<extra></extra>',
              },
            ]}
            layout={{
              barmode: 'group',
              height: 300,
              yaxis: {
                title: {
                  text:
                    activeMetricTab === 'downsideBeta'
                      ? 'Downside Beta (β⁻)'
                      : activeMetricTab === 'volatility'
                      ? 'Annualized Volatility (%)'
                      : activeMetricTab === 'sortino'
                      ? 'Sortino Ratio'
                      : 'Maximum Drawdown (%)',
                },
                gridcolor: '#f1f5f9',
              },
              xaxis: {
                gridcolor: '#f8fafc',
              },
            }}
          />
        </div>
      </div>

      {/* Cross-Regime Academic Summary Insights */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800">
        <div className="flex items-center gap-2.5 mb-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-slate-200">
            Empirical Cross-Regime Conclusions & Historical Stress Findings
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 leading-relaxed">
          <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/60">
            <strong className="text-white block font-semibold text-[13px] mb-1">
              1. Downside Beta Persistence
            </strong>
            <p>
              In all three regimes, Portfolio A Downside Beta consistently exceeded 1.30 (reaching 1.54 during the COVID shock), confirming that its systematic risk accelerates when the broad market declines. Portfolio B Downside Beta was persistently dampened between 0.63 and 0.69.
            </p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/60">
            <strong className="text-white block font-semibold text-[13px] mb-1">
              2. Asymmetric Crisis Drawdown
            </strong>
            <p>
              During the 2020 acute crisis window, Portfolio A fell -48.16% peak-to-trough, with a daily 95% Expected Shortfall of 8.94%. Portfolio B suffered a maximum drawdown of only -27.34%, proving that defensive FMCG and utilities provide critical balance-sheet protection.
            </p>
          </div>

          <div className="bg-slate-800/60 p-3.5 rounded-lg border border-slate-700/60">
            <strong className="text-white block font-semibold text-[13px] mb-1">
              3. Recent Period Compounding
            </strong>
            <p>
              In the 2021–2026 sample, Portfolio A capitalized on heavy growth in electronics manufacturing (Dixon) and defense (Mazdock) to deliver a +268.45% cumulative return, yet still bore a maximum drawdown of -34.82% vs -14.28% for Portfolio B.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
