import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import type { ExerciseCategory } from '../../models/training';
import type { ExerciseLifecycleStatus } from '../../models/exercise';
import {
  catalogGroupLabel,
  pickerOptionsFromIds,
  searchPickerOptions,
  type SessionPickerOption,
} from '../../services/exercise';

const CAT: Record<ExerciseCategory, string> = {
  snatch: 'SN',
  clean_jerk: 'CJ',
  squat: 'SQ',
  accessory: 'AC',
};

const CAT_FILTER: { value: ExerciseCategory | null; labelEs: string; labelEn: string }[] = [
  { value: null, labelEs: 'Todo', labelEn: 'All' },
  { value: 'snatch', labelEs: 'SN', labelEn: 'SN' },
  { value: 'clean_jerk', labelEs: 'CJ', labelEn: 'CJ' },
  { value: 'squat', labelEs: 'SQ', labelEn: 'SQ' },
  { value: 'accessory', labelEs: 'AC', labelEn: 'AC' },
];

function lifecycleBadgeClass(status: ExerciseLifecycleStatus): string {
  return `wolf-ei-badge wolf-ei-badge--${status}`;
}

const SHORT_LIFECYCLE: Record<ExerciseLifecycleStatus, [string, string]> = {
  official: ['Of.', 'Off.'],
  coach_modified: ['Coach', 'Coach'],
  experimental: ['Propio', 'Cust.'],
  deprecated: ['Dep.', 'Dep.'],
  ai_suggested: ['IA', 'AI'],
};

function optionMeta(opt: SessionPickerOption): string {
  const parts: string[] = [];
  const g = catalogGroupLabel(opt.tags, opt.catalogGroup);
  if (g) parts.push(g);
  parts.push(CAT[opt.category]);
  if (opt.kind === 'complex') parts.push('Complex');
  return parts.join(' · ');
}

interface ExerciseAutocompleteProps {
  options: SessionPickerOption[];
  value: string;
  onChange: (exerciseId: string) => void;
  isEs: boolean;
  placeholder?: string;
  compact?: boolean;
  /** IDs used elsewhere in this session — surfaced first when opening */
  recentIds?: string[];
  catalogGroupFilter?: string | null;
  pickerIdsInGroup?: Set<string>;
  /** Align dropdown to full exercise card width (coach editor). */
  panelMatchCard?: boolean;
}

interface PanelRect {
  top: number;
  left: number;
  width: number;
}

function measurePanelRect(input: HTMLInputElement, matchCard: boolean): PanelRect {
  const inputRect = input.getBoundingClientRect();
  const card = input.closest('article.wolf-se-block-card');
  const margin = 12;
  if (matchCard && card) {
    const cardRect = card.getBoundingClientRect();
    return {
      top: inputRect.bottom + 6,
      left: cardRect.left + margin,
      width: Math.max(cardRect.width - margin * 2, inputRect.width),
    };
  }
  return {
    top: inputRect.bottom + 6,
    left: inputRect.left,
    width: Math.max(inputRect.width, 320),
  };
}

export const ExerciseAutocomplete: React.FC<ExerciseAutocompleteProps> = ({
  options,
  value,
  onChange,
  isEs,
  placeholder,
  compact,
  recentIds = [],
  catalogGroupFilter = null,
  pickerIdsInGroup,
  panelMatchCard = false,
}) => {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null);

  const selected = options.find((o) => o.id === value);

  const recentOptions = useMemo(
    () => pickerOptionsFromIds(options, recentIds.filter((id) => id !== value), 6),
    [options, recentIds, value],
  );

  const suggestions = useMemo(
    () =>
      searchPickerOptions(options, query, 24, {
        catalogGroup: catalogGroupFilter,
        exerciseIdsInGroup: pickerIdsInGroup,
        category: categoryFilter,
        preferIds: recentIds,
      }),
    [options, query, catalogGroupFilter, pickerIdsInGroup, categoryFilter, recentIds],
  );

  const displayList = useMemo(() => {
    if (!query.trim() && recentOptions.length > 0) {
      const recentIdsSet = new Set(recentOptions.map((o) => o.id));
      const rest = suggestions.filter((o) => !recentIdsSet.has(o.id));
      return [...recentOptions, ...rest].slice(0, 24);
    }
    return suggestions;
  }, [query, recentOptions, suggestions]);

  useEffect(() => {
    if (!open) setQuery(selected?.name ?? '');
  }, [value, selected?.name, open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, categoryFilter, catalogGroupFilter]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const updatePanelRect = useCallback(() => {
    if (!inputRef.current) return;
    setPanelRect(measurePanelRect(inputRef.current, panelMatchCard));
  }, [panelMatchCard]);

  useEffect(() => {
    if (!open) return;
    updatePanelRect();
    const onLayout = () => updatePanelRect();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
    };
  }, [open, updatePanelRect]);

  const pick = useCallback(
    (id: string) => {
      onChange(id);
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    },
    [onChange],
  );

  const moveActive = (delta: number) => {
    if (displayList.length === 0) return;
    setActiveIndex((i) => (i + delta + displayList.length) % displayList.length);
  };

  const panelContent = open ? (
    <div
      ref={panelRef}
      className={`wolf-se-autocomplete-panel${panelMatchCard ? ' wolf-se-autocomplete-panel--fixed' : ''}`}
      style={
        panelMatchCard && panelRect
          ? {
              position: 'fixed',
              top: panelRect.top,
              left: panelRect.left,
              width: panelRect.width,
              zIndex: 1200,
            }
          : undefined
      }
    >
      <div className="wolf-se-autocomplete-filters" role="group" aria-label={isEs ? 'Filtro categoría' : 'Category filter'}>
        {CAT_FILTER.map((f) => (
          <button
            key={f.value ?? 'all'}
            type="button"
            className={`wolf-se-autocomplete-filter-chip${categoryFilter === f.value ? ' is-active' : ''}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setCategoryFilter(f.value)}
          >
            {isEs ? f.labelEs : f.labelEn}
          </button>
        ))}
      </div>

      {!query.trim() && recentOptions.length > 0 && (
        <p className="wolf-se-autocomplete-section-label">{isEs ? 'En esta sesión' : 'In this session'}</p>
      )}

      {displayList.length > 0 ? (
        <>
          <p className="wolf-se-autocomplete-count" aria-live="polite">
            {displayList.length}
            {options.length > displayList.length ? ` / ${options.length}` : ''}{' '}
            {isEs ? 'movimientos' : 'movements'}
            {catalogGroupLabel(undefined, catalogGroupFilter ?? undefined)
              ? ` · ${catalogGroupLabel(undefined, catalogGroupFilter ?? undefined)}`
              : ''}
          </p>
          <ul id={listId} role="listbox" className="wolf-se-autocomplete-menu">
            {displayList.map((opt, idx) => (
              <li key={opt.id} id={`${listId}-opt-${idx}`} role="option" aria-selected={opt.id === value}>
                <button
                  type="button"
                  className={`wolf-se-autocomplete-option${opt.id === value ? ' is-selected' : ''}${idx === activeIndex ? ' is-active' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => pick(opt.id)}
                >
                  <span className="wolf-se-autocomplete-option-text">
                    <span className="wolf-se-autocomplete-option-name">{opt.name}</span>
                    <span className="wolf-se-autocomplete-option-meta">{optionMeta(opt)}</span>
                  </span>
                  <span className="wolf-se-autocomplete-option-badges">
                    {opt.kind === 'complex' ? (
                      <span className="wolf-ei-badge wolf-ei-badge--coach_modified wolf-se-autocomplete-badge">
                        C+
                      </span>
                    ) : null}
                    <span className={`${lifecycleBadgeClass(opt.lifecycleStatus)} wolf-se-autocomplete-badge`}>
                      {SHORT_LIFECYCLE[opt.lifecycleStatus][isEs ? 0 : 1]}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="wolf-se-autocomplete-empty">
          {isEs
            ? 'Sin resultados. Prueba otra palabra o quita filtros SN/CJ/SQ/AC.'
            : 'No results. Try another term or clear SN/CJ/SQ/AC filters.'}
        </p>
      )}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`wolf-se-autocomplete${compact ? ' wolf-se-autocomplete--compact' : ''}${panelMatchCard ? ' wolf-se-autocomplete--match-card' : ''}`}>
      <div className={`wolf-se-autocomplete-input-wrap${compact ? ' wolf-se-autocomplete-input-wrap--compact' : ''}`}>
        <Search size={16} aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && displayList[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined}
          className="wolf-se-autocomplete-input"
          placeholder={placeholder ?? (isEs ? 'Buscar: snatch, pull, G4…' : 'Search: snatch, pull, G4…')}
          value={open ? query : (selected?.name ?? '')}
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setQuery(selected?.name ?? '');
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!open) setOpen(true);
              else moveActive(1);
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              moveActive(-1);
            }
            if (e.key === 'Enter' && open && displayList[activeIndex]) {
              e.preventDefault();
              pick(displayList[activeIndex]!.id);
            }
          }}
        />
      </div>

      {!panelMatchCard && panelContent}
      {panelMatchCard && panelContent && typeof document !== 'undefined'
        ? createPortal(panelContent, document.body)
        : null}
    </div>
  );
};
