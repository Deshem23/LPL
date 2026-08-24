'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLogoDataUrl, exportToExcel, exportToWord, exportToPdf, type ExportColumn } from '@/lib/export-utils';

interface ExportButtonsProps {
  /** Shown as the document title/heading in every exported format. */
  title: string;
  /** Base filename, without extension - each format appends its own. */
  filename: string;
  columns: ExportColumn[];
  /** Rows to export, when the caller already has the full matching set in
   *  hand (e.g. a report page's in-memory data). Ignored when `getRows`
   *  is provided. */
  rows?: Record<string, any>[];
  /** Lazily fetches the full matching row set right before export, instead
   *  of exporting whatever `rows` currently holds. Use this whenever the
   *  data on screen is paginated (e.g. the audit log table) - without it,
   *  "export" would only ever produce the current page instead of every
   *  entry matching the active filters. Since fetching can take a moment
   *  for a long history, the buttons show a loading state while it runs. */
  getRows?: () => Promise<Record<string, any>[]>;
  /** Required when using `getRows`, since the button can't infer "any
   *  matching rows?" from a count it hasn't fetched yet - pass e.g.
   *  `total === 0` from whatever query is driving the page. */
  disabled?: boolean;
}

// Reusable "Exporter" button group - Excel / Word / PDF, all generated
// client-side with no new dependency (see lib/export-utils.ts for how).
// Used on both /admin/reports and /admin/audit-log.
export function ExportButtons({ title, filename, columns, rows, getRows, disabled }: ExportButtonsProps) {
  const [exporting, setExporting] = useState<'excel' | 'word' | 'pdf' | null>(null);
  const isDisabled = disabled || (!getRows && (rows?.length ?? 0) === 0) || exporting !== null;

  const runExport = async (kind: 'excel' | 'word' | 'pdf') => {
    setExporting(kind);
    try {
      const [exportRows, logo] = await Promise.all([
        getRows ? getRows() : Promise.resolve(rows || []),
        getLogoDataUrl(),
      ]);
      if (exportRows.length === 0) return;
      if (kind === 'excel') exportToExcel(filename, title, columns, exportRows);
      else if (kind === 'word') exportToWord(filename, title, columns, exportRows, logo);
      else exportToPdf(title, columns, exportRows, logo);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" disabled={isDisabled} onClick={() => runExport('excel')}>
        {exporting === 'excel' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="mr-2 h-4 w-4" />
        )}
        Excel
      </Button>
      <Button variant="outline" size="sm" disabled={isDisabled} onClick={() => runExport('word')}>
        {exporting === 'word' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        Word
      </Button>
      <Button variant="outline" size="sm" disabled={isDisabled} onClick={() => runExport('pdf')}>
        {exporting === 'pdf' ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Printer className="mr-2 h-4 w-4" />
        )}
        PDF
      </Button>
    </div>
  );
}
