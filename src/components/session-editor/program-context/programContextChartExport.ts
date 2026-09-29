import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { slugExportFilename } from '../../../utils/matrixExport';

const EXPORT_BG = '#ffffff';

async function captureChartRoot(root: HTMLElement): Promise<HTMLCanvasElement> {
  const width = Math.max(1, root.scrollWidth);
  const height = Math.max(1, root.scrollHeight);
  return html2canvas(root, {
    backgroundColor: EXPORT_BG,
    scale: Math.min(2, 8192 / Math.max(width, height)),
    logging: false,
    useCORS: true,
    width,
    height,
    scrollX: 0,
    scrollY: 0,
  });
}

export async function exportProgramContextChartAsPng(
  root: HTMLElement,
  filenameBase: string,
): Promise<void> {
  const canvas = await captureChartRoot(root);
  const link = document.createElement('a');
  link.download = slugExportFilename(filenameBase, 'png');
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}

export async function exportProgramContextChartAsPdf(
  root: HTMLElement,
  filenameBase: string,
  documentTitle?: string,
): Promise<void> {
  const canvas = await captureChartRoot(root);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  if (documentTitle?.trim()) {
    pdf.setProperties({ title: documentTitle.trim() });
  }
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  let drawWidth = contentWidth;
  let drawHeight = (canvas.height * contentWidth) / canvas.width;
  if (drawHeight > contentHeight) {
    drawHeight = contentHeight;
    drawWidth = (canvas.width * drawHeight) / canvas.height;
  }
  const x = margin + (contentWidth - drawWidth) / 2;
  const y = margin + (contentHeight - drawHeight) / 2;
  pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', x, y, drawWidth, drawHeight);
  pdf.save(slugExportFilename(filenameBase, 'pdf'));
}

export function buildProgramContextChartFilename(params: {
  programName: string;
  scopeLabel: string;
  chartTitle: string;
}): string {
  const parts = [params.programName, params.scopeLabel, params.chartTitle].filter(Boolean);
  return parts.join(' — ');
}
