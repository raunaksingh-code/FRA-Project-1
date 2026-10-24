export interface StockInfo {
  ticker: string;
  name: string;
  portfolio: 'Portfolio A' | 'Portfolio B' | 'Financials';
  sector: string;
  description: string;
  listingDate: string;
  listedBeforeCovid: boolean;
  benchmarkBeta: number;
  riskCategory?: 'High Risk' | 'Low Risk' | 'Moderate Risk';
  riskRationale?: string;
  primaryRiskDriver?: string;
  volatilityProfile?: string;
}

export interface MonthlyReturnRow {
  date: string; // YYYY-MM
  [ticker: string]: number | string | null | undefined;
}

export interface DailyReturnRow {
  date: string; // YYYY-MM-DD
  [ticker: string]: number | string;
}

export interface StockStatistics {
  ticker: string;
  name: string;
  portfolio: 'Portfolio A' | 'Portfolio B' | 'Financials';
  sector: string;
  monthsCount: number;
  meanMonthlyReturnPct: number;
  annualizedReturnPct: number;
  annualizedVolPct: number;
  bestMonthPct: number;
  worstMonthPct: number;
  positiveMonthsPct: number;
  sharpeRatio: number;
  var95Pct: number;
  es95Pct: number;
  beta: number;
  riskCategory?: 'High Risk' | 'Low Risk' | 'Moderate Risk';
  riskRationale?: string;
}

export interface PortfolioPerformanceMetrics {
  name: string;
  observationsMonths: number;
  initialCapital: number;
  endingValue: number;
  cumulativeReturnPct: number;
  annualizedReturnPct: number;
  annualizedVolatilityPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  monthlyVar90Pct: number;
  monthlyVar95Pct: number;
  monthlyVar99Pct: number;
  monthlyEs90Pct: number;
  monthlyEs95Pct: number;
  monthlyEs99Pct: number;
  maximumDrawdownPct: number;
  downsideDeviationPct: number;
  positiveMonthsPct: number;
  bestMonthPct: number;
  worstMonthPct: number;
  skewness: number;
  kurtosis: number;
}

export interface StressTestResult {
  portfolio: 'Portfolio A' | 'Portfolio B';
  period: string;
  startDate: string;
  endDate: string;
  includedStocksCount: number;
  includedStocks: string[];
  excludedStocks: string[];
  observationsCount: number;
  annualizedVolPct: number;
  dailyVar95Pct: number;
  dailyEs95Pct: number;
  maximumDrawdownPct: number;
  cumulativeReturnPct: number;
}

export interface OptimizationResult {
  ticker: string;
  name: string;
  equalWeightPct: number;
  minVolWeightPct: number;
  maxSharpeWeightPct: number;
  customWeightPct?: number;
}

export interface FrontierPoint {
  expectedReturnPct: number;
  volatilityPct: number;
  sharpeRatio: number;
  weights: Record<string, number>;
}

export interface FeasiblePortfolioPoint {
  expectedReturnPct: number;
  volatilityPct: number;
  sharpeRatio: number;
}

export interface FrontierOptimizationSummary {
  minVol: {
    expectedReturnPct: number;
    volatilityPct: number;
    sharpeRatio: number;
    weights: Record<string, number>;
  };
  maxSharpe: {
    expectedReturnPct: number;
    volatilityPct: number;
    sharpeRatio: number;
    weights: Record<string, number>;
  };
  equalWeight: {
    expectedReturnPct: number;
    volatilityPct: number;
    sharpeRatio: number;
    weights: Record<string, number>;
  };
  currentCustom?: {
    expectedReturnPct: number;
    volatilityPct: number;
    sharpeRatio: number;
    weights: Record<string, number>;
  };
  frontierCurve: FrontierPoint[];
  feasiblePortfolios: FeasiblePortfolioPoint[];
}

export interface DownsideRiskMetrics {
  ordinaryBeta: number;
  downsideBeta: number;
  alignedObsCount: number;
  negativeMarketObsCount: number;
  negativeMarketRatioPct: number;
  downsideDeviationPct: number;
  sortinoRatio: number;
  targetReturnPct: number;
  annualizationFactor: number;
}

export interface HistoricalRiskComparisonPeriod {
  periodKey: 'calm' | 'covid' | 'inflation2022' | 'adani2023' | 'election2024' | 'recent' | string;
  periodName: string;

  dateRange: string;
  startDate: string;
  endDate: string;
  frequency: string;
  portfolio: 'Portfolio A' | 'Portfolio B';
  includedStocksCount: number;
  includedTickers: string[];
  excludedTickers: string[];
  alignedObsCount: number;
  negativeMarketObsCount: number;
  annualizedVolPct: number;
  ordinaryBeta: number;
  downsideBeta: number;
  sortinoRatio: number;
  var95Pct: number;
  es95Pct: number;
  maxDrawdownPct: number;
  cumulativeReturnPct: number;
  cagrReturnPct: number;
}

export interface RollingVolPoint {
  date: string;
  volA: number;
  volB: number;
  benchVol?: number;
}

export interface EvidenceConclusion {
  overallRiskier: 'Portfolio A' | 'Portfolio B' | 'Inconclusive';
  isHypothesisConfirmed: boolean;
  summaryHeadline: string;
  downsideBetaVerdict: string;
  downsideBetaA: number;
  downsideBetaB: number;
  ordinaryBetaA: number;
  ordinaryBetaB: number;
  sortinoComparison: string;
  sortinoA: number;
  sortinoB: number;
  volatilityPersistenceVerdict: string;
  minRollingVolA: number;
  maxRollingVolA: number;
  minRollingVolB: number;
  maxRollingVolB: number;
  rankingReversals: string[];
  methodologicalLimitations: string[];
}

export interface GlobalFilterState {
  activePortfolio: 'All' | 'Portfolio A' | 'Portfolio B';
  confidenceLevel: 0.90 | 0.95 | 0.99;
  riskFreeRatePct: number; // e.g. 6.0
  initialCapital: number; // e.g. 1500000
  rebalanceFrequency: 'Monthly' | 'BuyAndHold';
  maxStockWeightPct: number; // e.g. 100 or 30
  startDate: string;
  endDate: string;
  comparableUniverseOnly: boolean;
  sortinoTargetReturnPct?: number; // Target return hurdle for Sortino
}

export interface RiskDriverAttribution {
  ticker: string;
  name: string;
  portfolio: string;
  sector: string;
  weightPct: number;
  marginalContributionRiskPct: number; // MCR_i = (Sigma w)_i / sigma_p
  percentageRiskContributionPct: number; // PRC_i = w_i * MCR_i / sigma_p * 100
  annualizedVolPct: number;
  beta: number;
  riskCategory: 'High Risk' | 'Low Risk' | 'Moderate Risk';
  whyRiskyOrLowRisk: string;
}

export interface CrisisStockPerformance {
  ticker: string;
  name: string;
  portfolio: 'Portfolio A' | 'Portfolio B' | 'Financials';
  returnPct: number;
  maxDrawdownPct: number;
  sector: string;
}

export interface CrisisEventInfo {
  id: string;
  name: string;
  period: string;
  startDate: string;
  endDate: string;
  description: string;
  marketDrawdownPct: number;
  portfolioADrawdownPct: number;
  portfolioBDrawdownPct: number;
  portfolioAReturnPct: number;
  portfolioBReturnPct: number;
  keyCatalyst: string;
  stockPerformances: CrisisStockPerformance[];
}

export interface DescriptiveStatistics {
  count: number;
  meanMonthlyReturnPct: number;
  annualizedReturnPct: number;
  medianMonthlyReturnPct: number;
  modeMonthlyReturnPct: number;
  sampleVariancePct: number;
  annualizedVolPct: number;
  interquartileRangePct: number;
  skewness: number;
  excessKurtosis: number;
  minMonthlyReturnPct: number;
  maxMonthlyReturnPct: number;
  positiveMonthsPct: number;
  jarqueBeraStatistic: number;
  isNormalAt5Pct: boolean;
}

export interface ConstituentBetaContribution {
  ticker: string;
  name: string;
  sector: string;
  weightPct: number;
  rawWeight: number;
  stockBeta: number;
  weightedContribution: number;
  shareOfPortfolioBetaPct: number;
  riskCategory: string;
  riskRationale: string;
}

export interface DetailedPortfolioBetaCalculation {
  portfolioName: string;
  observationsCount: number;
  // Method 1: Constituent-Weighted Portfolio Beta (sum w_i * beta_i)
  weightedBeta: number;
  constituents: ConstituentBetaContribution[];
  // Method 2: Empirical Sample Covariance Beta (Cov(Rp, Rm) / Var(Rm))
  covarianceBeta: number;
  meanPortfolioReturnMonthlyPct: number;
  meanBenchmarkReturnMonthlyPct: number;
  portfolioMonthlyVolPct: number;
  benchmarkMonthlyVolPct: number;
  covarianceMonthly: number;
  benchmarkVarianceMonthly: number;
  correlation: number;
  // Risk Decomposition & CAPM Parameters
  annualizedPortfolioReturnPct: number;
  annualizedBenchmarkReturnPct: number;
  annualizedPortfolioVolPct: number;
  annualizedBenchmarkVolPct: number;
  riskFreeRatePct: number;
  jensensAlphaAnnualizedPct: number;
  rSquaredPct: number;
  systematicVolAnnualizedPct: number;
  unsystematicVolAnnualizedPct: number;
  systematicVariancePct: number;
  unsystematicVariancePct: number;
  treynorRatio: number;
  downsideBeta: number;
  // Security Characteristic Line (Regression Scatter Data)
  regressionPoints: {
    date: string;
    marketReturnPct: number;
    portfolioReturnPct: number;
    predictedReturnPct: number;
    residualPct: number;
  }[];
  regressionSlope: number;
  regressionInterceptMonthlyPct: number;
}


