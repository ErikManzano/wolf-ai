import React from 'react';
import type { ExerciseLifecycleStatus, MergedDefinitionView } from '../../models/exercise';
import LifecycleBadge from './LifecycleBadge';

interface DefinitionListPanelProps {
  definitions: MergedDefinitionView[];
  selectedId: string | null;
  search: string;
  statusFilter: ExerciseLifecycleStatus | 'all' | 'complex';
  isEs: boolean;
  onSearch: (q: string) => void;
  onStatusFilter: (s: ExerciseLifecycleStatus | 'all' | 'complex') => void;
  onSelect: (def: MergedDefinitionView) => void;
}

const STATUS_FILTERS: (ExerciseLifecycleStatus | 'all' | 'complex')[] = [
  'all',
  'official',
  'coach_modified',
  'experimental',
  'complex',
];

const DefinitionListPanel: React.FC<DefinitionListPanelProps> = ({
  definitions,
  selectedId,
  search,
  statusFilter,
  isEs,
  onSearch,
  onStatusFilter,
  onSelect,
}) => {
  const filtered = definitions.filter((d) => {
    if (statusFilter === 'complex') return d.kind === 'complex';
    if (statusFilter !== 'all' && d.lifecycleStatus !== statusFilter) return false;
    return true;
  });

  return (
    <section className="wolf-ei-pane">
      <div className="wolf-ei-pane__head">{isEs ? 'Registro' : 'Registry'}</div>
      <div className="wolf-ei-pane__body">
        <input
          type="search"
          className="wolf-ei-search"
          placeholder={isEs ? 'Buscar ejercicios…' : 'Search exercises…'}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <div className="wolf-ei-filter-row">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              className={`wolf-ei-filter${statusFilter === s ? ' active' : ''}`}
              onClick={() => onStatusFilter(s)}
            >
              {s === 'all' ? (isEs ? 'Todos' : 'All') : s === 'complex' ? 'C+' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
        {filtered.map((def) => (
          <button
            key={def.id}
            type="button"
            className={`wolf-ei-row${selectedId === def.id ? ' active' : ''}`}
            onClick={() => onSelect(def)}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="wolf-ei-row__title">{def.effectiveDisplayName}</div>
              <div className="wolf-ei-row__meta">
                {def.family ?? '—'} · {def.objective}
                {def.legacyExerciseId ? ` · ${def.legacyExerciseId}` : ''}
              </div>
            </div>
            <LifecycleBadge status={def.lifecycleStatus} kind={def.kind === 'complex' ? 'complex' : undefined} isEs={isEs} />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="muted" style={{ padding: '1rem', fontSize: '0.85rem' }}>
            {isEs ? 'Sin resultados.' : 'No results.'}
          </p>
        )}
      </div>
    </section>
  );
};

export default DefinitionListPanel;
