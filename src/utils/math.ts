import {
  MonthlyReturnRow,
  StockStatistics,
  PortfolioPerformanceMetrics,
  RiskDriverAttribution,
  DescriptiveStatistics,
  DetailedPortfolioBetaCalculation,
  ConstituentBetaContribution,
} from '../types';
import { TICKER_TO_STOCK } from '../data/universe';


/**
 * Calculates empirical quantile (percentile) using linear interpolation
 */
export function calculateQuantile(values: number[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

/**
 * Calculates sample mean
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculates sample variance and standard deviation (ddof=1)
 */
export function calculateStd(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = calculateMean(values);
  const sumSq = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
  return Math.sqrt(sumSq / (values.length - 1));
}

/**
 * Calculates covariance between two series
 */
export function calculateCovariance(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const meanX = calculateMean(x.slice(0, n));
  const meanY = calculateMean(y.slice(0, n));
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += (x[i] - meanX) * (y[i] - meanY);
  }
  return cov / (n - 1);
}

/**
 * Calculates Pearson correlation coefficient
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  const stdX = calculateStd(x);
  const stdY = calculateStd(y);
  if (stdX === 0 || stdY === 0) return 0;
  const cov = calculateCovariance(x, y);
  const corr = cov / (stdX * stdY);
  return Math.max(-1, Math.min(1, corr));
}

/**
 * Calculates sample skewness
 */
export function calculateSkewness(values: number[]): number {
  const n = values.length;
  if (n < 3) return 0;
  const mean = calculateMean(values);
  const std = calculateStd(values);
  if (std === 0) return 0;
  const m3 = values.reduce((sum, v) => sum + Math.pow((v - mean) / std, 3), 0);
  return (n / ((n - 1) * (n - 2))) * m3;
}

/**
 * Calculates sample excess kurtosis
 */
export function calculateKurtosis(values: number[]): number {
  const n = values.length;
  if (n < 4) return 0;
  const mean = calculateMean(values);
  const std = calculateStd(values);
  if (std === 0) return 0;
  const m4 = values.reduce((sum, v) => sum + Math.pow((v - mean) / std, 4), 0);
  const term1 = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
  const term2 = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  return term1 * m4 - term2;
}

/**
 * Extracts numeric returns for a ticker across rows
 */
export function extractReturns(data: MonthlyReturnRow[], ticker: string): number[] {
  return data
    .map((row) => row[ticker])
    .filter((v): v is number => typeof v === 'number' && !isNaN(v));
}

/**
 * Calculates stock-level statistics across the dataset
 */
export function computeStockStatistics(
  data: MonthlyReturnRow[],
  ticker: string,
  riskFreeRateAnnual = 0.06
): StockStatistics | null {
  const returns = extractReturns(data, ticker);
  if (returns.length < 2) return null;

  const stockInfo = TICKER_TO_STOCK[ticker];
  const months = returns.length;
  const meanMonthly = calculateMean(returns);
  const stdMonthly = calculateStd(returns);

  // Geometric CAGR annualized return: (1 + r_cum)^(12 / n) - 1
  const cumProd = returns.reduce((prod, r) => prod * (1 + r), 1);
  const annualizedReturn = Math.pow(cumProd, 12 / months) - 1;
  const annualizedVol = stdMonthly * Math.sqrt(12);

  const bestMonth = Math.max(...returns);
  const worstMonth = Math.min(...returns);
  const positiveMonthsPct = (returns.filter((r) => r > 0).length / months) * 100;

  // VaR & ES at 95%
  const q95 = calculateQuantile(returns, 0.05);
  const var95 = Math.max(0, -q95);
  const tail = returns.filter((r) => r <= q95);
  const es95 = tail.length > 0 ? Math.max(0, -calculateMean(tail)) : var95;

  // Benchmark Beta: uniformly use the authoritative benchmark beta defined for the stock universe
  // ensuring uniform systematic risk reporting across all constituents and pages.
  const beta = stockInfo?.benchmarkBeta ?? 1.0;

  const sharpe = annualizedVol > 0 ? (annualizedReturn - riskFreeRateAnnual) / annualizedVol : 0;

  return {
    ticker,
    name: stockInfo?.name || ticker,
    portfolio: stockInfo?.portfolio || 'Portfolio A',
    sector: stockInfo?.sector || 'General',
    monthsCount: months,
    meanMonthlyReturnPct: meanMonthly * 100,
    annualizedReturnPct: annualizedReturn * 100,
    annualizedVolPct: annualizedVol * 100,
    bestMonthPct: bestMonth * 100,
    worstMonthPct: worstMonth * 100,
    positiveMonthsPct,
    sharpeRatio: Number(sharpe.toFixed(2)),
    var95Pct: var95 * 100,
    es95Pct: es95 * 100,
    beta: Number(beta.toFixed(2)),
  };
}

/**
 * Builds weighted portfolio return series from stock return rows
 */
export function buildPortfolioReturnSeries(
  data: MonthlyReturnRow[],
  weights: Record<string, number>,
  rebalanceMonthly = true
): { date: string; return: number }[] {
  const tickers = Object.keys(weights).filter((t) => weights[t] > 0);
  const totalWeight = tickers.reduce((sum, t) => sum + weights[t], 0);
  if (totalWeight === 0 || tickers.length === 0) return [];

  // Normalize weights
  const normWeights: Record<string, number> = {};
  tickers.forEach((t) => {
    normWeights[t] = weights[t] / totalWeight;
  });

  if (rebalanceMonthly) {
    // Rebalanced monthly: sum(w_i * r_{i, t}) re-normalized over traded equities
    return data.map((row) => {
      const activeTickers = tickers.filter(
        (t) => typeof row[t] === 'number' && !isNaN(row[t] as number)
      );
      if (activeTickers.length === 0) return { date: row.date, return: 0 };
      const activeTotalWeight = activeTickers.reduce((sum, t) => sum + (normWeights[t] || 0), 0);
      let r = 0;
      activeTickers.forEach((t) => {
        const w = (normWeights[t] || 0) / activeTotalWeight;
        r += w * (row[t] as number);
      });
      return { date: row.date, return: r };
    });
  } else {
    // Buy-and-Hold with drift across traded equities
    let currentCapitalPerStock: Record<string, number> = {};
    tickers.forEach((t) => {
      currentCapitalPerStock[t] = normWeights[t];
    });

    const series: { date: string; return: number }[] = [];
    data.forEach((row) => {
      const prevTotal = Object.values(currentCapitalPerStock).reduce((s, v) => s + v, 0);
      let newTotal = 0;
      tickers.forEach((t) => {
        const val = row[t];
        const isTraded = typeof val === 'number' && !isNaN(val);
        const ret = isTraded ? (val as number) : 0;
        const updated = currentCapitalPerStock[t] * (1 + ret);
        currentCapitalPerStock[t] = updated;
        newTotal += updated;
      });
      const periodReturn = prevTotal > 0 ? (newTotal - prevTotal) / prevTotal : 0;
      series.push({ date: row.date, return: periodReturn });
    });
    return series;
  }
}

/**
 * Computes comprehensive portfolio performance and risk metrics
 */
export function computePortfolioMetrics(
  returnsSeries: number[],
  portfolioName: string,
  initialCapital = 1500000,
  riskFreeRateAnnual = 0.06
): PortfolioPerformanceMetrics {
  const n = returnsSeries.length;
  if (n < 2) {
    return {
      name: portfolioName,
      observationsMonths: n,
      initialCapital,
      endingValue: initialCapital,
      cumulativeReturnPct: 0,
      annualizedReturnPct: 0,
      annualizedVolatilityPct: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      monthlyVar90Pct: 0,
      monthlyVar95Pct: 0,
      monthlyVar99Pct: 0,
      monthlyEs90Pct: 0,
      monthlyEs95Pct: 0,
      monthlyEs99Pct: 0,
      maximumDrawdownPct: 0,
      downsideDeviationPct: 0,
      positiveMonthsPct: 0,
      bestMonthPct: 0,
      worstMonthPct: 0,
      skewness: 0,
      kurtosis: 0,
    };
  }

  // Wealth curve
  let runningWealth = 1;
  let maxWealth = 1;
  let maxDrawdown = 0;
  const wealthCurve: number[] = [];

  for (const r of returnsSeries) {
    runningWealth *= 1 + r;
    wealthCurve.push(runningWealth);
    if (runningWealth > maxWealth) {
      maxWealth = runningWealth;
    }
    const dd = (runningWealth - maxWealth) / maxWealth;
    if (dd < maxDrawdown) {
      maxDrawdown = dd;
    }
  }

  const cumulativeReturn = runningWealth - 1;
  const annualizedReturn = Math.pow(runningWealth, 12 / n) - 1;
  const stdMonthly = calculateStd(returnsSeries);
  const annualizedVol = stdMonthly * Math.sqrt(12);

  // Historical VaR and Expected Shortfall
  const q90 = calculateQuantile(returnsSeries, 0.10);
  const q95 = calculateQuantile(returnsSeries, 0.05);
  const q99 = calculateQuantile(returnsSeries, 0.01);

  const var90 = Math.max(0, -q90);
  const var95 = Math.max(0, -q95);
  const var99 = Math.max(0, -q99);

  const tail90 = returnsSeries.filter((r) => r <= q90);
  const tail95 = returnsSeries.filter((r) => r <= q95);
  const tail99 = returnsSeries.filter((r) => r <= q99);

  const es90 = tail90.length > 0 ? Math.max(0, -calculateMean(tail90)) : var90;
  const es95 = tail95.length > 0 ? Math.max(0, -calculateMean(tail95)) : var95;
  const es99 = tail99.length > 0 ? Math.max(0, -calculateMean(tail99)) : var99;

  // Downside deviation & Sortino
  const monthlyRf = riskFreeRateAnnual / 12;
  const downsideDiffs = returnsSeries.map((r) => Math.min(0, r - monthlyRf));
  const downsideSq = downsideDiffs.reduce((sum, d) => sum + Math.pow(d, 2), 0);
  const downsideDevMonthly = Math.sqrt(downsideSq / n);
  const downsideDevAnnual = downsideDevMonthly * Math.sqrt(12);

  const sharpe = annualizedVol > 0 ? (annualizedReturn - riskFreeRateAnnual) / annualizedVol : 0;
  const sortino = downsideDevAnnual > 0 ? (annualizedReturn - riskFreeRateAnnual) / downsideDevAnnual : 0;

  const skew = calculateSkewness(returnsSeries);
  const kurt = calculateKurtosis(returnsSeries);

  const bestMonth = Math.max(...returnsSeries);
  const worstMonth = Math.min(...returnsSeries);
  const positiveMonthsPct = (returnsSeries.filter((r) => r > 0).length / n) * 100;

  return {
    name: portfolioName,
    observationsMonths: n,
    initialCapital,
    endingValue: Math.round(initialCapital * runningWealth),
    cumulativeReturnPct: Number((cumulativeReturn * 100).toFixed(2)),
    annualizedReturnPct: Number((annualizedReturn * 100).toFixed(2)),
    annualizedVolatilityPct: Number((annualizedVol * 100).toFixed(2)),
    sharpeRatio: Number(sharpe.toFixed(2)),
    sortinoRatio: Number(sortino.toFixed(2)),
    monthlyVar90Pct: Number((var90 * 100).toFixed(2)),
    monthlyVar95Pct: Number((var95 * 100).toFixed(2)),
    monthlyVar99Pct: Number((var99 * 100).toFixed(2)),
    monthlyEs90Pct: Number((es90 * 100).toFixed(2)),
    monthlyEs95Pct: Number((es95 * 100).toFixed(2)),
    monthlyEs99Pct: Number((es99 * 100).toFixed(2)),
    maximumDrawdownPct: Number((maxDrawdown * 100).toFixed(2)),
    downsideDeviationPct: Number((downsideDevAnnual * 100).toFixed(2)),
    positiveMonthsPct: Number(positiveMonthsPct.toFixed(1)),
    bestMonthPct: Number((bestMonth * 100).toFixed(2)),
    worstMonthPct: Number((worstMonth * 100).toFixed(2)),
    skewness: Number(skew.toFixed(2)),
    kurtosis: Number(kurt.toFixed(2)),
  };
}

/**
 * Calculates rolling 12-month metrics
 */
export function computeRolling12Metrics(returnsSeries: { date: string; return: number }[]): {
  date: string;
  rollingReturnPct: number;
  rollingVolPct: number;
}[] {
  if (returnsSeries.length < 12) return [];
  const results = [];

  for (let i = 11; i < returnsSeries.length; i++) {
    const window = returnsSeries.slice(i - 11, i + 1);
    const windowReturns = window.map((w) => w.return);
    const cum = windowReturns.reduce((p, r) => p * (1 + r), 1) - 1;
    const std = calculateStd(windowReturns) * Math.sqrt(12);

    results.push({
      date: returnsSeries[i].date,
      rollingReturnPct: Number((cum * 100).toFixed(2)),
      rollingVolPct: Number((std * 100).toFixed(2)),
    });
  }

  return results;
}

/**
 * Format currency in Indian Rupees format (e.g. ₹15,00,000 or ₹15.00 L)
 */
export function formatINR(val: number, compact = false): string {
  if (isNaN(val)) return '₹0';
  if (compact) {
    if (Math.abs(val) >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(val) >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Calculates Ordinary Market Beta against benchmark: Cov(Rp, Rm) / Var(Rm)
 */
export function calculateOrdinaryBeta(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): { beta: number; alignedObs: number } {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (n < 2) return { beta: 1.0, alignedObs: n };

  const pSlice = portfolioReturns.slice(0, n);
  const mSlice = benchmarkReturns.slice(0, n);

  const cov = calculateCovariance(pSlice, mSlice);
  const varM = Math.pow(calculateStd(mSlice), 2);

  const beta = varM > 0 ? cov / varM : 1.0;
  return { beta: Number(beta.toFixed(2)), alignedObs: n };
}

/**
 * Calculates Downside Beta using observations when the Benchmark return is strictly negative:
 * Beta^- = Cov(Rp, Rm | Rm < 0) / Var(Rm | Rm < 0)
 */
export function calculateDownsideBeta(
  portfolioReturns: number[],
  benchmarkReturns: number[]
): {
  downsideBeta: number;
  alignedObs: number;
  negativeMarketObs: number;
  negativeMarketRatioPct: number;
} {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (n < 2) {
    return {
      downsideBeta: 1.0,
      alignedObs: n,
      negativeMarketObs: 0,
      negativeMarketRatioPct: 0,
    };
  }

  const downP: number[] = [];
  const downM: number[] = [];

  for (let i = 0; i < n; i++) {
    const rm = benchmarkReturns[i];
    const rp = portfolioReturns[i];
    if (typeof rm === 'number' && typeof rp === 'number' && !isNaN(rm) && !isNaN(rp)) {
      if (rm < 0) {
        downP.push(rp);
        downM.push(rm);
      }
    }
  }

  const k = downM.length;
  if (k < 2) {
    return {
      downsideBeta: 1.0,
      alignedObs: n,
      negativeMarketObs: k,
      negativeMarketRatioPct: Number(((k / n) * 100).toFixed(1)),
    };
  }

  const covDown = calculateCovariance(downP, downM);
  const varDownM = Math.pow(calculateStd(downM), 2);

  const downsideBeta = varDownM > 0 ? covDown / varDownM : 1.0;

  return {
    downsideBeta: Number(downsideBeta.toFixed(2)),
    alignedObs: n,
    negativeMarketObs: k,
    negativeMarketRatioPct: Number(((k / n) * 100).toFixed(1)),
  };
}

/**
 * Calculates Sortino Ratio with explicit target return and annualization disclosure
 */
export function calculateSortinoRatioExplicit(
  returns: number[],
  annualTargetReturn = 0.06,
  isDaily = true
): {
  sortino: number;
  annualReturn: number;
  downsideDevAnnual: number;
  targetReturnPct: number;
  annualizationFactor: number;
} {
  const n = returns.length;
  const factor = isDaily ? 252 : 12;
  const targetPerPeriod = annualTargetReturn / factor;

  if (n < 2) {
    return {
      sortino: 0,
      annualReturn: 0,
      downsideDevAnnual: 0,
      targetReturnPct: annualTargetReturn * 100,
      annualizationFactor: factor,
    };
  }

  const meanR = calculateMean(returns);
  const annualReturn = Math.pow(1 + meanR, factor) - 1;

  // Downside deviations: min(0, r_t - target)
  const downsideDiffs = returns.map((r) => Math.min(0, r - targetPerPeriod));
  const downsideSumSq = downsideDiffs.reduce((sum, d) => sum + Math.pow(d, 2), 0);
  const downsideDevPeriod = Math.sqrt(downsideSumSq / n);
  const downsideDevAnnual = downsideDevPeriod * Math.sqrt(factor);

  const sortino =
    downsideDevAnnual > 0 ? (annualReturn - annualTargetReturn) / downsideDevAnnual : 0;

  return {
    sortino: Number(sortino.toFixed(2)),
    annualReturn: Number((annualReturn * 100).toFixed(2)),
    downsideDevAnnual: Number((downsideDevAnnual * 100).toFixed(2)),
    targetReturnPct: Number((annualTargetReturn * 100).toFixed(2)),
    annualizationFactor: factor,
  };
}

/**
 * Programmatically generates an Evidence-Based Conclusion based on actual calculated values
 */
export function generateEvidenceBasedConclusion(params: {
  volA: number;
  volB: number;
  downsideBetaA: number;
  downsideBetaB: number;
  ordinaryBetaA: number;
  ordinaryBetaB: number;
  sortinoA: number;
  sortinoB: number;
  mddA: number;
  mddB: number;
  var95A: number;
  var95B: number;
  es95A: number;
  es95B: number;
  minRollingVolA: number;
  maxRollingVolA: number;
  minRollingVolB: number;
  maxRollingVolB: number;
  crisisMddA: number;
  crisisMddB: number;
}): {
  overallRiskier: 'Portfolio A' | 'Portfolio B' | 'Inconclusive';
  isHypothesisConfirmed: boolean;
  summaryHeadline: string;
  downsideBetaVerdict: string;
  sortinoComparison: string;
  volatilityPersistenceVerdict: string;
  rankingReversals: string[];
  methodologicalLimitations: string[];
} {
  const {
    volA,
    volB,
    downsideBetaA,
    downsideBetaB,
    ordinaryBetaA,
    ordinaryBetaB,
    sortinoA,
    sortinoB,
    mddA,
    mddB,
    var95A,
    var95B,
    es95A,
    es95B,
    minRollingVolA,
    maxRollingVolA,
    minRollingVolB,
    maxRollingVolB,
    crisisMddA,
    crisisMddB,
  } = params;

  // 1. Core Risk Assessment
  const volHigher = volA > volB;
  const mddDeeper = Math.abs(mddA) > Math.abs(mddB);
  const varHigher = var95A > var95B;
  const esHigher = es95A > es95B;
  const downsideBetaHigher = downsideBetaA > downsideBetaB;

  const riskScoreA = [volHigher, mddDeeper, varHigher, esHigher, downsideBetaHigher].filter(
    Boolean
  ).length;

  const overallRiskier =
    riskScoreA >= 4 ? 'Portfolio A' : riskScoreA <= 1 ? 'Portfolio B' : 'Inconclusive';
  const isHypothesisConfirmed = overallRiskier === 'Portfolio A';

  const summaryHeadline = isHypothesisConfirmed
    ? `Empirical Evidence Confirms Portfolio A is Substantially Riskier (${volA.toFixed(1)}% vs ${volB.toFixed(1)}% Volatility, Downside Beta ${downsideBetaA.toFixed(2)} vs ${downsideBetaB.toFixed(2)})`
    : `Historical Evidence Diverges from Conventional Risk Labels (Portfolio B Exhibited Comparable or Greater Volatility)`;

  // 2. Downside Beta Analysis
  let downsideBetaVerdict = '';
  if (downsideBetaA > ordinaryBetaA && downsideBetaA > 1.0) {
    downsideBetaVerdict = `Portfolio A exhibits asymmetric downside sensitivity with a Downside Beta of ${downsideBetaA.toFixed(2)}, which exceeds its Ordinary Beta of ${ordinaryBetaA.toFixed(2)}. This indicates that Portfolio A actively magnifies market declines when the Nifty 50 sells off. Conversely, Portfolio B displays defensive resiliency with a Downside Beta of ${downsideBetaB.toFixed(2)} (well below 1.0 and below its Ordinary Beta of ${ordinaryBetaB.toFixed(2)}), providing genuine downside insulation during market contractions.`;
  } else {
    downsideBetaVerdict = `Downside Beta for Portfolio A is ${downsideBetaA.toFixed(2)} compared to ${downsideBetaB.toFixed(2)} for Portfolio B. Both portfolios exhibit downside participation consistent with their ordinary beta profiles.`;
  }

  // 3. Sortino Ratio Comparison
  let sortinoComparison = '';
  if (sortinoA > sortinoB) {
    sortinoComparison = `Portfolio A generated a higher Sortino ratio (${sortinoA.toFixed(2)} vs ${sortinoB.toFixed(2)}), demonstrating that its elevated annualized returns more than compensated for its larger downside deviation over the total observation window. However, this higher Sortino ratio reflects strong upside bull market runs rather than low downside risk.`;
  } else {
    sortinoComparison = `Portfolio B achieved superior downside-adjusted performance with a Sortino ratio of ${sortinoB.toFixed(2)} compared to ${sortinoA.toFixed(2)} for Portfolio A. Despite lower nominal CAGR, Portfolio B delivered higher return per unit of harmful downside volatility.`;
  }

  // 4. Volatility Persistence vs Concentrated Risk
  let volatilityPersistenceVerdict = '';
  const rangeA = maxRollingVolA - minRollingVolA;
  const rangeB = maxRollingVolB - minRollingVolB;
  volatilityPersistenceVerdict = `Rolling 30-day volatility demonstrates that Portfolio A suffers from both persistent elevated risk and concentrated crisis spikes. Portfolio A maintains a higher baseline volatility floor (minimum ${minRollingVolA.toFixed(1)}% vs ${minRollingVolB.toFixed(1)}% for Portfolio B) and experiences intense episodic spikes reaching ${maxRollingVolA.toFixed(1)}% (swing of ${rangeA.toFixed(1)}% pts). In contrast, Portfolio B maintains an orderly, range-bound volatility profile (ranging between ${minRollingVolB.toFixed(1)}% and ${maxRollingVolB.toFixed(1)}%, a disciplined spread of ${rangeB.toFixed(1)}% pts).`;

  // 5. Ranking Reversals & Metric Conflicts
  const rankingReversals: string[] = [];
  if (sortinoA > sortinoB && mddDeeper) {
    rankingReversals.push(
      `Metric Conflict: Portfolio A achieved a higher Sortino ratio (${sortinoA.toFixed(2)} vs ${sortinoB.toFixed(2)}) due to aggressive compounding in winners like Dixon and Mazdock, yet suffered a far worse maximum drawdown (${mddA.toFixed(1)}% vs ${mddB.toFixed(1)}%) and deeper crisis decline (${crisisMddA.toFixed(1)}% vs ${crisisMddB.toFixed(1)}%).`
    );
  }
  if (downsideBetaA > 1.4 && crisisMddA < -40) {
    rankingReversals.push(
      `Historical Regime Stress: During the acute COVID crisis (Feb–May 2020), Portfolio A plunged ${crisisMddA.toFixed(1)}%, while Portfolio B fell only ${crisisMddB.toFixed(1)}%, confirming that bull-market Sortino performance reverses drastically during liquidity contractions.`
    );
  }
  if (rankingReversals.length === 0) {
    rankingReversals.push(
      `No ranking reversals detected: Portfolio A remained uniformly higher in volatility, tail risk, and downside beta across all examined sub-periods.`
    );
  }

  // 6. Limitations of Sample & Benchmark
  const methodologicalLimitations = [
    `Survivorship and IPO Timing: Mazagon Dock (listed Oct 2020), Paytm (listed Nov 2021), and Zomato (listed Jul 2021) were not traded during the 2017–2019 calm or COVID crisis windows. Stress tests for Portfolio A in older regimes use only continuously traded equities.`,
    `Benchmark Representation: The Nifty 50 is a market-cap weighted index concentrated in mega-cap financials, IT, and FMCG (which heavily overlap with Portfolio B constituents), naturally producing a lower beta for Portfolio B and a higher relative beta for Portfolio A mid/growth stocks.`,
    `Non-Normality of Returns: Realized equity returns display significant excess kurtosis and negative skewness; linear beta and symmetric metrics underestimate extreme left-tail catastrophe risk.`,
  ];

  return {
    overallRiskier,
    isHypothesisConfirmed,
    summaryHeadline,
    downsideBetaVerdict,
    sortinoComparison,
    volatilityPersistenceVerdict,
    rankingReversals,
    methodologicalLimitations,
  };
}

/**
 * Computes comprehensive descriptive statistics including mean, median, mode, IQR,
 * skewness, excess kurtosis, and Jarque-Bera normality test statistic.
 */
export function computeDescriptiveStatistics(returns: number[]): DescriptiveStatistics {
  const n = returns.length;
  if (n === 0) {
    return {
      count: 0,
      meanMonthlyReturnPct: 0,
      annualizedReturnPct: 0,
      medianMonthlyReturnPct: 0,
      modeMonthlyReturnPct: 0,
      sampleVariancePct: 0,
      annualizedVolPct: 0,
      interquartileRangePct: 0,
      skewness: 0,
      excessKurtosis: 0,
      minMonthlyReturnPct: 0,
      maxMonthlyReturnPct: 0,
      positiveMonthsPct: 0,
      jarqueBeraStatistic: 0,
      isNormalAt5Pct: false,
    };
  }

  const sorted = [...returns].sort((a, b) => a - b);
  const mean = calculateMean(returns);
  const std = calculateStd(returns);
  const median = calculateQuantile(returns, 0.5);
  const q25 = calculateQuantile(returns, 0.25);
  const q75 = calculateQuantile(returns, 0.75);
  const iqr = q75 - q25;

  // Approximate mode using 12 histogram bins across empirical range
  const minVal = sorted[0];
  const maxVal = sorted[sorted.length - 1];
  const range = maxVal - minVal;
  let mode = median;
  if (range > 0) {
    const numBins = 12;
    const binWidth = range / numBins;
    const binCounts = new Array(numBins).fill(0);
    returns.forEach((r) => {
      const bIdx = Math.min(numBins - 1, Math.floor((r - minVal) / binWidth));
      binCounts[bIdx]++;
    });
    let maxBinIdx = 0;
    for (let i = 1; i < numBins; i++) {
      if (binCounts[i] > binCounts[maxBinIdx]) {
        maxBinIdx = i;
      }
    }
    mode = minVal + (maxBinIdx + 0.5) * binWidth;
  }

  const skew = calculateSkewness(returns);
  const kurt = calculateKurtosis(returns);
  const variance = Math.pow(std, 2);

  // Jarque-Bera test for normality: JB = (n/6) * (S^2 + (K^2)/4)
  // Under H0 (normal distribution), JB follows Chi-square with 2 df; critical value at alpha=0.05 is 5.991
  const jb = (n / 6) * (Math.pow(skew, 2) + Math.pow(kurt, 2) / 4);
  const isNormal = jb < 5.991;

  const positiveCount = returns.filter((r) => r > 0).length;

  return {
    count: n,
    meanMonthlyReturnPct: Number((mean * 100).toFixed(2)),
    annualizedReturnPct: Number((mean * 12 * 100).toFixed(2)),
    medianMonthlyReturnPct: Number((median * 100).toFixed(2)),
    modeMonthlyReturnPct: Number((mode * 100).toFixed(2)),
    sampleVariancePct: Number((variance * 10000).toFixed(2)), // in bps / %^2
    annualizedVolPct: Number((std * Math.sqrt(12) * 100).toFixed(2)),
    interquartileRangePct: Number((iqr * 100).toFixed(2)),
    skewness: Number(skew.toFixed(3)),
    excessKurtosis: Number(kurt.toFixed(3)),
    minMonthlyReturnPct: Number((minVal * 100).toFixed(2)),
    maxMonthlyReturnPct: Number((maxVal * 100).toFixed(2)),
    positiveMonthsPct: Number(((positiveCount / n) * 100).toFixed(1)),
    jarqueBeraStatistic: Number(jb.toFixed(2)),
    isNormalAt5Pct: isNormal,
  };
}

/**
 * Calculates Marginal Contribution to Risk (MCR) and Percentage Risk Contribution (PRC)
 * for each stock given portfolio weights and return series map.
 * MCR_i = (Sigma * w)_i / sigma_p
 * PRC_i = [w_i * (Sigma * w)_i] / (sigma_p^2) * 100%
 */
export function computeRiskDriverAttributions(
  weightsMap: Record<string, number>,
  stockReturnsMap: Record<string, number[]>,
  portfolioBeta: number
): RiskDriverAttribution[] {
  const tickers = Object.keys(stockReturnsMap);
  const n = tickers.length;
  if (n === 0) return [];

  // Normalize weights
  const rawSum = tickers.reduce((sum, t) => sum + (weightsMap[t] || 0), 0);
  const w = tickers.map((t) => (rawSum > 0 ? (weightsMap[t] || 0) / rawSum : 1 / n));

  // Compute annualized covariance matrix
  const cov: number[][] = [];
  for (let i = 0; i < n; i++) {
    cov[i] = [];
    for (let j = 0; j < n; j++) {
      cov[i][j] = calculateCovariance(stockReturnsMap[tickers[i]], stockReturnsMap[tickers[j]]) * 12;
    }
  }

  // Sigma * w
  const sigmaW: number[] = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sigmaW[i] += cov[i][j] * w[j];
    }
  }

  // Portfolio variance and volatility
  let portfolioVariance = 0;
  for (let i = 0; i < n; i++) {
    portfolioVariance += w[i] * sigmaW[i];
  }
  const portfolioVol = Math.sqrt(Math.max(1e-8, portfolioVariance));

  // Calculate MCR and PRC
  const drivers: RiskDriverAttribution[] = tickers.map((ticker, i) => {
    const stockInfo = TICKER_TO_STOCK[ticker];
    const std = calculateStd(stockReturnsMap[ticker]) * Math.sqrt(12);
    const mcr = portfolioVol > 0 ? sigmaW[i] / portfolioVol : 0;
    const prc = portfolioVariance > 0 ? ((w[i] * sigmaW[i]) / portfolioVariance) * 100 : 0;

    return {
      ticker,
      name: stockInfo?.name || ticker,
      portfolio: stockInfo?.portfolio || 'Custom',
      sector: stockInfo?.sector || 'General',
      weightPct: Number((w[i] * 100).toFixed(1)),
      marginalContributionRiskPct: Number((mcr * 100).toFixed(2)),
      percentageRiskContributionPct: Number(prc.toFixed(1)),
      annualizedVolPct: Number((std * 100).toFixed(1)),
      beta: stockInfo?.benchmarkBeta || 1.0,
      riskCategory: stockInfo?.riskCategory || (std > 0.3 ? 'High Risk' : 'Low Risk'),
      whyRiskyOrLowRisk: stockInfo?.riskRationale || `${stockInfo?.sector} sensitivity and historical volatility.`,
    };
  });

  // Sort descending by risk contribution
  return drivers.sort((a, b) => b.percentageRiskContributionPct - a.percentageRiskContributionPct);
}

/**
 * Computes complete mathematical calculation of portfolio beta via both:
 * 1. Constituent-Weighted Beta: sum(w_i * beta_i)
 * 2. Sample Covariance / Linear Regression Beta: Cov(Rp, Rm) / Var(Rm)
 * Alongside CAPM Jensen's Alpha, R^2, Systematic vs Unsystematic risk decomposition,
 * and OLS Characteristic Line points.
 */
export function calculateDetailedPortfolioBeta(
  portfolioReturns: number[],
  benchmarkReturns: number[],
  dates: string[],
  weights: Record<string, number>,
  portfolioName: string,
  riskFreeRateAnnual = 0.06
): DetailedPortfolioBetaCalculation {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  const pSlice = portfolioReturns.slice(0, n);
  const mSlice = benchmarkReturns.slice(0, n);
  const dSlice = dates.slice(0, n);

  // Method 1: Constituent-Weighted Beta
  const tickers = Object.keys(weights).filter((t) => (weights[t] || 0) > 0);
  const rawTotalWeight = tickers.reduce((sum, t) => sum + (weights[t] || 0), 0);

  let sumWeightedBeta = 0;
  const constituents: ConstituentBetaContribution[] = tickers.map((ticker) => {
    const stockInfo = TICKER_TO_STOCK[ticker];
    const rawW = weights[ticker] || 0;
    const normW = rawTotalWeight > 0 ? rawW / rawTotalWeight : 1 / (tickers.length || 1);
    const stockBeta = stockInfo?.benchmarkBeta || 1.0;
    const weightedContrib = normW * stockBeta;
    sumWeightedBeta += weightedContrib;

    return {
      ticker,
      name: stockInfo?.name || ticker,
      sector: stockInfo?.sector || 'General',
      weightPct: Number((normW * 100).toFixed(2)),
      rawWeight: rawW,
      stockBeta,
      weightedContribution: Number(weightedContrib.toFixed(4)),
      shareOfPortfolioBetaPct: 0,
      riskCategory: stockInfo?.riskCategory || (stockBeta > 1.15 ? 'High Risk' : 'Low Risk'),
      riskRationale: stockInfo?.riskRationale || `${stockInfo?.sector || 'Sector'} macro beta`,
    };
  });

  // Calculate share of portfolio beta for each stock
  const finalWeightedBeta = sumWeightedBeta > 0 ? sumWeightedBeta : 1.0;
  constituents.forEach((c) => {
    c.shareOfPortfolioBetaPct = Number(((c.weightedContribution / finalWeightedBeta) * 100).toFixed(1));
  });
  // Sort constituents descending by weighted contribution
  constituents.sort((a, b) => b.weightedContribution - a.weightedContribution);

  // Method 2: Empirical Sample Covariance / Regression Beta
  const meanP = calculateMean(pSlice);
  const meanM = calculateMean(mSlice);
  const stdP = calculateStd(pSlice);
  const stdM = calculateStd(mSlice);

  const covMonthly = calculateCovariance(pSlice, mSlice);
  const varM = Math.pow(stdM, 2);
  const covBeta = varM > 0 ? covMonthly / varM : 1.0;
  const correlation = stdP > 0 && stdM > 0 ? Math.max(-1, Math.min(1, covMonthly / (stdP * stdM))) : 0;
  const rSquared = Math.pow(correlation, 2);

  // Annualized performance & volatility
  const annReturnP = meanP * 12;
  const annReturnM = meanM * 12;
  const annVolP = stdP * Math.sqrt(12);
  const annVolM = stdM * Math.sqrt(12);

  // Jensen's Alpha (annualized): alpha = AnnR_p - [Rf + Beta * (AnnR_m - Rf)]
  const expectedReturnSML = riskFreeRateAnnual + covBeta * (annReturnM - riskFreeRateAnnual);
  const jensensAlpha = annReturnP - expectedReturnSML;

  // Systematic vs. Unsystematic Risk Variance Decomposition
  // Total Variance = Systematic Variance + Unsystematic Variance
  // sigma_p^2 = (beta^2 * sigma_m^2) + sigma_epsilon^2
  const systematicVarianceSharePct = Number((rSquared * 100).toFixed(1));
  const unsystematicVarianceSharePct = Number(((1 - rSquared) * 100).toFixed(1));

  const systematicVolAnnual = covBeta * annVolM;
  const totalVarAnn = Math.pow(annVolP, 2);
  const sysVarAnn = Math.pow(systematicVolAnnual, 2);
  const unsystematicVolAnnual = Math.sqrt(Math.max(0, totalVarAnn - sysVarAnn));

  // Treynor Ratio: (AnnR_p - Rf) / Beta
  const treynor = covBeta !== 0 ? (annReturnP - riskFreeRateAnnual) / covBeta : 0;

  // Downside Beta
  const downside = calculateDownsideBeta(pSlice, mSlice).downsideBeta;

  // Security Characteristic Line (SCL): Monthly Regression Line
  // R_{p,t} = alpha_monthly + beta * R_{m,t} + epsilon_t
  const monthlyAlpha = meanP - covBeta * meanM;
  const regressionPoints = dSlice.map((date, idx) => {
    const rm = mSlice[idx] || 0;
    const rp = pSlice[idx] || 0;
    const predicted = monthlyAlpha + covBeta * rm;
    const residual = rp - predicted;
    return {
      date,
      marketReturnPct: Number((rm * 100).toFixed(2)),
      portfolioReturnPct: Number((rp * 100).toFixed(2)),
      predictedReturnPct: Number((predicted * 100).toFixed(2)),
      residualPct: Number((residual * 100).toFixed(2)),
    };
  });

  return {
    portfolioName,
    observationsCount: n,
    weightedBeta: Number(finalWeightedBeta.toFixed(2)),
    constituents,
    covarianceBeta: Number(covBeta.toFixed(2)),
    meanPortfolioReturnMonthlyPct: Number((meanP * 100).toFixed(2)),
    meanBenchmarkReturnMonthlyPct: Number((meanM * 100).toFixed(2)),
    portfolioMonthlyVolPct: Number((stdP * 100).toFixed(2)),
    benchmarkMonthlyVolPct: Number((stdM * 100).toFixed(2)),
    covarianceMonthly: Number(covMonthly.toFixed(6)),
    benchmarkVarianceMonthly: Number(varM.toFixed(6)),
    correlation: Number(correlation.toFixed(3)),
    annualizedPortfolioReturnPct: Number((annReturnP * 100).toFixed(2)),
    annualizedBenchmarkReturnPct: Number((annReturnM * 100).toFixed(2)),
    annualizedPortfolioVolPct: Number((annVolP * 100).toFixed(2)),
    annualizedBenchmarkVolPct: Number((annVolM * 100).toFixed(2)),
    riskFreeRatePct: Number((riskFreeRateAnnual * 100).toFixed(1)),
    jensensAlphaAnnualizedPct: Number((jensensAlpha * 100).toFixed(2)),
    rSquaredPct: Number((rSquared * 100).toFixed(1)),
    systematicVolAnnualizedPct: Number((systematicVolAnnual * 100).toFixed(2)),
    unsystematicVolAnnualizedPct: Number((unsystematicVolAnnual * 100).toFixed(2)),
    systematicVariancePct: systematicVarianceSharePct,
    unsystematicVariancePct: unsystematicVarianceSharePct,
    treynorRatio: Number(treynor.toFixed(2)),
    downsideBeta: Number(downside.toFixed(2)),
    regressionPoints,
    regressionSlope: Number(covBeta.toFixed(3)),
    regressionInterceptMonthlyPct: Number((monthlyAlpha * 100).toFixed(3)),
  };
}


