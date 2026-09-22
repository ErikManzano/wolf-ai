import { ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  EXERCISES_PAGE_SIZE,
  EXERCISES_PAGE_SIZE_MOBILE,
} from './exerciseListUtils';

export function ExerciseListPager({
  isEs,
  isMobile = false,
  shown,
  total,
  pageSize,
  dockHidden = false,
  onShowMore,
}: {
  isEs: boolean;
  isMobile?: boolean;
  shown: number;
  total: number;
  pageSize?: number;
  dockHidden?: boolean;
  onShowMore: () => void;
}) {
  const effectivePageSize =
    pageSize ?? (isMobile ? EXERCISES_PAGE_SIZE_MOBILE : EXERCISES_PAGE_SIZE);

  if (total === 0 || total <= effectivePageSize) return null;

  const remaining = total - shown;
  const nextBatch = Math.min(effectivePageSize, remaining);
  const progress = Math.min(100, Math.round((shown / total) * 100));
  const showDock = isMobile && remaining > 0 && !dockHidden;

  const metaShort = isEs ? `${shown} / ${total}` : `${shown} / ${total}`;
  const metaLong = isEs
    ? `Mostrando ${shown} de ${total} ejercicios`
    : `Showing ${shown} of ${total} exercises`;

  const btnLabel = isEs
    ? isMobile
      ? `Ver más (+${nextBatch})`
      : `Ver más ejercicios (${nextBatch})`
    : isMobile
      ? `See more (+${nextBatch})`
      : `See more exercises (${nextBatch})`;

  const progressLabel = isEs
    ? `${progress}% de la biblioteca visible`
    : `${progress}% of library visible`;

  const dock = showDock ? (
    <div
      className="wl-exercises-pager wl-exercises-pager--dock"
      role="region"
      aria-label={isEs ? 'Cargar más ejercicios' : 'Load more exercises'}
    >
      <div
        className="wl-exercises-pager__progress"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={progressLabel}
      >
        <span className="wl-exercises-pager__progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="wl-exercises-pager__dock-row">
        <span className="wl-exercises-pager__meta wl-exercises-pager__meta--dock">{metaShort}</span>
        <button type="button" className="wl-exercises-pager__btn wl-exercises-pager__btn--dock" onClick={onShowMore}>
          <span>{btnLabel}</span>
          <ChevronDown size={16} strokeWidth={2.5} aria-hidden />
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {dock && typeof document !== 'undefined' ? createPortal(dock, document.body) : null}

      {showDock ? <div className="wl-exercises-pager__spacer" aria-hidden /> : null}

      {!showDock ? (
        <div className="wl-exercises-pager">
          <div
            className="wl-exercises-pager__progress wl-exercises-pager__progress--inline"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progressLabel}
          >
            <span className="wl-exercises-pager__progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="wl-exercises-pager__meta">{metaLong}</p>
          {remaining > 0 ? (
            <button type="button" className="wl-exercises-pager__btn" onClick={onShowMore}>
              {btnLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
