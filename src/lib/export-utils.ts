'use client';

// Client-side, dependency-free export helpers for the admin's "download
// as Excel/Word/PDF" buttons (Audit Log, Reports). No new npm package is
// installed for any of these - each format uses a real, widely-supported
// trick instead of a generation library:
//
//  - Excel: SpreadsheetML (Office's XML spreadsheet format) - a plain XML
//    string that Excel opens natively, no zip/binary .xlsx needed.
//  - Word: an HTML document saved with a .doc extension - Word has opened
//    HTML-as-.doc natively for decades, so no docx-generation library is
//    needed either.
//  - PDF: a print-styled popup window + window.print() - the browser's
//    own "Save as PDF" print destination produces the actual PDF, so no
//    PDF-generation library is needed.
//
// All three optionally embed the site's own logo (see getLogoDataUrl) so
// exported documents are branded, per the "i want to have my own logo"
// request - swap public/logo.png on disk to change it everywhere at once.

export interface ExportColumn {
  key: string;
  label: string;
}

/** Fetches /logo.png and returns it as a data: URL for embedding in
 *  generated documents. Returns null (documents render without a logo,
 *  never blocking the export) if it can't be loaded. */
export async function getLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch('/logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob(['﻿' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeXml(value: unknown): string {
  const map: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
  return String(value ?? '').replace(/[<>&'"]/g, (c) => map[c]);
}

// HTML escaping needs the same substitutions as XML here (no extra HTML
// entities are used in the generated markup), so this just aliases it.
const escapeHtml = escapeXml;

function formatGeneratedAt(): string {
  return new Date().toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface ChartDatum {
  label: string;
  value: number;
}

/**
 * Renders a simple vertical bar chart to a PNG data: URL using a plain
 * <canvas> - no charting library needed, since this only ever needs to
 * produce one static image to embed in an exported document (PDF/Word),
 * not an interactive on-page chart (that's what recharts, already used
 * on /admin/analytics, is for). Returns null for empty data instead of
 * an empty/broken image, so callers can skip embedding it entirely.
 */
export function renderBarChartDataUrl(title: string, data: ChartDatum[]): string | null {
  if (!data || data.length === 0) return null;
  if (typeof document === 'undefined') return null;

  const width = 720;
  const height = 360;
  const padding = { top: 48, right: 24, bottom: 64, left: 48 };
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#1a2a3a';
  ctx.font = 'bold 18px -apple-system, Arial, sans-serif';
  ctx.fillText(title, padding.left, 28);

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...data.slice(0, 12).map((d) => d.value));
  const bars = data.slice(0, 12); // cap so labels stay legible
  const barSlot = chartWidth / bars.length;
  const barWidth = Math.min(56, barSlot * 0.6);

  // Baseline
  ctx.strokeStyle = '#e5e7eb';
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(width - padding.right, padding.top + chartHeight);
  ctx.stroke();

  bars.forEach((d, i) => {
    const barHeight = (d.value / maxValue) * chartHeight;
    const x = padding.left + i * barSlot + (barSlot - barWidth) / 2;
    const y = padding.top + chartHeight - barHeight;

    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Value on top of the bar
    ctx.fillStyle = '#1a2a3a';
    ctx.font = '12px -apple-system, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(d.value), x + barWidth / 2, y - 6);

    // Label below the axis - truncated so a long name can't overlap its
    // neighbors; the underlying table in the same export still has the
    // full text.
    const label = d.label.length > 12 ? `${d.label.slice(0, 11)}…` : d.label;
    ctx.fillStyle = '#666666';
    ctx.font = '11px -apple-system, Arial, sans-serif';
    ctx.save();
    ctx.translate(x + barWidth / 2, padding.top + chartHeight + 16);
    ctx.rotate(bars.length > 6 ? -Math.PI / 6 : 0);
    ctx.textAlign = bars.length > 6 ? 'right' : 'center';
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  ctx.textAlign = 'left';
  return canvas.toDataURL('image/png');
}

export function exportToExcel(
  filename: string,
  sheetTitle: string,
  columns: ExportColumn[],
  rows: Record<string, any>[]
) {
  const headerCells = columns
    .map((c) => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(c.label)}</Data></Cell>`)
    .join('');
  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((c) => {
          const value = row[c.key];
          const isNumber = typeof value === 'number';
          return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${escapeXml(value)}</Data></Cell>`;
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1A2A3A" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetTitle).slice(0, 31) || 'Feuille1'}">
  <Table>
   <Row>${headerCells}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;

  triggerDownload(xml, filename.endsWith('.xls') ? filename : `${filename}.xls`, 'application/vnd.ms-excel');
}

export function exportToWord(
  filename: string,
  title: string,
  columns: ExportColumn[],
  rows: Record<string, any>[],
  logoDataUrl: string | null,
  chartDataUrl?: string | null
) {
  const headerCells = columns
    .map((c) => `<th style="background:#1a2a3a;color:#fff;padding:8px;text-align:left;">${escapeHtml(c.label)}</th>`)
    .join('');
  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((c) => `<td style="padding:8px;border-bottom:1px solid #ddd;">${escapeHtml(row[c.key])}</td>`)
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="font-family:Arial,sans-serif;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
    ${logoDataUrl ? `<img src="${logoDataUrl}" style="height:48px;" />` : ''}
    <h1 style="margin:0;font-size:20px;">${escapeHtml(title)}</h1>
  </div>
  <p style="color:#666;font-size:12px;">Généré le ${formatGeneratedAt()}</p>
  ${chartDataUrl ? `<img src="${chartDataUrl}" style="max-width:100%;margin-bottom:16px;" />` : ''}
  <table style="border-collapse:collapse;width:100%;">
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;

  triggerDownload(html, filename.endsWith('.doc') ? filename : `${filename}.doc`, 'application/msword');
}

export function exportToPdf(
  title: string,
  columns: ExportColumn[],
  rows: Record<string, any>[],
  logoDataUrl: string | null,
  chartDataUrl?: string | null
) {
  const headerCells = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const bodyRows = rows
    .map((row) => {
      const cells = columns.map((c) => `<td>${escapeHtml(row[c.key])}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; padding: 32px; color: #1a1a1a; }
  .header { display: flex; align-items: center; gap: 12px; border-bottom: 3px solid #1a2a3a; padding-bottom: 16px; margin-bottom: 24px; }
  .header img { height: 48px; }
  h1 { font-size: 22px; margin: 0; }
  .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
  .chart { max-width: 100%; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #1a2a3a; color: #fff; text-align: left; padding: 8px; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) td { background: #f9f9f9; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    ${logoDataUrl ? `<img src="${logoDataUrl}" />` : ''}
    <h1>${escapeHtml(title)}</h1>
  </div>
  <p class="meta">Généré le ${formatGeneratedAt()}</p>
  ${chartDataUrl ? `<img class="chart" src="${chartDataUrl}" />` : ''}
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <script>
    window.onload = function () { window.focus(); window.print(); };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Le navigateur a bloqué l'ouverture de la fenêtre d'impression. Autorisez les pop-ups pour ce site puis réessayez.");
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
