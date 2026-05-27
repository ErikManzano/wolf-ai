import React, { useMemo } from 'react';
import {
  Copy,
  GitFork,
  GitCompare,
  Layers,
  Link2,
  MoreHorizontal,
  Pencil,
  Star,
} from 'lucide-react';
import type { ExerciseLifecycleStatus, MergedDefinitionView } from '../../models/exercise';
import { isSingleComposition } from '../../models/exercise';
import LifecycleBadge from './LifecycleBadge';
import EiTag from './EiTag';
import { FAMILY_TOKEN } from './familyTokens';

interface RegistryCardGridProps {
  definitions: MergedDefinitionView[];
  selectedId: string | null;
  search: string;
  statusFilter: ExerciseLifecycleStatus | 'all' | 'complex';
  isEs: boolean;
  onSearch: (q: string) => void;
  onStatusFilter: (s: ExerciseLifecycleStatus | 'all' | 'complex') => void;
  onSelect: (d: MergedDefinitionView) => void;
  onEdit: (d: MergedDefinitionView) => void;
  onFork: (d: MergedDefinitionView) => void;
  onDuplicate: (d: MergedDefinitionView) => void;
  onComposeComplex: (d: MergedDefinitionView) => void;
}

const RegistryCardGrid: React.FC<RegistryCardGridProps> = ({
  definitions,
  selectedId,
  search,
  statusFilter,
  isEs,
  onSearch,
  onStatusFilter,
  onSelect,
  onEdit,
  onFork,
  onDuplicate,
  onComposeComplex,
}) => {
  const grouped = useMemo(() => {
    const map = new Map<string, MergedDefinitionView[]>();
    for (const d of definitions) {
      const key =
        d.kind === 'complex'
          ? isEs
            ? 'Complejos'
            : 'Complexes'
          : d.family ?? 'other';
      const list = map.get(key) ?? [];
      list.push(d);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [definitions, isEs]);

  const filters: { id: typeof statusFilter; label: string }[] = [
    { id: 'all', label: isEs ? 'Todos' : 'All' },
    { id: 'official', label: isEs ? 'Oficial' : 'Official' },
    { id: 'coach_modified', label: 'Coach+' },
    { id: 'complex', label: isEs ? 'Complejos' : 'Complexes' },
  ];

  return (
    <main className="wolf-ei-pane wolf-ei-registry wolf-ei__layout-col wolf-ei__layout-col--registry">
      <div className="wolf-ei-registry__toolbar">
        <input
          type="search"
          className="wolf-ei-search wolf-ei-search--premium"
          placeholder={isEs ? 'Buscar movimiento… (/)' : 'Search movement… (/)'}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          data-ei-search
        />
        <div className="wolf-ei-filter-row" role="tablist" aria-label={isEs ? 'Filtros' : 'Filters'}>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === f.id}
              className={`wolf-ei-filter${statusFilter === f.id ? ' active' : ''}`}
              onClick={() => onStatusFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="wolf-ei-pane__body wolf-ei-registry__grid-wrap">
        {definitions.length === 0 ? (
          <p className="wolf-ei-empty">{isEs ? 'Sin resultados en el registro.' : 'No registry matches.'}</p>
        ) : (
          grouped.map(([group, items]) => (
            <section key={group} className="wolf-ei-registry__group">
              <h3 className="wolf-ei-registry__group-title">{group}</h3>
              <div className="wolf-ei-card-grid">
                {items.map((d) => {
                  const active = selectedId === d.id;
                  const comp = d.composition;
                  const fam = isSingleComposition(comp) ? comp.family : null;
                  const tok = fam ? FAMILY_TOKEN[fam] : null;
                  return (
                    <article
                      key={d.id}
                      className={`wolf-ei-card${active ? ' active' : ''}`}
                      onClick={() => onSelect(d)}
                      onKeyDown={(e) => e.key === 'Enter' && onSelect(d)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="wolf-ei-card__top">
                        {tok ? (
                          <EiTag tone="category" size="sm" accent={tok.hue}>
                            {tok.abbr}
                          </EiTag>
                        ) : null}
                        <LifecycleBadge status={d.lifecycleStatus} kind={d.kind === 'complex' ? 'complex' : undefined} isEs={isEs} />
                      </div>
                      <h4 className="wolf-ei-card__title">{d.effectiveDisplayName}</h4>
                      <div className="wolf-ei-card__meta">
                        <EiTag tone="objective" size="sm">
                          {d.objective}
                        </EiTag>
                        <span className="wolf-ei-card__meta-sep" aria-hidden>
                          ·
                        </span>
                        <span>{d.loadAnchor}</span>
                      </div>
                      {d.tags.length > 0 ? (
                        <div className="wolf-ei-card__tags">
                          {d.tags.slice(0, 3).map((t) => (
                            <EiTag key={t} tone="meta" size="sm">
                              {t}
                            </EiTag>
                          ))}
                        </div>
                      ) : null}
                      <div className="wolf-ei-card__actions" onClick={(e) => e.stopPropagation()}>
                        <button type="button" title={isEs ? 'Editar' : 'Edit'} onClick={() => onEdit(d)}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" title="Fork" onClick={() => onFork(d)}>
                          <GitFork size={14} />
                        </button>
                        <button type="button" title={isEs ? 'Clonar' : 'Clone'} onClick={() => onDuplicate(d)}>
                          <Copy size={14} />
                        </button>
                        <button type="button" title={isEs ? 'Complejo' : 'Complex'} onClick={() => onComposeComplex(d)}>
                          <Layers size={14} />
                        </button>
                        <button type="button" title={isEs ? 'Relación' : 'Relationship'}>
                          <Link2 size={14} />
                        </button>
                        <button type="button" title={isEs ? 'Favorito' : 'Favorite'}>
                          <Star size={14} />
                        </button>
                        <button type="button" title={isEs ? 'Comparar' : 'Compare'}>
                          <GitCompare size={14} />
                        </button>
                        <button type="button" title="More">
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
};

export default RegistryCardGrid;
