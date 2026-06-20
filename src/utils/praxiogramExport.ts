import { jsPDF } from 'jspdf';
import { PRAXIOGRAM_COLUMNS } from '../components/praxiogram/praxiogram-columns';
import {
  capturePreparedRoot,
  exportCanvasesToPdf,
  slugExportFilename,
  type MatrixExportOptions,
} from './matrixExport';

export interface PraxiogramExportOptions extends MatrixExportOptions {
  sportContext?: string;
  isEs?: boolean;
  situationCount?: number;
  completeCount?: number;
}

const PRX_EXPORT = {
  bg: '#0a0c10',
  surface: '#12151c',
  surface2: '#171b24',
  border: '#2a3140',
  accent: '#a78bfa',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textDim: '#64748b',
} as const;

const MIN_SINGLE_PAGE_SHRINK = 0.42;

const COL_HEAD_ICON_TONES: Record<string, { bg: string; color: string }> = {
  'prx-col-head--violet': { bg: 'rgba(167, 139, 250, 0.14)', color: '#c4b5fd' },
  'prx-col-head--sky': { bg: 'rgba(56, 189, 248, 0.12)', color: '#7dd3fc' },
  'prx-col-head--emerald': { bg: 'rgba(52, 211, 153, 0.12)', color: '#6ee7b7' },
  'prx-col-head--amber': { bg: 'rgba(251, 191, 36, 0.12)', color: '#fcd34d' },
  'prx-col-head--rose': { bg: 'rgba(251, 113, 133, 0.12)', color: '#fda4af' },
  'prx-col-head--cyan': { bg: 'rgba(34, 211, 238, 0.12)', color: '#67e8f9' },
  'prx-col-head--fuchsia': { bg: 'rgba(232, 121, 249, 0.12)', color: '#e879f9' },
  'prx-col-head--orange': { bg: 'rgba(249, 115, 22, 0.14)', color: '#fdba74' },
};

function syncFormValues(source: HTMLElement, clone: HTMLElement): void {
  const liveTextareas = source.querySelectorAll<HTMLTextAreaElement>('textarea');
  const cloneTextareas = clone.querySelectorAll<HTMLTextAreaElement>('textarea');
  liveTextareas.forEach((live, index) => {
    const target = cloneTextareas[index];
    if (target) target.value = live.value;
  });

  const liveSelects = source.querySelectorAll<HTMLSelectElement>('select');
  const cloneSelects = clone.querySelectorAll<HTMLSelectElement>('select');
  liveSelects.forEach((live, index) => {
    const target = cloneSelects[index];
    if (target) target.value = live.value;
  });
}

function replaceInputsWithStatic(root: HTMLElement): void {
  root.querySelectorAll<HTMLTextAreaElement>('textarea.prx-cell-textarea').forEach((textarea) => {
    const cell = document.createElement('div');
    cell.className = 'prx-export-cell-text';
    cell.textContent = textarea.value.trim() || '—';
    textarea.replaceWith(cell);
  });

  root.querySelectorAll<HTMLSelectElement>('select.prx-cell-select').forEach((select) => {
    const cell = document.createElement('div');
    cell.className = 'prx-export-cell-text prx-export-cell-text--select';
    const label = select.options[select.selectedIndex]?.text?.trim();
    cell.textContent =
      label && label !== 'Selecciona…' && label !== 'Select…' ? label : select.value.trim() || '—';
    select.replaceWith(cell);
  });
}

function removeInteractiveChrome(root: HTMLElement): void {
  root.querySelectorAll('button').forEach((btn) => btn.remove());
  root.querySelectorAll('.prx-col-head__help').forEach((el) => el.remove());
  root.querySelectorAll('.prx-col-actions').forEach((el) => el.remove());
  root.querySelectorAll('.prx-order-grip').forEach((el) => el.remove());
  root.querySelector('.prx-matrix-meta')?.remove();
  root.querySelector('.prx-matrix-add')?.remove();
  root.querySelector('.prx-toolbar')?.remove();
}

function applyExportGrid(root: HTMLElement): void {
  const gridCols = ['44px', ...PRAXIOGRAM_COLUMNS.map((col) => `${col.minWidth}px`)].join(' ');
  root.querySelectorAll<HTMLElement>('.prx-matrix-head, .prx-matrix-row').forEach((row) => {
    row.style.display = 'grid';
    row.style.gridTemplateColumns = gridCols;
    row.style.position = 'static';
    row.style.top = 'auto';
    row.style.zIndex = 'auto';
  });

  root.querySelectorAll<HTMLElement>('.prx-matrix-scroll, .prx-matrix-grid, .prx-matrix-rows').forEach((el) => {
    el.style.maxHeight = 'none';
    el.style.height = 'auto';
    el.style.overflow = 'visible';
  });
}

function sanitizeHtml2canvasTree(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.style.setProperty('backdrop-filter', 'none');
    el.style.setProperty('-webkit-backdrop-filter', 'none');
    el.style.setProperty('filter', 'none');
    el.style.setProperty('transform', 'none');
    el.style.setProperty('box-shadow', 'none');
    el.style.setProperty('transition', 'none');
    el.style.setProperty('animation', 'none');
  });
  root.querySelectorAll('svg').forEach((svg) => svg.remove());
}

function applyExportSafeStyles(root: HTMLElement): void {
  root.setAttribute('data-prx-export-root', 'true');
  root.style.fontFamily = 'Inter, system-ui, sans-serif';
  root.style.color = PRX_EXPORT.text;
  root.style.background = PRX_EXPORT.bg;
  root.style.border = '1px solid rgba(167, 139, 250, 0.28)';
  root.style.borderRadius = '12px';
  root.style.boxShadow = 'none';
  root.style.opacity = '1';
  root.style.visibility = 'visible';
  root.style.overflow = 'visible';

  sanitizeHtml2canvasTree(root);

  root.querySelectorAll<HTMLElement>('.prx-export-brand').forEach((brand) => {
    brand.style.display = 'block';
    brand.style.padding = '14px 16px 12px';
    brand.style.background = `linear-gradient(180deg, ${PRX_EXPORT.surface2} 0%, ${PRX_EXPORT.surface} 100%)`;
    brand.style.borderBottom = `1px solid ${PRX_EXPORT.border}`;
  });

  root.querySelectorAll<HTMLElement>('.prx-export-brand__row').forEach((row) => {
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '10px';
  });

  root.querySelectorAll<HTMLElement>('.prx-export-brand__mark').forEach((el) => {
    el.style.color = PRX_EXPORT.accent;
    el.style.fontWeight = '800';
    el.style.fontSize = '13px';
  });

  root.querySelectorAll<HTMLElement>('.prx-export-brand__title').forEach((el) => {
    el.style.margin = '0';
    el.style.color = PRX_EXPORT.text;
    el.style.fontSize = '16px';
    el.style.fontWeight = '800';
  });

  root.querySelectorAll<HTMLElement>('.prx-export-brand__context, .prx-export-brand__meta').forEach((el) => {
    el.style.margin = '6px 0 0';
    el.style.color = PRX_EXPORT.textMuted;
    el.style.fontSize = '11px';
    el.style.lineHeight = '1.4';
  });

  root.querySelectorAll<HTMLElement>('.prx-export-footer').forEach((footer) => {
    footer.style.display = 'flex';
    footer.style.alignItems = 'center';
    footer.style.justifyContent = 'space-between';
    footer.style.gap = '12px';
    footer.style.padding = '8px 16px';
    footer.style.background = PRX_EXPORT.surface;
    footer.style.borderTop = `1px solid ${PRX_EXPORT.border}`;
    footer.style.color = PRX_EXPORT.textDim;
    footer.style.fontSize = '10px';
  });

  root.querySelectorAll<HTMLElement>('.prx-export-footer__site').forEach((el) => {
    el.style.color = PRX_EXPORT.accent;
    el.style.fontWeight = '800';
  });

  root.querySelectorAll<HTMLElement>('.prx-export-surface, .prx-matrix, .prx-cards').forEach((el) => {
    el.style.background = PRX_EXPORT.bg;
    el.style.border = 'none';
    el.style.boxShadow = 'none';
  });

  root.querySelectorAll<HTMLElement>('.prx-matrix-head').forEach((head) => {
    head.style.background = PRX_EXPORT.surface2;
    head.style.borderBottom = `1px solid ${PRX_EXPORT.border}`;
  });

  root.querySelectorAll<HTMLElement>('.prx-matrix-row').forEach((row, index) => {
    row.style.background = index % 2 === 0 ? PRX_EXPORT.bg : PRX_EXPORT.surface;
    row.style.borderBottom = `1px solid ${PRX_EXPORT.border}`;
  });

  root.querySelectorAll<HTMLElement>('.prx-col-order').forEach((cell) => {
    cell.style.borderColor = PRX_EXPORT.border;
  });

  root.querySelectorAll<HTMLElement>('.prx-col-head').forEach((head) => {
    head.style.background = PRX_EXPORT.surface2;
    head.style.borderLeft = `1px solid ${PRX_EXPORT.border}`;
  });

  root.querySelectorAll<HTMLElement>('.prx-col-head').forEach((head) => {
    for (const [className, tone] of Object.entries(COL_HEAD_ICON_TONES)) {
      if (!head.classList.contains(className)) continue;
      head.querySelectorAll<HTMLElement>('.prx-col-head__icon').forEach((icon) => {
        icon.style.background = tone.bg;
        icon.style.color = tone.color;
      });
    }
  });

  root.querySelectorAll<HTMLElement>('.prx-col-head__label').forEach((label) => {
    label.style.color = PRX_EXPORT.textMuted;
  });

  root.querySelectorAll<HTMLElement>('.prx-col-cell').forEach((cell) => {
    cell.style.borderLeft = `1px solid ${PRX_EXPORT.border}`;
    cell.style.background = 'transparent';
  });

  root.querySelectorAll<HTMLElement>('.prx-export-cell-text').forEach((cell) => {
    cell.style.minHeight = '52px';
    cell.style.padding = '7px 8px';
    cell.style.borderRadius = '8px';
    cell.style.border = `1px solid ${PRX_EXPORT.border}`;
    cell.style.background = PRX_EXPORT.surface;
    cell.style.color = PRX_EXPORT.text;
    cell.style.fontSize = '11px';
    cell.style.lineHeight = '1.35';
    cell.style.whiteSpace = 'pre-wrap';
    cell.style.wordBreak = 'break-word';
    cell.style.overflow = 'visible';
    cell.style.boxSizing = 'border-box';
  });

  root.querySelectorAll<HTMLElement>('.prx-order-num').forEach((num) => {
    num.style.color = PRX_EXPORT.accent;
    num.style.border = `1px solid ${PRX_EXPORT.border}`;
    num.style.background = PRX_EXPORT.surface;
  });

  root.querySelectorAll<HTMLElement>('.prx-card').forEach((card, index) => {
    card.style.background = index % 2 === 0 ? PRX_EXPORT.surface : PRX_EXPORT.surface2;
    card.style.border = `1px solid ${PRX_EXPORT.border}`;
    card.style.borderRadius = '12px';
    card.style.padding = '12px';
    card.style.marginBottom = '10px';
  });

  root.querySelectorAll<HTMLElement>('.prx-field-label').forEach((label) => {
    label.style.color = PRX_EXPORT.textMuted;
    label.style.fontSize = '10px';
  });
}

function buildExportHeader(options: PraxiogramExportOptions): HTMLElement {
  const isEs = options.isEs ?? true;
  const title = options.title?.trim() || (isEs ? 'Praxiograma' : 'Praxiogram');
  const header = document.createElement('header');
  header.className = 'prx-export-brand';
  header.innerHTML = `
    <div class="prx-export-brand__row">
      <span class="prx-export-brand__mark">Wolf AI</span>
      <h2 class="prx-export-brand__title"></h2>
    </div>
    <p class="prx-export-brand__context"></p>
    <p class="prx-export-brand__meta"></p>
  `;
  header.querySelector('.prx-export-brand__title')!.textContent = title;
  header.querySelector('.prx-export-brand__context')!.textContent =
    options.sportContext?.trim() || title;
  const total = options.situationCount ?? 0;
  const complete = options.completeCount ?? 0;
  header.querySelector('.prx-export-brand__meta')!.textContent =
    total > 0
      ? isEs
        ? `${total} situaciones · ${complete} completas`
        : `${total} situations · ${complete} complete`
      : isEs
        ? 'Praxiograma táctico'
        : 'Tactical praxiogram';
  return header;
}

function buildExportFooter(isEs: boolean): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'prx-export-footer';
  footer.innerHTML = `
    <span class="prx-export-footer__site">wolf.ai</span>
    <span>${isEs ? 'Análisis táctico y diseño de entrenamiento' : 'Tactical analysis and training design'}</span>
  `;
  return footer;
}

function preparePraxiogramExportRoot(
  source: HTMLElement,
  options: PraxiogramExportOptions,
): HTMLElement {
  const root = source.cloneNode(true) as HTMLElement;
  const isEs = options.isEs ?? true;

  syncFormValues(source, root);

  root.style.maxHeight = 'none';
  root.style.height = 'auto';
  root.style.overflow = 'visible';
  root.style.width = 'max-content';
  root.style.minWidth = '100%';
  root.style.flex = 'none';

  const scroll = root.querySelector('.prx-matrix-scroll') as HTMLElement | null;
  if (scroll) {
    scroll.style.maxHeight = 'none';
    scroll.style.height = 'auto';
    scroll.style.overflow = 'visible';
  }

  const cards = root.querySelector('.prx-cards') as HTMLElement | null;
  if (cards) {
    cards.style.display = 'grid';
    cards.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
    cards.style.gap = '12px';
    cards.style.width = 'max-content';
    cards.style.maxWidth = 'none';
  }

  removeInteractiveChrome(root);
  replaceInputsWithStatic(root);
  applyExportGrid(root);

  const wrapper = document.createElement('div');
  wrapper.className = 'prx-export-root';
  wrapper.appendChild(buildExportHeader(options));
  wrapper.appendChild(root);
  wrapper.appendChild(buildExportFooter(isEs));
  applyExportSafeStyles(wrapper);

  return wrapper;
}

function fitDimensions(
  canvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
  margin: number,
): { shrinkRatio: number } {
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;
  const imgHeightAtFullWidth = (canvas.height * contentWidth) / canvas.width;
  let drawHeight = imgHeightAtFullWidth;
  if (drawHeight > contentHeight) {
    drawHeight = contentHeight;
  }
  return { shrinkRatio: drawHeight / imgHeightAtFullWidth };
}

async function capturePraxiogramCanvas(
  source: HTMLElement,
  options: PraxiogramExportOptions,
): Promise<HTMLCanvasElement> {
  const exportRoot = preparePraxiogramExportRoot(source, options);
  return capturePreparedRoot(exportRoot, {
    backgroundColor: PRX_EXPORT.bg,
    cloneRootSelector: '[data-prx-export-root]',
    onClone: applyExportSafeStyles,
  });
}

async function capturePraxiogramForPdf(
  source: HTMLElement,
  options: PraxiogramExportOptions,
): Promise<HTMLCanvasElement[]> {
  const fullCanvas = await capturePraxiogramCanvas(source, options);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const { shrinkRatio } = fitDimensions(fullCanvas, pageWidth, pageHeight, 6);

  if (shrinkRatio >= MIN_SINGLE_PAGE_SHRINK) {
    return [fullCanvas];
  }

  const rowNodes = source.querySelectorAll('.prx-matrix-row, .prx-card');
  if (rowNodes.length <= 1) {
    return [fullCanvas];
  }

  const rowCanvases: HTMLCanvasElement[] = [];
  for (let index = 0; index < rowNodes.length; index += 1) {
    const exportRoot = preparePraxiogramExportRoot(source, options);
    const matrix = exportRoot.querySelector('.prx-matrix');
    const cards = exportRoot.querySelector('.prx-cards');

    if (matrix) {
      exportRoot.querySelectorAll('.prx-matrix-row').forEach((row, rowIndex) => {
        if (rowIndex !== index) row.remove();
      });
    } else if (cards) {
      exportRoot.querySelectorAll('.prx-card').forEach((card, cardIndex) => {
        if (cardIndex !== index) card.remove();
      });
    }

    applyExportSafeStyles(exportRoot);
    rowCanvases.push(
      await capturePreparedRoot(exportRoot, {
        backgroundColor: PRX_EXPORT.bg,
        cloneRootSelector: '[data-prx-export-root]',
        onClone: applyExportSafeStyles,
      }),
    );
  }

  return rowCanvases.length > 0 ? rowCanvases : [fullCanvas];
}

export function praxiogramExportFilename(title: string, ext: 'png' | 'pdf'): string {
  return slugExportFilename(title, ext);
}

export async function exportPraxiogramAsPng(
  source: HTMLElement,
  filename: string,
  options: PraxiogramExportOptions = {},
): Promise<void> {
  const canvas = await capturePraxiogramCanvas(source, options);
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}

export async function exportPraxiogramAsPdf(
  source: HTMLElement,
  filename: string,
  options: PraxiogramExportOptions = {},
): Promise<void> {
  const canvases = await capturePraxiogramForPdf(source, options);
  exportCanvasesToPdf(canvases, filename, options.title);
}
