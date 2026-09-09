import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ExportColumn {
  label: string;
  key: string;
}

/**
 * Export data records to an Excel (.xlsx) file.
 */
export const exportToExcel = (
  filename: string,
  sheetName: string,
  headers: ExportColumn[],
  data: Record<string, any>[]
) => {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const formattedData = data.map((item) => {
    const row: Record<string, any> = {};
    headers.forEach((h) => {
      let val = item[h.key];
      if (val === null || val === undefined) val = '';
      else if (typeof val === 'object') val = JSON.stringify(val);
      row[h.label] = val;
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Set intelligent column widths
  const colWidths = headers.map((h) => {
    const maxLen = Math.max(
      h.label.length,
      ...formattedData.map((r) => String(r[h.label] || '').length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 12), 45) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Data');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Export data records to a styled PDF (.pdf) document.
 */
export const exportToPDF = (
  filename: string,
  title: string,
  headers: ExportColumn[],
  data: Record<string, any>[],
  orientation: 'portrait' | 'landscape' = 'landscape'
) => {
  if (!data || data.length === 0) {
    alert("No data available to export.");
    return;
  }

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Header Banner Background (Dark Slate)
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 22, 'F');

  // Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('HENDAXIS TRUST', 14, 11);

  // Subtitle
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('Official Escrow Audit & Operations Report', 14, 17);

  // Date Generated
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  const dateStr = `Generated: ${new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`;
  doc.text(dateStr, pageWidth - 14, 14, { align: 'right' });

  // Report Section Title
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 30);

  // Metadata Subhead
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Records: ${data.length}`, 14, 36);

  // Table Data Mapping
  const tableHeaders = headers.map((h) => h.label);
  const tableRows = data.map((item) =>
    headers.map((h) => {
      let val = item[h.key];
      if (val === null || val === undefined) return '-';
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      return String(val);
    })
  );

  autoTable(doc, {
    startY: 40,
    head: [tableHeaders],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { top: 40, left: 14, right: 14, bottom: 14 },
    didDrawPage: (dataArg) => {
      const pageCount = (doc as any).getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${dataArg.pageNumber} of ${pageCount}`,
        pageWidth - 14,
        pageHeight - 6,
        { align: 'right' }
      );
      doc.text(
        'HendAxis Trust • Confidential Platform Data',
        14,
        pageHeight - 6
      );
    },
  });

  doc.save(`${filename}.pdf`);
};
