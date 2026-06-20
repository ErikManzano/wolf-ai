import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { MATRIX_DAY_TONES } from './matrixDayTones';

export interface MatrixExportOptions {
  title?: string;
}

const MIN_SINGLE_PAGE_SHRINK = 0.42;
const MAX_CANVAS_SIDE = 8192;

/** Wolf AI export palette — solid colors only (html2canvas-safe). */
const MATRIX_EXPORT = {
  bg: '#0a0c10',
  surface: '#12151c',
  surface2: '#171b24',
  border: '#2a3140',
  accent: '#f97316',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textDim: '#64748b',
} as const;

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

function toneFromAttr(el: Element): (typeof MATRIX_DAY_TONES)[number] | null {
  const raw = el.getAttribute('data-day-tone');
  if (raw == null) return null;
  const index = Number.parseInt(raw, 10);
  return MATRIX_DAY_TONES[index] ?? null;
}

function tbodyRowParity(cell: Element): 'even' | 'odd' {
  const row = cell.closest('tbody tr');
  if (!row?.parentElement) return 'odd';
  const rows = Array.from(row.parentElement.children).filter((el) => el.tagName === 'TR');
  const index = rows.indexOf(row);
  return index >= 0 && index % 2 === 1 ? 'even' : 'odd';
}

/** Inline solid colors so html2canvas never chokes on color-mix / gradient text. */
function applyExportSafeStyles(root: HTMLElement): void {
  root.setAttribute('data-matrix-export-root', 'true');
  root.style.fontFamily = 'Inter, system-ui, sans-serif';
  root.style.color = MATRIX_EXPORT.text;
  root.style.background = MATRIX_EXPORT.bg;
  root.style.boxShadow = 'none';
  root.style.opacity = '1';
  root.style.visibility = 'visible';

  const brand = root.querySelector('.wolf-program-matrix-brand') as HTMLElement | null;
  if (brand) {
    brand.style.background = `linear-gradient(180deg, ${MATRIX_EXPORT.surface2} 0%, ${MATRIX_EXPORT.surface} 100%)`;
    brand.style.borderBottom = `1px solid ${MATRIX_EXPORT.border}`;
  }

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-brand__ai').forEach((el) => {
    el.style.background = 'none';
    el.style.webkitBackgroundClip = 'border-box';
    el.style.backgroundClip = 'border-box';
    el.style.color = MATRIX_EXPORT.accent;
    el.style.webkitTextFillColor = MATRIX_EXPORT.accent;
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-brand__wolf').forEach((el) => {
    el.style.color = MATRIX_EXPORT.text;
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-brand__title').forEach((el) => {
    el.style.color = MATRIX_EXPORT.text;
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-corner').forEach((el) => {
    el.style.background = MATRIX_EXPORT.surface2;
    el.style.color = MATRIX_EXPORT.textDim;
    el.style.borderColor = MATRIX_EXPORT.border;
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-day-col').forEach((el) => {
    const tone = toneFromAttr(el) ?? MATRIX_DAY_TONES[0]!;
    el.style.background = tone.headerBg;
    el.style.color = MATRIX_EXPORT.textMuted;
    el.style.borderColor = MATRIX_EXPORT.border;
    el.style.borderBottom = `2px solid ${tone.headerBorder}`;
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-week-row').forEach((el) => {
    const row = el.closest('tr');
    const weekToneRaw = row?.getAttribute('data-week-tone');
    const weekTone =
      weekToneRaw != null ? MATRIX_DAY_TONES[Number.parseInt(weekToneRaw, 10)] ?? MATRIX_DAY_TONES[0]! : MATRIX_DAY_TONES[0]!;
    el.style.background = MATRIX_EXPORT.bg;
    el.style.borderColor = MATRIX_EXPORT.border;
    const btn = el.querySelector('.wolf-program-matrix-week-row-btn') as HTMLElement | null;
    if (btn) {
      btn.style.borderLeft = `3px solid ${weekTone.accent}`;
    }
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-week-title').forEach((el) => {
    el.style.color = MATRIX_EXPORT.textMuted;
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-week-load').forEach((el) => {
    el.style.color = MATRIX_EXPORT.textDim;
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-cell').forEach((el) => {
    const tone = toneFromAttr(el) ?? MATRIX_DAY_TONES[0]!;
    const isEvenRow = tbodyRowParity(el) === 'even';
    const isEmpty = el.classList.contains('is-empty');

    el.style.background = isEmpty ? '#08090d' : isEvenRow ? tone.cellBgEven : tone.cellBg;
    el.style.borderColor = MATRIX_EXPORT.border;
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-exercise').forEach((el) => {
    const cell = el.closest('[data-day-tone]');
    const tone = cell ? toneFromAttr(cell) ?? MATRIX_DAY_TONES[0]! : MATRIX_DAY_TONES[0]!;
    el.style.borderLeft = `2px solid ${tone.chipBorder}`;
    el.style.background = tone.chipBg;
    el.style.borderRadius = '5px';
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-exercise-name').forEach((el) => {
    el.style.color = MATRIX_EXPORT.text;
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-exercise-rx').forEach((el) => {
    const cell = el.closest('[data-day-tone]');
    const tone = cell ? toneFromAttr(cell) ?? MATRIX_DAY_TONES[0]! : MATRIX_DAY_TONES[0]!;
    el.style.color = tone.rx;
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-export-footer').forEach((el) => {
    el.style.background = MATRIX_EXPORT.surface;
    el.style.borderTop = `1px solid ${MATRIX_EXPORT.border}`;
    el.style.color = MATRIX_EXPORT.textDim;
  });

  root.querySelectorAll<HTMLElement>('.wolf-program-matrix-export-footer__site').forEach((el) => {
    el.style.color = MATRIX_EXPORT.accent;
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
  root.style.background = MATRIX_EXPORT.bg;
  root.style.border = '1px solid rgba(249, 115, 22, 0.28)';
  root.style.borderRadius = '12px';
  root.style.boxShadow = 'none';

  root.querySelector('.wolf-program-matrix-toolbar')?.remove();
  root.querySelector('.wolf-program-matrix-hint')?.remove();
  root.querySelectorAll('.wolf-program-matrix-cell-float').forEach((el) => el.remove());

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
    const rows = Array.from(
      root.querySelectorAll('.wolf-program-matrix-table tbody tr, .wolf-program-matrix-week-line'),
    );
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

  const brand = root.querySelector('.wolf-program-matrix-brand') as HTMLElement | null;
  if (brand) {
    brand.style.display = 'flex';
    brand.style.padding = '12px 16px';
  }

  const footer = root.querySelector('.wolf-program-matrix-export-footer') as HTMLElement | null;
  if (footer) {
    footer.style.display = 'flex';
    footer.style.padding = '8px 16px';
  }

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

  if (weekRowIndex != null && baseTitle && weekTitle && brand) {
    const titleEl = brand.querySelector('.wolf-program-matrix-brand__title');
    if (titleEl) titleEl.textContent = `${baseTitle} — ${weekTitle}`;
  } else if (!brand && baseTitle) {
    const displayTitle =
      weekRowIndex != null && weekTitle ? `${baseTitle} — ${weekTitle}` : baseTitle;
    const titleBar = document.createElement('div');
    titleBar.textContent = displayTitle;
    titleBar.style.cssText = `padding:12px 16px;font-size:15px;font-weight:700;line-height:1.3;color:${MATRIX_EXPORT.text};background:linear-gradient(180deg, ${MATRIX_EXPORT.surface2} 0%, ${MATRIX_EXPORT.surface} 100%);border-bottom:1px solid ${MATRIX_EXPORT.border};font-family:Inter,system-ui,sans-serif;`;
    root.insertBefore(titleBar, root.firstChild);
  }

  applyExportSafeStyles(root);

  return root;
}

function countWeekRows(source: HTMLElement): number {
  const legacyRows = source.querySelectorAll('.wolf-program-matrix-table tbody tr').length;
  if (legacyRows > 0) return legacyRows;
  return source.querySelectorAll('.wolf-program-matrix-week-line').length;
}

function pickCaptureScale(width: number, height: number): number {
  let scale = Math.min(2, Math.max(1.25, window.devicePixelRatio || 1.25));
  while ((width * scale > MAX_CANVAS_SIDE || height * scale > MAX_CANVAS_SIDE) && scale > 1) {
    scale -= 0.25;
  }
  return Math.max(1, scale);
}

async function capturePreparedRoot(exportRoot: HTMLElement): Promise<HTMLCanvasElement> {
  const mount = document.createElement('div');
  mount.setAttribute('data-matrix-export-mount', 'true');
  mount.style.cssText =
    'position:fixed;left:0;top:0;z-index:-1;pointer-events:none;overflow:visible;opacity:1;visibility:visible;';
  mount.appendChild(exportRoot);
  document.body.appendChild(mount);

  try {
    await document.fonts?.ready;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    const width = Math.max(1, Math.ceil(exportRoot.scrollWidth || exportRoot.offsetWidth));
    const height = Math.max(1, Math.ceil(exportRoot.scrollHeight || exportRoot.offsetHeight));
    const scale = pickCaptureScale(width, height);

    exportRoot.style.opacity = '1';
    exportRoot.style.visibility = 'visible';

    return await html2canvas(exportRoot, {
      backgroundColor: MATRIX_EXPORT.bg,
      scale,
      logging: false,
      useCORS: true,
      allowTaint: true,
      width,
      height,
      windowWidth: width + 64,
      windowHeight: height + 64,
      scrollX: 0,
      scrollY: 0,
      onclone: (doc) => {
        const cloned =
          (doc.querySelector('[data-matrix-export-mount] [data-matrix-export-root]') as HTMLElement | null) ??
          (doc.body.querySelector('[data-matrix-export-root]') as HTMLElement | null);
        if (cloned) applyExportSafeStyles(cloned);
      },
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
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
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
