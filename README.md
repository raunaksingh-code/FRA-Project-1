# FRA RiskLab: Institutional Portfolio Risk Analytics Dashboard

**Financial Risk Analysis (FRA) Group Research Project**  
*Great Lakes Institute of Management*

---

## 1. Executive Overview & Research Objective

**FRA RiskLab** is an institutional-grade financial risk analytics, stress-testing, and portfolio optimization research platform built to examine two 10-stock Indian equity universes:

1. **Portfolio A — High Risk Universe:** High operating leverage, capital-intensive, cyclical, and high-beta growth equities:
   - `ADANIGREEN.NS`, `ADANIPOWER.NS`, `MAZDOCK.NS`, `DLF.NS`, `DIXON.NS`, `BSE.NS`, `TRENT.NS`, `BAJFINANCE.NS`, `PAYTM.NS`, `ZOMATO.NS`
2. **Portfolio B — Low Risk Universe:** Defensive, cash-generative blue-chip stalwarts with non-cyclical consumer demand and regulated tariffs:
   - `HINDUNILVR.NS`, `ITC.NS`, `TCS.NS`, `INFY.NS`, `HDFCBANK.NS`, `ICICIBANK.NS`, `SUNPHARMA.NS`, `NESTLEIND.NS`, `POWERGRID.NS`, `NTPC.NS`

### Core Empirical Research Question
Does historical market data over the completed 5-year observation period (60 completed monthly observations) and the acute COVID-19 shock validate the ex-ante risk classifications, or is Portfolio A only assumed to be riskier?

---

## 2. Key Modules & Analytical Capabilities

The dashboard is structured into 7 dedicated analytical pages:

1. **Executive Summary:**
   - Multi-metric KPI cards (CAGR Return, Annualized Volatility, Downside Beta, 95% Historical VaR, 95% Expected Shortfall, Max Drawdown, Sharpe Ratio, Sortino Ratio).
   - Side-by-side growth of ₹15 Lakh initial capital vs NIFTY 50 benchmark.
   - Underwater peak-to-trough drawdown comparison.
   - Risk-Return scatter plot of constituent stocks and aggregate portfolio points.
   - **NEW — Evidence-Based Conclusion & Classification Verdict:** Dynamic, programmatically evaluated conclusions assessing whether Portfolio A is riskier, analyzing downside beta asymmetry, Sortino ratios, rolling volatility persistence vs concentration, historical ranking reversals, and sample/benchmark limitations. Includes one-click export to `evidence_based_conclusion.txt`.

2. **Portfolio Construction & Capital Allocation:**
   - Constituent table with sector tagging, NIFTY beta, and historical risk figures.
   - Interactive weight adjusters (Equal-Weight 10% preset or custom sliders with auto-normalization).
   - Sector exposure breakdown.
   - Rolling 12-month return and volatility trajectory comparison.
   - Monthly rebalancing vs Buy-and-Hold toggle.

3. **Risk Analytics (VaR, Downside Beta & Sortino):**
   - **NEW — Downside Risk Analytics Section:**
     * **Downside Beta (β⁻):** Calculated on dates when Nifty 50 return is negative: $\beta^- = \frac{\text{Cov}(R_p, R_m \mid R_m < 0)}{\text{Var}(R_m \mid R_m < 0)}$.
     * **Ordinary Market Beta (β):** $\frac{\text{Cov}(R_p, R_m)}{\text{Var}(R_m)}$ for side-by-side comparison.
     * **Sortino Ratio:** Target return hurdle (default 6% p.a. proxy) and annualization factor ($\sqrt{252}$ daily / $\sqrt{12}$ monthly) clearly disclosed.
     * **Observation Alignment:** Discloses aligned observation count ($N = 1,240$ days) and down-market days ($N = 568$ days).
     * **Rolling 30-Trading-Day Annualized Volatility Chart:** Built using Plotly with interactive hover tooltips, zoom/pan, and persistence vs concentration analysis. Includes export to `rolling_volatility.csv`.
   - Non-parametric historical simulation VaR and Expected Shortfall (CVaR) across 90%, 95%, and 99% confidence horizons.
   - Return distribution histogram with vertical tail loss markers.
   - Higher moments: Sample skewness and excess kurtosis.
   - Downside deviation and Sortino ratio master tables.
   - Export to `risk_metrics.csv`.

4. **Stress Testing (3-Period Historical Risk Comparison):**
   - **NEW — 3-Period Master Comparison Matrix:** Compares (1) Calm Reference Period (2017–2019, 738 days), (2) COVID Crisis Window (Feb–May 2020, 68 days), and (3) Recent Sample (2021–2026, 1,240 days).
   - For each period: Annualized volatility, Downside Beta, Ordinary Beta, Sortino ratio, 95% Historical VaR, 95% Expected Shortfall, Maximum Drawdown, aligned observations, and down days.
   - Strict survivorship bias controls: Discloses unlisted stocks (Mazagon Dock, Paytm, Zomato were unlisted in older periods) without fabricated prices or zero-imputations.
   - **Interactive Plotly Grouped Bar Charts:** Compare Downside Beta, Volatility, Sortino, and Drawdown across all 3 historical regimes.
   - Export to `historical_risk_comparison.csv`.

5. **Markowitz Efficient Frontier & Optimization:**
   - Constrained long-only quadratic programming optimizer.
   - Simulates 1,000+ feasible portfolios via Dirichlet random distributions.
   - Identifies Minimum Volatility and Maximum Sharpe optimal allocations.
   - Target Return solver computing minimum volatility for a user-specified hurdle rate.
   - Single-asset weight caps (e.g. ≤ 25%, ≤ 35%, 100%).

6. **Correlation & Diversification Heatmaps:**
   - Interactive diverging heatmaps for Portfolio A, Portfolio B, and the full 20-stock universe.
   - Pearson correlation and annualized covariance matrix toggles.
   - Top 5 highest correlated pairs and top 5 diversifying hedging pairs.
   - Average intra-portfolio correlation coefficient.

7. **Data Explorer, Upload & Export:**
   - Full `.xlsx` and `.csv` upload engine with automatic column and sheet parsing.
   - Preloaded verified Colab dataset with seamless reset.
   - Data quality audit (0 duplicate dates, zero cross-portfolio overlap, complete sample history).
   - Export full `FRA_Complete_Analysis.xlsx` multi-sheet workbook.
   - Export CSV datasets for returns, stock statistics, and stress test metrics.
   - Printable / PDF-ready Executive Committee presentation report.

---

## 3. Mathematical & Financial Conventions

- **Geometric CAGR Return:** $R_{annual} = \left[\prod_{t=1}^n (1 + r_t)\right]^{12/n} - 1$
- **Annualized Volatility (Monthly):** $\sigma_{annual} = \sigma_{monthly} \times \sqrt{12}$
- **Annualized Volatility (Daily):** $\sigma_{annual} = \sigma_{daily} \times \sqrt{252}$
- **Historical Value at Risk (VaR):** $VaR_\alpha = \max(0, -Q_{1-\alpha}(R))$
- **Historical Expected Shortfall (ES):** $ES_\alpha = E[-R \mid R \le Q_{1-\alpha}(R)]$
- **Sharpe Ratio:** $\frac{R_{annual} - R_f}{\sigma_{annual}}$ (Default $R_f = 6.0\%$ annual benchmark proxy)
- **Currency & Formatting:** Displayed in Indian Rupees (₹) with Lakh notation.

---

## 4. Local Setup & Execution

### Prerequisites
- Node.js (version 18 or higher)
- npm

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd fra-risk-dashboard

# Install dependencies
npm install

# Start local development server
npm run dev
```

Open your browser at `http://localhost:3000`.

---

## 5. Deployment Instructions

This web app is configured as a high-performance React SPA on Vite and can be deployed with one click to:
- **Vercel:** Connect GitHub repository, build command `npm run build`, output directory `dist`.
- **Netlify:** Build command `npm run build`, publish directory `dist`.
- **Google Cloud Run / Docker:** Containerize with standard Node/Nginx image.
