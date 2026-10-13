import React, { useMemo } from 'react';
import { X, Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import { PortfolioPerformanceMetrics, StressTestResult, GlobalFilterState } from '../../types';
import { formatINR, calculateDownsideBeta, calculateOrdinaryBeta } from '../../utils/math';
import { DAILY_OBSERVATIONS } from '../../data/dailyRiskData';
import { exportToCSV } from '../../utils/excel';

interface ReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricsA: PortfolioPerformanceMetrics;
  metricsB: PortfolioPerformanceMetrics;
  stressTestResults: StressTestResult[];
  filters: GlobalFilterState;
}

export function ReportExportModal({
  isOpen,
  onClose,
  metricsA,
  metricsB,
  stressTestResults,
  filters,
}: ReportExportModalProps) {
  if (!isOpen) return null;

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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSummaryCSV = () => {
    const summaryRows = [
      {
        Category: 'Executive Metric',
        Metric: 'Cumulative Return (%)',
        'Portfolio A (High Risk)': metricsA.cumulativeReturnPct,
        'Portfolio B (Low Risk)': metricsB.cumulativeReturnPct,
      },
      {
        Category: 'Executive Metric',
        Metric: 'Annualized Return (%)',
        'Portfolio A (High Risk)': metricsA.annualizedReturnPct,
        'Portfolio B (Low Risk)': metricsB.annualizedReturnPct,
      },
      {
        Category: 'Executive Metric',
        Metric: 'Annualized Volatility (%)',
        'Portfolio A (High Risk)': metricsA.annualizedVolatilityPct,
        'Portfolio B (Low Risk)': metricsB.annualizedVolatilityPct,
      },
      {
        Category: 'Executive Metric',
        Metric: 'Sharpe Ratio (Rf=6%)',
        'Portfolio A (High Risk)': metricsA.sharpeRatio,
        'Portfolio B (Low Risk)': metricsB.sharpeRatio,
      },
      {
        Category: 'Executive Metric',
        Metric: 'Max Drawdown (%)',
        'Portfolio A (High Risk)': metricsA.maximumDrawdownPct,
        'Portfolio B (Low Risk)': metricsB.maximumDrawdownPct,
      },
      {
        Category: 'Executive Metric',
        Metric: 'Ordinary Market Beta (β)',
        'Portfolio A (High Risk)': ordinaryBetaA.beta,
        'Portfolio B (Low Risk)': ordinaryBetaB.beta,
      },
      {
        Category: 'Downside Asymmetry',
        Metric: 'Downside Beta (β⁻, Nifty < 0)',
        'Portfolio A (High Risk)': downsideBetaA.downsideBeta,
        'Portfolio B (Low Risk)': downsideBetaB.downsideBeta,
      },
      {
        Category: 'Downside Tail Risk',
        Metric: 'Monthly 95% VaR (%)',
        'Portfolio A (High Risk)': metricsA.monthlyVar95Pct,
        'Portfolio B (Low Risk)': metricsB.monthlyVar95Pct,
      },
      {
        Category: 'Downside Tail Risk',
        Metric: 'Monthly 95% Expected Shortfall (%)',
        'Portfolio A (High Risk)': metricsA.monthlyEs95Pct,
        'Portfolio B (Low Risk)': metricsB.monthlyEs95Pct,
      },
    ];
    exportToCSV(summaryRows, 'FRA_Executive_Report_Summary');
  };

  // Automated Insight statements
  const returnDiff = (metricsA.annualizedReturnPct - metricsB.annualizedReturnPct).toFixed(1);
  const volDiff = (metricsA.annualizedVolatilityPct - metricsB.annualizedVolatilityPct).toFixed(1);
  const mddDiff = (Math.abs(metricsA.maximumDrawdownPct) - Math.abs(metricsB.maximumDrawdownPct)).toFixed(1);
  const varDiff = (metricsA.monthlyVar95Pct - metricsB.monthlyVar95Pct).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Modal Top Bar */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-800" />
            <span className="font-bold text-slate-900 text-sm">
              Executive Investment Committee Risk Report
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSummaryCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 space-y-6 text-slate-900" id="printable-report">
          {/* Institutional Report Header */}
          <div className="border-b-2 border-slate-900 pb-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
                  Great Lakes Institute of Management · Financial Risk Analysis (FRA)
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Portfolio Risk, Stress Testing & Markowitz Optimization Report
                </h1>
                <div className="text-xs text-slate-600 mt-1">
                  Empirical Risk Analysis of High-Risk vs Defensive Equities (5-Year Historical Observations)
                </div>
              </div>
              <div className="text-right text-xs text-slate-500 font-mono">
                <div>Date: {new Date().toLocaleDateString('en-IN')}</div>
                <div>Status: Academic Defense Review</div>
              </div>
            </div>
          </div>

          {/* Core Findings Callout */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Executive Finding: Empirical Data Validates Ex-Ante Risk Classification
            </div>
            <p className="text-slate-700 leading-relaxed">
              The historical evidence over the observed period robustly confirms the risk hypothesis:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>
                <strong>Volatility Spread:</strong> Portfolio A exhibited an annualized volatility of{' '}
                <strong>{metricsA.annualizedVolatilityPct}%</strong> vs{' '}
                <strong>{metricsB.annualizedVolatilityPct}%</strong> for Portfolio B ({volDiff}% pts higher).
              </li>
              <li>
                <strong>Downside Tail Risk (95% VaR & ES):</strong> Portfolio A recorded a monthly 95% VaR of{' '}
                <strong>{metricsA.monthlyVar95Pct}%</strong> vs{' '}
                <strong>{metricsB.monthlyVar95Pct}%</strong> for Portfolio B, confirming significantly fatter left-tail losses.
              </li>
              <li>
                <strong>Maximum Drawdown:</strong> Portfolio A suffered a maximum peak-to-trough decline of{' '}
                <strong>{metricsA.maximumDrawdownPct}%</strong>, whereas Portfolio B preserved capital with a drawdown of{' '}
                <strong>{metricsB.maximumDrawdownPct}%</strong>.
              </li>
              <li>
                <strong>Stress Testing Resiliency:</strong> During the acute COVID-19 crisis window, Portfolio B provided decisive downside cushion, experiencing half the maximum drawdown of the high-risk basket.
              </li>
            </ul>
          </div>

          {/* Performance & Risk Comparison Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Table 1: 5-Year Empirical Risk & Return Summary
            </h3>
            <table className="w-full text-xs border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold text-left">
                  <th className="p-2 border border-slate-200">Analytical Metric</th>
                  <th className="p-2 border border-slate-200 text-orange-950 bg-orange-50/60">
                    Portfolio A (High Risk)
                  </th>
                  <th className="p-2 border border-slate-200 text-teal-950 bg-teal-50/60">
                    Portfolio B (Low Risk)
                  </th>
                  <th className="p-2 border border-slate-200 text-slate-600">Spread (A - B)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                <tr>
                  <td className="p-2 font-sans font-medium text-slate-800">Initial Capital</td>
                  <td className="p-2">{formatINR(metricsA.initialCapital)}</td>
                  <td className="p-2">{formatINR(metricsB.initialCapital)}</td>
                  <td className="p-2 text-slate-500">₹0</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium text-slate-800">Ending Portfolio Value</td>
                  <td className="p-2 font-bold text-slate-900">{formatINR(metricsA.endingValue)}</td>
                  <td className="p-2 font-bold text-slate-900">{formatINR(metricsB.endingValue)}</td>
                  <td className="p-2 font-bold">
                    {formatINR(metricsA.endingValue - metricsB.endingValue)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium text-slate-800">Cumulative Return (%)</td>
                  <td className="p-2 text-emerald-700">{metricsA.cumulativeReturnPct}%</td>
                  <td className="p-2 text-emerald-700">{metricsB.cumulativeReturnPct}%</td>
                  <td className="p-2">{(metricsA.cumulativeReturnPct - metricsB.cumulativeReturnPct).toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium text-slate-800">Annualized CAGR Return (%)</td>
                  <td className="p-2">{metricsA.annualizedReturnPct}%</td>
                  <td className="p-2">{metricsB.annualizedReturnPct}%</td>
                  <td className="p-2">+{returnDiff}%</td>
                </tr>
                <tr className="bg-slate-50/50">
                  <td className="p-2 font-sans font-bold text-slate-900">Annualized Volatility (%)</td>
                  <td className="p-2 font-bold text-orange-600">{metricsA.annualizedVolatilityPct}%</td>
                  <td className="p-2 font-bold text-teal-700">{metricsB.annualizedVolatilityPct}%</td>
                  <td className="p-2 font-bold">+{volDiff}%</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium text-slate-800">Ordinary Market Beta (β)</td>
                  <td className="p-2 font-bold">{ordinaryBetaA.beta.toFixed(2)}</td>
                  <td className="p-2 font-bold">{ordinaryBetaB.beta.toFixed(2)}</td>
                  <td className="p-2">
                    {ordinaryBetaA.beta - ordinaryBetaB.beta >= 0 ? '+' : ''}
                    {(ordinaryBetaA.beta - ordinaryBetaB.beta).toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-red-50/20">
                  <td className="p-2 font-sans font-bold text-red-950">Downside Beta (β⁻, Nifty &lt; 0)</td>
                  <td className="p-2 font-bold text-red-700">{downsideBetaA.downsideBeta.toFixed(2)}</td>
                  <td className="p-2 font-bold text-teal-700">{downsideBetaB.downsideBeta.toFixed(2)}</td>
                  <td className="p-2 font-bold text-red-700">
                    {downsideBetaA.downsideBeta - downsideBetaB.downsideBeta >= 0 ? '+' : ''}
                    {(downsideBetaA.downsideBeta - downsideBetaB.downsideBeta).toFixed(2)} (Amplified)
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium text-slate-800">Sharpe Ratio (Rf=6%)</td>
                  <td className="p-2">{metricsA.sharpeRatio}</td>
                  <td className="p-2">{metricsB.sharpeRatio}</td>
                  <td className="p-2">{(metricsA.sharpeRatio - metricsB.sharpeRatio).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium text-slate-800">Sortino Ratio (Rf=6%, √252)</td>
                  <td className="p-2">{metricsA.sortinoRatio}</td>
                  <td className="p-2">{metricsB.sortinoRatio}</td>
                  <td className="p-2">{(metricsA.sortinoRatio - metricsB.sortinoRatio).toFixed(2)}</td>
                </tr>
                <tr className="bg-red-50/30">
                  <td className="p-2 font-sans font-bold text-red-950">Monthly 95% VaR (%)</td>
                  <td className="p-2 font-bold text-red-700">{metricsA.monthlyVar95Pct}%</td>
                  <td className="p-2 font-bold text-red-700">{metricsB.monthlyVar95Pct}%</td>
                  <td className="p-2 font-bold text-red-700">+{varDiff}%</td>
                </tr>
                <tr className="bg-red-50/30">
                  <td className="p-2 font-sans font-bold text-red-950">Monthly 95% Expected Shortfall (%)</td>
                  <td className="p-2 font-bold text-red-800">{metricsA.monthlyEs95Pct}%</td>
                  <td className="p-2 font-bold text-red-800">{metricsB.monthlyEs95Pct}%</td>
                  <td className="p-2 font-bold text-red-800">
                    +{(metricsA.monthlyEs95Pct - metricsB.monthlyEs95Pct).toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium text-slate-800">Maximum Drawdown (%)</td>
                  <td className="p-2 text-red-700">{metricsA.maximumDrawdownPct}%</td>
                  <td className="p-2 text-slate-700">{metricsB.maximumDrawdownPct}%</td>
                  <td className="p-2 font-bold">-{mddDiff}% deeper</td>
                </tr>
                <tr>
                  <td className="p-2 font-sans font-medium text-slate-800">Positive Months Frequency (%)</td>
                  <td className="p-2">{metricsA.positiveMonthsPct}%</td>
                  <td className="p-2">{metricsB.positiveMonthsPct}%</td>
                  <td className="p-2">{(metricsA.positiveMonthsPct - metricsB.positiveMonthsPct).toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Stress Testing Section */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Table 2: Historical Regime Stress Test (Calm vs COVID Shock)
            </h3>
            <table className="w-full text-xs border border-slate-200 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold text-left">
                  <th className="p-2 border border-slate-200">Portfolio</th>
                  <th className="p-2 border border-slate-200">Period</th>
                  <th className="p-2 border border-slate-200">Stocks</th>
                  <th className="p-2 border border-slate-200">Annual Vol (%)</th>
                  <th className="p-2 border border-slate-200">Daily 95% VaR (%)</th>
                  <th className="p-2 border border-slate-200">Max Drawdown (%)</th>
                  <th className="p-2 border border-slate-200">Cumulative (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {stressTestResults.map((st, i) => (
                  <tr key={i}>
                    <td className="p-2 font-sans font-medium text-slate-900">{st.portfolio}</td>
                    <td className="p-2 font-sans text-slate-700">{st.period}</td>
                    <td className="p-2">{st.includedStocksCount} / 10</td>
                    <td className="p-2">{st.annualizedVolPct}%</td>
                    <td className="p-2">{st.dailyVar95Pct}%</td>
                    <td className="p-2 text-red-700">{st.maximumDrawdownPct}%</td>
                    <td className="p-2 font-bold">{st.cumulativeReturnPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Academic Governance and Limitations */}
          <div className="border-t border-slate-200 pt-4 text-xs text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700">Methodological Limitations:</div>
            <p>
              1. Past performance does not assure forward return distributions. 2. Survivorship bias controls were implemented for stocks listed post-2020. 3. Risk-free rate was set at 6.0% annual as a theoretical benchmark proxy.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50 flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Close Report
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Print / Save PDF
          </button>
        </div>
      </div>
    </div>
  );
}
