import * as XLSX from 'xlsx';
import { MonthlyReturnRow, StockStatistics, PortfolioPerformanceMetrics, StressTestResult } from '../types';

/**
 * Generates and downloads the complete FRA Analysis Excel Workbook
 */
export function exportFRAWorkbook(params: {
  monthlyReturns: MonthlyReturnRow[];
  stockStats: StockStatistics[];
  metricsA: PortfolioPerformanceMetrics;
  metricsB: PortfolioPerformanceMetrics;
  stressTestResults: StressTestResult[];
  correlationMatrix: { tickerA: string; tickerB: string; correlation: number }[];
  frontierAWeights: { ticker: string; name: string; minVolWeight: number; maxSharpeWeight: number }[];
  frontierBWeights: { ticker: string; name: string; minVolWeight: number; maxSharpeWeight: number }[];
}) {
  const wb = XLSX.utils.book_new();

  // 1. Data Quality / Overview Sheet
  const qualityData = params.stockStats.map((s) => ({
    Ticker: s.ticker,
    Company: s.name,
    Portfolio: s.portfolio,
    Sector: s.sector,
    'Observed Months': s.monthsCount,
    'Annualized Return (%)': s.annualizedReturnPct,
    'Annualized Volatility (%)': s.annualizedVolPct,
    '95% Historical VaR (%)': s.var95Pct,
    '95% Expected Shortfall (%)': s.es95Pct,
    'Benchmark Beta': s.beta,
  }));
  const wsQuality = XLSX.utils.json_to_sheet(qualityData);
  XLSX.utils.book_append_sheet(wb, wsQuality, 'Data_Quality');

  // 2. Portfolio Performance Metrics Sheet
  const metricsData = [
    {
      Metric: 'Observations (Months)',
      'Portfolio A (High Risk)': params.metricsA.observationsMonths,
      'Portfolio B (Low Risk)': params.metricsB.observationsMonths,
    },
    {
      Metric: 'Initial Capital (₹)',
      'Portfolio A (High Risk)': params.metricsA.initialCapital,
      'Portfolio B (Low Risk)': params.metricsB.initialCapital,
    },
    {
      Metric: 'Ending Value (₹)',
      'Portfolio A (High Risk)': params.metricsA.endingValue,
      'Portfolio B (Low Risk)': params.metricsB.endingValue,
    },
    {
      Metric: 'Cumulative Return (%)',
      'Portfolio A (High Risk)': params.metricsA.cumulativeReturnPct,
      'Portfolio B (Low Risk)': params.metricsB.cumulativeReturnPct,
    },
    {
      Metric: 'Annualized Return (%)',
      'Portfolio A (High Risk)': params.metricsA.annualizedReturnPct,
      'Portfolio B (Low Risk)': params.metricsB.annualizedReturnPct,
    },
    {
      Metric: 'Annualized Volatility (%)',
      'Portfolio A (High Risk)': params.metricsA.annualizedVolatilityPct,
      'Portfolio B (Low Risk)': params.metricsB.annualizedVolatilityPct,
    },
    {
      Metric: 'Sharpe Ratio (Rf=6%)',
      'Portfolio A (High Risk)': params.metricsA.sharpeRatio,
      'Portfolio B (Low Risk)': params.metricsB.sharpeRatio,
    },
    {
      Metric: 'Sortino Ratio',
      'Portfolio A (High Risk)': params.metricsA.sortinoRatio,
      'Portfolio B (Low Risk)': params.metricsB.sortinoRatio,
    },
    {
      Metric: 'Monthly 95% VaR (%)',
      'Portfolio A (High Risk)': params.metricsA.monthlyVar95Pct,
      'Portfolio B (Low Risk)': params.metricsB.monthlyVar95Pct,
    },
    {
      Metric: 'Monthly 95% Expected Shortfall (%)',
      'Portfolio A (High Risk)': params.metricsA.monthlyEs95Pct,
      'Portfolio B (Low Risk)': params.metricsB.monthlyEs95Pct,
    },
    {
      Metric: 'Maximum Drawdown (%)',
      'Portfolio A (High Risk)': params.metricsA.maximumDrawdownPct,
      'Portfolio B (Low Risk)': params.metricsB.maximumDrawdownPct,
    },
    {
      Metric: 'Positive Months (%)',
      'Portfolio A (High Risk)': params.metricsA.positiveMonthsPct,
      'Portfolio B (Low Risk)': params.metricsB.positiveMonthsPct,
    },
    {
      Metric: 'Return Skewness',
      'Portfolio A (High Risk)': params.metricsA.skewness,
      'Portfolio B (Low Risk)': params.metricsB.skewness,
    },
    {
      Metric: 'Return Excess Kurtosis',
      'Portfolio A (High Risk)': params.metricsA.kurtosis,
      'Portfolio B (Low Risk)': params.metricsB.kurtosis,
    },
  ];
  const wsMetrics = XLSX.utils.json_to_sheet(metricsData);
  XLSX.utils.book_append_sheet(wb, wsMetrics, 'Portfolio_Metrics');

  // 3. Monthly Returns Sheet
  const wsReturns = XLSX.utils.json_to_sheet(params.monthlyReturns);
  XLSX.utils.book_append_sheet(wb, wsReturns, 'Monthly_Returns');

  // 4. Stress Test Results Sheet
  const stressRows = params.stressTestResults.map((st) => ({
    Portfolio: st.portfolio,
    Period: st.period,
    'Start Date': st.startDate,
    'End Date': st.endDate,
    'Included Stocks Count': st.includedStocksCount,
    'Included Tickers': st.includedStocks.join(', '),
    'Excluded Tickers': st.excludedStocks.join(', '),
    'Daily Observations': st.observationsCount,
    'Annualized Volatility (%)': st.annualizedVolPct,
    'Daily 95% VaR (%)': st.dailyVar95Pct,
    'Daily 95% ES (%)': st.dailyEs95Pct,
    'Max Drawdown (%)': st.maximumDrawdownPct,
    'Cumulative Return (%)': st.cumulativeReturnPct,
  }));
  const wsStress = XLSX.utils.json_to_sheet(stressRows);
  XLSX.utils.book_append_sheet(wb, wsStress, 'Stress_Test');

  // 5. Frontier Weights A & B
  const wsFrontierA = XLSX.utils.json_to_sheet(params.frontierAWeights);
  XLSX.utils.book_append_sheet(wb, wsFrontierA, 'Portfolio_A_Frontier_Weights');

  const wsFrontierB = XLSX.utils.json_to_sheet(params.frontierBWeights);
  XLSX.utils.book_append_sheet(wb, wsFrontierB, 'Portfolio_B_Frontier_Weights');

  // Generate file and trigger download
  XLSX.writeFile(wb, 'FRA_Complete_Analysis.xlsx');
}

/**
 * Exports arbitrary array of objects to CSV
 */
export function exportToCSV(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports arbitrary string content to a plain text file (.txt)
 */
export function exportTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Parses user-uploaded Excel or CSV file
 */
export async function parseUploadedFile(file: File): Promise<{
  monthlyReturns: MonthlyReturnRow[];
  tickersFound: string[];
  rowCount: number;
  warnings: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const wb = XLSX.read(buffer, { type: 'binary' });

        // Prefer sheet named 'Monthly_Returns' or the first sheet
        let sheetName = wb.SheetNames.find((s) => s.toLowerCase().includes('return')) || wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws);

        if (!rawJson || rawJson.length === 0) {
          throw new Error('The uploaded file contains no data rows.');
        }

        const warnings: string[] = [];
        const firstRow = rawJson[0];
        const keys = Object.keys(firstRow);

        // Identify date column
        const dateKey = keys.find((k) =>
          ['date', 'month', 'period', 'timestamp'].includes(k.toLowerCase().trim())
        );

        if (!dateKey) {
          warnings.push("No explicit 'date' column found. Defaulted to first column as date.");
        }

        const effectiveDateKey = dateKey || keys[0];
        const tickerKeys = keys.filter((k) => k !== effectiveDateKey);

        const parsedRows: MonthlyReturnRow[] = rawJson.map((row, index) => {
          const rowDate = String(row[effectiveDateKey] || `Month-${index + 1}`).trim();
          const cleanRow: MonthlyReturnRow = { date: rowDate };

          tickerKeys.forEach((t) => {
            let val = row[t];
            if (typeof val === 'string') {
              val = parseFloat(val.replace('%', ''));
              if (row[t].includes('%')) {
                val = val / 100;
              }
            }
            if (typeof val === 'number' && !isNaN(val)) {
              cleanRow[t] = val;
            } else {
              cleanRow[t] = 0;
            }
          });

          return cleanRow;
        });

        resolve({
          monthlyReturns: parsedRows,
          tickersFound: tickerKeys,
          rowCount: parsedRows.length,
          warnings,
        });
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file.'));
    };

    reader.readAsBinaryString(file);
  });
}
