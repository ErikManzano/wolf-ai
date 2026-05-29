import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { filterPickerOptions, type SessionPickerOption } from '../../../services/exercise';
import { exerciseName } from '../../session-editor/blockMetrics';
import type { Exercise } from '../../../models/training';
import { BottomSheet } from './BottomSheet';
import '../mobile-wl.css';

interface ExercisePickerSheetProps {
  open: boolean;
  onClose: () => void;
  options: SessionPickerOption[];
  exercises: Exercise[];
  value: string;
  onChange: (exerciseId: string) => void;
  isEs: boolean;
  title?: string;
}

export const ExercisePickerSheet: React.FC<ExercisePickerSheetProps> = ({
  open,
  onClose,
  options,
  exercises,
  value,
  onChange,
  isEs,
  title,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => filterPickerOptions(options, query, 24), [options, query]);

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: SessionPickerOption[] = [];
    for (const o of options) {
      if (seen.has(o.id)) continue;
      seen.add(o.id);
      out.push(o);
      if (out.length >= 6) break;
    }
    return out;
  }, [options]);

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
          placeholder={isEs ? 'Buscar movimiento…' : 'Search movement…'}
          aria-label={isEs ? 'Buscar ejercicio' : 'Search exercise'}
        />
      </div>

      {!query.trim() && recent.length > 0 && (
        <>
          <span className="mwl-field-label">{isEs ? 'Recientes / catálogo' : 'Recent / catalog'}</span>
          <div className="mwl-picker-list" style={{ marginBottom: 16 }}>
            {recent.map((o) => (
              <button
                key={`recent-${o.id}`}
                type="button"
                className={`mwl-picker-item${value === o.id ? ' is-selected' : ''}`}
                onClick={() => pick(o.id)}
              >
                <span className="mwl-picker-item-name">{o.name}</span>
                <span className="mwl-picker-item-cat">{o.category}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <span className="mwl-field-label">{isEs ? 'Resultados' : 'Results'}</span>
      <div className="mwl-picker-list">
        {filtered.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            {isEs ? 'Sin resultados' : 'No results'}
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
                {exerciseName(exercises, o.id) === o.name ? o.category : o.name}
              </span>
            </button>
          ))
        )}
      </div>
    </BottomSheet>
  );
};
