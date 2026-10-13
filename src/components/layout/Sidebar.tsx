import React from 'react';
import {
  LayoutDashboard,
  PieChart,
  ShieldAlert,
  Flame,
  TrendingUp,
  Grid,
  Database,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { GlobalFilterState } from '../../types';

export type PageId =
  | 'summary'
  | 'portfolio'
  | 'risk'
  | 'stress'
  | 'frontier'
  | 'correlation'
  | 'explorer';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  filters: GlobalFilterState;
  onChangeFilters: (filters: Partial<GlobalFilterState>) => void;
  onResetFilters: () => void;
}

const NAV_ITEMS: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'summary', label: '1. Executive Summary', icon: LayoutDashboard },
  { id: 'portfolio', label: '2. Portfolio Construction', icon: PieChart },
  { id: 'risk', label: '3. Risk Analytics (VaR/ES)', icon: ShieldAlert },
  { id: 'stress', label: '4. Stress Testing & Crisis', icon: Flame },
  { id: 'frontier', label: '5. Markowitz Efficient Frontier', icon: TrendingUp },
  { id: 'correlation', label: '6. Correlation & Heatmaps', icon: Grid },
  { id: 'explorer', label: '7. Data Explorer & Validation', icon: Database },
];

export function Sidebar({
  currentPage,
  onSelectPage,
  filters,
  onChangeFilters,
  onResetFilters,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col justify-between shrink-0 h-full overflow-y-auto">
      {/* Navigation Links */}
      <div className="p-3">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Analytics Modules
        </div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer text-left ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-sky-400' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Global Interactive Parameters Panel */}
      <div className="p-3.5 border-t border-slate-200 bg-white/70">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Global Parameters</span>
          </div>
          <button
            onClick={onResetFilters}
            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
            title="Reset to project baseline assumptions"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {/* Active Portfolio Toggle */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Active Focus
            </label>
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-md">
              {(['All', 'Portfolio A', 'Portfolio B'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onChangeFilters({ activePortfolio: mode })}
                  className={`py-1 text-[11px] font-medium rounded transition-colors cursor-pointer text-center ${
                    filters.activePortfolio === mode
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'All' ? 'Both' : mode === 'Portfolio A' ? 'Port A' : 'Port B'}
                </button>
              ))}
            </div>
          </div>

          {/* Confidence Level */}
          <div>
            <div className="flex justify-between items-center text-[11px] font-medium text-slate-600 mb-1">
              <span>VaR / ES Confidence</span>
              <span className="font-mono text-slate-900 font-semibold">
                {(filters.confidenceLevel * 100).toFixed(0)}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-md">
              {([0.90, 0.95, 0.99] as const).map((cl) => (
                <button
                  key={cl}
                  onClick={() => onChangeFilters({ confidenceLevel: cl })}
                  className={`py-1 text-[11px] font-medium rounded transition-colors cursor-pointer ${
                    filters.confidenceLevel === cl
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {(cl * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>

          {/* Risk-Free Rate */}
          <div>
            <div className="flex justify-between items-center text-[11px] font-medium text-slate-600 mb-1">
              <span>Risk-Free Rate (Rf)</span>
              <span className="font-mono text-slate-900 font-semibold">
                {filters.riskFreeRatePct.toFixed(1)}% p.a.
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              step={0.5}
              value={filters.riskFreeRatePct}
              onChange={(e) => onChangeFilters({ riskFreeRatePct: parseFloat(e.target.value) })}
              className="w-full accent-slate-800 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
            />
            <div className="text-[10px] text-slate-400 mt-0.5">
              Assumed proxy for 10Y Indian G-Sec yield
            </div>
          </div>

          {/* Rebalancing Frequency */}
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Rebalancing Mode
            </label>
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-md">
              <button
                onClick={() => onChangeFilters({ rebalanceFrequency: 'Monthly' })}
                className={`py-1 text-[11px] font-medium rounded transition-colors cursor-pointer text-center ${
                  filters.rebalanceFrequency === 'Monthly'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => onChangeFilters({ rebalanceFrequency: 'BuyAndHold' })}
                className={`py-1 text-[11px] font-medium rounded transition-colors cursor-pointer text-center ${
                  filters.rebalanceFrequency === 'BuyAndHold'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Buy & Hold
              </button>
            </div>
          </div>

          {/* Initial Capital Display */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Initial Capital:</span>
              <span className="font-mono text-slate-800 font-medium">₹15,00,000</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-0.5">
              <span>Stocks per Universe:</span>
              <span className="font-mono text-slate-800 font-medium">10 Stocks each</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
