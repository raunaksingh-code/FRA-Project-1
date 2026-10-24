import React, { useState, useMemo } from 'react';
import { GlobalFilterState, MonthlyReturnRow, CrisisEventInfo } from '../types';
import { HISTORICAL_RISK_COMPARISON } from '../data/dailyRiskData';
import { PORTFOLIO_A_STOCKS, PORTFOLIO_B_STOCKS, ALL_UNIVERSE_STOCKS } from '../data/universe';
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
  TrendingDown,
  Activity,
  BarChart3,
  Award,
} from 'lucide-react';

interface StressTestingProps {
  filters: GlobalFilterState;
  weightsA?: Record<string, number>;
  weightsB?: Record<string, number>;
  monthlyReturns?: MonthlyReturnRow[];
}

export function StressTestingPage({
  filters,
  weightsA = {},
  weightsB = {},
  monthlyReturns = [],
}: StressTestingProps) {
  const [comparableMode, setComparableMode] = useState<boolean>(true);
  const [activeCrisisId, setActiveCrisisId] = useState<string>('covid');
  const [tableDisplayMode, setTableDisplayMode] = useState<'focused' | 'all'>('focused');

  const comparisonData = HISTORICAL_RISK_COMPARISON;


  // 4 HISTORICAL CRISIS EVENTS DATA WITH DETAILED STOCK-WISE PERFORMANCES
  const CRISIS_EVENTS: CrisisEventInfo[] = [
    {
      id: 'covid',
      name: 'COVID-19 Global Liquidity Crash',
      period: 'Feb 2020 – May 2020 (Acute 3-Month Window)',
      startDate: '2020-02-20',
      endDate: '2020-05-29',
      description: 'Global pandemic emergence, nationwide lockdown declarations, severe liquidity freeze, and global margin liquidation.',
      marketDrawdownPct: -38.4,
      portfolioADrawdownPct: -48.2,
      portfolioBDrawdownPct: -27.3,
      portfolioAReturnPct: -29.9,
      portfolioBReturnPct: -14.6,
      keyCatalyst: 'Global pandemic lockdowns & rapid institutional deleveraging across global equities.',
      stockPerformances: [
        { ticker: 'BAJFINANCE.NS', name: 'Bajaj Finance', portfolio: 'Portfolio A', returnPct: -58.2, maxDrawdownPct: -61.4, sector: 'NBFC' },
        { ticker: 'DLF.NS', name: 'DLF', portfolio: 'Portfolio A', returnPct: -52.4, maxDrawdownPct: -56.1, sector: 'Real Estate' },
        { ticker: 'ADANIGREEN.NS', name: 'Adani Green Energy', portfolio: 'Portfolio A', returnPct: -42.8, maxDrawdownPct: -46.5, sector: 'Renewables' },
        { ticker: 'ADANIPOWER.NS', name: 'Adani Power', portfolio: 'Portfolio A', returnPct: -41.2, maxDrawdownPct: -44.8, sector: 'Power' },
        { ticker: 'DIXON.NS', name: 'Dixon Technologies', portfolio: 'Portfolio A', returnPct: -38.6, maxDrawdownPct: -42.1, sector: 'Manufacturing' },
        { ticker: 'BSE.NS', name: 'BSE', portfolio: 'Portfolio A', returnPct: -35.4, maxDrawdownPct: -39.0, sector: 'Capital Markets' },
        { ticker: 'TRENT.NS', name: 'Trent', portfolio: 'Portfolio A', returnPct: -31.8, maxDrawdownPct: -36.5, sector: 'Retail' },
        // Portfolio B constituents during COVID
        { ticker: 'ICICIBANK.NS', name: 'ICICI Bank', portfolio: 'Portfolio B', returnPct: -32.4, maxDrawdownPct: -36.8, sector: 'Banking' },
        { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', portfolio: 'Portfolio B', returnPct: -28.6, maxDrawdownPct: -32.1, sector: 'Banking' },
        { ticker: 'INFY.NS', name: 'Infosys', portfolio: 'Portfolio B', returnPct: -22.4, maxDrawdownPct: -26.5, sector: 'IT Services' },
        { ticker: 'ITC.NS', name: 'ITC', portfolio: 'Portfolio B', returnPct: -21.8, maxDrawdownPct: -25.2, sector: 'FMCG' },
        { ticker: 'TCS.NS', name: 'TCS', portfolio: 'Portfolio B', returnPct: -18.2, maxDrawdownPct: -22.1, sector: 'IT Services' },
        { ticker: 'NTPC.NS', name: 'NTPC', portfolio: 'Portfolio B', returnPct: -17.5, maxDrawdownPct: -21.4, sector: 'Utilities' },
        { ticker: 'POWERGRID.NS', name: 'Power Grid', portfolio: 'Portfolio B', returnPct: -14.2, maxDrawdownPct: -18.1, sector: 'Utilities' },
        { ticker: 'HINDUNILVR.NS', name: 'Hindustan Unilever', portfolio: 'Portfolio B', returnPct: -12.4, maxDrawdownPct: -16.2, sector: 'FMCG' },
        { ticker: 'NESTLEIND.NS', name: 'Nestlé India', portfolio: 'Portfolio B', returnPct: -9.8, maxDrawdownPct: -13.5, sector: 'FMCG' },
        { ticker: 'SUNPHARMA.NS', name: 'Sun Pharma', portfolio: 'Portfolio B', returnPct: -6.4, maxDrawdownPct: -10.8, sector: 'Pharma' },
      ],
    },
    {
      id: 'inflation2022',
      name: 'Global Inflation & Monetary Tightening Shock',
      period: 'Jan 2022 – Jun 2022 (Fed/RBI Rate Hikes)',
      startDate: '2022-01-01',
      endDate: '2022-06-30',
      description: 'US CPI inflation peaked at 9.1%, Russia-Ukraine conflict spiked crude oil to $120/bbl, aggressive rate hikes commenced.',
      marketDrawdownPct: -15.6,
      portfolioADrawdownPct: -29.4,
      portfolioBDrawdownPct: -10.2,
      portfolioAReturnPct: -21.5,
      portfolioBReturnPct: -4.8,
      keyCatalyst: 'Global central bank interest rate tightening, soaring crude oil prices, and growth tech valuation collapse.',
      stockPerformances: [
        { ticker: 'PAYTM.NS', name: 'Paytm', portfolio: 'Portfolio A', returnPct: -61.8, maxDrawdownPct: -64.2, sector: 'Fintech' },
        { ticker: 'ZOMATO.NS', name: 'Zomato', portfolio: 'Portfolio A', returnPct: -56.4, maxDrawdownPct: -59.8, sector: 'Consumer Tech' },
        { ticker: 'DIXON.NS', name: 'Dixon Technologies', portfolio: 'Portfolio A', returnPct: -32.5, maxDrawdownPct: -36.2, sector: 'Manufacturing' },
        { ticker: 'DLF.NS', name: 'DLF', portfolio: 'Portfolio A', returnPct: -24.8, maxDrawdownPct: -28.1, sector: 'Real Estate' },
        { ticker: 'BAJFINANCE.NS', name: 'Bajaj Finance', portfolio: 'Portfolio A', returnPct: -22.1, maxDrawdownPct: -26.5, sector: 'NBFC' },
        { ticker: 'BSE.NS', name: 'BSE', portfolio: 'Portfolio A', returnPct: -19.4, maxDrawdownPct: -23.0, sector: 'Capital Markets' },
        { ticker: 'TRENT.NS', name: 'Trent', portfolio: 'Portfolio A', returnPct: -11.2, maxDrawdownPct: -15.4, sector: 'Retail' },
        { ticker: 'ADANIPOWER.NS', name: 'Adani Power', portfolio: 'Portfolio A', returnPct: 112.4, maxDrawdownPct: -18.2, sector: 'Power' },
        { ticker: 'ADANIGREEN.NS', name: 'Adani Green', portfolio: 'Portfolio A', returnPct: 38.6, maxDrawdownPct: -22.4, sector: 'Renewables' },
        { ticker: 'MAZDOCK.NS', name: 'Mazagon Dock', portfolio: 'Portfolio A', returnPct: 24.5, maxDrawdownPct: -14.2, sector: 'Defense' },
        // Portfolio B constituents
        { ticker: 'INFY.NS', name: 'Infosys', portfolio: 'Portfolio B', returnPct: -23.8, maxDrawdownPct: -26.4, sector: 'IT Services' },
        { ticker: 'TCS.NS', name: 'TCS', portfolio: 'Portfolio B', returnPct: -14.6, maxDrawdownPct: -18.2, sector: 'IT Services' },
        { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', portfolio: 'Portfolio B', returnPct: -9.8, maxDrawdownPct: -14.1, sector: 'Banking' },
        { ticker: 'ICICIBANK.NS', name: 'ICICI Bank', portfolio: 'Portfolio B', returnPct: -5.4, maxDrawdownPct: -11.2, sector: 'Banking' },
        { ticker: 'NESTLEIND.NS', name: 'Nestlé India', portfolio: 'Portfolio B', returnPct: -4.2, maxDrawdownPct: -9.5, sector: 'FMCG' },
        { ticker: 'HINDUNILVR.NS', name: 'Hindustan Unilever', portfolio: 'Portfolio B', returnPct: 2.1, maxDrawdownPct: -8.4, sector: 'FMCG' },
        { ticker: 'SUNPHARMA.NS', name: 'Sun Pharma', portfolio: 'Portfolio B', returnPct: 4.8, maxDrawdownPct: -7.1, sector: 'Pharma' },
        { ticker: 'POWERGRID.NS', name: 'Power Grid', portfolio: 'Portfolio B', returnPct: 8.4, maxDrawdownPct: -6.5, sector: 'Utilities' },
        { ticker: 'NTPC.NS', name: 'NTPC', portfolio: 'Portfolio B', returnPct: 12.8, maxDrawdownPct: -7.2, sector: 'Utilities' },
        { ticker: 'ITC.NS', name: 'ITC', portfolio: 'Portfolio B', returnPct: 32.4, maxDrawdownPct: -5.1, sector: 'FMCG' },
      ],
    },
    {
      id: 'adani2023',
      name: 'Adani-Hindenburg & Banking Stress Contagion',
      period: 'Jan 2023 – Mar 2023 (Q1 2023 Shock)',
      startDate: '2023-01-24',
      endDate: '2023-03-31',
      description: 'Hindenburg short-seller report on Adani Group, US Silicon Valley Bank (SVB) collapse, and contagion concerns in Indian credit markets.',
      marketDrawdownPct: -6.8,
      portfolioADrawdownPct: -32.1,
      portfolioBDrawdownPct: -4.2,
      portfolioAReturnPct: -18.4,
      portfolioBReturnPct: -1.8,
      keyCatalyst: 'Corporate governance controversy, Adani equity plunge, and global banking solvency panic (SVB/Credit Suisse).',
      stockPerformances: [
        { ticker: 'ADANIGREEN.NS', name: 'Adani Green Energy', portfolio: 'Portfolio A', returnPct: -65.8, maxDrawdownPct: -71.2, sector: 'Renewables' },
        { ticker: 'ADANIPOWER.NS', name: 'Adani Power', portfolio: 'Portfolio A', returnPct: -48.2, maxDrawdownPct: -54.0, sector: 'Power' },
        { ticker: 'BSE.NS', name: 'BSE', portfolio: 'Portfolio A', returnPct: -14.2, maxDrawdownPct: -17.5, sector: 'Capital Markets' },
        { ticker: 'BAJFINANCE.NS', name: 'Bajaj Finance', portfolio: 'Portfolio A', returnPct: -12.4, maxDrawdownPct: -15.8, sector: 'NBFC' },
        { ticker: 'DLF.NS', name: 'DLF', portfolio: 'Portfolio A', returnPct: -7.6, maxDrawdownPct: -11.2, sector: 'Real Estate' },
        { ticker: 'DIXON.NS', name: 'Dixon Technologies', portfolio: 'Portfolio A', returnPct: -6.5, maxDrawdownPct: -10.4, sector: 'Manufacturing' },
        { ticker: 'PAYTM.NS', name: 'Paytm', portfolio: 'Portfolio A', returnPct: -2.4, maxDrawdownPct: -8.5, sector: 'Fintech' },
        { ticker: 'ZOMATO.NS', name: 'Zomato', portfolio: 'Portfolio A', returnPct: 4.8, maxDrawdownPct: -9.1, sector: 'Consumer Tech' },
        { ticker: 'TRENT.NS', name: 'Trent', portfolio: 'Portfolio A', returnPct: 8.2, maxDrawdownPct: -6.4, sector: 'Retail' },
        { ticker: 'MAZDOCK.NS', name: 'Mazagon Dock', portfolio: 'Portfolio A', returnPct: 14.5, maxDrawdownPct: -8.2, sector: 'Defense' },
        // Portfolio B constituents
        { ticker: 'INFY.NS', name: 'Infosys', portfolio: 'Portfolio B', returnPct: -7.8, maxDrawdownPct: -9.5, sector: 'IT Services' },
        { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', portfolio: 'Portfolio B', returnPct: -4.5, maxDrawdownPct: -6.8, sector: 'Banking' },
        { ticker: 'ICICIBANK.NS', name: 'ICICI Bank', portfolio: 'Portfolio B', returnPct: -3.8, maxDrawdownPct: -5.9, sector: 'Banking' },
        { ticker: 'TCS.NS', name: 'TCS', portfolio: 'Portfolio B', returnPct: -2.1, maxDrawdownPct: -4.5, sector: 'IT Services' },
        { ticker: 'HINDUNILVR.NS', name: 'Hindustan Unilever', portfolio: 'Portfolio B', returnPct: 1.2, maxDrawdownPct: -3.8, sector: 'FMCG' },
        { ticker: 'POWERGRID.NS', name: 'Power Grid', portfolio: 'Portfolio B', returnPct: 3.4, maxDrawdownPct: -3.1, sector: 'Utilities' },
        { ticker: 'NESTLEIND.NS', name: 'Nestlé India', portfolio: 'Portfolio B', returnPct: 4.5, maxDrawdownPct: -2.8, sector: 'FMCG' },
        { ticker: 'NTPC.NS', name: 'NTPC', portfolio: 'Portfolio B', returnPct: 5.8, maxDrawdownPct: -3.5, sector: 'Utilities' },
        { ticker: 'SUNPHARMA.NS', name: 'Sun Pharma', portfolio: 'Portfolio B', returnPct: 6.2, maxDrawdownPct: -2.4, sector: 'Pharma' },
        { ticker: 'ITC.NS', name: 'ITC', portfolio: 'Portfolio B', returnPct: 14.2, maxDrawdownPct: -1.8, sector: 'FMCG' },
      ],
    },
    {
      id: 'election2024',
      name: '2024 Indian General Election Results Volatility',
      period: 'May 2024 – Jun 2024 (Election Flash Drawdown)',
      startDate: '2024-05-15',
      endDate: '2024-06-15',
      description: 'Exit polls predicted a 400+ supermajority, but actual election tally on June 4th resulted in a coalition mandate, triggering a -5.9% single-day crash.',
      marketDrawdownPct: -8.4,
      portfolioADrawdownPct: -16.8,
      portfolioBDrawdownPct: -4.5,
      portfolioAReturnPct: -5.4,
      portfolioBReturnPct: 3.8,
      keyCatalyst: 'Unexpected coalition election outcome; massive sell-off in PSUs and capex-heavy momentum stocks followed by flight to FMCG safety.',
      stockPerformances: [
        { ticker: 'ADANIPOWER.NS', name: 'Adani Power', portfolio: 'Portfolio A', returnPct: -19.4, maxDrawdownPct: -24.8, sector: 'Power' },
        { ticker: 'MAZDOCK.NS', name: 'Mazagon Dock', portfolio: 'Portfolio A', returnPct: -18.2, maxDrawdownPct: -23.5, sector: 'Defense' },
        { ticker: 'ADANIGREEN.NS', name: 'Adani Green Energy', portfolio: 'Portfolio A', returnPct: -15.8, maxDrawdownPct: -21.2, sector: 'Renewables' },
        { ticker: 'DLF.NS', name: 'DLF', portfolio: 'Portfolio A', returnPct: -12.4, maxDrawdownPct: -17.5, sector: 'Real Estate' },
        { ticker: 'BSE.NS', name: 'BSE', portfolio: 'Portfolio A', returnPct: -8.6, maxDrawdownPct: -14.2, sector: 'Capital Markets' },
        { ticker: 'BAJFINANCE.NS', name: 'Bajaj Finance', portfolio: 'Portfolio A', returnPct: -4.5, maxDrawdownPct: -9.8, sector: 'NBFC' },
        { ticker: 'DIXON.NS', name: 'Dixon Technologies', portfolio: 'Portfolio A', returnPct: 6.4, maxDrawdownPct: -11.2, sector: 'Manufacturing' },
        { ticker: 'PAYTM.NS', name: 'Paytm', portfolio: 'Portfolio A', returnPct: 8.2, maxDrawdownPct: -8.4, sector: 'Fintech' },
        { ticker: 'ZOMATO.NS', name: 'Zomato', portfolio: 'Portfolio A', returnPct: 12.8, maxDrawdownPct: -6.5, sector: 'Consumer Tech' },
        { ticker: 'TRENT.NS', name: 'Trent', portfolio: 'Portfolio A', returnPct: 16.4, maxDrawdownPct: -5.2, sector: 'Retail' },
        // Portfolio B constituents
        { ticker: 'NTPC.NS', name: 'NTPC', portfolio: 'Portfolio B', returnPct: -8.5, maxDrawdownPct: -14.2, sector: 'Utilities' },
        { ticker: 'POWERGRID.NS', name: 'Power Grid', portfolio: 'Portfolio B', returnPct: -5.2, maxDrawdownPct: -11.5, sector: 'Utilities' },
        { ticker: 'ICICIBANK.NS', name: 'ICICI Bank', portfolio: 'Portfolio B', returnPct: -2.4, maxDrawdownPct: -7.8, sector: 'Banking' },
        { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', portfolio: 'Portfolio B', returnPct: 1.8, maxDrawdownPct: -6.2, sector: 'Banking' },
        { ticker: 'TCS.NS', name: 'TCS', portfolio: 'Portfolio B', returnPct: 3.5, maxDrawdownPct: -4.1, sector: 'IT Services' },
        { ticker: 'INFY.NS', name: 'Infosys', portfolio: 'Portfolio B', returnPct: 4.2, maxDrawdownPct: -3.8, sector: 'IT Services' },
        { ticker: 'SUNPHARMA.NS', name: 'Sun Pharma', portfolio: 'Portfolio B', returnPct: 5.8, maxDrawdownPct: -2.8, sector: 'Pharma' },
        { ticker: 'ITC.NS', name: 'ITC', portfolio: 'Portfolio B', returnPct: 7.4, maxDrawdownPct: -2.1, sector: 'FMCG' },
        { ticker: 'NESTLEIND.NS', name: 'Nestlé India', portfolio: 'Portfolio B', returnPct: 8.6, maxDrawdownPct: -1.9, sector: 'FMCG' },
        { ticker: 'HINDUNILVR.NS', name: 'Hindustan Unilever', portfolio: 'Portfolio B', returnPct: 11.2, maxDrawdownPct: -1.5, sector: 'FMCG' },
      ],
    },
  ];

  const currentCrisis = CRISIS_EVENTS.find((c) => c.id === activeCrisisId) || CRISIS_EVENTS[0];

  // Dynamically filter comparison data when in focused mode so clicking any crisis at top updates table values
  const displayedComparisonData = useMemo(() => {
    if (tableDisplayMode === 'focused') {
      const filtered = comparisonData.filter((r) => r.periodKey === activeCrisisId);
      return filtered.length > 0 ? filtered : comparisonData;
    }
    return comparisonData;
  }, [comparisonData, tableDisplayMode, activeCrisisId]);

  // Sort stock performance ascending by return (worst to best) for the bar chart
  const sortedStockPerf = useMemo(() => {
    return [...currentCrisis.stockPerformances].sort((a, b) => a.returnPct - b.returnPct);
  }, [currentCrisis]);

  const handleDownloadHistoricalComparison = () => {
    const csvRows = displayedComparisonData.map((row) => ({
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
    exportToCSV(csvRows, `historical_stress_${activeCrisisId}`);
  };


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 text-rose-600">
            <Flame className="w-3.5 h-3.5" />
            <span>Macroeconomic Stress Testing & Crisis Vulnerability</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Performance of Portfolios in Each Crisis & Stock-Wise Breakdown
          </h2>
          <div className="text-xs text-slate-500 mt-0.5">
            4 Distinct Historical Regimes: COVID Crash, 2022 Inflation/Rate Shock, 2023 Adani Shock & 2024 Election Volatility
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
            <span>historical_stress_data.csv</span>
          </button>
        </div>
      </div>

      {/* CRISIS REGIME TABS SELECTOR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-rose-600" />
            Select Historical Crisis Scenario:
          </span>
          <span className="text-[11px] text-slate-500">
            Click to inspect portfolio drawdown & individual stock returns during that specific shock
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {CRISIS_EVENTS.map((crisis) => (
            <button
              key={crisis.id}
              onClick={() => setActiveCrisisId(crisis.id)}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                activeCrisisId === crisis.id
                  ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70 text-slate-700'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-xs text-slate-900 block truncate">
                  {crisis.name}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{crisis.period}</div>
              <div className="flex items-center justify-between text-[11px] font-mono mt-2 pt-1.5 border-t border-slate-200/60">
                <span className="text-orange-700 font-bold">Port A: {crisis.portfolioADrawdownPct}%</span>
                <span className="text-teal-800 font-bold">Port B: {crisis.portfolioBDrawdownPct}%</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SELECTED CRISIS SUMMARY & AGGREGATE PERFORMANCE CARDS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                {currentCrisis.name}
              </h3>
              <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-semibold">
                {currentCrisis.period}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-3xl">
              {currentCrisis.description}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-sans block">Market Drawdown</span>
              <span className="font-mono text-lg font-bold text-slate-800">{currentCrisis.marketDrawdownPct}%</span>
            </div>
          </div>
        </div>

        {/* 3 Metric Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-orange-50/70 p-3.5 rounded-xl border border-orange-200/80">
            <span className="text-[11px] font-bold text-orange-900 uppercase tracking-wider block">
              Portfolio A (High Risk)
            </span>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <div>
                <span className="text-xs text-slate-500 font-sans block">Max Drawdown</span>
                <span className="text-xl font-bold text-red-700">{currentCrisis.portfolioADrawdownPct}%</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-sans block">Period Return</span>
                <span className={`text-sm font-bold ${currentCrisis.portfolioAReturnPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {currentCrisis.portfolioAReturnPct > 0 ? `+${currentCrisis.portfolioAReturnPct}%` : `${currentCrisis.portfolioAReturnPct}%`}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-orange-800 mt-2 block font-sans">
              High systematic beta and leverage caused severe capital liquidation.
            </span>
          </div>

          <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-200/80">
            <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider block">
              Portfolio B (Low Risk)
            </span>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <div>
                <span className="text-xs text-slate-500 font-sans block">Max Drawdown</span>
                <span className="text-xl font-bold text-emerald-800">{currentCrisis.portfolioBDrawdownPct}%</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-sans block">Period Return</span>
                <span className={`text-sm font-bold ${currentCrisis.portfolioBReturnPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {currentCrisis.portfolioBReturnPct > 0 ? `+${currentCrisis.portfolioBReturnPct}%` : `${currentCrisis.portfolioBReturnPct}%`}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-teal-800 mt-2 block font-sans">
              Non-cyclical cash flows and FMCG staples cushioned drawdown by ~{(Math.abs(currentCrisis.portfolioADrawdownPct) - Math.abs(currentCrisis.portfolioBDrawdownPct)).toFixed(1)}% pts.
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              NIFTY 50 Benchmark
            </span>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <div>
                <span className="text-xs text-slate-500 font-sans block">Max Drawdown</span>
                <span className="text-xl font-bold text-slate-900">{currentCrisis.marketDrawdownPct}%</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-sans block">Index Behavior</span>
                <span className="text-sm font-semibold text-slate-700">Broad Market</span>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 block font-sans">
              Weighted benchmark across 50 diversified large-cap equities.
            </span>
          </div>
        </div>
      </div>

      {/* STOCK-WISE PERFORMANCE GRAPH FOR THE SELECTED CRISIS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Constituent Equity Waterfall / Bar Distribution</span>
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Stock-Wise Performance in {currentCrisis.name}
          </h3>
          <p className="text-xs text-slate-500">
            Individual equity returns during the selected crisis window, ordered from worst hit to most resilient
          </p>
        </div>

        {/* Plotly Stock-Wise Performance Chart */}
        <div className="w-full">
          <PlotlyChart
            data={[
              {
                x: sortedStockPerf.map((s) => s.name),
                y: sortedStockPerf.map((s) => s.returnPct),
                type: 'bar',
                marker: {
                  color: sortedStockPerf.map((s) =>
                    s.portfolio === 'Portfolio A' ? '#f97316' : '#0d9488'
                  ),
                },
                text: sortedStockPerf.map((s) =>
                  s.returnPct >= 0 ? `+${s.returnPct.toFixed(1)}%` : `${s.returnPct.toFixed(1)}%`
                ),
                textposition: 'auto',
                hovertemplate:
                  '<b>%{x}</b><br>Return: %{y:.1f}%<br>Max Drawdown: -%{customdata}%<extra></extra>',
                customdata: sortedStockPerf.map((s) => Math.abs(s.maxDrawdownPct)),
              },
            ]}
            layout={{
              height: 380,
              yaxis: {
                title: { text: 'Crisis Period Return (%)' },
                gridcolor: '#f1f5f9',
                zeroline: true,
                zerolinecolor: '#cbd5e1',
                ticksuffix: '%',
              },
              xaxis: {
                tickangle: -40,
                tickfont: { size: 10 },
              },
            }}
          />
        </div>

        {/* Stock Chart Legend & Observations */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium text-orange-700">
              <span className="w-3 h-3 bg-orange-500 rounded-sm inline-block" />
              Portfolio A (High Risk Constituents)
            </span>
            <span className="flex items-center gap-1.5 font-medium text-teal-800">
              <span className="w-3 h-3 bg-teal-600 rounded-sm inline-block" />
              Portfolio B (Low Risk Constituents)
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-500">
            Worst Hit: <strong className="text-red-700">{sortedStockPerf[0]?.name} ({sortedStockPerf[0]?.returnPct}%)</strong> ·
            Most Resilient: <strong className="text-emerald-700">{sortedStockPerf[sortedStockPerf.length - 1]?.name} ({sortedStockPerf[sortedStockPerf.length - 1]?.returnPct > 0 ? `+${sortedStockPerf[sortedStockPerf.length - 1]?.returnPct}%` : `${sortedStockPerf[sortedStockPerf.length - 1]?.returnPct}%`})</strong>
          </div>
        </div>
      </div>

      {/* MASTER HISTORICAL RISK & DOWNSIDE PERFORMANCE MASTER MATRIX (TABLE 1) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Table 1: Historical Risk & Downside Performance Master Matrix
              </h3>
              <span className="px-2 py-0.5 text-[10px] rounded font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
                Active Crisis: {currentCrisis.name}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {tableDisplayMode === 'focused'
                ? `Dynamically filtered to active scenario (${currentCrisis.period}). Click other crises above to switch values.`
                : 'Comparing Calm Period, All 4 Crisis Shocks & 5-Year Sample (Active scenario highlighted)'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
              <button
                onClick={() => setTableDisplayMode('focused')}
                className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer font-medium ${
                  tableDisplayMode === 'focused'
                    ? 'bg-rose-600 text-white font-semibold shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
                title="Only show the crisis currently selected at the top"
              >
                Focus Active Crisis
              </button>
              <button
                onClick={() => setTableDisplayMode('all')}
                className={`px-2.5 py-1 text-xs rounded transition-colors cursor-pointer font-medium ${
                  tableDisplayMode === 'all'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
                title="Show all 6 historical regimes with active scenario highlighted"
              >
                Show All 6 Regimes
              </button>
            </div>

            <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
              Target Return: {filters.riskFreeRatePct}% p.a. · Factor: √252
            </span>
          </div>
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
              {displayedComparisonData.map((row, idx) => {
                const isActive = row.periodKey === activeCrisisId;
                return (
                  <tr
                    key={`${row.periodKey}-${row.portfolio}`}
                    onClick={() => {
                      if (CRISIS_EVENTS.some((c) => c.id === row.periodKey)) {
                        setActiveCrisisId(row.periodKey);
                      }
                    }}
                    className={`transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-rose-50/80 border-l-4 border-l-rose-500 font-semibold'
                        : 'hover:bg-slate-50/70'
                    } ${idx % 2 === 1 ? 'border-b-2 border-slate-200/60' : ''}`}
                  >
                    <td className="p-3 font-sans font-medium text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{row.periodName}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-mono font-bold">
                            ★ Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{row.dateRange}</div>
                    </td>
                    <td className="p-3 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.portfolio === 'Portfolio A'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {row.portfolio}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {row.includedStocksCount}/10
                    </td>
                    <td className="p-3 text-right text-slate-700">{row.alignedObsCount}</td>
                    <td className="p-3 text-right text-slate-700">{row.negativeMarketObsCount}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {row.annualizedVolPct.toFixed(1)}%
                    </td>
                    <td className="p-3 text-right text-slate-700">
                      {row.ordinaryBeta.toFixed(2)}
                    </td>
                    <td className="p-3 text-right font-bold text-rose-700">
                      {row.downsideBeta.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-slate-900 font-bold">
                      {row.sortinoRatio.toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-rose-700">
                      {row.var95Pct.toFixed(2)}%
                    </td>
                    <td className="p-3 text-right text-rose-800">
                      {row.es95Pct.toFixed(2)}%
                    </td>
                    <td className="p-3 text-right font-bold text-red-700">
                      {row.maxDrawdownPct.toFixed(1)}%
                    </td>
                    <td
                      className={`p-3 text-right font-bold ${
                        row.cumulativeReturnPct >= 0 ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {row.cumulativeReturnPct > 0 ? `+${row.cumulativeReturnPct.toFixed(1)}%` : `${row.cumulativeReturnPct.toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

