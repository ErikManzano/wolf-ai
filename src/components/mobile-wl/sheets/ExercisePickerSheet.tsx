import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import {
  catalogGroupLabel,
  pickerOptionsFromIds,
  searchPickerOptions,
  type SessionPickerOption,
} from '../../../services/exercise';
import { BottomSheet } from './BottomSheet';
import '../mobile-wl.css';

interface ExercisePickerSheetProps {
  open: boolean;
  onClose: () => void;
  options: SessionPickerOption[];
  value: string;
  onChange: (exerciseId: string) => void;
  isEs: boolean;
  title?: string;
  recentIds?: string[];
  catalogGroupFilter?: string | null;
  pickerIdsInGroup?: Set<string>;
}

export const ExercisePickerSheet: React.FC<ExercisePickerSheetProps> = ({
  open,
  onClose,
  options,
  value,
  onChange,
  isEs,
  title,
  recentIds = [],
  catalogGroupFilter = null,
  pickerIdsInGroup,
}) => {
  const [query, setQuery] = useState('');

  const recentOptions = useMemo(
    () => pickerOptionsFromIds(options, recentIds.filter((id) => id !== value), 8),
    [options, recentIds, value],
  );

  const filtered = useMemo(
    () =>
      searchPickerOptions(options, query, 32, {
        catalogGroup: catalogGroupFilter,
        exerciseIdsInGroup: pickerIdsInGroup,
        preferIds: recentIds,
      }),
    [options, query, catalogGroupFilter, pickerIdsInGroup, recentIds],
  );

  const pick = (id: string) => {
    onChange(id);
    setQuery('');
    onClose();
  };

  const sheetTitle = title ?? (isEs ? 'Elegir ejercicio' : 'Pick exercise');

  return (
    <BottomSheet open={open} onClose={onClose} title={sheetTitle} snap={0.9}>
      <div className="mwl-picker-search">
        <Search size={18} aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isEs ? 'Buscar: pull, snatch, G4…' : 'Search: pull, snatch, G4…'}
          aria-label={isEs ? 'Buscar ejercicio' : 'Search exercise'}
        />
      </div>

      {!query.trim() && recentOptions.length > 0 && (
        <>
          <span className="mwl-field-label">{isEs ? 'En esta sesión' : 'In this session'}</span>
          <div className="mwl-picker-list" style={{ marginBottom: 16 }}>
            {recentOptions.map((o) => (
              <button
                key={`recent-${o.id}`}
                type="button"
                className={`mwl-picker-item${value === o.id ? ' is-selected' : ''}`}
                onClick={() => pick(o.id)}
              >
                <span className="mwl-picker-item-name">{o.name}</span>
                <span className="mwl-picker-item-cat">
                  {catalogGroupLabel(o.tags, o.catalogGroup) ?? o.category}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <span className="mwl-field-label">
        {isEs ? 'Resultados' : 'Results'}
        {catalogGroupFilter
          ? ` · ${catalogGroupLabel(undefined, catalogGroupFilter) ?? catalogGroupFilter}`
          : ''}
      </span>
      <div className="mwl-picker-list">
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            {isEs ? 'Sin resultados. Cambia el grupo o el texto de búsqueda.' : 'No results. Change group or search text.'}
          </p>
        ) : (
          filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`mwl-picker-item${value === o.id ? ' is-selected' : ''}`}
              onClick={() => pick(o.id)}
            >
              <span className="mwl-picker-item-name">{o.name}</span>
              <span className="mwl-picker-item-cat">
                {[catalogGroupLabel(o.tags, o.catalogGroup), o.category, o.kind === 'complex' ? 'C+' : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
          ))
        )}
      </div>
    </BottomSheet>
  );
};
