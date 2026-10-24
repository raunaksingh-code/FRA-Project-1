import React from 'react';
import { X, BookOpen, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function MethodologyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-slate-800" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Methodological Framework & Mathematical Formulation
              </h2>
              <div className="text-xs text-slate-500">
                Financial Risk Analysis (FRA) · Great Lakes Institute of Management
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-sm text-slate-700 leading-relaxed">
          {/* Section 1 */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              1. Portfolio Construction Logic & Stock Universe Selection
            </h3>
            <p className="text-slate-600 mb-2">
              The project investigates whether historical market data corroborates the ex-ante risk classifications of two distinct 10-stock Indian equity portfolios:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-orange-50/70 border border-orange-200/80 p-3 rounded-lg">
                <strong className="text-orange-950 font-semibold block mb-1">
                  Portfolio A — High Risk Universe
                </strong>
                <p className="text-orange-900">
                  Comprises 10 high-beta, growth-oriented, capital-intensive, or cyclically sensitive equities (Adani Green, Adani Power, Mazagon Dock, DLF, Dixon Technologies, BSE, Trent, Bajaj Finance, Paytm, Zomato). Characterized by elevated operating leverage, valuation multiple sensitivity, and heavy retail sentiment swings.
                </p>
              </div>
              <div className="bg-teal-50/70 border border-teal-200/80 p-3 rounded-lg">
                <strong className="text-teal-950 font-semibold block mb-1">
                  Portfolio B — Low Risk Universe
                </strong>
                <p className="text-teal-900">
                  Comprises 10 defensive, cash-flow generative, blue-chip bellwethers (HUL, ITC, TCS, Infosys, HDFC Bank, ICICI Bank, Sun Pharma, Nestlé India, Power Grid, NTPC). Characterized by non-cyclical consumer staples demand, regulated transmission tariffs, durable pricing power, and low net debt.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              2. Annualization & Performance Formulas
            </h3>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg font-mono text-xs space-y-2">
              <div>
                <span className="text-slate-500">Geometric CAGR: </span>
                <span className="text-slate-900 font-semibold">
                  R_annual = [ ∏ (1 + r_t) ]^(12 / n) - 1
                </span>
              </div>
              <div>
                <span className="text-slate-500">Annualized Monthly Volatility: </span>
                <span className="text-slate-900 font-semibold">
                  σ_annual = σ_monthly × √12
                </span>
              </div>
              <div>
                <span className="text-slate-500">Annualized Daily Volatility: </span>
                <span className="text-slate-900 font-semibold">
                  σ_daily_annual = σ_daily × √252
                </span>
              </div>
              <div>
                <span className="text-slate-500">Sharpe Ratio: </span>
                <span className="text-slate-900 font-semibold">
                  Sharpe = (R_annual - R_f) / σ_annual  (where R_f = 6.0% p.a. baseline)
                </span>
              </div>
              <div>
                <span className="text-slate-500">Sortino Ratio: </span>
                <span className="text-slate-900 font-semibold">
                  Sortino = (R_annual - R_f) / DownsideDeviation_annual
                </span>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              3. Downside Risk Metrics: VaR & Expected Shortfall (ES)
            </h3>
            <p className="text-slate-600 mb-2">
              Value at Risk (VaR) and Expected Shortfall (CVaR) are calculated using the non-parametric <strong>historical simulation method</strong> to preserve observed empirical skewness and fat-tailed excess kurtosis without imposing Gaussian normality assumptions:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li>
                <strong>Downside Beta (&beta;&minus;):</strong> Measures systematic market risk specifically during negative benchmark market phases (when Nifty 50 return &lt; 0):
                <code className="ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                  &beta;&minus; = Cov(R_p, R_m | R_m &lt; 0) / Var(R_m | R_m &lt; 0)
                </code>
              </li>
              <li>
                <strong>Sortino Ratio:</strong> Annualized excess return over target hurdle (default 6% p.a.) divided by downside deviation:
                <code className="ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                  Sortino = (R_annual - R_target) / (DownsideDev_daily &times; &radic;252)
                </code>
              </li>
              <li>
                <strong>Historical VaR (&alpha;):</strong> Identified as the (1 - &alpha;) empirical lower quantile of returns, expressed as a positive loss percentage:
                <code className="ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                  VaR(&alpha;) = max(0, -Quantile(R, 1 - &alpha;))
                </code>
              </li>
              <li>
                <strong>Expected Shortfall (ES):</strong> Conditional expectation of portfolio loss given that loss exceeds the VaR threshold:
                <code className="ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                  ES(&alpha;) = Average(-R | R &le; Quantile(R, 1 - &alpha;))
                </code>
              </li>
              <li>
                <strong>Maximum Drawdown:</strong> The deepest historical peak-to-trough cumulative percentage decline:
                <code className="ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                  MDD = min [ (Wealth_t - Peak_t) / Peak_t ]
                </code>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              4. Calculation of Systematic Beta (β) for Both Portfolios
            </h3>
            <p className="text-slate-600 mb-2 text-xs">
              Portfolio systematic risk relative to the NIFTY 50 benchmark is evaluated using two mathematically consistent methods:
            </p>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg font-mono text-xs space-y-2 text-slate-800">
              <div>
                <strong className="text-slate-900 font-sans block mb-0.5">Method 1 — Constituent-Weighted Beta:</strong>
                β_p = ∑ (wᵢ · βᵢ)  where wᵢ = weight of stock i, βᵢ = Cov(Rᵢ, R_m) / Var(R_m)
              </div>
              <div className="pt-1 border-t border-slate-200">
                <strong className="text-slate-900 font-sans block mb-0.5">Method 2 — Empirical Sample Covariance Beta:</strong>
                β_p = Cov(R_p, R_m) / Var(R_m) = ρ_p,m · (σ_p / σ_m)
              </div>
              <div className="pt-1 border-t border-slate-200">
                <strong className="text-slate-900 font-sans block mb-0.5">CAPM Risk Variance Decomposition:</strong>
                σ_p² = β_p² · σ_m² (Systematic Risk) + σ_ε² (Unsystematic Specific Risk)
              </div>
              <div className="pt-1 border-t border-slate-200">
                <strong className="text-slate-900 font-sans block mb-0.5">Jensen's Alpha (α) & Treynor Ratio:</strong>
                α = R_annual - [ R_f + β_p · (R_market_annual - R_f) ]  |  Treynor = (R_annual - R_f) / β_p
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              5. Stress Testing & Survivorship Bias Governance
            </h3>
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Rigorous Handling of Historical Listing Discrepancies
              </div>
              <p>
                In empirical backtesting, several stocks in Portfolio A were listed subsequent to the 2020 COVID shock:
                <strong> Mazagon Dock (Oct 2020), Zomato (Jul 2021), and Paytm (Nov 2021)</strong>.
              </p>
              <p>
                In strict adherence to academic financial research principles, this dashboard:
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Never fabricates unlisted historical prices or fills missing dates with zeros.</li>
                <li>Explicitly reports unlisted excluded stocks for each stress regime window.</li>
                <li>Calculates stress test metrics only across eligible stocks with verified market observations during the episode.</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              6. Markowitz Mean-Variance Portfolio Optimization
            </h3>
            <p className="text-slate-600 text-xs mb-2">
              The Markowitz Efficient Frontier is constructed by solving constrained quadratic programming formulations over annualized returns vector <strong>μ</strong> and covariance matrix <strong>Σ</strong>:
            </p>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs font-mono text-slate-800 space-y-1">
              <div>min_w  w^T Σ w</div>
              <div>subject to:  w^T 1 = 1  (Fully invested budget constraint)</div>
              <div>0 ≤ w_i ≤ w_max  (Long-only, no shorting)</div>
              <div>w^T μ = R_target  (Target expected return constraint)</div>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Close Framework
          </button>
        </div>
      </div>
    </div>
  );
}
