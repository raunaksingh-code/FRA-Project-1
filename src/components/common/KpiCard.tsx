import React from 'react';
import { HelpCircle } from 'lucide-react';

interface KpiCardProps {
  label: string;
  valA: string | number;
  valB?: string | number;
  unit?: string;
  comparisonMode?: boolean;
  activePortfolio?: 'All' | 'Portfolio A' | 'Portfolio B';
  tooltip?: string;
  isRiskMetric?: boolean; // if true, higher is riskier
  betterVal?: 'A' | 'B' | 'neutral';
}

export function KpiCard({
  label,
  valA,
  valB,
  unit = '',
  comparisonMode = true,
  activePortfolio = 'All',
  tooltip,
  isRiskMetric = false,
  betterVal = 'neutral',
}: KpiCardProps) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-shadow min-w-0 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2 min-w-0">
        <span className="truncate pr-1" title={label}>{label}</span>
        {tooltip && (
          <div className="relative group cursor-help shrink-0">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block w-52 p-2 bg-slate-900 text-white text-[11px] rounded-md shadow-lg z-30 leading-snug">
              {tooltip}
            </div>
          </div>
        )}
      </div>

      {/* Numerical Display */}
      {comparisonMode && activePortfolio === 'All' && valB !== undefined ? (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 items-baseline min-w-0">
          {/* Portfolio A Value */}
          <div className="border-r border-slate-100 pr-1.5 sm:pr-2 min-w-0">
            <div className="text-[10px] uppercase font-bold text-orange-600 mb-0.5 truncate tracking-wider">
              Port A
            </div>
            <div
              className="text-base sm:text-lg font-bold font-mono text-slate-900 tracking-tight truncate"
              title={`${valA}${unit}`}
            >
              {valA}
              {unit && <span className="text-[11px] font-normal text-slate-500 ml-0.5">{unit}</span>}
            </div>
          </div>

          {/* Portfolio B Value */}
          <div className="pl-1 sm:pl-1.5 min-w-0">
            <div className="text-[10px] uppercase font-bold text-teal-700 mb-0.5 truncate tracking-wider">
              Port B
            </div>
            <div
              className="text-base sm:text-lg font-bold font-mono text-slate-900 tracking-tight truncate"
              title={`${valB}${unit}`}
            >
              {valB}
              {unit && <span className="text-[11px] font-normal text-slate-500 ml-0.5">{unit}</span>}
            </div>
          </div>
        </div>
      ) : (
        <div className="min-w-0">
          <div
            className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight truncate"
            title={`${activePortfolio === 'Portfolio B' ? valB : valA}${unit}`}
          >
            {activePortfolio === 'Portfolio B' ? valB : valA}
            {unit && <span className="text-sm font-normal text-slate-500 ml-1">{unit}</span>}
          </div>
          <div className="text-[11px] font-medium text-slate-500 mt-1 truncate">
            {activePortfolio === 'Portfolio B'
              ? 'Portfolio B (Low Risk)'
              : 'Portfolio A (High Risk)'}
          </div>
        </div>
      )}
    </div>
  );
}
