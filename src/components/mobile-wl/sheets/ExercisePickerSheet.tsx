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

const GROUP_LABELS: Record<ExerciseCategory, { es: string; en: string; short: string }> = {
  snatch: { es: 'Arrancada', en: 'Snatch', short: 'SN' },
  clean_jerk: { es: 'Cargada y envión', en: 'Clean & jerk', short: 'CJ' },
  squat: { es: 'Sentadilla', en: 'Squat', short: 'SQ' },
  accessory: { es: 'Accesorios', en: 'Accessory', short: 'AC' },
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
    if (open) return;
    setQuery('');
  }, [open]);

  const recentOptions = useMemo(
    () => pickerOptionsFromIds(options, recentIds.filter((id) => id !== value), 8),
    [options, recentIds, value],
  );

  const filtered = useMemo(
    () =>
      fuzzySearchPickerOptions(options, query, 48, {
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
  };

  const sheetTitle = title ?? (isEs ? 'Elegir ejercicio' : 'Pick exercise');
  const showRecents = !query.trim() && recentOptions.length > 0;
  const resultsLabel = query.trim()
    ? isEs
      ? `${filtered.length} resultado${filtered.length === 1 ? '' : 's'}`
      : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`
    : isEs
      ? 'Catálogo'
      : 'Catalog';

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={sheetTitle}
      snap={0.88}
      panelClassName="mwl-sheet-panel--picker"
      bodyClassName="mwl-sheet-body--picker"
    >
      <div className="mwl-picker-chrome">
        <label className="mwl-picker-search">
          <Search size={18} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault();
            }}
            placeholder={isEs ? 'Buscar por nombre…' : 'Search by name…'}
            aria-label={isEs ? 'Buscar ejercicio' : 'Search exercise'}
          />
        </label>

        <div className="mwl-picker-scroll" role="listbox" aria-label={sheetTitle}>
          {showRecents ? (
            <section className="mwl-picker-section">
              <h3 className="mwl-picker-section-title">{isEs ? 'Recientes' : 'Recent'}</h3>
              <div className="mwl-picker-list mwl-picker-list--recents">
                {recentOptions.map((o) => (
                  <button
                    key={`recent-${o.id}`}
                    type="button"
                    role="option"
                    aria-selected={value === o.id}
                    className={`mwl-picker-item${value === o.id ? ' is-selected' : ''}`}
                    onClick={() => pick(o.id)}
                  >
                    <span className="mwl-picker-item-main">
                      <span className="mwl-picker-item-name">{o.name}</span>
                      <span className="mwl-picker-item-cat">
                        {catalogGroupLabel(o.tags, o.catalogGroup) ?? o.category}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mwl-picker-section">
            <h3 className="mwl-picker-section-title">
              {resultsLabel}
              {catalogGroupFilter
                ? ` · ${catalogGroupLabel(undefined, catalogGroupFilter) ?? catalogGroupFilter}`
                : ''}
            </h3>

            {filtered.length === 0 ? (
              <p className="mwl-picker-empty">
                {isEs
                  ? 'Sin resultados. Prueba otro término de búsqueda.'
                  : 'No results. Try a different search term.'}
              </p>
            ) : (
              <div className="mwl-picker-list">
                {grouped.map((section) => {
                  const groupMeta = GROUP_LABELS[section.cat];
                  return (
                    <section key={section.cat} className="mwl-picker-group">
                      <h4 className="mwl-picker-group-label">
                        <span className="mwl-picker-group-label__short" aria-hidden>
                          {groupMeta.short}
                        </span>
                        <span>{isEs ? groupMeta.es : groupMeta.en}</span>
                      </h4>
                      {section.items.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          role="option"
                          aria-selected={value === o.id}
                          className={`mwl-picker-item${value === o.id ? ' is-selected' : ''}`}
                          onClick={() => pick(o.id)}
                        >
                          <span className="mwl-picker-item-main">
                            <span className="mwl-picker-item-name">{o.name}</span>
                            {(catalogGroupLabel(o.tags, o.catalogGroup) || o.kind === 'complex') && (
                              <span className="mwl-picker-item-cat">
                                {[catalogGroupLabel(o.tags, o.catalogGroup), o.kind === 'complex' ? 'Complex' : null]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </BottomSheet>
  );
};
