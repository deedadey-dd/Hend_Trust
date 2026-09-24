import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, ChevronDown, Loader2, Check } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import type { ExportColumn } from '../utils/exportUtils';

interface ExportButtonProps {
  filename: string;
  title: string;
  headers: ExportColumn[];
  data: Record<string, any>[];
  totalCount?: number;
  onFetchAll?: () => Promise<Record<string, any>[]>;
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
  totalCount,
  onFetchAll,
  sheetName = 'Report',
  orientation = 'landscape',
  className = '',
  label = 'Export Report',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [isFetchingAll, setIsFetchingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const canExportAll = Boolean(onFetchAll && totalCount && totalCount > (data?.length || 0));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDataToExport = async (): Promise<Record<string, any>[]> => {
    if (exportScope === 'all' && onFetchAll) {
      setIsFetchingAll(true);
      try {
        const allData = await onFetchAll();
        return allData && allData.length > 0 ? allData : data;
      } catch (err) {
        console.error('Failed to fetch all data for export, falling back to current page:', err);
        return data;
      } finally {
        setIsFetchingAll(false);
      }
    }
    return data;
  };

  const handleExportPDF = async () => {
    const exportDataset = await getDataToExport();
    setIsOpen(false);
    const scopeSuffix = exportScope === 'all' ? '_all_records' : `_page_${exportDataset.length}`;
    exportToPDF(`${filename}${scopeSuffix}`, title, headers, exportDataset, orientation);
  };

  const handleExportExcel = async () => {
    const exportDataset = await getDataToExport();
    setIsOpen(false);
    const scopeSuffix = exportScope === 'all' ? '_all_records' : `_page_${exportDataset.length}`;
    exportToExcel(`${filename}${scopeSuffix}`, sheetName, headers, exportDataset);
  };

  const effectiveCount = exportScope === 'all' && totalCount ? totalCount : (data?.length || 0);
  const isDisabled = (!data || data.length === 0) && !totalCount;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled || isFetchingAll}
        title={isDisabled ? 'No data to export' : `Export ${effectiveCount} records`}
        className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all shadow-sm cursor-pointer ${
          isDisabled
            ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed border border-slate-700/40'
            : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500/40 shadow-emerald-950/20 hover:shadow-md'
        }`}
      >
        {isFetchingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        <span>{label}</span>
        {effectiveCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 text-[10px] bg-emerald-950/60 text-emerald-200 rounded-full font-mono font-bold">
            {effectiveCount}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 w-60 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl ring-1 ring-black ring-opacity-5 divide-y divide-slate-800/60 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Scope Selector if All Records available */}
          {canExportAll && (
            <div className="p-2 bg-slate-950/60 border-b border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block mb-1.5 px-1">
                Select Export Scope:
              </span>
              <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setExportScope('current')}
                  className={`py-1.5 px-2 rounded flex items-center justify-center gap-1 transition ${
                    exportScope === 'current'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {exportScope === 'current' && <Check className="w-3 h-3" />}
                  <span>In View ({data.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope('all')}
                  className={`py-1.5 px-2 rounded flex items-center justify-center gap-1 transition ${
                    exportScope === 'all'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {exportScope === 'all' && <Check className="w-3 h-3" />}
                  <span>All ({totalCount})</span>
                </button>
              </div>
            </div>
          )}

          <div className="p-1">
            <button
              type="button"
              disabled={isFetchingAll}
              onClick={handleExportPDF}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors group cursor-pointer disabled:opacity-50"
            >
              <div className="p-1 bg-red-500/10 text-red-400 group-hover:bg-red-500/20 rounded shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="font-semibold text-slate-100 flex items-center justify-between">
                  <span>Export PDF Report</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({exportScope === 'all' && totalCount ? totalCount : data.length})
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">Formatted document (.pdf)</div>
              </div>
            </button>

            <button
              type="button"
              disabled={isFetchingAll}
              onClick={handleExportExcel}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors group cursor-pointer disabled:opacity-50"
            >
              <div className="p-1 bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 rounded shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="font-semibold text-slate-100 flex items-center justify-between">
                  <span>Export Excel Workbook</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({exportScope === 'all' && totalCount ? totalCount : data.length})
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">Native spreadsheet (.xlsx)</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
