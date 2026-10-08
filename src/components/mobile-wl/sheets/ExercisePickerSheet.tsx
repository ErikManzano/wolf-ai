import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import {
  catalogGroupLabel,
  fuzzySearchPickerOptions,
  pickerOptionsFromIds,
  type SessionPickerOption,
} from '../../../services/exercise';
import {
  pickerCatalogGroup,
  pickerCatalogGroupLabel,
} from '../../session-editor/exerciseAutocompleteUtils';
import { BottomSheet } from './BottomSheet';
import '../mobile-wl.css';

const PICKER_SECTION_ORDER = [
  'snatch',
  'clean',
  'jerk',
  'pull',
  'squat',
  'press',
  'foam',
  'warmup',
  'strength',
  'bodyweight',
  'accessory',
] as const;

const SECTION_CHIPS: { id: 'all' | 'weightlifting' | 'foam' | 'warmup' | 'strength' | 'bodyweight'; es: string; en: string }[] = [
  { id: 'all', es: 'Todos', en: 'All' },
  { id: 'weightlifting', es: 'Halterofilia', en: 'Weightlifting' },
  { id: 'foam', es: 'Foam', en: 'Foam' },
  { id: 'warmup', es: 'Calentamiento', en: 'Warm-up' },
  { id: 'strength', es: 'Fuerza', en: 'Strength' },
  { id: 'bodyweight', es: 'Peso corporal', en: 'Bodyweight' },
];

const WL_GROUPS = new Set(['snatch', 'clean', 'jerk', 'pull', 'squat', 'press']);

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
  const [section, setSection] = useState<(typeof SECTION_CHIPS)[number]['id']>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    setQuery('');
    setSection('all');
  }, [open]);

  const sectionOptions = useMemo(() => {
    if (section === 'all') return options;
    return options.filter((opt) => {
      const group = pickerCatalogGroup(opt);
      if (section === 'weightlifting') return WL_GROUPS.has(group);
      return group === section;
    });
  }, [options, section]);

  const recentOptions = useMemo(
    () => pickerOptionsFromIds(sectionOptions, recentIds.filter((id) => id !== value), 8),
    [sectionOptions, recentIds, value],
  );

  const filtered = useMemo(
    () =>
      fuzzySearchPickerOptions(sectionOptions, query, 48, {
        catalogGroup: catalogGroupFilter,
        exerciseIdsInGroup: pickerIdsInGroup,
        preferIds: recentIds,
      }),
    [sectionOptions, query, catalogGroupFilter, pickerIdsInGroup, recentIds],
  );

  const grouped = useMemo(() => {
    const buckets = new Map<string, SessionPickerOption[]>();
    for (const opt of filtered) {
      const id = pickerCatalogGroup(opt);
      const list = buckets.get(id) ?? [];
      list.push(opt);
      buckets.set(id, list);
    }
    const known = PICKER_SECTION_ORDER.filter((id) => buckets.has(id));
    const extra = [...buckets.keys()].filter(
      (id) => !PICKER_SECTION_ORDER.includes(id as (typeof PICKER_SECTION_ORDER)[number]),
    );
    return [...known, ...extra].map((id) => ({ id, items: buckets.get(id) ?? [] }));
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

        <div className="mwl-picker-sections" role="group" aria-label={isEs ? 'Sección' : 'Section'}>
          {SECTION_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`mwl-picker-sections__btn${section === chip.id ? ' is-active' : ''}`}
              aria-pressed={section === chip.id}
              onClick={() => setSection(chip.id)}
            >
              {isEs ? chip.es : chip.en}
            </button>
          ))}
        </div>

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
                {grouped.map((group) => {
                  return (
                    <section key={group.id} className="mwl-picker-group">
                      <h4 className="mwl-picker-group-label">
                        <span>{pickerCatalogGroupLabel(group.id, isEs)}</span>
                      </h4>
                      {group.items.map((o) => (
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
