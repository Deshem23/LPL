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
  logoDataUrl: string | null
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
  logoDataUrl: string | null
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
