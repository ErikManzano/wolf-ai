import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import type { ExerciseCategory } from '../../models/training';
import type { ExerciseLifecycleStatus } from '../../models/exercise';
import {
  catalogGroupLabel,
  fuzzySearchPickerOptions,
  pickerOptionsFromIds,
  type SessionPickerOption,
} from '../../services/exercise';

const GROUP_ORDER: ExerciseCategory[] = ['snatch', 'clean_jerk', 'squat', 'accessory'];

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
  /** Enter selects but keeps panel open (coach multi-add). */
  keepOpenOnSelect?: boolean;
  /** Larger input + focus ring (embedded program editor). */
  prominent?: boolean;
  /** Focus search on mount. */
  autoFocus?: boolean;
}

interface PanelRect {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  flipAbove: boolean;
}

function measurePanelRect(input: HTMLInputElement, matchCard: boolean): PanelRect {
  const gap = 6;
  const inputRect = input.getBoundingClientRect();
  const card = input.closest('article.wolf-se-block-card');
  const margin = 12;

  let width = Math.max(inputRect.width, 300);
  let left = inputRect.left;

  if (matchCard && card) {
    const cardRect = card.getBoundingClientRect();
    left = cardRect.left + margin;
    width = Math.max(cardRect.width - margin * 2, inputRect.width);
  }

  width = Math.min(Math.max(width, 280), window.innerWidth - 16);
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - width - 8);
  }

  const viewportCap = Math.min(380, Math.floor(window.innerHeight * 0.52));
  const spaceBelow = window.innerHeight - inputRect.bottom - gap;
  const spaceAbove = inputRect.top - gap;
  const preferBelow = spaceBelow >= 140 || spaceBelow >= spaceAbove;

  if (preferBelow) {
    return {
      top: inputRect.bottom + gap,
      left,
      width,
      maxHeight: Math.min(viewportCap, Math.max(140, spaceBelow - 8)),
      flipAbove: false,
    };
  }

  return {
    top: inputRect.top - gap,
    left,
    width,
    maxHeight: Math.min(viewportCap, Math.max(140, spaceAbove - 8)),
    flipAbove: true,
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
  keepOpenOnSelect = false,
  prominent = false,
  autoFocus = false,
}) => {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  const selected = options.find((o) => o.id === value);

  const recentOptions = useMemo(
    () => pickerOptionsFromIds(options, recentIds.filter((id) => id !== value), 6),
    [options, recentIds, value],
  );

  const suggestions = useMemo(
    () =>
      fuzzySearchPickerOptions(options, query, 24, {
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

  const groupedSections = useMemo(() => {
    if (categoryFilter) return null;
    const buckets = new Map<ExerciseCategory, SessionPickerOption[]>();
    for (const cat of GROUP_ORDER) buckets.set(cat, []);
    for (const opt of displayList) {
      buckets.get(opt.category)?.push(opt);
    }
    return GROUP_ORDER.map((cat) => ({ cat, items: buckets.get(cat) ?? [] })).filter((s) => s.items.length > 0);
  }, [categoryFilter, displayList]);

  const flatList = useMemo(() => {
    if (!groupedSections) return displayList;
    return groupedSections.flatMap((s) => s.items);
  }, [groupedSections, displayList]);

  useEffect(() => {
    if (!open && pickedLabel == null) setQuery(selected?.name ?? '');
  }, [value, selected?.name, open, pickedLabel]);

  useEffect(() => {
    setPickedLabel(null);
  }, [value]);

  useEffect(() => {
    if (open) {
      setPanelMounted(true);
      const id = requestAnimationFrame(() => setPanelVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setPanelVisible(false);
  }, [open]);

  useEffect(() => {
    if (!panelMounted || panelVisible) return;
    const timer = window.setTimeout(() => setPanelMounted(false), 200);
    return () => clearTimeout(timer);
  }, [panelMounted, panelVisible]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, categoryFilter, catalogGroupFilter]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const active = panelRef.current.querySelector('.wolf-se-autocomplete-option.is-active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, flatList]);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, []);

  const updatePanelRect = useCallback(() => {
    if (!inputRef.current) return;
    setPanelRect(measurePanelRect(inputRef.current, panelMatchCard));
  }, [panelMatchCard]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelRect(null);
      return;
    }
    updatePanelRect();
  }, [open, updatePanelRect]);

  useEffect(() => {
    if (!open) return;
    const onLayout = () => updatePanelRect();
    window.addEventListener('resize', onLayout);
    window.addEventListener('scroll', onLayout, true);
    window.visualViewport?.addEventListener('resize', onLayout);
    return () => {
      window.removeEventListener('resize', onLayout);
      window.removeEventListener('scroll', onLayout, true);
      window.visualViewport?.removeEventListener('resize', onLayout);
    };
  }, [open, updatePanelRect]);

  const pick = useCallback(
    (id: string) => {
      const opt = options.find((o) => o.id === id);
      onChange(id);
      if (keepOpenOnSelect) {
        setQuery('');
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }
      setPickedLabel(opt?.name ?? null);
      setQuery(opt?.name ?? '');
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange, keepOpenOnSelect, options],
  );

  const closedLabel = pickedLabel ?? selected?.name ?? '';
  const inputValue = open ? query : closedLabel;
  const hasSettledValue = !open && Boolean(closedLabel.trim());

  const moveActive = (delta: number) => {
    if (flatList.length === 0) return;
    setActiveIndex((i) => (i + delta + flatList.length) % flatList.length);
  };

  const renderOption = (opt: SessionPickerOption, idx: number) => (
    <li key={opt.id} id={`${listId}-opt-${idx}`} role="option" aria-selected={opt.id === value}>
      <button
        type="button"
        className={`wolf-se-autocomplete-option${opt.id === value ? ' is-selected' : ''}${idx === activeIndex ? ' is-active' : ''}`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.stopPropagation();
          pick(opt.id);
        }}
        onMouseEnter={() => setActiveIndex(idx)}
      >
        <span className="wolf-se-autocomplete-option-text">
          <span className="wolf-se-autocomplete-option-name">{opt.name}</span>
          <span className="wolf-se-autocomplete-option-meta">{optionMeta(opt)}</span>
        </span>
        <span className="wolf-se-autocomplete-option-badges">
          {opt.kind === 'complex' ? (
            <span className="wolf-ei-badge wolf-ei-badge--coach_modified wolf-se-autocomplete-badge">C+</span>
          ) : null}
          <span className={`${lifecycleBadgeClass(opt.lifecycleStatus)} wolf-se-autocomplete-badge`}>
            {SHORT_LIFECYCLE[opt.lifecycleStatus][isEs ? 0 : 1]}
          </span>
        </span>
      </button>
    </li>
  );

  const panelContent = panelMounted ? (
    <div
      ref={panelRef}
      className={`wolf-se-autocomplete-panel wolf-se-autocomplete-panel--portal${panelMatchCard ? ' wolf-se-autocomplete-panel--match-card' : ''}${panelRect?.flipAbove ? ' wolf-se-autocomplete-panel--above' : ''}${panelVisible ? ' is-visible' : ' is-closing'}`}
      style={
        panelRect
          ? {
              position: 'fixed',
              top: panelRect.top,
              left: panelRect.left,
              width: panelRect.width,
              maxHeight: panelRect.maxHeight,
              zIndex: 10050,
            }
          : { position: 'fixed', visibility: 'hidden', zIndex: 10050 }
      }
    >
      <div className="wolf-se-autocomplete-filters" role="group" aria-label={isEs ? 'Filtro categoría' : 'Category filter'}>
        {CAT_FILTER.map((f) => (
          <button
            key={f.value ?? 'all'}
            type="button"
            className={`wolf-se-autocomplete-filter-chip${categoryFilter === f.value ? ' is-active' : ''}`}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              setCategoryFilter(f.value);
            }}
          >
            {isEs ? f.labelEs : f.labelEn}
          </button>
        ))}
      </div>

      {!query.trim() && recentOptions.length > 0 && (
        <p className="wolf-se-autocomplete-section-label">{isEs ? 'En esta sesión' : 'In this session'}</p>
      )}

      {flatList.length > 0 ? (
        <>
          <p className="wolf-se-autocomplete-count" aria-live="polite">
            {flatList.length}
            {options.length > flatList.length ? ` / ${options.length}` : ''}{' '}
            {isEs ? 'movimientos' : 'movements'}
            {catalogGroupLabel(undefined, catalogGroupFilter ?? undefined)
              ? ` · ${catalogGroupLabel(undefined, catalogGroupFilter ?? undefined)}`
              : ''}
          </p>
          <ul id={listId} role="listbox" className="wolf-se-autocomplete-menu">
            {(() => {
              let globalIdx = 0;
              if (!groupedSections) return flatList.map((opt) => renderOption(opt, globalIdx++));
              return groupedSections.map((section) => (
                <li key={section.cat} className="wolf-se-autocomplete-group" role="presentation">
                  <span className="wolf-se-autocomplete-group-label">{CAT[section.cat]}</span>
                  <ul role="group">
                    {section.items.map((opt) => renderOption(opt, globalIdx++))}
                  </ul>
                </li>
              ));
            })()}
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
    <div
      ref={rootRef}
      className={`wolf-se-autocomplete${compact ? ' wolf-se-autocomplete--compact' : ''}${panelMatchCard ? ' wolf-se-autocomplete--match-card' : ''}${prominent ? ' wolf-se-autocomplete--prominent' : ''}`}
    >
      <div
        className={`wolf-se-autocomplete-input-wrap${compact ? ' wolf-se-autocomplete-input-wrap--compact' : ''}${prominent ? ' wolf-se-autocomplete-input-wrap--prominent' : ''}${hasSettledValue ? ' wolf-se-autocomplete-input-wrap--settled' : ''}${open ? ' wolf-se-autocomplete-input-wrap--open' : ''}`}
      >
        <Search size={prominent ? 20 : 16} aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && flatList[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined}
          className="wolf-se-autocomplete-input"
          placeholder={placeholder ?? (isEs ? 'Buscar: snatch, pull, G4…' : 'Search: snatch, pull, G4…')}
          value={inputValue}
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
            if (e.key === 'Enter' && open && flatList[activeIndex]) {
              e.preventDefault();
              pick(flatList[activeIndex]!.id);
            }
          }}
        />
      </div>

      {panelMounted && typeof document !== 'undefined'
        ? createPortal(panelContent, document.body)
        : null}
    </div>
  );
};
