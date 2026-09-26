import { ChevronLeft, ChevronRight } from 'lucide-react';
import { EXERCISES_PAGE_SIZE_OPTIONS, type ExercisesPageSize } from './exerciseListUtils';

export function ExerciseListPager({
  isEs,
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  isEs: boolean;
  page: number;
  pageSize: ExercisesPageSize;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: ExercisesPageSize) => void;
}) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * pageSize + 1;
  const end = Math.min((safePage + 1) * pageSize, total);
  const canPrev = safePage > 0;
  const canNext = safePage < totalPages - 1;

  const sizeLabel = isEs ? 'Filas por página' : 'Rows per page';
  const prevLabel = isEs ? 'Página anterior' : 'Previous page';
  const nextLabel = isEs ? 'Página siguiente' : 'Next page';

  return (
    <nav
      className="wl-exercises-pager wl-exercises-pager--classic"
      aria-label={isEs ? 'Paginación de ejercicios' : 'Exercise pagination'}
    >
      <div className="wl-exercises-pager__bar">
        <div className="wl-exercises-pager__cluster wl-exercises-pager__cluster--size">
          <span className="wl-exercises-pager__cluster-label">{sizeLabel}</span>
          <div className="wl-exercises-pager__segments" role="group" aria-label={sizeLabel}>
            {EXERCISES_PAGE_SIZE_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`wl-exercises-pager__segment${pageSize === option ? ' is-active' : ''}`}
                aria-pressed={pageSize === option}
                onClick={() => onPageSizeChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <p className="wl-exercises-pager__range" aria-live="polite">
          <span className="wl-exercises-pager__range-strong">
            {start}–{end}
          </span>
          <span className="wl-exercises-pager__range-sep" aria-hidden>
            /
          </span>
          <span className="wl-exercises-pager__range-total">{total}</span>
          <span className="wl-exercises-pager__range-unit">
            {isEs ? 'ejercicios' : 'exercises'}
          </span>
        </p>

        <div className="wl-exercises-pager__cluster wl-exercises-pager__cluster--nav">
          <div className="wl-exercises-pager__nav">
            <button
              type="button"
              className="wl-exercises-pager__nav-btn"
              disabled={!canPrev}
              aria-label={prevLabel}
              onClick={() => onPageChange(safePage - 1)}
            >
              <ChevronLeft size={18} strokeWidth={2.5} aria-hidden />
            </button>
            <span className="wl-exercises-pager__page-indicator">
              <span className="wl-exercises-pager__page-current">{safePage + 1}</span>
              <span className="wl-exercises-pager__page-sep" aria-hidden>
                /
              </span>
              <span className="wl-exercises-pager__page-total">{totalPages}</span>
            </span>
            <button
              type="button"
              className="wl-exercises-pager__nav-btn"
              disabled={!canNext}
              aria-label={nextLabel}
              onClick={() => onPageChange(safePage + 1)}
            >
              <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
