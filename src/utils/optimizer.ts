import { FrontierOptimizationSummary, FrontierPoint, FeasiblePortfolioPoint } from '../types';
import { calculateMean, calculateCovariance } from './math';

interface StockReturnsMap {
  [ticker: string]: number[];
}

/**
 * Projects a vector onto the probability simplex sum(w) = 1, 0 <= w_i <= maxWeight
 */
function projectSimplexWithCap(v: number[], maxCap = 1.0): number[] {
  const n = v.length;
  // Standard bisection / root finding for Lagrange multiplier tau:
  // w_i = clamp(v_i - tau, 0, maxCap) such that sum(w_i) = 1
  let low = Math.min(...v) - 2;
  let high = Math.max(...v) + 2;

  for (let iter = 0; iter < 60; iter++) {
    const mid = (low + high) / 2;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const val = Math.max(0, Math.min(maxCap, v[i] - mid));
      sum += val;
    }
    if (sum > 1.0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  const tau = (low + high) / 2;
  const w = v.map((x) => Math.max(0, Math.min(maxCap, x - tau)));
  const currentSum = w.reduce((s, x) => s + x, 0);
  if (currentSum > 0) {
    return w.map((x) => x / currentSum);
  }
  return new Array(n).fill(1 / n);
}

/**
 * Computes annualized expected returns (mu) and covariance matrix (cov)
 */
export function computeAnnualizedMuAndCov(stockReturns: StockReturnsMap): {
  tickers: string[];
  mu: number[];
  cov: number[][];
} {
  const tickers = Object.keys(stockReturns);
  const n = tickers.length;

  const mu: number[] = tickers.map((t) => {
    const r = stockReturns[t];
    // Monthly mean * 12 for annualized expected return
    return calculateMean(r) * 12;
  });

  const cov: number[][] = [];
  for (let i = 0; i < n; i++) {
    cov[i] = [];
    for (let j = 0; j < n; j++) {
      const c = calculateCovariance(stockReturns[tickers[i]], stockReturns[tickers[j]]);
      cov[i][j] = c * 12; // Annualized covariance
    }
  }

  return { tickers, mu, cov };
}

/**
 * Evaluates portfolio return, volatility, and Sharpe ratio given weights
 */
export function evaluatePortfolio(
  w: number[],
  mu: number[],
  cov: number[][],
  rf = 0.06
): { expReturn: number; vol: number; sharpe: number } {
  const n = w.length;
  let expReturn = 0;
  for (let i = 0; i < n; i++) {
    expReturn += w[i] * mu[i];
  }

  let variance = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += w[i] * cov[i][j] * w[j];
    }
  }
  const vol = Math.sqrt(Math.max(1e-8, variance));
  const sharpe = vol > 0 ? (expReturn - rf) / vol : 0;

  return { expReturn, vol, sharpe };
}

/**
 * Solves Minimum Volatility Portfolio using Projected Gradient Descent
 */
export function solveMinimumVolatility(
  mu: number[],
  cov: number[][],
  maxCap = 1.0
): number[] {
  const n = mu.length;
  let w = new Array(n).fill(1 / n);

  // Gradient of 0.5 * w^T Cov w is Cov * w
  const maxIters = 600;
  let lr = 0.02;

  for (let iter = 0; iter < maxIters; iter++) {
    const grad = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        grad[i] += cov[i][j] * w[j];
      }
    }

    const nextV = w.map((wi, i) => wi - lr * grad[i]);
    const nextW = projectSimplexWithCap(nextV, maxCap);

    // Check step difference
    const diff = Math.sqrt(nextW.reduce((sum, val, i) => sum + Math.pow(val - w[i], 2), 0));
    w = nextW;
    if (diff < 1e-6) break;
  }

  return w;
}

/**
 * Solves Maximum Sharpe Ratio Portfolio using numerical search and gradient optimization
 */
export function solveMaximumSharpe(
  mu: number[],
  cov: number[][],
  rf = 0.06,
  maxCap = 1.0
): number[] {
  const n = mu.length;
  let bestWeights = new Array(n).fill(1 / n);
  let bestSharpe = evaluatePortfolio(bestWeights, mu, cov, rf).sharpe;

  // Grid / random multi-start initialization
  const randomStarts = 40;
  for (let s = 0; s < randomStarts; s++) {
    const randV = Array.from({ length: n }, () => Math.random());
    const initW = projectSimplexWithCap(randV, maxCap);
    const evalInit = evaluatePortfolio(initW, mu, cov, rf);
    if (evalInit.sharpe > bestSharpe) {
      bestSharpe = evalInit.sharpe;
      bestWeights = initW;
    }
  }

  // Numerical gradient ascent on Sharpe ratio
  let w = [...bestWeights];
  let lr = 0.01;
  const eps = 1e-4;

  for (let iter = 0; iter < 400; iter++) {
    const currentEval = evaluatePortfolio(w, mu, cov, rf);
    const grad = new Array(n).fill(0);

    for (let i = 0; i < n; i++) {
      const perturbed = [...w];
      perturbed[i] += eps;
      const normPerturbed = projectSimplexWithCap(perturbed, maxCap);
      const evalPerturbed = evaluatePortfolio(normPerturbed, mu, cov, rf);
      grad[i] = (evalPerturbed.sharpe - currentEval.sharpe) / eps;
    }

    const nextV = w.map((wi, i) => wi + lr * grad[i]);
    const nextW = projectSimplexWithCap(nextV, maxCap);
    const nextEval = evaluatePortfolio(nextW, mu, cov, rf);

    if (nextEval.sharpe > currentEval.sharpe) {
      w = nextW;
      if (nextEval.sharpe > bestSharpe) {
        bestSharpe = nextEval.sharpe;
        bestWeights = [...nextW];
      }
    } else {
      lr *= 0.5;
      if (lr < 1e-5) break;
    }
  }

  return bestWeights;
}

/**
 * Solves minimum volatility for a specified target return
 */
export function solveTargetReturnPortfolio(
  mu: number[],
  cov: number[][],
  targetReturn: number,
  maxCap = 1.0
): { weights: number[]; feasible: boolean; achievedReturn: number; vol: number } {
  const n = mu.length;
  // Penalty method: min w^T Cov w + lambda * (w^T mu - target)^2
  let w = new Array(n).fill(1 / n);
  let lambda = 80.0;
  let lr = 0.01;

  for (let iter = 0; iter < 600; iter++) {
    let currentRet = 0;
    for (let i = 0; i < n; i++) currentRet += w[i] * mu[i];

    const grad = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let covTerm = 0;
      for (let j = 0; j < n; j++) covTerm += cov[i][j] * w[j];
      const penaltyTerm = 2 * lambda * (currentRet - targetReturn) * mu[i];
      grad[i] = covTerm + penaltyTerm;
    }

    const nextV = w.map((wi, i) => wi - lr * grad[i]);
    w = projectSimplexWithCap(nextV, maxCap);
  }

  let finalRet = 0;
  for (let i = 0; i < n; i++) finalRet += w[i] * mu[i];
  const finalEval = evaluatePortfolio(w, mu, cov);

  const feasible = Math.abs(finalRet - targetReturn) < 0.02;
  return {
    weights: w,
    feasible,
    achievedReturn: finalRet,
    vol: finalEval.vol,
  };
}

/**
 * Generates full Markowitz Efficient Frontier summary
 */
export function runMarkowitzOptimization(
  stockReturns: StockReturnsMap,
  rf = 0.06,
  maxCap = 1.0,
  nSimulations = 1200,
  customWeights?: Record<string, number>
): FrontierOptimizationSummary {
  const { tickers, mu, cov } = computeAnnualizedMuAndCov(stockReturns);
  const n = tickers.length;

  // Custom portfolio evaluation from user weights (if provided)
  let currentCustom: FrontierOptimizationSummary['currentCustom'] | undefined = undefined;
  if (customWeights && Object.keys(customWeights).length > 0) {
    const rawSum = tickers.reduce((sum, t) => sum + (customWeights[t] || 0), 0);
    const customW = tickers.map((t) => {
      const w = customWeights[t] || 0;
      return rawSum > 0 ? w / rawSum : 1 / n;
    });
    const customEval = evaluatePortfolio(customW, mu, cov, rf);
    const customWeightsMap: Record<string, number> = {};
    tickers.forEach((t, i) => {
      customWeightsMap[t] = Number((customW[i] * 100).toFixed(2));
    });
    currentCustom = {
      expectedReturnPct: Number((customEval.expReturn * 100).toFixed(2)),
      volatilityPct: Number((customEval.vol * 100).toFixed(2)),
      sharpeRatio: Number(customEval.sharpe.toFixed(2)),
      weights: customWeightsMap,
    };
  }

  // Equal weight benchmark
  const eqW = new Array(n).fill(1 / n);
  const eqEval = evaluatePortfolio(eqW, mu, cov, rf);
  const eqWeightsMap: Record<string, number> = {};
  tickers.forEach((t, i) => {
    eqWeightsMap[t] = Number((eqW[i] * 100).toFixed(2));
  });

  // Minimum Volatility
  const minVolW = solveMinimumVolatility(mu, cov, maxCap);
  const minVolEval = evaluatePortfolio(minVolW, mu, cov, rf);
  const minVolMap: Record<string, number> = {};
  tickers.forEach((t, i) => {
    minVolMap[t] = Number((minVolW[i] * 100).toFixed(2));
  });

  // Maximum Sharpe
  const maxSharpeW = solveMaximumSharpe(mu, cov, rf, maxCap);
  const maxSharpeEval = evaluatePortfolio(maxSharpeW, mu, cov, rf);
  const maxSharpeMap: Record<string, number> = {};
  tickers.forEach((t, i) => {
    maxSharpeMap[t] = Number((maxSharpeW[i] * 100).toFixed(2));
  });

  // Generate Feasible Portfolios Cloud using Dirichlet / Random sampling
  const feasiblePortfolios: FeasiblePortfolioPoint[] = [];
  for (let s = 0; s < nSimulations; s++) {
    // Generate exponential random variables to get Dirichlet distribution
    const expVars = Array.from({ length: n }, () => -Math.log(Math.max(1e-6, Math.random())));
    const sumExp = expVars.reduce((sum, v) => sum + v, 0);
    const randW = expVars.map((v) => v / sumExp);
    const cappedW = projectSimplexWithCap(randW, maxCap);
    const evalPt = evaluatePortfolio(cappedW, mu, cov, rf);
    feasiblePortfolios.push({
      expectedReturnPct: Number((evalPt.expReturn * 100).toFixed(2)),
      volatilityPct: Number((evalPt.vol * 100).toFixed(2)),
      sharpeRatio: Number(evalPt.sharpe.toFixed(2)),
    });
  }

  // Efficient Frontier Curve: sweep returns from minVol return to highest return
  const frontierCurve: FrontierPoint[] = [];
  const minTarget = minVolEval.expReturn;
  const maxTarget = Math.max(...mu);
  const steps = 30;

  for (let i = 0; i <= steps; i++) {
    const target = minTarget + (i / steps) * (maxTarget - minTarget);
    const res = solveTargetReturnPortfolio(mu, cov, target, maxCap);
    const evalRes = evaluatePortfolio(res.weights, mu, cov, rf);
    const ptWeights: Record<string, number> = {};
    tickers.forEach((t, idx) => {
      ptWeights[t] = Number((res.weights[idx] * 100).toFixed(2));
    });

    frontierCurve.push({
      expectedReturnPct: Number((evalRes.expReturn * 100).toFixed(2)),
      volatilityPct: Number((evalRes.vol * 100).toFixed(2)),
      sharpeRatio: Number(evalRes.sharpe.toFixed(2)),
      weights: ptWeights,
    });
  }

  // Ensure frontier curve is strictly sorted by volatility
  frontierCurve.sort((a, b) => a.volatilityPct - b.volatilityPct);

  return {
    minVol: {
      expectedReturnPct: Number((minVolEval.expReturn * 100).toFixed(2)),
      volatilityPct: Number((minVolEval.vol * 100).toFixed(2)),
      sharpeRatio: Number(minVolEval.sharpe.toFixed(2)),
      weights: minVolMap,
    },
    maxSharpe: {
      expectedReturnPct: Number((maxSharpeEval.expReturn * 100).toFixed(2)),
      volatilityPct: Number((maxSharpeEval.vol * 100).toFixed(2)),
      sharpeRatio: Number(maxSharpeEval.sharpe.toFixed(2)),
      weights: maxSharpeMap,
    },
    equalWeight: {
      expectedReturnPct: Number((eqEval.expReturn * 100).toFixed(2)),
      volatilityPct: Number((eqEval.vol * 100).toFixed(2)),
      sharpeRatio: Number(eqEval.sharpe.toFixed(2)),
      weights: eqWeightsMap,
    },
    currentCustom,
    frontierCurve,
    feasiblePortfolios,
  };
}
