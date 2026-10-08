import { Clock, Folder, Star } from 'lucide-react';

export interface CatalogSidebarItem {
  id: string;
  label: string;
  count?: number;
  icon?: 'star' | 'clock' | 'folder';
  swatchColor?: string;
  disabled?: boolean;
  indent?: boolean;
}

export function WlExerciseCatalogSidebarList({
  ariaLabel,
  items,
  activeId,
  onChange,
  nested = false,
  preventFocusSteal = false,
}: {
  ariaLabel: string;
  items: CatalogSidebarItem[];
  activeId: string;
  onChange: (id: string) => void;
  nested?: boolean;
  /** Evita que el input del combobox pierda foco (picker del editor). */
  preventFocusSteal?: boolean;
}) {
  return (
    <ul
      className={`wl-exercise-catalog-sidebar__list${nested ? ' wl-exercise-catalog-sidebar__list--nested' : ''}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <li key={item.id}>
            <button
              type="button"
              role="tab"
              aria-selected={active}
              disabled={item.disabled}
              className={`wl-exercise-catalog-sidebar__row${active ? ' is-active' : ''}${item.indent ? ' is-indent' : ''}${item.disabled ? ' is-disabled' : ''}`}
              onPointerDown={
                preventFocusSteal
                  ? (event) => {
                      event.preventDefault();
                      if (!item.disabled) onChange(item.id);
                    }
                  : undefined
              }
              onClick={preventFocusSteal ? undefined : () => onChange(item.id)}
            >
              {item.icon === 'star' ? <Star size={14} strokeWidth={2.25} aria-hidden /> : null}
              {item.icon === 'clock' ? <Clock size={14} strokeWidth={2.25} aria-hidden /> : null}
              {item.icon === 'folder' ? (
                item.swatchColor ? (
                  <span className="wl-exercise-catalog-sidebar__swatch" style={{ background: item.swatchColor }} aria-hidden />
                ) : (
                  <Folder size={14} strokeWidth={2.25} aria-hidden />
                )
              ) : null}
              <span className="wl-exercise-catalog-sidebar__label">{item.label}</span>
              {item.count != null ? (
                <span className="wl-exercise-catalog-sidebar__count">{item.count}</span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
