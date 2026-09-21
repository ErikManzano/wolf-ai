import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Clock, Plus, Search, Star } from 'lucide-react';
import {
  fuzzySearchPickerOptions,
  pickerOptionsFromIds,
  type SessionPickerOption,
} from '../../services/exercise';
import { customFamilyTag, stripCustomFamilyTags } from '../../models/exercise/coachFamily';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { WlExerciseFormModal } from '../wl-exercises/WlExerciseFormModal';
import {
  readExerciseFavorites,
  recordExerciseRecent,
  toggleExerciseFavorite,
  readExerciseRecents,
} from '../wl-exercises/exerciseLibraryPrefs';
import { FamilyAvatar } from '../wl-exercises/FamilyAvatar';
import type { ExerciseFamilyId } from '../wl-exercises/types';
import { ExercisePickerBrowseModal } from './ExercisePickerBrowseModal';
import {
  buildPickerFamilyCounts,
  ExercisePickerFamilyFilters,
  filterPickerByFamily,
  type PickerFamilyFilter,
} from './ExercisePickerFamilyFilters';
import {
  buildDropdownSections,
  combinedRecentIds,
  formatHoverPreview,
  highlightTokens,
  HOVER_PREVIEW_MS,
  SEARCH_DEBOUNCE_MS,
  truncateLabel,
  type DropdownSectionKind,
  type NavigableRow,
} from './exerciseAutocompleteUtils';

interface ExerciseAutocompleteProps {
  options: SessionPickerOption[];
  value: string;
  onChange: (exerciseId: string) => void;
  isEs: boolean;
  placeholder?: string;
  compact?: boolean;
  /** IDs usados en esta sesión — prioridad en recientes. */
  recentIds?: string[];
  catalogGroupFilter?: string | null;
  pickerIdsInGroup?: Set<string>;
  panelMatchCard?: boolean;
  keepOpenOnSelect?: boolean;
  prominent?: boolean;
  autoFocus?: boolean;
  /** Abre modal de creación con nombre prellenado. */
  onCreateExercise?: (name: string) => void;
}

interface PanelRect {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  flipAbove: boolean;
}

const SECTION_ICON: Record<DropdownSectionKind, React.ReactNode> = {
  favorites: <Star size={11} aria-hidden />,
  recents: <Clock size={11} aria-hidden />,
  all: <BookOpen size={11} aria-hidden />,
};

function collectScrollTargets(anchor: HTMLElement | null): (HTMLElement | Window)[] {
  const targets: (HTMLElement | Window)[] = [];
  let el = anchor?.parentElement ?? null;
  while (el) {
    const style = getComputedStyle(el);
    const overflow = `${style.overflow} ${style.overflowY} ${style.overflowX}`;
    if (/(auto|scroll|overlay)/.test(overflow)) targets.push(el);
    el = el.parentElement;
  }
  targets.push(window);
  return targets;
}

function measurePanelRect(input: HTMLInputElement, matchCard: boolean): PanelRect {
  const gap = 6;
  const inputRect = input.getBoundingClientRect();
  const card = input.closest('article.wolf-se-block-card');
  const margin = 12;

  let width = Math.max(inputRect.width, 400);
  let left = inputRect.left;

  if (matchCard && card) {
    const cardRect = card.getBoundingClientRect();
    left = cardRect.left + margin;
    width = Math.max(cardRect.width - margin * 2, inputRect.width);
  }

  width = Math.min(Math.max(width, 400), window.innerWidth - 16);
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - width - 8);
  }

  const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
  const viewportCap = Math.min(480, Math.floor(viewportHeight * 0.58));
  const minComfortable = Math.min(240, viewportCap);
  const spaceBelow = viewportHeight - inputRect.bottom - gap;
  const spaceAbove = inputRect.top - gap;
  const flipAbove = spaceAbove > spaceBelow || (spaceBelow < minComfortable && spaceAbove >= minComfortable);
  const available = flipAbove ? spaceAbove : spaceBelow;
  const maxHeight = Math.min(viewportCap, Math.max(180, available - 8));

  if (flipAbove) {
    return { top: inputRect.top - gap, left, width, maxHeight, flipAbove: true };
  }
  return { top: inputRect.bottom + gap, left, width, maxHeight, flipAbove: false };
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
  onCreateExercise,
}) => {
  const { createExerciseDefinition, exerciseTaxonomy, refreshExerciseCatalog } = useWolfAssign();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hoverTimerRef = useRef<number | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelRect, setPanelRect] = useState<PanelRect | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => readExerciseFavorites());
  const [libraryRecentIds] = useState<string[]>(() => readExerciseRecents());
  const [browseOpen, setBrowseOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [hoverPreview, setHoverPreview] = useState<string | null>(null);
  const [familyFilter, setFamilyFilter] = useState<PickerFamilyFilter>('all');

  const openCreateFlow = useCallback(
    (name: string) => {
      if (onCreateExercise) {
        onCreateExercise(name);
        return;
      }
      setQuery(name);
      setCreateOpen(true);
      setOpen(false);
    },
    [onCreateExercise],
  );

  useEffect(() => {
    if (!autoFocus) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [autoFocus]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(
    () => () => {
      if (hoverTimerRef.current != null) window.clearTimeout(hoverTimerRef.current);
    },
    [],
  );

  const selected = options.find((o) => o.id === value);
  const mergedRecentIds = useMemo(
    () => combinedRecentIds(recentIds, libraryRecentIds),
    [recentIds, libraryRecentIds],
  );

  const familyCounts = useMemo(() => buildPickerFamilyCounts(options), [options]);

  const optionPool = useMemo(
    () => filterPickerByFamily(options, familyFilter),
    [options, familyFilter],
  );

  const searchResults = useMemo(() => {
    const limit = debouncedQuery.trim() ? 80 : 40;
    const results = fuzzySearchPickerOptions(optionPool, debouncedQuery, limit, {
      catalogGroup: catalogGroupFilter,
      exerciseIdsInGroup: pickerIdsInGroup,
      preferIds: mergedRecentIds,
    });
    if (!debouncedQuery.trim()) {
      const recentOpts = pickerOptionsFromIds(optionPool, mergedRecentIds.filter((id) => id !== value), 8);
      const recentSet = new Set(recentOpts.map((o) => o.id));
      const rest = results.filter((o) => !recentSet.has(o.id));
      return [...recentOpts, ...rest].slice(0, limit);
    }
    return results;
  }, [optionPool, debouncedQuery, catalogGroupFilter, pickerIdsInGroup, mergedRecentIds, value]);

  const matched = searchResults;

  const dropdown = useMemo(
    () =>
      buildDropdownSections({
        matched,
        favoriteIds,
        recentIds: mergedRecentIds,
        query: debouncedQuery,
        isEs,
      }),
    [matched, favoriteIds, mergedRecentIds, debouncedQuery, isEs],
  );

  const navigable = dropdown.navigable;

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
    if (!open) setFamilyFilter('all');
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, catalogGroupFilter, familyFilter]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const active = panelRef.current.querySelector('.wolf-se-picker-row.is-active, .wolf-se-picker-create.is-active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex, navigable]);

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
  }, [open, updatePanelRect, navigable.length]);

  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const onLayout = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => updatePanelRect());
    };
    const scrollTargets = collectScrollTargets(inputRef.current);
    window.addEventListener('resize', onLayout);
    window.visualViewport?.addEventListener('resize', onLayout);
    window.visualViewport?.addEventListener('scroll', onLayout);
    for (const target of scrollTargets) {
      target.addEventListener('scroll', onLayout, { passive: true });
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onLayout);
      window.visualViewport?.removeEventListener('resize', onLayout);
      window.visualViewport?.removeEventListener('scroll', onLayout);
      for (const target of scrollTargets) {
        target.removeEventListener('scroll', onLayout);
      }
    };
  }, [open, updatePanelRect]);

  const pick = useCallback(
    (id: string) => {
      const opt = options.find((o) => o.id === id);
      onChange(id);
      recordExerciseRecent(id, readExerciseRecents());

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

  const handleToggleFavorite = useCallback((id: string) => {
    setFavoriteIds((prev) => toggleExerciseFavorite(id, prev));
  }, []);

  const openBrowseModal = useCallback(() => {
    setOpen(false);
    setPanelVisible(false);
    setBrowseOpen(true);
    inputRef.current?.blur();
  }, []);

  const activateNavRow = useCallback(
    (row: NavigableRow) => {
      if (row.kind === 'option') pick(row.opt.id);
      else if (row.kind === 'more') openBrowseModal();
      else if (row.kind === 'create') openCreateFlow(row.query);
    },
    [pick, openCreateFlow, openBrowseModal],
  );

  const closedLabel = pickedLabel ?? selected?.name ?? '';
  const inputValue = open ? query : closedLabel;
  const hasSettledValue = !open && Boolean(closedLabel.trim());

  const moveActive = (delta: number) => {
    if (navigable.length === 0) return;
    setActiveIndex((i) => (i + delta + navigable.length) % navigable.length);
  };

  const renderOptionRow = (opt: SessionPickerOption, navIndex: number, section: DropdownSectionKind) => {
    const isFavorite = favoriteIds.includes(opt.id) || favoriteIds.includes(opt.definitionId);
    const isActive = navigable[activeIndex]?.kind === 'option' && navigable[activeIndex]?.id === `opt-${opt.id}`;
    const family = opt.family as ExerciseFamilyId;
    const meta = `${opt.familyLabel} · ${opt.typeLabel}`;

    return (
      <li key={`${section}-${opt.id}`} id={`${listId}-opt-${navIndex}`} role="option" aria-selected={opt.id === value}>
        <div
          className={`wolf-se-picker-row${isActive ? ' is-active' : ''}${opt.id === value ? ' is-selected' : ''}`}
          onMouseEnter={() => {
            setActiveIndex(navIndex);
            if (hoverTimerRef.current != null) window.clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = window.setTimeout(
              () => setHoverPreview(formatHoverPreview(opt, isEs)),
              HOVER_PREVIEW_MS,
            );
          }}
          onMouseLeave={() => {
            if (hoverTimerRef.current != null) window.clearTimeout(hoverTimerRef.current);
            setHoverPreview(null);
          }}
        >
          <button
            type="button"
            className="wolf-se-picker-row__select"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              pick(opt.id);
            }}
          >
            <span
              className={`wolf-se-picker-row__avatar${opt.isOfficial ? '' : ' wolf-se-picker-row__avatar--custom'}`}
            >
              <FamilyAvatar family={family} size={32} />
            </span>
            <span className="wolf-se-picker-row__main">
              <span className="wolf-se-picker-row__name">
                {highlightTokens(truncateLabel(opt.name), debouncedQuery).map((part, index) =>
                  part.match ? (
                    <mark key={index} className="wolf-se-picker-highlight">
                      {part.text}
                    </mark>
                  ) : (
                    <span key={index}>{part.text}</span>
                  ),
                )}
              </span>
              <span className="wolf-se-picker-row__meta">{meta}</span>
            </span>
          </button>
          <button
            type="button"
            className={`wolf-se-picker-row__fav${isFavorite ? ' is-on' : ''}`}
            aria-label={isEs ? 'Favorito' : 'Favorite'}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleFavorite(opt.id);
            }}
          >
            <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
      </li>
    );
  };

  const sectionBlocks = dropdown.sections.map((section) => {
    const sectionLabel = isEs ? section.labelEs : section.labelEn;
    const rows = section.items.map((opt) => {
      const idx = navigable.findIndex((n) => n.kind === 'option' && n.id === `opt-${opt.id}`);
      return renderOptionRow(opt, idx >= 0 ? idx : 0, section.kind);
    });
    return (
      <li key={section.kind} className="wolf-se-picker-section" role="presentation">
        <p className="wolf-se-picker-section-label">
          {SECTION_ICON[section.kind]}
          <span>{sectionLabel}</span>
          {section.kind === 'all' && debouncedQuery.trim() ? (
            <span className="wolf-se-picker-section-count">({dropdown.totalMatches})</span>
          ) : null}
        </p>
        <ul role="group">{rows}</ul>
      </li>
    );
  });

  const moreRow = navigable.find((n) => n.kind === 'more');
  const createRow = navigable.find((n) => n.kind === 'create');

  const panelContent = panelMounted && !browseOpen ? (
    <div
      ref={panelRef}
      className={`wolf-se-autocomplete-panel wolf-se-autocomplete-panel--portal wolf-se-autocomplete-panel--v2${panelMatchCard ? ' wolf-se-autocomplete-panel--match-card' : ''}${panelRect?.flipAbove ? ' wolf-se-autocomplete-panel--above' : ''}${panelVisible ? ' is-visible' : ' is-closing'}`}
      onWheel={(e) => e.stopPropagation()}
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
      <ExercisePickerFamilyFilters
        isEs={isEs}
        active={familyFilter}
        counts={familyCounts}
        compact={compact}
        onChange={setFamilyFilter}
      />

      {hoverPreview ? <p className="wolf-se-picker-inline-preview">{hoverPreview}</p> : null}

      {navigable.some((n) => n.kind === 'option') ? (
        <ul id={listId} role="listbox" className="wolf-se-picker-menu">
          {sectionBlocks}
        </ul>
      ) : (
        <p className="wolf-se-autocomplete-empty">
          {dropdown.showCreate
            ? isEs
              ? `Sin resultados. Crea "${debouncedQuery.trim()}" para añadirlo a la biblioteca.`
              : `No results. Create "${debouncedQuery.trim()}" to add it to the library.`
            : familyFilter !== 'all'
              ? isEs
                ? 'Sin ejercicios en esta familia.'
                : 'No exercises in this family.'
              : isEs
                ? 'Sin resultados.'
                : 'No results.'}
        </p>
      )}

      {moreRow && moreRow.kind === 'more' ? (
        <button
          type="button"
          className={`wolf-se-picker-more${activeIndex === navigable.indexOf(moreRow) ? ' is-active' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault();
            openBrowseModal();
          }}
        >
          {isEs ? `Ver todos los resultados (${dropdown.totalMatches})` : `View all results (${dropdown.totalMatches})`}
        </button>
      ) : null}

      {createRow && createRow.kind === 'create' ? (
        <button
          type="button"
          className={`wolf-se-picker-create${activeIndex === navigable.indexOf(createRow) ? ' is-active' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault();
            openCreateFlow(createRow.query);
          }}
        >
          <Plus size={14} aria-hidden />
          {isEs
            ? `Crear "${createRow.query}" en la biblioteca`
            : `Create "${createRow.query}" in library`}
        </button>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <div
        ref={rootRef}
        className={`wolf-se-autocomplete${compact ? ' wolf-se-autocomplete--compact' : ''}${panelMatchCard ? ' wolf-se-autocomplete--match-card' : ''}${prominent ? ' wolf-se-autocomplete--prominent' : ''}`}
      >
        <div
          className={`wolf-se-autocomplete-input-wrap${compact ? ' wolf-se-autocomplete-input-wrap--compact' : ''}${prominent ? ' wolf-se-autocomplete-input-wrap--prominent' : ''}${hasSettledValue ? ' wolf-se-autocomplete-input-wrap--settled' : ''}${open ? ' wolf-se-autocomplete-input-wrap--open' : ''}`}
        >
          <Search size={prominent ? 20 : compact ? 14 : 16} aria-hidden />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={
              open && navigable[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined
            }
            className="wolf-se-autocomplete-input"
            placeholder={placeholder ?? (isEs ? 'Buscar ejercicio…' : 'Search exercise…')}
            value={inputValue}
            onFocus={() => {
              if (browseOpen) return;
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
              if (e.key === 'Tab') {
                setOpen(false);
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
              if (e.key === 'Enter' && open && navigable[activeIndex]) {
                e.preventDefault();
                activateNavRow(navigable[activeIndex]!);
              }
            }}
          />
        </div>

        {panelMounted && typeof document !== 'undefined' ? createPortal(panelContent, document.body) : null}
      </div>

      <ExercisePickerBrowseModal
        isEs={isEs}
        open={browseOpen}
        options={options}
        initialQuery={debouncedQuery}
        initialFamily={familyFilter}
        favoriteIds={favoriteIds}
        onClose={() => setBrowseOpen(false)}
        onSelect={pick}
        onToggleFavorite={handleToggleFavorite}
        onCreate={openCreateFlow}
      />

      {createOpen ? (
        <WlExerciseFormModal
          isEs={isEs}
          mode="create"
          taxonomy={exerciseTaxonomy}
          busy={createBusy}
          onClose={() => setCreateOpen(false)}
          onSave={async (input, { folderId }) => {
            setCreateBusy(true);
            try {
              const payload =
                folderId != null
                  ? {
                      ...input,
                      tags: [...stripCustomFamilyTags(input.tags), customFamilyTag(folderId)],
                    }
                  : input;
              const id = await createExerciseDefinition(payload);
              await refreshExerciseCatalog();
              if (id) pick(id);
              setCreateOpen(false);
            } finally {
              setCreateBusy(false);
            }
          }}
        />
      ) : null}
    </>
  );
};
