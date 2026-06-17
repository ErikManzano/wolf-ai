import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export type AppBreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

export function AppBreadcrumb({
  items,
  isEs,
  onBack,
  backLabel,
  className,
  trailing,
}: {
  items: AppBreadcrumbItem[];
  isEs: boolean;
  onBack?: () => void;
  backLabel?: string;
  className?: string;
  trailing?: ReactNode;
}) {
  if (items.length === 0 && !onBack) return null;

  const lastIndex = items.length - 1;
  const resolvedBackLabel =
    backLabel ?? (items.length > 1 ? items[0]!.label : isEs ? 'Volver' : 'Back');

  const trailItems =
    onBack && items.length > 0
      ? items.map((item, index) => (index === 0 ? { ...item, onClick: undefined } : item))
      : items;

  return (
    <nav
      className={['app-breadcrumb', className].filter(Boolean).join(' ')}
      aria-label={isEs ? 'Navegación' : 'Breadcrumb'}
    >
      <div className="app-breadcrumb__row">
        {onBack ? (
          <button
            type="button"
            className="app-breadcrumb__back"
            onClick={onBack}
            aria-label={isEs ? `Volver a ${resolvedBackLabel}` : `Back to ${resolvedBackLabel}`}
          >
            <ArrowLeft size={18} aria-hidden />
            <span className="app-breadcrumb__back-label">{resolvedBackLabel}</span>
          </button>
        ) : null}
        {items.length > 0 ? (
          <ol className="app-breadcrumb__list">
            {trailItems.map((item, index) => (
              <li key={`${item.label}-${index}`} className="app-breadcrumb__item">
                {index > 0 ? <ChevronRight size={14} className="app-breadcrumb__sep" aria-hidden /> : null}
                {index < lastIndex && item.onClick ? (
                  <button type="button" className="app-breadcrumb__link" onClick={item.onClick}>
                    {item.label}
                  </button>
                ) : (
                  <span
                    className={index === lastIndex ? 'app-breadcrumb__current' : 'app-breadcrumb__text'}
                    aria-current={index === lastIndex ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : null}
        {trailing ? <div className="app-breadcrumb__trailing">{trailing}</div> : null}
      </div>
    </nav>
  );
}
