import { ChevronRight } from 'lucide-react';

export type AppBreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

export function AppBreadcrumb({
  items,
  isEs,
}: {
  items: AppBreadcrumbItem[];
  isEs: boolean;
}) {
  if (items.length === 0) return null;

  const lastIndex = items.length - 1;

  return (
    <nav className="app-breadcrumb" aria-label={isEs ? 'Navegación' : 'Breadcrumb'}>
      <ol className="app-breadcrumb__list">
        {items.map((item, index) => (
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
    </nav>
  );
}
