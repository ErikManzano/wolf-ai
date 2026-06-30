import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { ExerciseCategory } from '../../../models/training';
import {
  catalogGroupLabel,
  fuzzySearchPickerOptions,
  pickerOptionsFromIds,
  type SessionPickerOption,
} from '../../../services/exercise';
import { BottomSheet } from './BottomSheet';
import '../mobile-wl.css';

const GROUP_ORDER: ExerciseCategory[] = ['snatch', 'clean_jerk', 'squat', 'accessory'];
const CAT: Record<ExerciseCategory, string> = {
  snatch: 'SN',
  clean_jerk: 'CJ',
  squat: 'SQ',
  accessory: 'AC',
};

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
  /** Keep sheet open after pick (multi-add mode). */
  keepOpenOnSelect?: boolean;
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
  keepOpenOnSelect = true,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  const recentOptions = useMemo(
    () => pickerOptionsFromIds(options, recentIds.filter((id) => id !== value), 8),
    [options, recentIds, value],
  );

  const filtered = useMemo(
    () =>
      fuzzySearchPickerOptions(options, query, 32, {
        catalogGroup: catalogGroupFilter,
        exerciseIdsInGroup: pickerIdsInGroup,
        preferIds: recentIds,
      }),
    [options, query, catalogGroupFilter, pickerIdsInGroup, recentIds],
  );

  const grouped = useMemo(() => {
    const buckets = new Map<ExerciseCategory, SessionPickerOption[]>();
    for (const cat of GROUP_ORDER) buckets.set(cat, []);
    for (const opt of filtered) buckets.get(opt.category)?.push(opt);
    return GROUP_ORDER.map((cat) => ({ cat, items: buckets.get(cat) ?? [] })).filter((s) => s.items.length > 0);
  }, [filtered]);

  const pick = (id: string) => {
    onChange(id);
    setQuery('');
    if (!keepOpenOnSelect) onClose();
    else requestAnimationFrame(() => inputRef.current?.focus());
  };

  const sheetTitle = title ?? (isEs ? 'Elegir ejercicio' : 'Pick exercise');

  return (
    <BottomSheet open={open} onClose={onClose} title={sheetTitle} snap={0.9}>
      <div className="mwl-picker-search">
        <Search size={18} aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          placeholder={isEs ? 'Buscar ejercicio' : 'Search exercise'}
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
          grouped.map((section) => (
            <section key={section.cat} className="mwl-picker-group">
              <span className="mwl-picker-group-label">{CAT[section.cat]}</span>
              {section.items.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`mwl-picker-item${value === o.id ? ' is-selected' : ''}`}
                  onClick={() => pick(o.id)}
                >
                  <span className="mwl-picker-item-name">{o.name}</span>
                  <span className="mwl-picker-item-cat">
                    {[catalogGroupLabel(o.tags, o.catalogGroup), o.kind === 'complex' ? 'C+' : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              ))}
            </section>
          ))
        )}
      </div>
    </BottomSheet>
  );
};
