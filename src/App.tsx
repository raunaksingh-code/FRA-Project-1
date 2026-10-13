import React, { useState, useMemo } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, PageId } from './components/layout/Sidebar';
import { MethodologyModal } from './components/common/MethodologyModal';
import { ReportExportModal } from './components/common/ReportExportModal';
import { ExecutiveSummaryPage } from './pages/ExecutiveSummaryPage';
import { PortfolioConstructionPage } from './pages/PortfolioConstructionPage';
import { RiskAnalyticsPage } from './pages/RiskAnalyticsPage';
import { StressTestingPage } from './pages/StressTestingPage';
import { EfficientFrontierPage } from './pages/EfficientFrontierPage';
import { CorrelationPage } from './pages/CorrelationPage';
import { DataExplorerPage } from './pages/DataExplorerPage';
import { MonthlyReturnRow, GlobalFilterState } from './types';
import { MONTHLY_RETURNS_DATA, STRESS_TEST_DATA } from './data/historicalData';
import { PORTFOLIO_A_STOCKS, PORTFOLIO_B_STOCKS, ALL_UNIVERSE_STOCKS } from './data/universe';
import {
  computeStockStatistics,
  buildPortfolioReturnSeries,
  computePortfolioMetrics,
  computeRolling12Metrics,
} from './utils/math';
import { exportFRAWorkbook } from './utils/excel';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('summary');
  const [dataMode, setDataMode] = useState<'preloaded' | 'custom'>('preloaded');
  const [monthlyReturns, setMonthlyReturns] = useState<MonthlyReturnRow[]>(MONTHLY_RETURNS_DATA);

  // Modals
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  // Global Model Filters
  const [filters, setFilters] = useState<GlobalFilterState>({
    activePortfolio: 'All',
    confidenceLevel: 0.95,
    riskFreeRatePct: 6.0,
    initialCapital: 1500000,
    rebalanceFrequency: 'Monthly',
    maxStockWeightPct: 35,
    startDate: '2021-10',
    endDate: '2026-09',
    comparableUniverseOnly: true,
  });

  // Constituent Weights State (Default 10% equal weight across 10 stocks in each portfolio)
  const [weightsA, setWeightsA] = useState<Record<string, number>>(() =>
    Object.fromEntries(PORTFOLIO_A_STOCKS.map((s) => [s.ticker, 10.0]))
  );

  const [weightsB, setWeightsB] = useState<Record<string, number>>(() =>
    Object.fromEntries(PORTFOLIO_B_STOCKS.map((s) => [s.ticker, 10.0]))
  );

  const handleUpdateFilters = (updates: Partial<GlobalFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters({
      activePortfolio: 'All',
      confidenceLevel: 0.95,
      riskFreeRatePct: 6.0,
      initialCapital: 1500000,
      rebalanceFrequency: 'Monthly',
      maxStockWeightPct: 35,
      startDate: '2021-10',
      endDate: '2026-09',
      comparableUniverseOnly: true,
    });
    setWeightsA(Object.fromEntries(PORTFOLIO_A_STOCKS.map((s) => [s.ticker, 10.0])));
    setWeightsB(Object.fromEntries(PORTFOLIO_B_STOCKS.map((s) => [s.ticker, 10.0])));
  };

  // Stock-Level Statistics
  const stockStats = useMemo(() => {
    return ALL_UNIVERSE_STOCKS.map((stock) =>
      computeStockStatistics(monthlyReturns, stock.ticker, filters.riskFreeRatePct / 100)
    ).filter((s): s is NonNullable<typeof s> => s !== null);
  }, [monthlyReturns, filters.riskFreeRatePct]);

  // Portfolio Return Series
  const portfolioSeriesA = useMemo(() => {
    return buildPortfolioReturnSeries(
      monthlyReturns,
      weightsA,
      filters.rebalanceFrequency === 'Monthly'
    );
  }, [monthlyReturns, weightsA, filters.rebalanceFrequency]);

  const portfolioSeriesB = useMemo(() => {
    return buildPortfolioReturnSeries(
      monthlyReturns,
      weightsB,
      filters.rebalanceFrequency === 'Monthly'
    );
  }, [monthlyReturns, weightsB, filters.rebalanceFrequency]);

  const benchmarkSeries = useMemo(() => {
    return monthlyReturns.map((row) => ({
      date: row.date,
      return: typeof row['NIFTY50.NS'] === 'number' ? (row['NIFTY50.NS'] as number) : 0,
    }));
  }, [monthlyReturns]);

  // Aggregate Portfolio Performance Metrics
  const metricsA = useMemo(() => {
    const rawReturns = portfolioSeriesA.map((p) => p.return);
    return computePortfolioMetrics(
      rawReturns,
      'Portfolio A (High Risk)',
      filters.initialCapital,
      filters.riskFreeRatePct / 100
    );
  }, [portfolioSeriesA, filters.initialCapital, filters.riskFreeRatePct]);

  const metricsB = useMemo(() => {
    const rawReturns = portfolioSeriesB.map((p) => p.return);
    return computePortfolioMetrics(
      rawReturns,
      'Portfolio B (Low Risk)',
      filters.initialCapital,
      filters.riskFreeRatePct / 100
    );
  }, [portfolioSeriesB, filters.initialCapital, filters.riskFreeRatePct]);

  // Cumulative Wealth Curves (Starting at initialCapital e.g. ₹15,00,000)
  const wealthSeries = useMemo(() => {
    let runningA = filters.initialCapital;
    let runningB = filters.initialCapital;
    let runningBench = filters.initialCapital;

    return monthlyReturns.map((row, i) => {
      const retA = portfolioSeriesA[i]?.return || 0;
      const retB = portfolioSeriesB[i]?.return || 0;
      const retBench = benchmarkSeries[i]?.return || 0;

      runningA *= 1 + retA;
      runningB *= 1 + retB;
      runningBench *= 1 + retBench;

      return {
        date: row.date,
        valA: Math.round(runningA),
        valB: Math.round(runningB),
        benchVal: Math.round(runningBench),
      };
    });
  }, [monthlyReturns, portfolioSeriesA, portfolioSeriesB, benchmarkSeries, filters.initialCapital]);

  // Peak-to-Trough Drawdown Series
  const { drawdownSeriesA, drawdownSeriesB } = useMemo(() => {
    let maxA = 1;
    let runningA = 1;
    const ddA: number[] = [];

    portfolioSeriesA.forEach((p) => {
      runningA *= 1 + p.return;
      if (runningA > maxA) maxA = runningA;
      ddA.push(((runningA - maxA) / maxA) * 100);
    });

    let maxB = 1;
    let runningB = 1;
    const ddB: number[] = [];

    portfolioSeriesB.forEach((p) => {
      runningB *= 1 + p.return;
      if (runningB > maxB) maxB = runningB;
      ddB.push(((runningB - maxB) / maxB) * 100);
    });

    return { drawdownSeriesA: ddA, drawdownSeriesB: ddB };
  }, [portfolioSeriesA, portfolioSeriesB]);

  // Rolling 12-Month Performance
  const rolling12A = useMemo(() => computeRolling12Metrics(portfolioSeriesA), [portfolioSeriesA]);
  const rolling12B = useMemo(() => computeRolling12Metrics(portfolioSeriesB), [portfolioSeriesB]);

  // Full Workbook Export Handler
  const handleExportWorkbook = () => {
    exportFRAWorkbook({
      monthlyReturns,
      stockStats,
      metricsA,
      metricsB,
      stressTestResults: STRESS_TEST_DATA,
      correlationMatrix: [],
      frontierAWeights: PORTFOLIO_A_STOCKS.map((s) => ({
        ticker: s.ticker,
        name: s.name,
        minVolWeight: 10,
        maxSharpeWeight: 15,
      })),
      frontierBWeights: PORTFOLIO_B_STOCKS.map((s) => ({
        ticker: s.ticker,
        name: s.name,
        minVolWeight: 12,
        maxSharpeWeight: 8,
      })),
    });
  };

  // Custom User Uploaded Data Handlers
  const handleSetCustomData = (rows: MonthlyReturnRow[]) => {
    setMonthlyReturns(rows);
    setDataMode('custom');
  };

  const handleResetToPreloaded = () => {
    setMonthlyReturns(MONTHLY_RETURNS_DATA);
    setDataMode('preloaded');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased">
      {/* Institutional Top Navigation Header */}
      <Navbar
        dataMode={dataMode}
        onExportExcel={handleExportWorkbook}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation & Global Controls */}
        <Sidebar
          currentPage={currentPage}
          onSelectPage={setCurrentPage}
          filters={filters}
          onChangeFilters={handleUpdateFilters}
          onResetFilters={handleResetFilters}
        />

        {/* Dynamic Analytics Viewport */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentPage === 'summary' && (
              <ExecutiveSummaryPage
                metricsA={metricsA}
                metricsB={metricsB}
                wealthSeries={wealthSeries}
                drawdownSeriesA={drawdownSeriesA}
                drawdownSeriesB={drawdownSeriesB}
                stockStats={stockStats}
                filters={filters}
                onChangeFilters={handleUpdateFilters}
              />
            )}

            {currentPage === 'portfolio' && (
              <PortfolioConstructionPage
                stockStats={stockStats}
                metricsA={metricsA}
                metricsB={metricsB}
                weightsA={weightsA}
                weightsB={weightsB}
                onChangeWeightsA={setWeightsA}
                onChangeWeightsB={setWeightsB}
                filters={filters}
                rolling12A={rolling12A}
                rolling12B={rolling12B}
              />
            )}

            {currentPage === 'risk' && (
              <RiskAnalyticsPage
                metricsA={metricsA}
                metricsB={metricsB}
                returnsA={portfolioSeriesA.map((p) => p.return)}
                returnsB={portfolioSeriesB.map((p) => p.return)}
                dates={monthlyReturns.map((m) => m.date)}
                drawdownA={drawdownSeriesA}
                drawdownB={drawdownSeriesB}
                filters={filters}
                onChangeFilters={handleUpdateFilters}
              />
            )}

            {currentPage === 'stress' && (
              <StressTestingPage filters={filters} />
            )}

            {currentPage === 'frontier' && (
              <EfficientFrontierPage
                filters={filters}
                onChangeFilters={handleUpdateFilters}
              />
            )}

            {currentPage === 'correlation' && (
              <CorrelationPage />
            )}

            {currentPage === 'explorer' && (
              <DataExplorerPage
                monthlyReturns={monthlyReturns}
                stockStats={stockStats}
                metricsA={metricsA}
                metricsB={metricsB}
                stressTestResults={STRESS_TEST_DATA}
                dataMode={dataMode}
                onSetCustomData={handleSetCustomData}
                onResetToPreloaded={handleResetToPreloaded}
              />
            )}

            {/* Editorial Footer */}
            <footer className="pt-8 pb-4 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
              <div>
                <strong>FRA RiskLab</strong> · Financial Risk Analysis Academic Research Project · Great Lakes Institute of Management
              </div>
              <div className="flex items-center gap-3">
                <span>Non-Commercial Academic Analysis</span>
                <span aria-hidden="true">·</span>
                <button
                  onClick={() => setIsMethodologyOpen(true)}
                  className="hover:text-slate-800 underline cursor-pointer"
                >
                  Mathematical Formulation
                </button>
              </div>
            </footer>
          </div>
        </main>
      </div>

      {/* Methodology Framework Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

      {/* Executive Committee Report Modal */}
      <ReportExportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        metricsA={metricsA}
        metricsB={metricsB}
        stressTestResults={STRESS_TEST_DATA}
        filters={filters}
      />
    </div>
  );
}
