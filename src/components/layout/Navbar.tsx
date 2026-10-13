import React from 'react';
import { Download, FileSpreadsheet, BookOpen, RefreshCw } from 'lucide-react';

interface NavbarProps {
  dataMode: 'preloaded' | 'custom';
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
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 px-6 flex items-center justify-between shadow-xs">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold font-mono text-sm tracking-wider shadow-xs">
          FRA
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              FRA RiskLab
            </h1>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-medium text-slate-600">
              Portfolio Risk, Stress Testing & Optimization
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Great Lakes Institute of Management</span>
            <span aria-hidden="true">·</span>
            <span>Financial Risk Analysis Project</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-600">
              {dataMode === 'preloaded'
                ? '5-Yr Monthly Dataset (2021–2026)'
                : 'Custom Uploaded Data Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenMethodology}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          title="View mathematical methodology, formulas, and assumptions"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-500" />
          <span>Methodology</span>
        </button>

        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs cursor-pointer"
          title="Generate Executive Committee Presentation Report"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Executive Report</span>
        </button>

        <button
          onClick={onExportExcel}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs cursor-pointer"
          title="Download complete analysis workbook (.xlsx)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Export Workbook (.xlsx)</span>
        </button>
      </div>
    </header>
  );
}
