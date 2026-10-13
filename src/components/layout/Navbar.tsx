import React from 'react';
import { Download, FileSpreadsheet, BookOpen, Globe, CheckCircle2, Sliders } from 'lucide-react';

export type AppDataMode = 'real-web' | 'custom';

interface NavbarProps {
  dataMode: AppDataMode;
  onSwitchDataMode?: (mode: 'real-web') => void;
  onExportExcel: () => void;
  onOpenReport: () => void;
  onOpenMethodology: () => void;
}

export function Navbar({
  dataMode,
  onExportExcel,
  onOpenReport,
  onOpenMethodology,
}: NavbarProps) {
  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-3 shadow-xs shrink-0 min-w-0">
      {/* Brand Identity */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold font-mono text-xs sm:text-sm tracking-wider shadow-xs shrink-0">
          FRA
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 truncate">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight shrink-0">
              FRA RiskLab
            </h1>
            <span className="text-slate-300 hidden md:inline">|</span>
            <span className="text-xs font-medium text-slate-600 hidden md:inline truncate">
              Portfolio Risk & Stress Testing
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5 truncate">
            <span>Great Lakes Institute of Management</span>
            <span aria-hidden="true" className="hidden lg:inline">·</span>
            <span className="hidden lg:inline">Financial Risk Analysis</span>
          </div>
        </div>
      </div>

      {/* Dataset Mode Indicator & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Verified Data Indicator Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-xs font-medium shrink-0">
          <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-semibold hidden lg:inline">Verified Market Data (NSE)</span>
          <span className="font-semibold lg:hidden">Live Verified</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {dataMode === 'custom' && (
            <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 font-mono text-[10px] rounded font-semibold">
              Custom
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <button
          onClick={onOpenMethodology}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
          title="View mathematical methodology, formulas, and assumptions"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="hidden sm:inline">Methodology</span>
        </button>

        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer shrink-0"
          title="Generate Executive Committee Presentation Report"
        >
          <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="hidden sm:inline">Report</span>
        </button>

        <button
          onClick={onExportExcel}
          className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
          title="Download complete analysis workbook (.xlsx)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Export .xlsx</span>
          <span className="sm:hidden">.xlsx</span>
        </button>
      </div>
    </header>
  );
}
