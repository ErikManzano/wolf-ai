import {
  WL_CATALOG_GROUP_LABELS,
  WL_CATALOG_GROUP_ORDER,
  type CatalogGrupoFilter,
  type WlCatalogGroupId,
} from '../../data/wlCatalogGroups';

function shortGrupoName(isEs: boolean, id: WlCatalogGroupId): string {
  const chip = isEs ? WL_CATALOG_GROUP_LABELS[id].chipEs : WL_CATALOG_GROUP_LABELS[id].chipEn;
  const parts = chip.split('·').map((s) => s.trim());
  return parts.length > 1 ? parts.slice(1).join(' · ') : chip.replace(/^G\d+\s*/, '');
}

export function WlExerciseGrupoGrid({
  isEs,
  catalogGrupo,
  counts,
  onChange,
  compact = false,
  sidebar = false,
  preventFocusSteal = false,
}: {
  isEs: boolean;
  catalogGrupo: CatalogGrupoFilter;
  counts: Record<string, number | undefined>;
  onChange: (grupo: CatalogGrupoFilter) => void;
  compact?: boolean;
  sidebar?: boolean;
  preventFocusSteal?: boolean;
}) {
  const allLabel = isEs ? 'Todos los grupos' : 'All groups';
  const allCount = counts.all ?? 0;

  return (
    <div
      className={`wl-grupo-grid${compact ? ' wl-grupo-grid--compact' : ''}${sidebar ? ' wl-grupo-grid--sidebar' : ''}`}
      role="tablist"
      aria-label={isEs ? 'Grupos de halterofilia' : 'Weightlifting groups'}
    >
      <button
        type="button"
        role="tab"
        aria-selected={catalogGrupo === 'all'}
        className={`wl-grupo-grid__all wl-exercises-chip${catalogGrupo === 'all' ? ' is-active' : ''}`}
        onPointerDown={
          preventFocusSteal
            ? (event) => {
                event.preventDefault();
                onChange('all');
              }
            : undefined
        }
        onClick={preventFocusSteal ? undefined : () => onChange('all')}
      >
        <span>{allLabel}</span>
        <span className="wl-exercises-chip__count">{allCount}</span>
      </button>

      <div className="wl-grupo-grid__cells">
        {WL_CATALOG_GROUP_ORDER.map((id) => {
          const count = counts[id] ?? 0;
          const disabled = count === 0;
          const active = catalogGrupo === id;
          const title = isEs ? WL_CATALOG_GROUP_LABELS[id].titleEs : WL_CATALOG_GROUP_LABELS[id].titleEn;
          const num = id.replace('grupo_', 'G');

          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={disabled}
              title={title}
              className={`wl-grupo-grid__cell${active ? ' is-active' : ''}${disabled ? ' is-disabled' : ''}`}
              onPointerDown={
                preventFocusSteal
                  ? (event) => {
                      event.preventDefault();
                      if (!disabled) onChange(id);
                    }
                  : undefined
              }
              onClick={preventFocusSteal ? undefined : () => onChange(id)}
            >
              <span className="wl-grupo-grid__num">{num}</span>
              <span className="wl-grupo-grid__body">
                <span className="wl-grupo-grid__name">{shortGrupoName(isEs, id)}</span>
                <span className="wl-grupo-grid__count">{count}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
