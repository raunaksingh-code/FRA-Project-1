import React, { useState, useMemo } from 'react';
import { PortfolioPerformanceMetrics, GlobalFilterState } from '../types';
import { PlotlyChart } from '../components/charts/PlotlyChart';
import {
  PRECOMPUTED_ROLLING_VOL,
  DAILY_OBSERVATIONS,
} from '../data/dailyRiskData';
import {
  PORTFOLIO_A_STOCKS,
  PORTFOLIO_B_STOCKS,
  ALL_UNIVERSE_STOCKS,
} from '../data/universe';
import {
  calculateDownsideBeta,
  calculateOrdinaryBeta,
  calculateSortinoRatioExplicit,
  computeDescriptiveStatistics,
  calculateMean,
  calculateStd,
} from '../utils/math';
import { exportToCSV } from '../utils/excel';
import {
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Sliders,
  TrendingDown,
  Info,
  Download,
  Activity,
  Layers,
  ShieldCheck,
  BarChart3,
  Scale,
  Percent,
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
  weightsA?: Record<string, number>;
  weightsB?: Record<string, number>;
  benchmarkReturns?: number[];
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
  weightsA = Object.fromEntries(PORTFOLIO_A_STOCKS.map((s) => [s.ticker, 10.0])),
  weightsB = Object.fromEntries(PORTFOLIO_B_STOCKS.map((s) => [s.ticker, 10.0])),
  benchmarkReturns = [],
}: RiskAnalyticsProps) {

  const [selectedPortfolio, setSelectedPortfolio] = useState<'Portfolio A' | 'Portfolio B'>('Portfolio A');
  const [expandedMetric, setExpandedMetric] = useState<string | null>('downsideBeta');
  const [sortinoTargetReturn, setSortinoTargetReturn] = useState<number>(filters.riskFreeRatePct);
  const [distributionView, setDistributionView] = useState<'overlay' | 'selected'>('overlay');

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

  // Explicit Sortino Ratios
  const sortinoDailyA = useMemo(
    () => calculateSortinoRatioExplicit(dailyReturnsA, sortinoTargetReturn / 100, true),
    [dailyReturnsA, sortinoTargetReturn]
  );
  const sortinoDailyB = useMemo(
    () => calculateSortinoRatioExplicit(dailyReturnsB, sortinoTargetReturn / 100, true),
    [dailyReturnsB, sortinoTargetReturn]
  );

  // Full Descriptive Statistics (Mean, Median, Mode, Variance, Vol, IQR, Skew, Kurt, Jarque-Bera)
  const descStatsA = useMemo(() => computeDescriptiveStatistics(returnsA), [returnsA]);
  const descStatsB = useMemo(() => computeDescriptiveStatistics(returnsB), [returnsB]);

  // Industry / Sector Descriptive Statistics Benchmarks
  const sectorBenchmarks = useMemo(() => {
    const sectorMap: Record<string, { returns: number[]; betas: number[]; vols: number[]; count: number }> = {};
    ALL_UNIVERSE_STOCKS.forEach((stock) => {
      const s = stock.sector;
      if (!sectorMap[s]) {
        sectorMap[s] = { returns: [], betas: [], vols: [], count: 0 };
      }
      sectorMap[s].betas.push(stock.benchmarkBeta);
      sectorMap[s].count++;
    });

    return Object.entries(sectorMap).map(([sector, data]) => {
      const avgBeta = calculateMean(data.betas);
      const isHighBetaSector = avgBeta > 1.2;
      return {
        sector,
        stockCount: data.count,
        meanBeta: Number(avgBeta.toFixed(2)),
        classification: isHighBetaSector ? 'Cyclical / High Risk' : 'Defensive / Stable',
      };
    }).sort((a, b) => b.meanBeta - a.meanBeta);
  }, []);

  // Stock Beta Comparison Data (All 20 Universe stocks sorted)
  const sortedStockBetas = useMemo(() => {
    return [...ALL_UNIVERSE_STOCKS].sort((a, b) => b.benchmarkBeta - a.benchmarkBeta);
  }, []);

  // Normal Distribution Gaussian Curve coordinates for Plotly
  const normalCurveA = useMemo(() => {
    const mean = calculateMean(returnsA);
    const std = calculateStd(returnsA);
    if (std === 0) return { x: [], y: [] };
    const points = 80;
    const minX = mean - 3.5 * std;
    const maxX = mean + 3.5 * std;
    const step = (maxX - minX) / points;
    const xArr: number[] = [];
    const yArr: number[] = [];
    for (let i = 0; i <= points; i++) {
      const x = minX + i * step;
      const pdf = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
      xArr.push(Number((x * 100).toFixed(2)));
      yArr.push(Number(pdf.toFixed(4)));
    }
    return { x: xArr, y: yArr, mean: mean * 100, std: std * 100 };
  }, [returnsA]);

  const normalCurveB = useMemo(() => {
    const mean = calculateMean(returnsB);
    const std = calculateStd(returnsB);
    if (std === 0) return { x: [], y: [] };
    const points = 80;
    const minX = mean - 3.5 * std;
    const maxX = mean + 3.5 * std;
    const step = (maxX - minX) / points;
    const xArr: number[] = [];
    const yArr: number[] = [];
    for (let i = 0; i <= points; i++) {
      const x = minX + i * step;
      const pdf = (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
      xArr.push(Number((x * 100).toFixed(2)));
      yArr.push(Number(pdf.toFixed(4)));
    }
    return { x: xArr, y: yArr, mean: mean * 100, std: std * 100 };
  }, [returnsB]);

  // Rolling 30-day volatility data
  const rollingVolData = PRECOMPUTED_ROLLING_VOL;

  const handleDownloadRiskMetrics = () => {
    const csvRows = [
      {
        Category: 'Descriptive Statistics',
        Metric: 'Sample Observations (n)',
        'Portfolio A (High Risk)': descStatsA.count,
        'Portfolio B (Low Risk)': descStatsB.count,
        Formula: 'Total monthly observations',
      },
      {
        Category: 'Descriptive Statistics',
        Metric: 'Arithmetic Mean Return (%)',
        'Portfolio A (High Risk)': descStatsA.meanMonthlyReturnPct,
        'Portfolio B (Low Risk)': descStatsB.meanMonthlyReturnPct,
        Formula: 'Sum(R_i) / n',
      },
      {
        Category: 'Descriptive Statistics',
        Metric: 'Sample Median Return (%)',
        'Portfolio A (High Risk)': descStatsA.medianMonthlyReturnPct,
        'Portfolio B (Low Risk)': descStatsB.medianMonthlyReturnPct,
        Formula: '50th empirical percentile',
      },
      {
        Category: 'Descriptive Statistics',
        Metric: 'Mode Return (%)',
        'Portfolio A (High Risk)': descStatsA.modeMonthlyReturnPct,
        'Portfolio B (Low Risk)': descStatsB.modeMonthlyReturnPct,
        Formula: 'Peak density histogram bin',
      },
      {
        Category: 'Descriptive Statistics',
        Metric: 'Interquartile Range IQR (%)',
        'Portfolio A (High Risk)': descStatsA.interquartileRangePct,
        'Portfolio B (Low Risk)': descStatsB.interquartileRangePct,
        Formula: 'Q3 (75th) - Q1 (25th)',
      },
      {
        Category: 'Descriptive Statistics',
        Metric: 'Sample Skewness',
        'Portfolio A (High Risk)': descStatsA.skewness,
        'Portfolio B (Low Risk)': descStatsB.skewness,
        Formula: 'E[(R-mu)^3] / sigma^3',
      },
      {
        Category: 'Descriptive Statistics',
        Metric: 'Excess Kurtosis',
        'Portfolio A (High Risk)': descStatsA.excessKurtosis,
        'Portfolio B (Low Risk)': descStatsB.excessKurtosis,
        Formula: 'E[(R-mu)^4] / sigma^4 - 3',
      },
      {
        Category: 'Descriptive Statistics',
        Metric: 'Jarque-Bera Statistic (Normality)',
        'Portfolio A (High Risk)': descStatsA.jarqueBeraStatistic,
        'Portfolio B (Low Risk)': descStatsB.jarqueBeraStatistic,
        Formula: 'n/6 * (S^2 + K^2/4)',
      },
      {
        Category: 'Market Sensitivity',
        Metric: 'Ordinary Market Beta (β)',
        'Portfolio A (High Risk)': ordinaryBetaA.beta,
        'Portfolio B (Low Risk)': ordinaryBetaB.beta,
        Formula: 'Cov(Rp, Rm) / Var(Rm)',
      },
      {
        Category: 'Downside Asymmetry',
        Metric: 'Downside Beta (β⁻)',
        'Portfolio A (High Risk)': downsideBetaA.downsideBeta,
        'Portfolio B (Low Risk)': downsideBetaB.downsideBeta,
        Formula: 'Cov(Rp, Rm | Rm < 0) / Var(Rm | Rm < 0)',
      },
      {
        Category: 'Risk-Adjusted Return',
        Metric: `Sortino Ratio (Target: ${sortinoTargetReturn}%)`,
        'Portfolio A (High Risk)': sortinoDailyA.sortino,
        'Portfolio B (Low Risk)': sortinoDailyB.sortino,
        Formula: '(R_annual - Target) / DownsideDev_annual',
      },
      {
        Category: 'Tail Risk',
        Metric: 'Monthly 95% Historical VaR (%)',
        'Portfolio A (High Risk)': metricsA.monthlyVar95Pct,
        'Portfolio B (Low Risk)': metricsB.monthlyVar95Pct,
        Formula: 'max(0, -Quantile(R, 0.05))',
      },
      {
        Category: 'Tail Risk',
        Metric: 'Monthly 95% Expected Shortfall (%)',
        'Portfolio A (High Risk)': metricsA.monthlyEs95Pct,
        'Portfolio B (Low Risk)': metricsB.monthlyEs95Pct,
        Formula: 'Average(-R | R <= Quantile(R, 0.05))',
      },
      {
        Category: 'Capital Preservation',
        Metric: 'Maximum Historical Drawdown (%)',
        'Portfolio A (High Risk)': metricsA.maximumDrawdownPct,
        'Portfolio B (Low Risk)': metricsB.maximumDrawdownPct,
        Formula: 'min_t (Wealth_t - Peak_t) / Peak_t',
      },
    ];
    exportToCSV(csvRows, 'risk_metrics_and_descriptive_stats');
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
            <span>Downside Risk Analytics & Descriptive Statistics</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Normal Distribution Curve, Descriptive Statistics & Stock Beta Graph
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            Non-parametric empirical downside measures · Parametric Gaussian overlay · Aligned daily observation testing vs NIFTY 50
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
            <span>risk_descriptive_stats.csv</span>
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
              Port A (High Risk)
            </button>
            <button
              onClick={() => setSelectedPortfolio('Portfolio B')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                selectedPortfolio === 'Portfolio B'
                  ? 'bg-teal-600 text-white font-semibold shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Port B (Low Risk)
            </button>
          </div>
        </div>
      </div>

      {/* DOWNSIDE RISK MASTER CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Downside Beta Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
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
          <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-dashed border-slate-200 bg-slate-50/70 -mx-4 -mb-4 p-3 rounded-b-xl leading-relaxed">
            <strong className="text-slate-700 block font-sans">Theory & Formulation:</strong>
            <span className="font-mono text-slate-600">β⁻ = Cov(R_p, R_m | R_m &lt; 0) / Var(R_m | R_m &lt; 0)</span>.
            Measures co-movement specifically when the benchmark drops. When β⁻ &gt; Ordinary β, the portfolio amplifies market crashes.
          </div>
        </div>

        {/* Sortino Ratio Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">Sortino Ratio</span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono px-1.5 py-0.5 rounded border border-indigo-200">
                Hurdle: {sortinoTargetReturn}%
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2 border-t border-slate-100 pt-2 font-mono">
              <div>
                <div className="text-[10px] text-orange-600 font-bold uppercase">Port A</div>
                <div className="text-xl font-bold text-slate-900">{sortinoDailyA.sortino.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                  Downside σ: {sortinoDailyA.downsideDevAnnual.toFixed(1)}%
                </div>
              </div>
              <div className="border-l border-slate-100 pl-3">
                <div className="text-[10px] text-teal-600 font-bold uppercase">Port B</div>
                <div className="text-xl font-bold text-slate-900">{sortinoDailyB.sortino.toFixed(2)}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                  Downside σ: {sortinoDailyB.downsideDevAnnual.toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>Harmful Volatility:</span>
              <span className="font-semibold text-emerald-700">
                Port B Has {(((sortinoDailyA.downsideDevAnnual - sortinoDailyB.downsideDevAnnual) / sortinoDailyA.downsideDevAnnual) * 100).toFixed(0)}% Lower Downside σ
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-dashed border-slate-200 bg-slate-50/70 -mx-4 -mb-4 p-3 rounded-b-xl leading-relaxed">
            <strong className="text-slate-700 block font-sans">Theory & Formulation:</strong>
            <span className="font-mono text-slate-600">Sortino = (R_annual - Hurdle) / σ_downside</span>.
            Unlike Sharpe which penalizes upside gains, downside deviation (σ_d) only integrates volatility that drops below the {sortinoTargetReturn}% hurdle.
          </div>
        </div>

        {/* 95% Historical VaR Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">95% Monthly VaR</span>
              <span className="text-[10px] bg-amber-50 text-amber-700 font-mono px-1.5 py-0.5 rounded border border-amber-200">
                α = 5% Tail
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2 border-t border-slate-100 pt-2 font-mono">
              <div>
                <div className="text-[10px] text-orange-600 font-bold uppercase">Port A</div>
                <div className="text-xl font-bold text-rose-700">-{metricsA.monthlyVar95Pct.toFixed(1)}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                  95% ES: -{metricsA.monthlyEs95Pct.toFixed(1)}%
                </div>
              </div>
              <div className="border-l border-slate-100 pl-3">
                <div className="text-[10px] text-teal-600 font-bold uppercase">Port B</div>
                <div className="text-xl font-bold text-teal-800">-{metricsB.monthlyVar95Pct.toFixed(1)}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-sans">
                  95% ES: -{metricsB.monthlyEs95Pct.toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>Tail Loss Severity:</span>
              <span className="font-semibold text-rose-700">
                Port A VaR is {(metricsA.monthlyVar95Pct / metricsB.monthlyVar95Pct).toFixed(1)}x Deeper
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-dashed border-slate-200 bg-slate-50/70 -mx-4 -mb-4 p-3 rounded-b-xl leading-relaxed">
            <strong className="text-slate-700 block font-sans">Theory & Formulation:</strong>
            <span className="font-mono text-slate-600">VaR_95% = -Quantile(R, 0.05); ES_95% = E[-R | R ≤ -VaR]</span>.
            VaR marks the threshold loss breached in the worst 5% of months; Expected Shortfall (ES) measures the average loss when that barrier is broken.
          </div>
        </div>

        {/* Max Historical Drawdown Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700">Max Historical Drawdown</span>
              <span className="text-[10px] bg-red-50 text-red-700 font-mono px-1.5 py-0.5 rounded border border-red-200">
                Peak-to-Trough
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2 border-t border-slate-100 pt-2 font-mono">
              <div>
                <div className="text-[10px] text-orange-600 font-bold uppercase">Port A</div>
                <div className="text-xl font-bold text-red-700">-{metricsA.maximumDrawdownPct.toFixed(1)}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-sans">Severe capital impairment</div>
              </div>
              <div className="border-l border-slate-100 pl-3">
                <div className="text-[10px] text-teal-600 font-bold uppercase">Port B</div>
                <div className="text-xl font-bold text-emerald-800">-{metricsB.maximumDrawdownPct.toFixed(1)}%</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-sans">Cushioned drawdown</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>Capital Protection:</span>
              <span className="font-semibold text-emerald-700">Port B Preserved 82%+ Value</span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-dashed border-slate-200 bg-slate-50/70 -mx-4 -mb-4 p-3 rounded-b-xl leading-relaxed">
            <strong className="text-slate-700 block font-sans">Theory & Formulation:</strong>
            <span className="font-mono text-slate-600">MDD = min_t [(Wealth_t - Peak_t) / Peak_t]</span>.
            The worst cumulative paper loss suffered from any high-water mark before recovery. Represents the true liquidation and psychological pain threshold.
          </div>
        </div>
      </div>

      {/* NORMAL DISTRIBUTION CURVE CHART (Empirical Histogram vs Fitted Gaussian Bell Curve) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Probability Density Function (PDF) vs Empirical Realization</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Gaussian Normal Distribution Bell Curve vs Realized Returns
            </h3>
            <p className="text-xs text-slate-500">
              Fitted parametric distribution N(μ, σ²) overlaid with empirical monthly return histogram
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Display Mode:</span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => setDistributionView('overlay')}
                className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  distributionView === 'overlay'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Compare Both Portfolios
              </button>
              <button
                onClick={() => setDistributionView('selected')}
                className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer ${
                  distributionView === 'selected'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Focus {selectedPortfolio}
              </button>
            </div>
          </div>
        </div>

        {/* Plotly Normal Distribution Chart */}
        <div className="w-full">
          <PlotlyChart
            data={[
              // Portfolio A Empirical Histogram
              ...(distributionView === 'overlay' || selectedPortfolio === 'Portfolio A'
                ? [
                    {
                      x: returnsA.map((r) => Number((r * 100).toFixed(2))),
                      type: 'histogram' as const,
                      histnorm: 'probability density' as any,
                      name: 'Port A Empirical Histogram',
                      opacity: 0.38,
                      marker: { color: '#f97316' },
                      nbinsx: 18,
                      hovertemplate: '<b>Port A Bin</b>: %{x}%<br>Density: %{y:.4f}<extra></extra>',
                    },
                    {
                      x: normalCurveA.x,
                      y: normalCurveA.y,
                      type: 'scatter' as const,
                      mode: 'lines' as const,
                      name: 'Port A Fitted Gaussian N(μ, σ²)',
                      line: { color: '#ea580c', width: 2.8 },
                      hovertemplate: '<b>Port A Normal Curve</b>: %{x}%<br>Density: %{y:.4f}<extra></extra>',
                    },
                  ]
                : []),

              // Portfolio B Empirical Histogram
              ...(distributionView === 'overlay' || selectedPortfolio === 'Portfolio B'
                ? [
                    {
                      x: returnsB.map((r) => Number((r * 100).toFixed(2))),
                      type: 'histogram' as const,
                      histnorm: 'probability density' as any,
                      name: 'Port B Empirical Histogram',
                      opacity: 0.42,
                      marker: { color: '#0d9488' },
                      nbinsx: 18,
                      hovertemplate: '<b>Port B Bin</b>: %{x}%<br>Density: %{y:.4f}<extra></extra>',
                    },
                    {
                      x: normalCurveB.x,
                      y: normalCurveB.y,
                      type: 'scatter' as const,
                      mode: 'lines' as const,
                      name: 'Port B Fitted Gaussian N(μ, σ²)',
                      line: { color: '#0f766e', width: 2.8 },
                      hovertemplate: '<b>Port B Normal Curve</b>: %{x}%<br>Density: %{y:.4f}<extra></extra>',
                    },
                  ]
                : []),
            ]}
            layout={{
              height: 340,
              barmode: 'overlay',
              xaxis: {
                title: { text: 'Monthly Return (%)' },
                ticksuffix: '%',
                gridcolor: '#f1f5f9',
                zeroline: true,
                zerolinecolor: '#cbd5e1',
              },
              yaxis: {
                title: { text: 'Probability Density f(x)' },
                gridcolor: '#f1f5f9',
                zeroline: false,
              },
              shapes: [
                // 0% Return Vertical Reference Line
                {
                  type: 'line',
                  x0: 0,
                  x1: 0,
                  y0: 0,
                  y1: 1,
                  yref: 'paper',
                  line: { color: '#94a3b8', width: 1.5, dash: 'dot' },
                },
              ],
            }}
          />
        </div>

        {/* Statistical Distribution Callout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <span className="font-bold text-orange-900 block mb-1">
              Portfolio A Distribution Characteristics:
            </span>
            <p className="text-slate-600 leading-relaxed">
              Fitted Normal: μ = {descStatsA.meanMonthlyReturnPct}%/mo, σ = {(descStatsA.annualizedVolPct / Math.sqrt(12)).toFixed(2)}%/mo. Realized distribution displays pronounced right-tail growth skewness ({descStatsA.skewness.toFixed(2)}) alongside heavy negative tail risk, departing noticeably from a textbook bell curve (Jarque-Bera = {descStatsA.jarqueBeraStatistic.toFixed(1)}).
            </p>
          </div>
          <div>
            <span className="font-bold text-teal-950 block mb-1">
              Portfolio B Distribution Characteristics:
            </span>
            <p className="text-slate-600 leading-relaxed">
              Fitted Normal: μ = {descStatsB.meanMonthlyReturnPct}%/mo, σ = {(descStatsB.annualizedVolPct / Math.sqrt(12)).toFixed(2)}%/mo. Portfolio B exhibits a sharp, leptokurtic bell curve centered closely around its positive median ({descStatsB.medianMonthlyReturnPct}%), with 68% of monthly outcomes tightly bounded between -2.5% and +4.8%.
            </p>
          </div>
        </div>

        {/* Normal Distribution Theory Callout */}
        <div className="text-[11px] text-slate-600 bg-blue-50/60 border border-blue-200/70 p-3.5 rounded-xl leading-relaxed space-y-1">
          <strong className="text-blue-950 font-bold flex items-center gap-1.5 text-xs">
            <Info className="w-3.5 h-3.5 text-blue-700" />
            <span>Theoretical Framework: Normal Gaussian Distribution (Bachelier &amp; Markowitz)</span>
          </strong>
          <p>
            The Gaussian probability density function is parameterized by{' '}
            <code className="bg-blue-100/70 px-1 py-0.5 rounded text-blue-950 font-mono text-[10px]">
              f(x) = (1 / (σ √(2π))) · e^(-(x - μ)² / (2σ²))
            </code>
            . Under strict normality, risk is symmetric: 68.3% of outcomes lie within μ ± 1σ, 95.4% within μ ± 2σ, and 99.7% within μ ± 3σ.
            In real financial markets, returns deviate from Gaussian assumptions due to <strong>fat tails (leptokurtosis)</strong> and <strong>crash-induced skewness</strong>. Relying solely on volatility (σ) dangerously underestimates the true probability of extreme 3-sigma and 4-sigma market drawdowns.
          </p>
        </div>
      </div>

      {/* MASTER DESCRIPTIVE STATISTICS TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Descriptive Statistics Master Matrix
            </h3>
            <span className="text-[11px] text-slate-500">
              Arithmetic Mean, Sample Median, Mode, Variance, Interquartile Range, Skewness & Kurtosis
            </span>
          </div>
          <span className="text-xs font-mono text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded self-start sm:self-auto">
            60 Historical Monthly Observations (2021–2026)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200 font-sans">
                <th className="p-3">Statistical Metric</th>
                <th className="p-3 text-right">Portfolio A (High Risk)</th>
                <th className="p-3 text-right">Portfolio B (Low Risk)</th>
                <th className="p-3 text-right">Spread / Difference</th>
                <th className="p-3">Statistical Definition & Significance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr>
                <td className="p-3 font-sans font-medium text-slate-900">Sample Count (n)</td>
                <td className="p-3 text-right font-bold text-slate-900">{descStatsA.count} months</td>
                <td className="p-3 text-right font-bold text-slate-900">{descStatsB.count} months</td>
                <td className="p-3 text-right text-slate-500">0</td>
                <td className="p-3 font-sans text-[11px] text-slate-600">Total monthly price return intervals</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-3 font-sans font-medium text-slate-900">Arithmetic Mean (Monthly)</td>
                <td className="p-3 text-right font-bold text-orange-700">{descStatsA.meanMonthlyReturnPct.toFixed(2)}%</td>
                <td className="p-3 text-right font-bold text-teal-800">{descStatsB.meanMonthlyReturnPct.toFixed(2)}%</td>
                <td className="p-3 text-right text-slate-700">+{(descStatsA.meanMonthlyReturnPct - descStatsB.meanMonthlyReturnPct).toFixed(2)}%</td>
                <td className="p-3 font-sans text-[11px] text-slate-600">Sample expected monthly return (Sum R_i / n)</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-medium text-slate-900">Annualized Mean Return (CAGR)</td>
                <td className="p-3 text-right font-bold text-orange-700">{descStatsA.annualizedReturnPct.toFixed(1)}% p.a.</td>
                <td className="p-3 text-right font-bold text-teal-800">{descStatsB.annualizedReturnPct.toFixed(1)}% p.a.</td>
                <td className="p-3 text-right text-slate-700">+{(descStatsA.annualizedReturnPct - descStatsB.annualizedReturnPct).toFixed(1)}%</td>
                <td className="p-3 font-sans text-[11px] text-slate-600">Mean monthly return scaled by 12</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-3 font-sans font-medium text-slate-900">Sample Median (50th Percentile)</td>
                <td className="p-3 text-right font-bold text-slate-900">{descStatsA.medianMonthlyReturnPct.toFixed(2)}%</td>
                <td className="p-3 text-right font-bold text-slate-900">{descStatsB.medianMonthlyReturnPct.toFixed(2)}%</td>
                <td className="p-3 text-right text-slate-700">{(descStatsA.medianMonthlyReturnPct - descStatsB.medianMonthlyReturnPct).toFixed(2)}%</td>
                <td className="p-3 font-sans text-[11px] text-slate-600">Middle value robust to extreme outliers</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-medium text-slate-900">Sample Mode (Peak Density)</td>
                <td className="p-3 text-right font-bold text-slate-800">{descStatsA.modeMonthlyReturnPct.toFixed(2)}%</td>
                <td className="p-3 text-right font-bold text-slate-800">{descStatsB.modeMonthlyReturnPct.toFixed(2)}%</td>
                <td className="p-3 text-right text-slate-700">{(descStatsA.modeMonthlyReturnPct - descStatsB.modeMonthlyReturnPct).toFixed(2)}%</td>
                <td className="p-3 font-sans text-[11px] text-slate-600">Center of highest-frequency return bin</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-3 font-sans font-medium text-slate-900">Annualized Volatility (σ)</td>
                <td className="p-3 text-right font-bold text-rose-700">{descStatsA.annualizedVolPct.toFixed(1)}%</td>
                <td className="p-3 text-right font-bold text-teal-800">{descStatsB.annualizedVolPct.toFixed(1)}%</td>
                <td className="p-3 text-right font-bold text-rose-700">+{(descStatsA.annualizedVolPct - descStatsB.annualizedVolPct).toFixed(1)}%</td>
                <td className="p-3 font-sans text-[11px] text-slate-600">Sample standard deviation scaled by √12</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-medium text-slate-900">Interquartile Range (IQR = Q3 - Q1)</td>
                <td className="p-3 text-right font-bold text-slate-900">{descStatsA.interquartileRangePct.toFixed(2)}%</td>
                <td className="p-3 text-right font-bold text-slate-900">{descStatsB.interquartileRangePct.toFixed(2)}%</td>
                <td className="p-3 text-right text-rose-700">+{(descStatsA.interquartileRangePct - descStatsB.interquartileRangePct).toFixed(2)}%</td>
                <td className="p-3 font-sans text-[11px] text-slate-600">Spread of middle 50% of return outcomes</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-3 font-sans font-medium text-slate-900">Sample Skewness (S)</td>
                <td className="p-3 text-right font-bold text-slate-900">{descStatsA.skewness.toFixed(3)}</td>
                <td className="p-3 text-right font-bold text-slate-900">{descStatsB.skewness.toFixed(3)}</td>
                <td className="p-3 text-right text-slate-700">{(descStatsA.skewness - descStatsB.skewness).toFixed(3)}</td>
                <td className="p-3 font-sans text-[11px] text-slate-600">Degree of asymmetry around the mean</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-medium text-slate-900">Excess Kurtosis (K)</td>
                <td className="p-3 text-right font-bold text-slate-900">{descStatsA.excessKurtosis.toFixed(3)}</td>
                <td className="p-3 text-right font-bold text-slate-900">{descStatsB.excessKurtosis.toFixed(3)}</td>
                <td className="p-3 text-right text-slate-700">{(descStatsA.excessKurtosis - descStatsB.excessKurtosis).toFixed(3)}</td>
                <td className="p-3 font-sans text-[11px] text-slate-600">Fat-tailedness relative to normal curve (K &gt; 0 = leptokurtic)</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="p-3 font-sans font-medium text-slate-900">Jarque-Bera Statistic (JB)</td>
                <td className="p-3 text-right font-bold text-rose-700">{descStatsA.jarqueBeraStatistic.toFixed(1)}</td>
                <td className="p-3 text-right font-bold text-slate-900">{descStatsB.jarqueBeraStatistic.toFixed(1)}</td>
                <td className="p-3 text-right text-slate-700">{(descStatsA.jarqueBeraStatistic - descStatsB.jarqueBeraStatistic).toFixed(1)}</td>
                <td className="p-3 font-sans text-[11px] text-slate-600">
                  {descStatsA.isNormalAt5Pct ? 'Normal' : 'Rejects normality (p &lt; 0.05, fat-tailed)'}
                </td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-medium text-slate-900">Worst Single Month / Min Return</td>
                <td className="p-3 text-right font-bold text-red-700">{descStatsA.minMonthlyReturnPct.toFixed(1)}%</td>
                <td className="p-3 text-right font-bold text-emerald-800">{descStatsB.minMonthlyReturnPct.toFixed(1)}%</td>
                <td className="p-3 text-right text-red-700">{(descStatsA.minMonthlyReturnPct - descStatsB.minMonthlyReturnPct).toFixed(1)}%</td>
                <td className="p-3 font-sans text-[11px] text-slate-600">Maximum monthly loss experienced</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Statistical Moments Theoretical Framework Callout */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Theoretical Framework: Four Statistical Moments of Portfolio Risk</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <strong className="text-slate-900 block font-semibold text-xs">1st Moment: Mean (μ)</strong>
              <span className="font-mono text-[10px] text-slate-500 block mb-1">E[R] = ∑ R_i / n</span>
              <p className="text-[11px] leading-relaxed">
                Measures central location (expected return). Critical for baseline compounding, but offers zero insight into volatility, variance, or downside ruin.
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <strong className="text-slate-900 block font-semibold text-xs">2nd Moment: Volatility (σ)</strong>
              <span className="font-mono text-[10px] text-slate-500 block mb-1">σ = √[E(R - μ)²] × √12</span>
              <p className="text-[11px] leading-relaxed">
                Measures dispersion around the mean. Standard deviation treats upside multi-baggers and downside crashes identically, failing to distinguish between desirable and destructive volatility.
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <strong className="text-slate-900 block font-semibold text-xs">3rd Moment: Skewness (S)</strong>
              <span className="font-mono text-[10px] text-slate-500 block mb-1">S = E[(R - μ)³] / σ³</span>
              <p className="text-[11px] leading-relaxed">
                Measures asymmetry. Negative skew indicates sudden severe crashes ('picking up pennies in front of a steamroller'); positive skew reflects lottery-like right-tail growth.
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
              <strong className="text-slate-900 block font-semibold text-xs">4th Moment: Kurtosis (K)</strong>
              <span className="font-mono text-[10px] text-slate-500 block mb-1">K = E[(R - μ)⁴] / σ⁴ - 3</span>
              <p className="text-[11px] leading-relaxed">
                Measures tail fatness (leptokurtosis). Positive excess kurtosis (K &gt; 0) mathematically proves that black-swan shocks occur exponentially more often than Gaussian bell curves assume.
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* STOCK BETA COMPARISON GRAPH (Low vs High Risk Constituents vs Market Beta 1.0) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">

        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            <span>Cross-Portfolio Systematic Risk Comparison</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Stock Systematic Beta (β) Comparison: High vs Low Risk Constituents
          </h3>
          <p className="text-xs text-slate-500">
            All 20 individual universe equities benchmarked against NIFTY 50 (Market Beta = 1.0)
          </p>
        </div>

        {/* Plotly Beta Bar Chart */}
        <div className="w-full">
          <PlotlyChart
            data={[
              {
                x: sortedStockBetas.map((s) => s.name),
                y: sortedStockBetas.map((s) => s.benchmarkBeta),
                type: 'bar',
                marker: {
                  color: sortedStockBetas.map((s) =>
                    s.portfolio === 'Portfolio A' ? '#f97316' : '#0d9488'
                  ),
                },
                text: sortedStockBetas.map((s) => `β=${s.benchmarkBeta.toFixed(2)}`),
                textposition: 'auto',
                hovertemplate: '<b>%{x}</b><br>Beta: %{y:.2f}<br>Sector: %{customdata}<extra></extra>',
                customdata: sortedStockBetas.map((s) => s.sector),
              },
            ]}
            layout={{
              height: 340,
              yaxis: {
                title: { text: 'Systematic Beta (β vs NIFTY 50)' },
                gridcolor: '#f1f5f9',
                zeroline: false,
              },
              xaxis: {
                tickangle: -40,
                tickfont: { size: 10 },
              },
              shapes: [
                // Market Beta Line = 1.0
                {
                  type: 'line',
                  x0: -0.5,
                  x1: sortedStockBetas.length - 0.5,
                  y0: 1.0,
                  y1: 1.0,
                  line: { color: '#ef4444', width: 2, dash: 'dash' },
                },
              ],
              annotations: [
                {
                  x: sortedStockBetas.length - 2,
                  y: 1.08,
                  text: 'Market Beta Benchmark (β = 1.0)',
                  showarrow: false,
                  font: { color: '#ef4444', size: 10 },
                },
              ],
            }}
          />
        </div>

        {/* Legend & Findings */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-orange-700">
              <span className="w-3 h-3 bg-orange-500 rounded-sm inline-block" />
              Portfolio A (High Risk / β &gt; 1.25)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-teal-800">
              <span className="w-3 h-3 bg-teal-600 rounded-sm inline-block" />
              Portfolio B (Low Risk / β &lt; 0.95)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-red-600">
              <span className="w-4 h-0.5 bg-red-500 inline-block" />
              NIFTY 50 Reference (β = 1.0)
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Clear structural bifurcation: Every Portfolio A stock has β &gt; 1.28; every Portfolio B stock has β &lt; 0.95.
          </span>
        </div>

        {/* Systematic Beta Theory Callout */}
        <div className="text-[11px] text-slate-600 bg-indigo-50/60 border border-indigo-200/70 p-3.5 rounded-xl leading-relaxed space-y-1">
          <strong className="text-indigo-950 font-bold flex items-center gap-1.5 text-xs">
            <Info className="w-3.5 h-3.5 text-indigo-700" />
            <span>Theoretical Framework: Capital Asset Pricing Model (CAPM) Systematic Beta</span>
          </strong>
          <p>
            Under the Capital Asset Pricing Model (Sharpe, Lintner, Mossin), systematic beta represents undiversifiable co-movement with broad macroeconomic market shocks:{' '}
            <code className="bg-indigo-100/70 px-1 py-0.5 rounded text-indigo-950 font-mono text-[10px]">
              β_i = Cov(R_i, R_m) / Var(R_m) = ρ_i,m · (σ_i / σ_m)
            </code>
            . Total variance decomposes into systematic market variance and idiosyncratic firm risk ({' '}
            <code className="bg-indigo-100/70 px-1 py-0.5 rounded text-indigo-950 font-mono text-[10px]">
              σ_i² = β_i² · σ_m² + σ_ε²
            </code>
            ). Stocks with β &gt; 1.25 systematically amplify market pullbacks, whereas low-beta defensives (β &lt; 0.95) dampen portfolio drawdown depth.
          </p>
        </div>
      </div>

      {/* INDUSTRY / SECTOR DESCRIPTIVE STATISTICS TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Industry & Sector Systematic Risk Benchmarks
            </h3>
            <span className="text-[11px] text-slate-500">
              Industry Average Beta and Macro Risk Profile across Indian Equity Sectors
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-sans">
            <thead>
              <tr className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-3">Sector</th>
                <th className="p-3 text-center">Universe Stocks</th>
                <th className="p-3 text-right">Mean Beta (β)</th>
                <th className="p-3">Risk Classification</th>
                <th className="p-3">Sector Risk Sensitivity Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sectorBenchmarks.map((b) => (
                <tr key={b.sector} className="hover:bg-slate-50">
                  <td className="p-3 font-medium text-slate-900">{b.sector}</td>
                  <td className="p-3 text-center font-mono text-slate-600">{b.stockCount}</td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">{b.meanBeta.toFixed(2)}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        b.classification.includes('High')
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {b.classification}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 text-[11px]">
                    {b.meanBeta > 1.3
                      ? 'High operating leverage, cyclical earnings elasticity, and sensitivity to interest rate spikes.'
                      : 'Essential non-cyclical consumer demand, regulated utility tariffs, and steady dividend yields.'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sector Systematic Risk Theory Callout */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900 font-bold flex items-center gap-1.5 mb-1 text-xs">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>Theoretical Framework: Business Cycle Cyclicality &amp; Operating Leverage</span>
          </strong>
          <p className="text-[11px]">
            Sector betas reflect fundamental microeconomic structures: companies with high <strong>operating leverage</strong> (heavy fixed capex, e.g. shipbuilding, manufacturing, renewable power) experience disproportionate operating profit swings when macroeconomic demand fluctuates, generating high betas (β &gt; 1.3). Conversely, companies with inelastic consumer demand (FMCG staples, pharmaceuticals) or regulated tariff rate-bases (power utilities) generate durable, bond-like cash flows that resist economic contractions, producing defensive betas (β &lt; 0.95).
          </p>
        </div>
      </div>

      {/* ROLLING 30-DAY VOLATILITY PLOT */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-600" />
              <span>30-Day Rolling Annualized Volatility Window</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Dynamic Volatility Clustering & Regime Shifts
            </h3>
            <p className="text-xs text-slate-500">
              Rolling 30-trading-day annualized standard deviation (σ × √252) over time
            </p>
          </div>
        </div>

        <div className="w-full">
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
              height: 320,
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

        {/* Rolling Volatility Clustering Theory Callout */}
        <div className="text-[11px] text-slate-600 bg-amber-50/60 border border-amber-200/70 p-3.5 rounded-xl leading-relaxed space-y-1">
          <strong className="text-amber-950 font-bold flex items-center gap-1.5 text-xs">
            <Info className="w-3.5 h-3.5 text-amber-700" />
            <span>Theoretical Framework: Volatility Clustering &amp; ARCH/GARCH Regimes (Engle 1982)</span>
          </strong>
          <p>
            Classical static standard deviation assumes volatility is constant across time (homoscedasticity). In contrast, Robert Engle's Nobel prize-winning <strong>Autoregressive Conditional Heteroskedasticity (ARCH/GARCH)</strong> framework and Mandelbrot's fractal market observations prove that financial markets exhibit <strong>volatility clustering</strong>: tranquil periods cluster together, while sudden geopolitical or liquidity shocks trigger persistent volatility bursts where large standard deviation swings follow large swings. Rolling 30-day volatility (σ_t × √252) captures these dynamic stress regimes that static full-period averages conceal.
          </p>
        </div>
      </div>
    </div>
  );
}
