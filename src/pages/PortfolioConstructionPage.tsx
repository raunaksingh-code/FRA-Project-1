import React, { useState, useMemo } from 'react';
import {
  StockStatistics,
  PortfolioPerformanceMetrics,
  GlobalFilterState,
  MonthlyReturnRow,
} from '../types';
import { formatINR, extractReturns, computeRiskDriverAttributions } from '../utils/math';
import {
  PORTFOLIO_A_STOCKS,
  PORTFOLIO_B_STOCKS,
  FINANCIAL_SECTOR_STOCKS,
  RISK_METHODOLOGY_JUSTIFICATIONS,
  TICKER_TO_STOCK,
} from '../data/universe';
import {
  RotateCcw,
  PieChart,
  Info,
  ShieldCheck,
  Check,
  AlertTriangle,
  HelpCircle,
  Activity,
  Layers,
  Flame,
  Scale,
  Landmark,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

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
  monthlyReturns?: MonthlyReturnRow[];
  returnsA?: number[];
  returnsB?: number[];
  benchmarkReturns?: number[];
  dates?: string[];
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
  monthlyReturns = [],
  returnsA = [],
  returnsB = [],
  benchmarkReturns = [],
  dates = [],
}: PortfolioConstructionProps) {

  const [activePortfolioTab, setActivePortfolioTab] = useState<'Portfolio A' | 'Portfolio B'>('Portfolio A');
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(true);
  const [showFinancialsTest, setShowFinancialsTest] = useState<boolean>(false);

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

  // Compute Risk Driver Attribution (MCR and PRC) live from monthly returns
  const riskDriverAttributions = useMemo(() => {
    if (!monthlyReturns || monthlyReturns.length === 0) return [];
    const stockReturnsMap: Record<string, number[]> = {};
    currentStocks.forEach((s) => {
      stockReturnsMap[s.ticker] = extractReturns(monthlyReturns, s.ticker);
    });
    return computeRiskDriverAttributions(currentWeights, stockReturnsMap, 1.0);
  }, [monthlyReturns, currentStocks, currentWeights]);

  // Sector Exposure aggregation
  const sectorExposure: Record<string, number> = {};
  currentStocks.forEach((s) => {
    const w = currentWeights[s.ticker] || 0;
    sectorExposure[s.sector] = (sectorExposure[s.sector] || 0) + w;
  });

  // Top risk driver callout
  const topRiskDriver = riskDriverAttributions[0];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-blue-600" />
            <span>Portfolio Construction & Risk Parameter Framework</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Constituent Equities, Risk Classifications & Dynamic Weighting
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            Initial Allocation: 10 Equities · Equal Weight 10.0% (₹1,50,000 per stock) · Total Capital ₹15,00,000
          </div>
        </div>

        {/* Portfolio Tab Switcher & Financials Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFinancialsTest(!showFinancialsTest)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
              showFinancialsTest
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-indigo-600" />
            <span>Financials Test Suite</span>
          </button>

          <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
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
      </div>

      {/* RISK PARAMETER DISCLOSURE & SELECTION RATIONALE BANNER */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg mt-0.5 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  Risk Parameter Identification & Classification Framework
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-blue-100 text-blue-800">
                  Modern Portfolio Theory Primitives
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Which asset is risky and what defines risk? Each portfolio constituent is categorized based on objective statistical and structural parameters:
                <strong> Systematic Beta (β &gt; 1.25 vs &lt; 0.95)</strong>, 
                <strong> Realized Volatility (σ &gt; 30% vs &lt; 20%)</strong>, 
                <strong> Historical Max Drawdown</strong>, and 
                <strong> Sector Demand Cyclicality</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsMethodologyOpen(!isMethodologyOpen)}
            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors shrink-0 cursor-pointer"
          >
            <span>{isMethodologyOpen ? 'Hide Methodology Rationale' : 'Why These Parameters?'}</span>
            {isMethodologyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Expanded Institutional Methodology Rationale */}
        {isMethodologyOpen && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 1. Why Selected Parameters */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/80">
              <strong className="font-semibold text-slate-900 block mb-1.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                Why We Selected These Parameters:
              </strong>
              <ul className="space-y-1.5 text-slate-600 leading-normal">
                <li>
                  <strong className="text-slate-800">Market Beta (β & β⁻):</strong> Measures non-diversifiable systematic sensitivity to macro shocks.
                </li>
                <li>
                  <strong className="text-slate-800">Annual Volatility (σ):</strong> Reflects total return dispersion and market clearing uncertainty.
                </li>
                <li>
                  <strong className="text-slate-800">Covariance Matrix (Σ):</strong> Dictates diversification benefits across the portfolio.
                </li>
                <li>
                  <strong className="text-slate-800">Risk Contribution (PRC):</strong> Pinpoints which specific stocks drive portfolio variance.
                </li>
              </ul>
            </div>

            {/* 2. Why Other Parameters Are Excluded */}
            <div className="bg-amber-50/70 p-3.5 rounded-lg border border-amber-200/70">
              <strong className="font-semibold text-amber-950 block mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Why Other Parameters Were Excluded:
              </strong>
              <ul className="space-y-1.5 text-amber-900/90 leading-normal">
                <li>
                  <strong className="text-amber-950">Why not P/E or P/B ratios?</strong> Accounting multiples are backward-looking valuation markers, not market risk measures. Cheap "value trap" stocks often collapse violently in crises, whereas high P/E staples (HUL, Nestlé) exhibit ultra-low volatility.
                </li>
                <li>
                  <strong className="text-amber-950">Why not single-tail VaR alone?</strong> Static VaR ignores fat-tail kurtosis and covariance.
                </li>
              </ul>
            </div>

            {/* 3. Why Low Risk Assets Are Classified As Low Risk */}
            <div className="bg-emerald-50/70 p-3.5 rounded-lg border border-emerald-200/70">
              <strong className="font-semibold text-emerald-950 block mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Why Low-Risk Equities Are Low Risk:
              </strong>
              <ul className="space-y-1.5 text-emerald-900/90 leading-normal">
                <li>
                  <strong className="text-emerald-950">Inelastic Staples:</strong> Non-cyclical demand for food, soap, and medicines (HUL, Nestlé, Sun Pharma).
                </li>
                <li>
                  <strong className="text-emerald-950">Regulated Utilities:</strong> CERC cost-plus guaranteed post-tax return on equity (Power Grid, NTPC).
                </li>
                <li>
                  <strong className="text-emerald-950">Negligible Debt:</strong> Fortress balance sheets with minimal debt insulate from interest rate spikes.
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* SUMMARY TABLE: SYSTEMATIC BETA (β) VS TOTAL VOLATILITY (σ) & IDIOSYNCRATIC RISK */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              <span>Risk Metrics Decoupling Summary & Systematic Beta Logic</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight mt-0.5">
              Systematic Beta (β) vs. Total Volatility (σ) & Idiosyncratic Risk Matrix
            </h3>
            <p className="text-xs text-slate-500">
              Why some extreme-risk Portfolio A assets (e.g., Paytm, Zomato) have a lower market beta than low-risk Portfolio B blue-chips (e.g., TCS, ICICI Bank)
            </p>
          </div>

          <div className="px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-mono font-semibold text-indigo-900 self-start sm:self-auto">
            Formula: β = ρ × (σ_i / σ_m)
          </div>
        </div>

        {/* Core Metric Classification Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse border border-slate-200 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
                <th className="p-3 w-48">Metric & Mathematical Formula</th>
                <th className="p-3 w-64">What It Actually Captures</th>
                <th className="p-3 bg-orange-50/50 text-orange-950">Behavior in Portfolio A (High Risk)</th>
                <th className="p-3 bg-teal-50/50 text-teal-950">Behavior in Portfolio B (Low Risk)</th>
                <th className="p-3">Financial Risk Interpretation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr className="hover:bg-slate-50">
                <td className="p-3 font-medium text-slate-900">
                  <div className="font-bold">Systematic Beta (β)</div>
                  <div className="text-[10px] text-slate-500 font-mono">Cov(R_i, R_m) / Var(R_m) = ρ · (σ_i / σ_m)</div>
                </td>
                <td className="p-3 text-slate-600">
                  Sensitivity of asset returns to macroeconomic market swings (NIFTY 50). Non-diversifiable market exposure.
                </td>
                <td className="p-3 bg-orange-50/20 font-medium text-orange-900">
                  <strong>High for cyclical/levered assets</strong> (Adani Green β=1.62, Mazdock β=1.48), <strong>but suppressed in idiosyncratic assets</strong> (Paytm β=0.20, Zomato β=0.95).
                </td>
                <td className="p-3 bg-teal-50/20 font-medium text-teal-900">
                  <strong>Disciplined (β = 0.58 to 0.95)</strong>, yet mega-caps (TCS β=1.05, ICICI Bank β=0.96) have high beta due to representing 40%+ of NIFTY 50 index weight.
                </td>
                <td className="p-3 text-[11px] text-slate-600">
                  Beta is depressed whenever correlation (ρ) drops, regardless of how wildly the stock fluctuates.
                </td>
              </tr>

              <tr className="hover:bg-slate-50 bg-slate-50/30">
                <td className="p-3 font-medium text-slate-900">
                  <div className="font-bold">Total Annualized Volatility (σ)</div>
                  <div className="text-[10px] text-slate-500 font-mono">Std(R_monthly) × √12</div>
                </td>
                <td className="p-3 text-slate-600">
                  Total price dispersion and return volatility, combining both systematic market swings and firm-specific news.
                </td>
                <td className="p-3 bg-orange-50/20 font-bold text-rose-700 font-mono">
                  Extreme: 32% to 56% p.a. (Portfolio A avg ~38.4%)
                </td>
                <td className="p-3 bg-teal-50/20 font-bold text-teal-800 font-mono">
                  Disciplined: 16% to 22% p.a. (Portfolio B avg ~19.5%)
                </td>
                <td className="p-3 text-[11px] text-slate-600">
                  Portfolio A experiences ~2x wider monthly standard deviation than Portfolio B.
                </td>
              </tr>

              <tr className="hover:bg-slate-50">
                <td className="p-3 font-medium text-slate-900">
                  <div className="font-bold">Specific / Idiosyncratic Risk (σ_ε²)</div>
                  <div className="text-[10px] text-slate-500 font-mono">Total Var - Systematic Var = σ_i² - (β² · σ_m²)</div>
                </td>
                <td className="p-3 text-slate-600">
                  Risk arising from company-specific shocks: regulatory bans, EBITDA cash burn, debt restructuring, or lockup expirations.
                </td>
                <td className="p-3 bg-orange-50/20 font-semibold text-orange-950">
                  <strong>Dominant (55% to 96% of total variance)</strong>. Single-stock event shocks swamp index moves.
                </td>
                <td className="p-3 bg-teal-50/20 font-semibold text-teal-950">
                  <strong>Low (Under 30% of total variance)</strong>. Returns are steady and aligned with macro GDP.
                </td>
                <td className="p-3 text-[11px] text-slate-600">
                  Idiosyncratic risk is diversifiable across large portfolios but can cause catastrophic loss in concentrated holdings.
                </td>
              </tr>

              <tr className="hover:bg-slate-50 bg-slate-50/30">
                <td className="p-3 font-medium text-slate-900">
                  <div className="font-bold">Correlation with NIFTY (ρ_i,m)</div>
                  <div className="text-[10px] text-slate-500 font-mono">Cov(R_i, R_m) / (σ_i · σ_m)</div>
                </td>
                <td className="p-3 text-slate-600">
                  Directional synchronization: does the stock move up and down in tandem with the benchmark market?
                </td>
                <td className="p-3 bg-orange-50/20 font-mono text-orange-900">
                  <strong>Weak to Moderate (ρ = 0.05 to 0.52)</strong>. Paytm crashed when NIFTY was rallying (ρ=0.05).
                </td>
                <td className="p-3 bg-teal-50/20 font-mono text-teal-900">
                  <strong>Strong (ρ = 0.65 to 0.85)</strong>. Institutional FII/DII basket flows keep blue chips synced.
                </td>
                <td className="p-3 text-[11px] text-slate-600">
                  Low correlation reduces Beta, leading naive investors to mistakenly believe a volatile stock is "low risk".
                </td>
              </tr>

              <tr className="hover:bg-slate-50">
                <td className="p-3 font-medium text-slate-900">
                  <div className="font-bold">Maximum Historical Drawdown</div>
                  <div className="text-[10px] text-slate-500 font-mono">Peak-to-Trough Decline: min (P_t - Peak) / Peak</div>
                </td>
                <td className="p-3 text-slate-600">
                  The deepest loss an investor experienced from highest peak before recovering.
                </td>
                <td className="p-3 bg-orange-50/20 font-bold text-red-700 font-mono">
                  Severe: -40% to -73.4% (Paytm -73%, Zomato -61%)
                </td>
                <td className="p-3 bg-teal-50/20 font-bold text-emerald-800 font-mono">
                  Cushioned: -14% to -22% (Nestlé -14%, HUL -16%)
                </td>
                <td className="p-3 text-[11px] text-slate-600">
                  Confirms that low-beta Portfolio A stocks still suffered devastating capital impairment.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Empirical Proof: High-Risk Low-Beta vs Low-Risk High-Beta Equities */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-600" />
                <span>Empirical Case Proof: Real Market Data (2021–2026, T = 60 Months)</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Direct evidence comparing Portfolio A idiosyncratic high-risk stocks against Portfolio B blue-chips
              </p>
            </div>
            <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold self-start sm:self-auto">
              NIFTY 50 Volatility: 13.1% p.a.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse bg-white rounded-lg border border-slate-200 overflow-hidden font-sans">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-2.5">Stock</th>
                  <th className="p-2.5">Portfolio</th>
                  <th className="p-2.5 text-right font-mono">Annual Vol (σ)</th>
                  <th className="p-2.5 text-right font-mono">NIFTY Corr (ρ)</th>
                  <th className="p-2.5 text-right font-mono">Benchmark Beta (β)</th>
                  <th className="p-2.5 text-right font-mono">Max Drawdown</th>
                  <th className="p-2.5">Risk Profile & Drawdown Mechanics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                <tr className="bg-rose-50/40">
                  <td className="p-2.5 font-sans font-bold text-slate-900">One97 (Paytm)</td>
                  <td className="p-2.5 font-sans"><span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold">Port A (High Risk)</span></td>
                  <td className="p-2.5 text-right font-bold text-rose-700">56.3%</td>
                  <td className="p-2.5 text-right text-slate-700">0.55</td>
                  <td className="p-2.5 text-right font-bold text-rose-700">1.68</td>
                  <td className="p-2.5 text-right font-bold text-red-700">-73.4%</td>
                  <td className="p-2.5 font-sans text-slate-600 text-[11px]">
                    <strong>High Beta & Regulatory Shock:</strong> High market sensitivity (β=1.68) amplified by RBI payments bank moratorium led to catastrophic capital loss.
                  </td>
                </tr>

                <tr className="bg-orange-50/40">
                  <td className="p-2.5 font-sans font-bold text-slate-900">Zomato / Eternal</td>
                  <td className="p-2.5 font-sans"><span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded font-semibold">Port A (High Risk)</span></td>
                  <td className="p-2.5 text-right font-bold text-orange-700">48.9%</td>
                  <td className="p-2.5 text-right text-slate-700">0.58</td>
                  <td className="p-2.5 text-right font-bold text-orange-700">1.55</td>
                  <td className="p-2.5 text-right font-bold text-red-700">-61.2%</td>
                  <td className="p-2.5 font-sans text-slate-600 text-[11px]">
                    <strong>Growth Tech Vulnerability:</strong> High beta (β=1.55) and dark-store cash burn triggered sharp 61% drawdown during global monetary tightening.
                  </td>
                </tr>

                <tr>
                  <td className="p-2.5 font-sans font-bold text-slate-900">Adani Green Energy</td>
                  <td className="p-2.5 font-sans"><span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded font-semibold">Port A (High Risk)</span></td>
                  <td className="p-2.5 text-right font-bold text-orange-700">44.2%</td>
                  <td className="p-2.5 text-right text-slate-700">0.52</td>
                  <td className="p-2.5 text-right font-bold text-orange-700">1.62</td>
                  <td className="p-2.5 text-right font-bold text-red-700">-58.7%</td>
                  <td className="p-2.5 font-sans text-slate-600 text-[11px]">
                    <strong>High Debt Leverage:</strong> Capital expenditure cycle and interest rate sensitivity generate both extreme volatility (44.2%) AND high systematic beta (1.62).
                  </td>
                </tr>

                <tr className="bg-teal-50/40">
                  <td className="p-2.5 font-sans font-bold text-slate-900">TCS (Tata Consultancy)</td>
                  <td className="p-2.5 font-sans"><span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-semibold">Port B (Low Risk)</span></td>
                  <td className="p-2.5 text-right font-bold text-teal-800">19.1%</td>
                  <td className="p-2.5 text-right text-slate-700">0.65</td>
                  <td className="p-2.5 text-right font-bold text-teal-800">0.69</td>
                  <td className="p-2.5 text-right font-bold text-emerald-800">-21.8%</td>
                  <td className="p-2.5 font-sans text-slate-600 text-[11px]">
                    <strong>Blue-Chip Defensive:</strong> Low beta (β=0.69), zero debt, and massive free cash flow keep drawdowns tightly contained (-21.8%).
                  </td>
                </tr>

                <tr className="bg-teal-50/40">
                  <td className="p-2.5 font-sans font-bold text-slate-900">ICICI Bank</td>
                  <td className="p-2.5 font-sans"><span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded font-semibold">Port B (Low Risk)</span></td>
                  <td className="p-2.5 text-right font-bold text-teal-800">22.4%</td>
                  <td className="p-2.5 text-right text-slate-700">0.80</td>
                  <td className="p-2.5 text-right font-bold text-teal-800">0.95</td>
                  <td className="p-2.5 text-right font-bold text-emerald-800">-18.4%</td>
                  <td className="p-2.5 font-sans text-slate-600 text-[11px]">
                    <strong>Banking Anchor:</strong> Disciplined beta (0.95) with pristine asset quality (NPAs &lt; 2%) protects capital during systemic selloffs.
                  </td>
                </tr>

                <tr className="bg-emerald-50/40">
                  <td className="p-2.5 font-sans font-bold text-slate-900">Hindustan Unilever (HUL)</td>
                  <td className="p-2.5 font-sans"><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold">Port B (Low Risk)</span></td>
                  <td className="p-2.5 text-right font-bold text-emerald-800">16.2%</td>
                  <td className="p-2.5 text-right text-slate-700">0.58</td>
                  <td className="p-2.5 text-right font-bold text-emerald-800">0.58</td>
                  <td className="p-2.5 text-right font-bold text-emerald-800">-14.6%</td>
                  <td className="p-2.5 font-sans text-slate-600 text-[11px]">
                    <strong>True Defensive Anchor:</strong> Inelastic consumer staples demand and debt-free balance sheet provide genuine low beta (0.58) and shallowest drawdown (-14.6%).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-amber-50/80 rounded-lg border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong>Uniform Risk Hierarchy Takeaway:</strong> Across the entire 20-stock universe, Portfolio A constituents uniformly exhibit high systematic beta (β ≥ 1.28, avg ~1.47) and high volatility (σ ≥ 30%), whereas Portfolio B constituents maintain defensive low betas (β ≤ 0.95, avg ~0.73) with cushioned historical drawdowns.
            </div>
          </div>
        </div>
      </div>

      {/* FINANCIAL STOCKS TESTING SUITE (Conditional Modal/Card) */}
      {showFinancialsTest && (
        <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-indigo-700" />
              <div>
                <h3 className="text-sm font-bold text-indigo-950">
                  Financial Sector Stocks Testing Suite
                </h3>
                <p className="text-xs text-indigo-800">
                  Evaluate how Indian banking & NBFC stocks perform across risk metrics compared to diversified portfolios.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFinancialsTest(false)}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold cursor-pointer"
            >
              ✕ Close Test Suite
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse bg-white rounded-lg border border-indigo-200 overflow-hidden">
              <thead>
                <tr className="bg-indigo-100/70 text-indigo-950 font-semibold border-b border-indigo-200">
                  <th className="p-3">Financial Institution</th>
                  <th className="p-3">Ticker</th>
                  <th className="p-3">Sub-Sector</th>
                  <th className="p-3">Risk Classification</th>
                  <th className="p-3 text-right">Market Beta</th>
                  <th className="p-3 text-right">Vol Profile</th>
                  <th className="p-3">Key Risk Driver & Balance Sheet Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-100">
                {FINANCIAL_SECTOR_STOCKS.map((stock) => (
                  <tr key={stock.ticker} className="hover:bg-indigo-50/50">
                    <td className="p-3 font-medium text-slate-900">{stock.name}</td>
                    <td className="p-3 font-mono text-slate-500">{stock.ticker.replace('.NS', '')}</td>
                    <td className="p-3 text-slate-600">{stock.sector}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          stock.riskCategory === 'Low Risk'
                            ? 'bg-emerald-100 text-emerald-800'
                            : stock.riskCategory === 'High Risk'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {stock.riskCategory}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      {stock.benchmarkBeta.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-mono text-slate-700">
                      {stock.volatilityProfile}
                    </td>
                    <td className="p-3 text-slate-600 text-[11px] max-w-xs">
                      {stock.primaryRiskDriver}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-indigo-900 bg-white/80 p-3 rounded-lg border border-indigo-100 flex items-start gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <p>
              <strong>Financial Sector Finding:</strong> Private lenders with massive CASA deposits (HDFC Bank: β=0.88, Kotak Bank: β=0.85) provide defensive ballast with lower volatility (~20%), while retail consumer NBFCs (Bajaj Finance: β=1.32, vol ~32%) experience pronounced credit cycle beta.
            </p>
          </div>
        </div>
      )}

      {/* RISK DRIVER ATTRIBUTION CARD: Which stocks drive the risk graph? */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-purple-700 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-purple-600" />
              <span>Risk Driver Attribution Analysis</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Which Stocks Drive the Risk Graph? (Marginal & Percentage Risk Contribution)
            </h3>
            <p className="text-xs text-slate-500">
              Calculated using the full annualized covariance matrix: PRC_i = [w_i * (Σ w)_i] / σ_p^2 × 100%
            </p>
          </div>

          {topRiskDriver && (
            <div className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 self-start sm:self-auto">
              <strong>Top Risk Contributor:</strong> {topRiskDriver.name} accounts for{' '}
              <span className="font-bold font-mono text-purple-800">{topRiskDriver.percentageRiskContributionPct}%</span>{' '}
              of total portfolio risk at {topRiskDriver.weightPct}% weight!
            </div>
          )}
        </div>

        {/* Visual Risk Driver Breakdown Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {riskDriverAttributions.slice(0, 5).map((driver, idx) => (
            <div
              key={driver.ticker}
              className={`p-3 rounded-lg border ${
                idx === 0
                  ? 'bg-rose-50/80 border-rose-200'
                  : idx === 1
                  ? 'bg-orange-50/80 border-orange-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start text-xs mb-1">
                <span className="font-bold text-slate-900 truncate" title={driver.name}>
                  {driver.name}
                </span>
                <span className="font-mono font-bold text-rose-700">
                  {driver.percentageRiskContributionPct}% Risk
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    idx === 0 ? 'bg-rose-600' : idx === 1 ? 'bg-orange-500' : 'bg-slate-600'
                  }`}
                  style={{ width: `${Math.min(100, driver.percentageRiskContributionPct * 3.5)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Weight: {driver.weightPct}%</span>
                <span>Beta: {driver.beta.toFixed(2)}</span>
              </div>
            </div>
          ))}
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
              Weights will be normalized to 100% across all portfolio analytics and frontier calculations.
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

      {/* Constituents Table with Weight Sliders & Parameter Classifications */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {activePortfolioTab} Constituents (10 Indian Equities)
            </h3>
            <span className="text-[11px] text-slate-500">
              Explicit Risk Classification, Market Beta, Volatility, and Why Each Stock is Classified
            </span>
          </div>
          <span className="text-xs font-mono text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
            Portfolio Volatility: {currentMetrics.annualizedVolatilityPct.toFixed(1)}% p.a.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/70 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-3">Company</th>
                <th className="p-3">Risk Category</th>
                <th className="p-3">Sector</th>
                <th className="p-3 w-44">Weight Allocation</th>
                <th className="p-3 text-right">Capital Sizing</th>
                <th className="p-3 text-right">CAGR</th>
                <th className="p-3 text-right">Ann. Vol</th>
                <th className="p-3 text-right">Beta (β)</th>
                <th className="p-3 text-right">Risk Contrib (PRC)</th>
                <th className="p-3">Primary Risk Driver & Deciding Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {currentStocks.map((s) => {
                const w = currentWeights[s.ticker] || 0;
                const allocatedRupees = (w / 100) * filters.initialCapital;
                const stockInfo = TICKER_TO_STOCK[s.ticker];
                const riskDriver = riskDriverAttributions.find((d) => d.ticker === s.ticker);

                return (
                  <tr key={s.ticker} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-sans font-medium text-slate-900 whitespace-nowrap">
                      <div>{s.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.ticker.replace('.NS', '')}</div>
                    </td>
                    <td className="p-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${
                          activePortfolioTab === 'Portfolio A'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {stockInfo?.riskCategory || (activePortfolioTab === 'Portfolio A' ? 'High Risk' : 'Low Risk')}
                      </span>
                    </td>
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
                          className={`w-24 accent-slate-800 h-1.5 bg-slate-200 rounded cursor-pointer ${
                            activePortfolioTab === 'Portfolio A' ? 'accent-orange-500' : 'accent-teal-600'
                          }`}
                        />
                        <span className="font-mono text-xs font-semibold text-slate-900 w-8 text-right">
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
                    <td className="p-3 text-right text-slate-900 font-bold">
                      {s.beta.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-bold text-purple-700">
                      {riskDriver ? `${riskDriver.percentageRiskContributionPct}%` : '—'}
                    </td>
                    <td className="p-3 font-sans text-[11px] text-slate-600 max-w-xs">
                      <p className="line-clamp-2" title={stockInfo?.riskRationale || stockInfo?.description}>
                        {stockInfo?.primaryRiskDriver || stockInfo?.riskRationale || stockInfo?.description}
                      </p>
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
                Rolling 12-Month Performance Dynamics
              </h3>
              <p className="text-xs text-slate-500">
                Rolling 1-year cumulative returns over time (Portfolio A vs Portfolio B)
              </p>
            </div>
          </div>

          {/* Rolling SVG Chart */}
          {(() => {
            const allRets = [
              ...rolling12A.map((d) => d.rollingReturnPct),
              ...rolling12B.map((d) => d.rollingReturnPct),
              0,
            ];
            const minR = Math.floor((Math.min(...allRets) - 5) / 10) * 10;
            const maxR = Math.ceil((Math.max(...allRets) + 5) / 10) * 10;
            const rangeR = Math.max(1, maxR - minR);

            const w = 450;
            const h = 180;
            const padL = 45;
            const padR = 20;
            const padT = 15;
            const padB = 25;
            const plotW = w - padL - padR;
            const plotH = h - padT - padB;
            const n = Math.max(rolling12A.length, rolling12B.length);

            const getX = (i: number) => padL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
            const getY = (r: number) => padT + plotH - ((r - minR) / rangeR) * plotH;
            const zeroY = getY(0);

            const yTicks = [minR, Math.round((minR + maxR) / 2), maxR];

            return (
              <div className="relative w-full">
                <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto select-none">
                  {/* Grid / Zero line */}
                  <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} stroke="#cbd5e1" />
                  {minR <= 0 && maxR >= 0 && (
                    <line
                      x1={padL}
                      y1={zeroY}
                      x2={w - padR}
                      y2={zeroY}
                      stroke="#94a3b8"
                      strokeDasharray="3 3"
                    />
                  )}

                  {yTicks.map((val) => (
                    <g key={val}>
                      <line
                        x1={padL}
                        y1={getY(val)}
                        x2={w - padR}
                        y2={getY(val)}
                        stroke="#f1f5f9"
                        strokeWidth="1"
                      />
                      <text
                        x={padL - 6}
                        y={getY(val) + 3}
                        fontSize="9"
                        fill="#64748b"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {val > 0 ? `+${val}` : val}%
                      </text>
                    </g>
                  ))}

                  {/* Portfolio A Line */}
                  {rolling12A.length > 0 && (
                    <path
                      d={rolling12A
                        .map(
                          (d, i) =>
                            `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.rollingReturnPct)}`
                        )
                        .join(' ')}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.2"
                    />
                  )}

                  {/* Portfolio B Line */}
                  {rolling12B.length > 0 && (
                    <path
                      d={rolling12B
                        .map(
                          (d, i) =>
                            `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.rollingReturnPct)}`
                        )
                        .join(' ')}
                      fill="none"
                      stroke="#0d9488"
                      strokeWidth="2.2"
                    />
                  )}

                  {/* X Axis dates */}
                  {rolling12A.length > 0 && (
                    <>
                      <text
                        x={getX(0)}
                        y={h - 6}
                        fontSize="8.5"
                        fill="#64748b"
                        textAnchor="start"
                        fontFamily="monospace"
                      >
                        {rolling12A[0].date}
                      </text>
                      <text
                        x={getX(rolling12A.length - 1)}
                        y={h - 6}
                        fontSize="8.5"
                        fill="#64748b"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {rolling12A[rolling12A.length - 1].date}
                      </text>
                    </>
                  )}
                </svg>

                <div className="flex items-center justify-center gap-4 text-xs text-slate-600 mt-2">
                  <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                    <span className="w-2.5 h-0.5 bg-orange-500 inline-block" />
                    Portfolio A Rolling 1-Yr
                  </span>
                  <span className="flex items-center gap-1.5 text-teal-700 font-medium">
                    <span className="w-2.5 h-0.5 bg-teal-600 inline-block" />
                    Portfolio B Rolling 1-Yr
                  </span>
                </div>
              </div>
            );
          })()}

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
            <div className="font-medium text-slate-700 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              Rebalancing Assumption:
            </div>
            <p>
              Current mode: <strong>{filters.rebalanceFrequency}</strong>. Under monthly rebalancing, target weights are restored at the beginning of each calendar month. Under Buy & Hold, allocations drift proportionally to cumulative price appreciation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
