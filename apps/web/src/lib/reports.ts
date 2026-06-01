"use client";

export function downloadCsv(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function pdfEscape(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\n/g, "\\n");
}

export interface PdfTableColumn {
  header: string;
  width: number;
}

export interface PdfTable {
  columns: PdfTableColumn[];
  rows: string[][];
  title: string;
  subtitle?: string;
}

const MARGIN_LEFT = 36;
const PAGE_HEIGHT = 792;
const PAGE_WIDTH = 612;
const LINE_HEIGHT = 14;

export function generatePdfReport(tables: PdfTable[]): Blob {
  const objects: string[] = [];
  let objId = 1;

  function addObj(type: string, children?: number[]): number {
    const id = objId;
    objId++;
    let dict = "";
    if (type === "Catalog") {
      dict = `<< /Type /Catalog /Pages ${id + 1} 0 R >>`;
    } else if (type === "Pages") {
      dict = `<< /Type /Pages /Kids [${(children ?? []).map((c) => `${c} 0 R`).join(" ")}] /Count ${children?.length ?? 0} >>`;
    } else if (type === "Page") {
      dict = `<< /Type /Page /Parent ${children?.[0] ?? (id - 1)} 0 R /MediaBox [0 0 612 792] /Contents ${children?.[1] ?? (id + 1)} 0 R /Resources << /Font << /F1 ${children?.[2] ?? (id + 2)} 0 R >> >> >>`;
    } else if (type === "Font") {
      dict = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
    }
    objects.push(`${id} 0 obj\n${dict}\nendobj`);
    return id;
  }

  function addContent(stream: string): number {
    const id = objId;
    objId++;
    const escaped = pdfEscape(stream);
    objects.push(`${id} 0 obj\n<< /Length ${escaped.length + 1} >>\nstream\n${escaped}\nendstream\nendobj`);
    return id;
  }

  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    let content = `BT\n/F1 10 Tf\n`;

    const totalWidth = table.columns.reduce((s, c) => s + c.width, 0);
    const scale = (PAGE_WIDTH - MARGIN_LEFT * 2) / totalWidth;
    const colWidths = table.columns.map((c) => Math.round(c.width * scale));

    let y = 760;

    content += `${MARGIN_LEFT} ${y} Td\n(FN ${pdfEscape(table.title)}) Tj\n`;
    y -= LINE_HEIGHT + 4;

    if (table.subtitle) {
      content += `BT /F1 8 Tf ET\n${MARGIN_LEFT} ${y} Td\n(${pdfEscape(table.subtitle)}) Tj\nET`;
      y -= LINE_HEIGHT + 2;
    }

    y -= 6;

    let xPos = MARGIN_LEFT;
    for (let ci = 0; ci < table.columns.length; ci++) {
      const w = colWidths[ci];
      content += `BT /F1 10 Tf ET\n${xPos} ${y} Td\n(${pdfEscape(table.columns[ci].header)}) Tj\nET`;
      content += `0 0 0 RG\n${xPos} ${y - 1} ${w} ${LINE_HEIGHT + 2} re S\n0 0 0 rg\n`;
      xPos += w;
    }
    y -= LINE_HEIGHT + 6;

    for (const row of table.rows) {
      if (y < 60) break;
      xPos = MARGIN_LEFT;
      for (let ci = 0; ci < row.length && ci < colWidths.length; ci++) {
        const w = colWidths[ci];
        const cellText = row[ci] ?? "";
        const maxChars = Math.max(1, Math.floor(w / 5.5));
        const displayText = cellText.length > maxChars ? cellText.slice(0, maxChars - 1) + "\u2026" : cellText;
        content += `BT /F1 10 Tf ET\n${xPos + 2} ${y} Td\n(${pdfEscape(displayText)}) Tj\nET`;
        content += `0 0 0 RG\n${xPos} ${y - 1} ${w} ${LINE_HEIGHT + 2} re S\n0 0 0 rg\n`;
        xPos += w;
      }
      y -= LINE_HEIGHT + 2;
    }

    const contentId = addContent(content);
    contentObjIds.push(contentId);
  }

  const fontId = addObj("Font");

  for (let i = 0; i < tables.length; i++) {
    const pageId = addObj("Page", [0, contentObjIds[i], fontId]);
    pageObjIds.push(pageId);
  }

  const pagesId = addObj("Pages", pageObjIds);
  addObj("Catalog", [pagesId]);

  let xref = `xref\n0 ${objId}\n0000000000 65535 f \n`;
  let offset = 0;
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(offset);
    offset += obj.length + 1;
  }
  for (const o of offsets) {
    xref += `${String(o).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objId} /Root ${objId - 1} 0 R >>\nstartxref\n${offset}\n%%EOF`;

  const pdf = `%PDF-1.4\n${objects.join("\n")}\n${xref}${trailer}`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadPdf(filename: string, tables: PdfTable[]) {
  const blob = generatePdfReport(tables);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
