import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import type { ExportColumn } from '../utils/exportUtils';

interface ExportButtonProps {
  filename: string;
  title: string;
  headers: ExportColumn[];
  data: Record<string, any>[];
  sheetName?: string;
  orientation?: 'portrait' | 'landscape';
  className?: string;
  label?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  filename,
  title,
  headers,
  data,
  sheetName = 'Report',
  orientation = 'landscape',
  className = '',
  label = 'Export Report',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportPDF = () => {
    setIsOpen(false);
    exportToPDF(filename, title, headers, data, orientation);
  };

  const handleExportExcel = () => {
    setIsOpen(false);
    exportToExcel(filename, sheetName, headers, data);
  };

  const isDisabled = !data || data.length === 0;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        title={isDisabled ? 'No data to export' : `Export ${data.length} records`}
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shadow-sm ${
          isDisabled
            ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/40'
            : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500/40 shadow-emerald-950/20 hover:shadow-md'
        }`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{label}</span>
        {data && data.length > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-emerald-950/60 text-emerald-200 rounded-full font-mono">
            {data.length}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl ring-1 ring-black ring-opacity-5 divide-y divide-slate-800/60 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-1">
            <button
              onClick={handleExportPDF}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors group"
            >
              <div className="p-1 bg-red-500/10 text-red-400 group-hover:bg-red-500/20 rounded">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Export PDF Report</div>
                <div className="text-[10px] text-slate-400">Formatted PDF document (.pdf)</div>
              </div>
            </button>

            <button
              onClick={handleExportExcel}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors group"
            >
              <div className="p-1 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 rounded">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Export Excel Workbook</div>
                <div className="text-[10px] text-slate-400">Native spreadsheet (.xlsx)</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
