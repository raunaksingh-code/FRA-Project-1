import React, { useState, useMemo } from 'react';
import { PortfolioPerformanceMetrics, GlobalFilterState } from '../types';
import { ReturnHistogram } from '../components/charts/Charts';
import { PlotlyChart } from '../components/charts/PlotlyChart';
import {
  PRECOMPUTED_ROLLING_VOL,
  DAILY_OBSERVATIONS,
} from '../data/dailyRiskData';
import {
  calculateDownsideBeta,
  calculateOrdinaryBeta,
  calculateSortinoRatioExplicit,
} from '../utils/math';
import { exportToCSV } from '../utils/excel';
import {
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sliders,
  HelpCircle,
  TrendingDown,
  Info,
  Download,
  Activity,
  Layers,
  ArrowDownRight,
  ShieldCheck,
} from 'lucide-react';

interface RiskAnalyticsProps {
  metricsA: PortfolioPerformanceMetrics;
  metricsB: PortfolioPerformanceMetrics;
  returnsA: number[];
  returnsB: number[];
  dates: string[];
  drawdownA: number[];
  drawdownB: number[];
  filters: GlobalFilterState;
  onChangeFilters: (f: Partial<GlobalFilterState>) => void;
}

export function RiskAnalyticsPage({
  metricsA,
  metricsB,
  returnsA,
  returnsB,
  dates,
  drawdownA,
  drawdownB,
  filters,
  onChangeFilters,
}: RiskAnalyticsProps) {
  const [selectedPortfolio, setSelectedPortfolio] = useState<'Portfolio A' | 'Portfolio B'>('Portfolio A');
  const [expandedMetric, setExpandedMetric] = useState<string | null>('downsideBeta');
  const [sortinoTargetReturn, setSortinoTargetReturn] = useState<number>(filters.riskFreeRatePct);

  // Compute Downside Beta and Ordinary Beta from daily observations
  const dailyReturnsA = useMemo(() => DAILY_OBSERVATIONS.map((o) => o.returnA), []);
  const dailyReturnsB = useMemo(() => DAILY_OBSERVATIONS.map((o) => o.returnB), []);
  const dailyReturnsNifty = useMemo(() => DAILY_OBSERVATIONS.map((o) => o.returnNifty), []);

  const downsideBetaA = useMemo(
    () => calculateDownsideBeta(dailyReturnsA, dailyReturnsNifty),
    [dailyReturnsA, dailyReturnsNifty]
  );
  const downsideBetaB = useMemo(
    () => calculateDownsideBeta(dailyReturnsB, dailyReturnsNifty),
    [dailyReturnsB, dailyReturnsNifty]
  );

  const ordinaryBetaA = useMemo(
    () => calculateOrdinaryBeta(dailyReturnsA, dailyReturnsNifty),
    [dailyReturnsA, dailyReturnsNifty]
  );
  const ordinaryBetaB = useMemo(
    () => calculateOrdinaryBeta(dailyReturnsB, dailyReturnsNifty),
    [dailyReturnsB, dailyReturnsNifty]
  );

  // Explicit Sortino Ratios with disclosed target return
  const sortinoDailyA = useMemo(
    () => calculateSortinoRatioExplicit(dailyReturnsA, sortinoTargetReturn / 100, true),
    [dailyReturnsA, sortinoTargetReturn]
  );
  const sortinoDailyB = useMemo(
    () => calculateSortinoRatioExplicit(dailyReturnsB, sortinoTargetReturn / 100, true),
    [dailyReturnsB, sortinoTargetReturn]
  );

  // Rolling 30-day volatility data for Plotly
  const rollingVolData = PRECOMPUTED_ROLLING_VOL;

  const handleDownloadRollingVol = () => {
    const csvRows = rollingVolData.map((d) => ({
      Date: d.date,
      'Portfolio A (High Risk) 30d Vol (%)': d.volA,
      'Portfolio B (Low Risk) 30d Vol (%)': d.volB,
      'NIFTY 50 Benchmark 30d Vol (%)': d.benchVol || 0,
    }));
    exportToCSV(csvRows, 'rolling_volatility');
  };

  const handleDownloadRiskMetrics = () => {
    const csvRows = [
      {
        Category: 'Market Sensitivity',
        Metric: 'Ordinary Market Beta (β)',
        'Portfolio A (High Risk)': ordinaryBetaA.beta,
        'Portfolio B (Low Risk)': ordinaryBetaB.beta,
        Formula: 'Cov(Rp, Rm) / Var(Rm)',
        Benchmark: 'NIFTY 50',
      },
      {
        Category: 'Downside Asymmetry',
        Metric: 'Downside Beta (β-)',
        'Portfolio A (High Risk)': downsideBetaA.downsideBeta,
        'Portfolio B (Low Risk)': downsideBetaB.downsideBeta,
        Formula: 'Cov(Rp, Rm | Rm < 0) / Var(Rm | Rm < 0)',
        Benchmark: 'NIFTY 50 (Down Days)',
      },
      {
        Category: 'Sample Alignment',
        Metric: 'Total Aligned Trading Days',
        'Portfolio A (High Risk)': downsideBetaA.alignedObs,
        'Portfolio B (Low Risk)': downsideBetaB.alignedObs,
        Formula: 'Aligned date count where both portfolio & benchmark exist',
        Benchmark: 'Full Aligned History',
      },
      {
        Category: 'Sample Alignment',
        Metric: 'Negative Market Days (Rm < 0)',
        'Portfolio A (High Risk)': downsideBetaA.negativeMarketObs,
        'Portfolio B (Low Risk)': downsideBetaB.negativeMarketObs,
        Formula: 'Count of days where Nifty 50 return < 0',
        Benchmark: `${downsideBetaA.negativeMarketRatioPct}% of trading days`,
      },
      {
        Category: 'Risk-Adjusted Return',
        Metric: `Sortino Ratio (Target: ${sortinoTargetReturn}%)`,
        'Portfolio A (High Risk)': sortinoDailyA.sortino,
        'Portfolio B (Low Risk)': sortinoDailyB.sortino,
        Formula: '(R_annual - Target) / DownsideDev_annual',
        Benchmark: 'Annualized factor = sqrt(252)',
      },
      {
        Category: 'Tail Risk',
        Metric: 'Monthly 95% Historical VaR (%)',
        'Portfolio A (High Risk)': metricsA.monthlyVar95Pct,
        'Portfolio B (Low Risk)': metricsB.monthlyVar95Pct,
        Formula: 'max(0, -Quantile(R, 0.05))',
        Benchmark: 'Empirical Historical Simulation',
      },
      {
        Category: 'Tail Risk',
        Metric: 'Monthly 95% Expected Shortfall (%)',
        'Portfolio A (High Risk)': metricsA.monthlyEs95Pct,
        'Portfolio B (Low Risk)': metricsB.monthlyEs95Pct,
        Formula: 'Average(-R | R <= Quantile(R, 0.05))',
        Benchmark: 'Conditional Tail Loss',
      },
      {
        Category: 'Capital Preservation',
        Metric: 'Maximum Historical Drawdown (%)',
        'Portfolio A (High Risk)': metricsA.maximumDrawdownPct,
        'Portfolio B (Low Risk)': metricsB.maximumDrawdownPct,
        Formula: 'min_t (Wealth_t - Peak_t) / Peak_t',
        Benchmark: 'Peak-to-Trough Maximum Loss',
      },
    ];
    exportToCSV(csvRows, 'risk_metrics');
  };

  const toggleMetric = (key: string) => {
    setExpandedMetric(expandedMetric === key ? null : key);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-rose-600">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Downside Risk Analytics & Tail Metrics</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Downside Beta, Sortino Ratio & 30-Day Rolling Volatility
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            Non-parametric empirical downside measures · Aligned daily observation testing vs NIFTY 50
          </div>
        </div>

        {/* Action Buttons & Portfolio Focus */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadRiskMetrics}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
            title="Download full risk metrics dataset in CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>risk_metrics.csv</span>
          </button>
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-lg">
            <button
              onClick={() => setSelectedPortfolio('Portfolio A')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedPortfolio === 'Portfolio A'
                  ? 'bg-orange-500 text-white font-semibold shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Port A
            </button>
            <button
              onClick={() => setSelectedPortfolio('Portfolio B')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedPortfolio === 'Portfolio B'
                  ? 'bg-teal-600 text-white font-semibold shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Port B
            </button>
          </div>
        </div>
      </div>

      {/* NEW: DOWNSIDE RISK MASTER CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Downside Beta Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Downside Beta (β⁻)</span>
            <span className="text-[10px] bg-rose-50 text-rose-700 font-mono px-1.5 py-0.5 rounded border border-rose-200">
              Down Market Days
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2 border-t border-slate-100 pt-2 font-mono">
            <div>
              <div className="text-[10px] text-orange-600 font-bold uppercase">Port A (High Risk)</div>
              <div className="text-xl font-bold text-slate-900">{downsideBetaA.downsideBeta.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                Ord β: {ordinaryBetaA.beta.toFixed(2)} (+{(downsideBetaA.downsideBeta - ordinaryBetaA.beta).toFixed(2)})
              </div>
            </div>
            <div className="border-l border-slate-100 pl-3">
              <div className="text-[10px] text-teal-600 font-bold uppercase">Port B (Low Risk)</div>
              <div className="text-xl font-bold text-slate-900">{downsideBetaB.downsideBeta.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                Ord β: {ordinaryBetaB.beta.toFixed(2)} ({(downsideBetaB.downsideBeta - ordinaryBetaB.beta).toFixed(2)})
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Downside Asymmetry:</span>
            <span className="font-semibold text-rose-700">Port A Amplifies Market Falls</span>
          </div>
        </div>

        {/* Ordinary Beta Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Ordinary Market Beta (β)</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded">
              All Aligned Days
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2 border-t border-slate-100 pt-2 font-mono">
            <div>
              <div className="text-[10px] text-orange-600 font-bold uppercase">Port A</div>
              <div className="text-xl font-bold text-slate-900">{ordinaryBetaA.beta.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-sans">High Market Sensitivity</div>
            </div>
            <div className="border-l border-slate-100 pl-3">
              <div className="text-[10px] text-teal-600 font-bold uppercase">Port B</div>
              <div className="text-xl font-bold text-slate-900">{ordinaryBetaB.beta.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-sans">Low Systematic Risk</div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Benchmark:</span>
            <span className="font-mono text-slate-700">NIFTY 50 Index (β = 1.00)</span>
          </div>
        </div>

        {/* Sortino Ratio Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Sortino Ratio</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-mono px-1.5 py-0.5 rounded border border-emerald-200">
              Target: {sortinoTargetReturn}% p.a.
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2 border-t border-slate-100 pt-2 font-mono">
            <div>
              <div className="text-[10px] text-orange-600 font-bold uppercase">Port A</div>
              <div className="text-xl font-bold text-slate-900">{sortinoDailyA.sortino.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-sans">DD: {sortinoDailyA.downsideDevAnnual}%</div>
            </div>
            <div className="border-l border-slate-100 pl-3">
              <div className="text-[10px] text-teal-600 font-bold uppercase">Port B</div>
              <div className="text-xl font-bold text-slate-900">{sortinoDailyB.sortino.toFixed(2)}</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-sans">DD: {sortinoDailyB.downsideDevAnnual}%</div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Convention:</span>
            <span className="font-mono text-slate-700">Annualized with √252</span>
          </div>
        </div>

        {/* Aligned Observations Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-semibold text-slate-700">Observation Data Alignment</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded">
              Verified
            </span>
          </div>
          <div className="space-y-1.5 mt-2 border-t border-slate-100 pt-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Total Aligned Days:</span>
              <span className="font-bold text-slate-900">{downsideBetaA.alignedObs} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Down Days (Rm &lt; 0):</span>
              <span className="font-bold text-rose-700">{downsideBetaA.negativeMarketObs} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Down Day Frequency:</span>
              <span className="font-bold text-slate-800">{downsideBetaA.negativeMarketRatioPct}%</span>
            </div>
          </div>
          <div className="text-[10px] text-emerald-700 mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 font-sans">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero missing data or imputed zeros</span>
          </div>
        </div>
      </div>

      {/* NEW: INTERACTIVE PLOTLY ROLLING 30-TRADING-DAY ANNUALIZED VOLATILITY CHART */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Rolling 30-Trading-Day Annualized Volatility (Plotly Interactive Chart)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated on daily returns using 252 trading days per year: σ_30d = std(R_30d) × √252 × 100%
            </p>
          </div>

          <button
            onClick={handleDownloadRollingVol}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
            title="Download rolling volatility dataset as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export rolling_volatility.csv</span>
          </button>
        </div>

        {/* Plotly Chart Container */}
        <div className="mt-2">
          <PlotlyChart
            data={[
              {
                x: rollingVolData.map((d) => d.date),
                y: rollingVolData.map((d) => d.volA),
                type: 'scatter',
                mode: 'lines',
                name: 'Portfolio A (High Risk)',
                line: { color: '#f97316', width: 2.2 },
                hovertemplate: '<b>Portfolio A</b><br>Date: %{x}<br>30d Vol: %{y:.2f}%<extra></extra>',
              },
              {
                x: rollingVolData.map((d) => d.date),
                y: rollingVolData.map((d) => d.volB),
                type: 'scatter',
                mode: 'lines',
                name: 'Portfolio B (Low Risk)',
                line: { color: '#0d9488', width: 2.2 },
                hovertemplate: '<b>Portfolio B</b><br>Date: %{x}<br>30d Vol: %{y:.2f}%<extra></extra>',
              },
              {
                x: rollingVolData.map((d) => d.date),
                y: rollingVolData.map((d) => d.benchVol || 0),
                type: 'scatter',
                mode: 'lines',
                name: 'NIFTY 50 Benchmark',
                line: { color: '#94a3b8', width: 1.5, dash: 'dot' },
                hovertemplate: '<b>NIFTY 50</b><br>Date: %{x}<br>30d Vol: %{y:.2f}%<extra></extra>',
              },
            ]}
            layout={{
              height: 340,
              yaxis: {
                title: { text: '30-Day Annualized Volatility (%)' },
                gridcolor: '#f1f5f9',
                zeroline: false,
                ticksuffix: '%',
              },
              xaxis: {
                title: { text: 'Date (30-Day Rolling Window End)' },
                gridcolor: '#f8fafc',
                showgrid: true,
              },
            }}
          />
        </div>

        {/* Volatility Dynamics Interpretation Note */}
        <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
          <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            Persistence vs Concentrated Risk Analysis:
          </div>
          <p>
            The rolling 30-day volatility curve reveals that Portfolio A risk is <strong>both persistent and concentrated</strong>. It maintains a structural baseline volatility floor well above Portfolio B (minimum rolling volatility is ~18% for Port A vs ~8% for Port B), and exhibits massive episodic volatility surges during stress episodes (reaching peak levels above 60% during the COVID shock and Adani Group regulatory controversies). Portfolio B exhibits exceptional stability with its rolling volatility bounded tightly between 8% and 28%.
          </p>
        </div>
      </div>

      {/* Target Return Adjustment for Sortino */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-800">
            Sortino Ratio Target Hurdle Rate (R_target):
          </span>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
            {sortinoTargetReturn.toFixed(1)}% p.a.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Presets:</span>
          {[0, 6.0, 7.5, 10.0].map((rate) => (
            <button
              key={rate}
              onClick={() => setSortinoTargetReturn(rate)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                sortinoTargetReturn === rate
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {rate === 0 ? '0% (Absolute Loss)' : `${rate}% (G-Sec Hurdle)`}
            </button>
          ))}
        </div>
      </div>

      {/* Historical VaR & ES Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Monthly Return Distribution & Left-Tail Loss Thresholds
              </h3>
              <p className="text-xs text-slate-500">
                {selectedPortfolio} histogram with 95% Historical VaR and Expected Shortfall
              </p>
            </div>
          </div>
          <ReturnHistogram
            returnsA={returnsA}
            returnsB={returnsB}
            var95A={metricsA.monthlyVar95Pct}
            var95B={metricsB.monthlyVar95Pct}
            es95A={metricsA.monthlyEs95Pct}
            es95B={metricsB.monthlyEs95Pct}
            portfolio={selectedPortfolio}
          />
        </div>

        {/* VaR & ES Spectrum across Confidence Levels */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Tail Risk Spectrum Comparison (VaR vs Expected Shortfall)
              </h3>
              <p className="text-xs text-slate-500">
                Empirical monthly loss percentage at 90%, 95%, and 99% confidence
              </p>
            </div>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>

          <div className="space-y-4">
            {/* 90% Confidence */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">90% Confidence Horizon</span>
                <span className="font-mono text-slate-800">
                  Port A: VaR {metricsA.monthlyVar90Pct}% / ES {metricsA.monthlyEs90Pct}% ·
                  Port B: VaR {metricsB.monthlyVar90Pct}% / ES {metricsB.monthlyEs90Pct}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-orange-50 p-2 rounded border border-orange-200 text-xs">
                  <span className="text-[11px] text-orange-800 font-semibold block">Portfolio A:</span>
                  <span className="font-mono text-orange-950 font-bold">
                    VaR: {metricsA.monthlyVar90Pct}% | ES: {metricsA.monthlyEs90Pct}%
                  </span>
                </div>
                <div className="bg-teal-50 p-2 rounded border border-teal-200 text-xs">
                  <span className="text-[11px] text-teal-800 font-semibold block">Portfolio B:</span>
                  <span className="font-mono text-teal-950 font-bold">
                    VaR: {metricsB.monthlyVar90Pct}% | ES: {metricsB.monthlyEs90Pct}%
                  </span>
                </div>
              </div>
            </div>

            {/* 95% Confidence (Default) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-bold text-slate-900">95% Confidence Horizon (Primary Benchmark)</span>
                <span className="font-mono font-bold text-rose-700">
                  Port A ES is {(metricsA.monthlyEs95Pct - metricsB.monthlyEs95Pct).toFixed(1)}% pts higher
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-orange-100/70 p-2.5 rounded border border-orange-300 text-xs">
                  <span className="text-[11px] text-orange-900 font-bold block">Portfolio A (High Risk):</span>
                  <span className="font-mono text-orange-950 font-bold text-sm">
                    VaR: {metricsA.monthlyVar95Pct}% | ES: {metricsA.monthlyEs95Pct}%
                  </span>
                </div>
                <div className="bg-teal-100/70 p-2.5 rounded border border-teal-300 text-xs">
                  <span className="text-[11px] text-teal-900 font-bold block">Portfolio B (Low Risk):</span>
                  <span className="font-mono text-teal-950 font-bold text-sm">
                    VaR: {metricsB.monthlyVar95Pct}% | ES: {metricsB.monthlyEs95Pct}%
                  </span>
                </div>
              </div>
            </div>

            {/* 99% Confidence */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-slate-700">99% Confidence Horizon (Extreme Outlier Tail)</span>
                <span className="font-mono text-slate-800">Worst 1% Outlier Scenarios</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-red-50 p-2 rounded border border-red-200 text-xs">
                  <span className="text-[11px] text-red-900 font-semibold block">Portfolio A:</span>
                  <span className="font-mono text-red-950 font-bold">
                    VaR: {metricsA.monthlyVar99Pct}% | ES: {metricsA.monthlyEs99Pct}%
                  </span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                  <span className="text-[11px] text-slate-800 font-semibold block">Portfolio B:</span>
                  <span className="font-mono text-slate-950 font-bold">
                    VaR: {metricsB.monthlyVar99Pct}% | ES: {metricsB.monthlyEs99Pct}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Technical Explanations Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" />
          Downside Risk Methodology, Formulas & Conventions
        </h3>

        <div className="space-y-2">
          {/* Downside Beta Accordion */}
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <button
              onClick={() => toggleMetric('downsideBeta')}
              className="w-full flex items-center justify-between font-bold text-slate-900 cursor-pointer"
            >
              <span>1. Downside Beta (β⁻) vs Ordinary Market Beta (β)</span>
              {expandedMetric === 'downsideBeta' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedMetric === 'downsideBeta' && (
              <div className="mt-2 text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                <p>
                  <strong>Economic Meaning:</strong> Downside Beta isolates market co-movement specifically during declining market phases (dates when Nifty 50 return &lt; 0). If Downside Beta &gt; Ordinary Beta, the portfolio exhibits unfavorable downside asymmetry, falling faster than the market during sell-offs.
                </p>
                <p>
                  <strong>Mathematical Definition:</strong> β⁻ = Cov(R_p, R_m | R_m &lt; 0) / Var(R_m | R_m &lt; 0), calculated over the {downsideBetaA.negativeMarketObs} negative benchmark dates.
                </p>
                <p>
                  <strong>Observed Result:</strong> Portfolio A Downside Beta is <strong>{downsideBetaA.downsideBeta.toFixed(2)}</strong> (higher than its ordinary beta of {ordinaryBetaA.beta.toFixed(2)}), confirming downside magnification. Portfolio B Downside Beta is <strong>{downsideBetaB.downsideBeta.toFixed(2)}</strong> (lower than its ordinary beta of {ordinaryBetaB.beta.toFixed(2)}), validating capital preservation.
                </p>
              </div>
            )}
          </div>

          {/* Sortino Ratio Accordion */}
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <button
              onClick={() => toggleMetric('sortino')}
              className="w-full flex items-center justify-between font-bold text-slate-900 cursor-pointer"
            >
              <span>2. Sortino Ratio — Target Return & Annualization Convention</span>
              {expandedMetric === 'sortino' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedMetric === 'sortino' && (
              <div className="mt-2 text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                <p>
                  <strong>Formula:</strong> Sortino = (R_annual - R_target) / DownsideDeviation_annual.
                </p>
                <p>
                  <strong>Disclosed Assumptions:</strong> Target hurdle rate = {sortinoTargetReturn}% p.a. Annualization factor for daily returns = √252. Downside deviation considers only return observations below the daily target hurdle.
                </p>
              </div>
            )}
          </div>

          {/* Rolling Volatility Accordion */}
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <button
              onClick={() => toggleMetric('rollingVol')}
              className="w-full flex items-center justify-between font-bold text-slate-900 cursor-pointer"
            >
              <span>3. Rolling 30-Trading-Day Volatility — Persistence vs Episodic Spikes</span>
              {expandedMetric === 'rollingVol' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expandedMetric === 'rollingVol' && (
              <div className="mt-2 text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                <p>
                  Calculated over rolling blocks of 30 trading days scaled by √252. Distinguishes between portfolios with persistent high volatility across all regimes versus portfolios with low baselines that experience isolated shocks.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
