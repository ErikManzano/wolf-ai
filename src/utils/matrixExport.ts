import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface MatrixExportOptions {
  title?: string;
}

const MIN_SINGLE_PAGE_SHRINK = 0.42;

export function slugExportFilename(title: string, ext: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 64);
  return `${base || 'programa'}.${ext}`;
}

function replaceButtonsWithStatic(root: HTMLElement): void {
  root.querySelectorAll('button').forEach((btn) => {
    const wrap = document.createElement('div');
    wrap.className = btn.className;
    wrap.innerHTML = btn.innerHTML;
    btn.replaceWith(wrap);
  });
}

function prepareExportRoot(
  source: HTMLElement,
  options: MatrixExportOptions,
  weekRowIndex?: number,
): HTMLElement {
  const root = source.cloneNode(true) as HTMLElement;

  root.style.maxHeight = 'none';
  root.style.height = 'auto';
  root.style.overflow = 'visible';
  root.style.width = 'max-content';
  root.style.minWidth = '100%';
  root.style.background = '#09090b';
  root.style.border = '1px solid #27272a';
  root.style.borderRadius = '12px';
  root.style.boxShadow = 'none';

  root.querySelector('.wolf-program-matrix-toolbar')?.remove();
  root.querySelector('.wolf-program-matrix-hint')?.remove();

  root.querySelectorAll('.is-active-day, .is-selected, .is-active-week').forEach((el) => {
    el.classList.remove('is-active-day', 'is-selected', 'is-active-week');
  });
  root.querySelectorAll('[aria-current]').forEach((el) => el.removeAttribute('aria-current'));

  const scroll = root.querySelector('.wolf-program-matrix-scroll') as HTMLElement | null;
  if (scroll) {
    scroll.style.maxHeight = 'none';
    scroll.style.height = 'auto';
    scroll.style.overflow = 'visible';
    scroll.style.flex = 'none';
  }

  if (weekRowIndex != null) {
    const rows = Array.from(root.querySelectorAll('.wolf-program-matrix-table tbody tr'));
    rows.forEach((row, index) => {
      if (index !== weekRowIndex) row.remove();
    });
  }

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-corner, .wolf-program-matrix-week-row, .wolf-program-matrix-day-col').forEach((cell) => {
    cell.style.position = 'static';
    cell.style.top = 'auto';
    cell.style.left = 'auto';
    cell.style.zIndex = 'auto';
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-day-col, .wolf-program-matrix-cell').forEach((cell) => {
    cell.style.minWidth = weekRowIndex != null ? '120px' : '132px';
    cell.style.maxWidth = 'none';
    cell.style.width = weekRowIndex != null ? '120px' : '132px';
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-week-row, .wolf-program-matrix-corner').forEach((cell) => {
    cell.style.width = '100px';
    cell.style.minWidth = '100px';
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-exercise-name').forEach((name) => {
    name.style.display = 'block';
    name.style.overflow = 'visible';
    name.style.webkitLineClamp = 'unset';
    name.style.whiteSpace = 'normal';
    name.style.wordBreak = 'break-word';
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-exercise-rx').forEach((rx) => {
    rx.style.whiteSpace = 'normal';
    rx.style.overflow = 'visible';
    rx.style.wordBreak = 'break-word';
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-cell-hit, .wolf-program-matrix-week-row-btn').forEach((hit) => {
    hit.style.minHeight = 'auto';
    hit.style.height = 'auto';
    hit.style.padding = '8px 10px';
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-exercise').forEach((el) => {
    el.style.background = '#18181b';
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-cell.is-empty').forEach((el) => {
    el.style.background = '#0a0a0c';
  });

  replaceButtonsWithStatic(root);

  const table = root.querySelector('.wolf-program-matrix-table') as HTMLElement | null;
  if (table) {
    table.style.width = 'max-content';
    table.style.tableLayout = 'auto';
  }

  const baseTitle = options.title?.trim();
  const weekTitle =
    weekRowIndex != null
      ? root.querySelector('.wolf-program-matrix-week-title')?.textContent?.trim()
      : null;
  const displayTitle =
    weekRowIndex != null && baseTitle && weekTitle
      ? `${baseTitle} — ${weekTitle}`
      : baseTitle;

  if (displayTitle) {
    const titleBar = document.createElement('div');
    titleBar.textContent = displayTitle;
    titleBar.style.cssText =
      'padding:12px 14px;font-size:15px;font-weight:700;line-height:1.3;color:#fafafa;background:#0c0c0e;border-bottom:1px solid #27272a;font-family:Inter,system-ui,sans-serif;';
    root.insertBefore(titleBar, root.firstChild);
  }

  return root;
}

function countWeekRows(source: HTMLElement): number {
  return source.querySelectorAll('.wolf-program-matrix-table tbody tr').length;
}

async function capturePreparedRoot(exportRoot: HTMLElement): Promise<HTMLCanvasElement> {
  const mount = document.createElement('div');
  mount.setAttribute('data-matrix-export-mount', 'true');
  mount.style.cssText = 'position:fixed;left:-30000px;top:0;z-index:-1;pointer-events:none;opacity:1;';
  mount.appendChild(exportRoot);
  document.body.appendChild(mount);

  try {
    await document.fonts?.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const width = Math.ceil(exportRoot.scrollWidth);
    const height = Math.ceil(exportRoot.scrollHeight);

    return await html2canvas(exportRoot, {
      backgroundColor: '#09090b',
      scale: Math.min(2, Math.max(1.5, window.devicePixelRatio || 1.5)),
      logging: false,
      useCORS: true,
      width,
      height,
      windowWidth: width + 48,
      windowHeight: height + 48,
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    mount.remove();
  }
}

async function captureMatrixElement(
  source: HTMLElement,
  options: MatrixExportOptions,
  weekRowIndex?: number,
): Promise<HTMLCanvasElement> {
  const exportRoot = prepareExportRoot(source, options, weekRowIndex);
  return capturePreparedRoot(exportRoot);
}

function fitDimensions(
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
  margin: number,
): { drawWidth: number; drawHeight: number; x: number; y: number; shrinkRatio: number } {
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const imgHeightAtFullWidth = (canvas.height * contentWidth) / canvas.width;

  let drawWidth = contentWidth;
  let drawHeight = imgHeightAtFullWidth;
  if (drawHeight > contentHeight) {
    drawHeight = contentHeight;
    drawWidth = (canvas.width * drawHeight) / canvas.height;
  }

  const shrinkRatio = drawHeight / imgHeightAtFullWidth;
  const x = margin + (contentWidth - drawWidth) / 2;
  const y = margin + (contentHeight - drawHeight) / 2;

  return { drawWidth, drawHeight, x, y, shrinkRatio };
}

function addCanvasPage(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  margin: number,
  isFirstPage: boolean,
): void {
  if (!isFirstPage) pdf.addPage();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const { drawWidth, drawHeight, x, y } = fitDimensions(canvas, pageWidth, pageHeight, margin);
  const imgData = canvas.toDataURL('image/png', 1.0);
  pdf.addImage(imgData, 'PNG', x, y, drawWidth, drawHeight);
}

async function captureForPdf(
  source: HTMLElement,
  options: MatrixExportOptions,
): Promise<HTMLCanvasElement[]> {
  const fullCanvas = await captureMatrixElement(source, options);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const { shrinkRatio } = fitDimensions(fullCanvas, pageWidth, pageHeight, 6);

  const weekCount = countWeekRows(source);
  if (shrinkRatio >= MIN_SINGLE_PAGE_SHRINK || weekCount <= 1) {
    return [fullCanvas];
  }

  const weekCanvases: HTMLCanvasElement[] = [];
  for (let i = 0; i < weekCount; i += 1) {
    weekCanvases.push(await captureMatrixElement(source, options, i));
  }
  return weekCanvases;
}

function exportCanvasesToPdf(canvases: HTMLCanvasElement[], filename: string, title?: string): void {
  const orientation =
    canvases.length === 1 && canvases[0]!.width >= canvases[0]!.height ? 'landscape' : 'landscape';
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4', compress: true });
  if (title?.trim()) {
    pdf.setProperties({ title: title.trim() });
  }

  const margin = 6;
  canvases.forEach((canvas, index) => {
    addCanvasPage(pdf, canvas, margin, index === 0);
  });

  pdf.save(filename);
}

export async function exportElementAsPng(
  el: HTMLElement,
  filename: string,
  options: MatrixExportOptions = {},
): Promise<void> {
  const canvas = await captureMatrixElement(el, options);
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}

export async function exportElementAsPdf(
  el: HTMLElement,
  filename: string,
  options: MatrixExportOptions = {},
): Promise<void> {
  const canvases = await captureForPdf(el, options);
  exportCanvasesToPdf(canvases, filename, options.title);
}
