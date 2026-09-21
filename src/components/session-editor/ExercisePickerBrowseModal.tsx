import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { fuzzySearchPickerOptions, type SessionPickerOption } from '../../services/exercise';
import { WlCenteredModal } from '../wl-shared/WlCenteredModal';
import { FamilyAvatar } from '../wl-exercises/FamilyAvatar';
import type { ExerciseFamilyId } from '../wl-exercises/types';
import {
  formatHoverPreview,
  highlightTokens,
  HOVER_PREVIEW_MS,
  SEARCH_DEBOUNCE_MS,
  truncateLabel,
} from './exerciseAutocompleteUtils';
import {
  buildPickerFamilyCounts,
  ExercisePickerFamilyFilters,
  filterPickerByFamily,
  type PickerFamilyFilter,
} from './ExercisePickerFamilyFilters';

const VIRTUAL_THRESHOLD = 50;
const ROW_HEIGHT = 48;

interface ExercisePickerBrowseModalProps {
  isEs: boolean;
  open: boolean;
  options: SessionPickerOption[];
  initialQuery: string;
  initialFamily?: PickerFamilyFilter;
  favoriteIds: string[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onCreate?: (name: string) => void;
}

function BrowseRow({
  opt,
  query,
  isEs,
  isActive,
  isFavorite,
  onSelect,
  onToggleFavorite,
  onHover,
}: {
  opt: SessionPickerOption;
  query: string;
  isEs: boolean;
  isActive: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onHover: (preview: string | null) => void;
}) {
  const hoverTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (hoverTimer.current != null) window.clearTimeout(hoverTimer.current);
    },
    [],
  );

  const family = opt.family as ExerciseFamilyId;
  const meta = `${opt.familyLabel} · ${opt.typeLabel}`;

  return (
    <div
      className={`wolf-se-picker-row${isActive ? ' is-active' : ''}`}
      onMouseEnter={() => {
        if (hoverTimer.current != null) window.clearTimeout(hoverTimer.current);
        hoverTimer.current = window.setTimeout(
          () => onHover(formatHoverPreview(opt, isEs)),
          HOVER_PREVIEW_MS,
        );
      }}
      onMouseLeave={() => {
        if (hoverTimer.current != null) window.clearTimeout(hoverTimer.current);
        onHover(null);
      }}
    >
      <button type="button" className="wolf-se-picker-row__select" onClick={onSelect}>
        <span
          className={`wolf-se-picker-row__avatar${opt.isOfficial ? '' : ' wolf-se-picker-row__avatar--custom'}`}
        >
          <FamilyAvatar family={family} size={32} />
        </span>
        <span className="wolf-se-picker-row__main">
          <span className="wolf-se-picker-row__name">
            {highlightTokens(truncateLabel(opt.name), query).map((part, index) =>
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
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggleFavorite();
        }}
      >
        <Star size={14} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden />
      </button>
    </div>
  );
}

export function ExercisePickerBrowseModal({
  isEs,
  open,
  options,
  initialQuery,
  initialFamily = 'all',
  favoriteIds,
  onClose,
  onSelect,
  onToggleFavorite,
  onCreate,
}: ExercisePickerBrowseModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hoverPreview, setHoverPreview] = useState<string | null>(null);
  const [familyFilter, setFamilyFilter] = useState<PickerFamilyFilter>(initialFamily);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery);
    setFamilyFilter(initialFamily);
    setActiveIndex(0);
  }, [open, initialQuery, initialFamily]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const familyCounts = useMemo(() => buildPickerFamilyCounts(options), [options]);

  const optionPool = useMemo(
    () => filterPickerByFamily(options, familyFilter),
    [options, familyFilter],
  );

  const matched = useMemo(
    () => fuzzySearchPickerOptions(optionPool, debouncedQuery, 500),
    [optionPool, debouncedQuery],
  );

  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const showCreate =
    normalizedQuery.length > 0 &&
    !matched.some((opt) => opt.name.trim().toLowerCase() === normalizedQuery);

  const navigableCount = matched.length + (showCreate ? 1 : 0);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, familyFilter]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const row = listRef.current.querySelector('.wolf-se-picker-row.is-active');
    row?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  if (!open) return null;

  const useSimpleScroll = matched.length <= VIRTUAL_THRESHOLD;

  return (
    <WlCenteredModal
      isEs={isEs}
      kicker={isEs ? 'Biblioteca' : 'Library'}
      title={isEs ? 'Buscar ejercicio' : 'Browse exercises'}
      subtitle={
        matched.length > 0
          ? isEs
            ? `${matched.length} resultados`
            : `${matched.length} results`
          : undefined
      }
      onClose={onClose}
      footer={
        <p className="wolf-se-picker-browse-hints">
          {isEs ? '↑↓ navegar · Enter seleccionar · Esc cerrar' : '↑↓ navigate · Enter select · Esc close'}
        </p>
      }
    >
      <div className="wolf-se-picker-browse">
        <div className="wolf-se-picker-browse-search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            className="wolf-se-picker-browse-input"
            value={query}
            autoFocus
            placeholder={isEs ? 'Snatch, tirón, técnica…' : 'Snatch, pull, technique…'}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % Math.max(navigableCount, 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((i) => (i - 1 + Math.max(navigableCount, 1)) % Math.max(navigableCount, 1));
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex < matched.length) {
                  onSelect(matched[activeIndex]!.id);
                  onClose();
                  return;
                }
                if (showCreate && onCreate) {
                  onCreate(debouncedQuery.trim());
                  onClose();
                }
              }
            }}
          />
        </div>

        <ExercisePickerFamilyFilters
          isEs={isEs}
          active={familyFilter}
          counts={familyCounts}
          onChange={setFamilyFilter}
        />

        {hoverPreview ? <p className="wolf-se-picker-browse-preview">{hoverPreview}</p> : null}

        <div
          ref={listRef}
          className="wolf-se-picker-browse-list"
          style={useSimpleScroll ? undefined : { maxHeight: ROW_HEIGHT * 12 }}
        >
          {matched.length === 0 ? (
            <p className="wolf-se-picker-browse-empty">
              {showCreate
                ? isEs
                  ? `Sin resultados. Crea "${debouncedQuery.trim()}" para añadirlo a la biblioteca.`
                  : `No results. Create "${debouncedQuery.trim()}" to add it to the library.`
                : isEs
                  ? 'Sin resultados.'
                  : 'No results.'}
            </p>
          ) : (
            matched.map((opt, index) => (
              <BrowseRow
                key={opt.id}
                opt={opt}
                query={debouncedQuery}
                isEs={isEs}
                isActive={index === activeIndex}
                isFavorite={favoriteSet.has(opt.id) || favoriteSet.has(opt.definitionId)}
                onSelect={() => {
                  onSelect(opt.id);
                  onClose();
                }}
                onToggleFavorite={() => onToggleFavorite(opt.id)}
                onHover={setHoverPreview}
              />
            ))
          )}

          {showCreate && onCreate ? (
            <button
              type="button"
              className={`wolf-se-picker-create${activeIndex === matched.length ? ' is-active' : ''}`}
              onClick={() => {
                onCreate(debouncedQuery.trim());
                onClose();
              }}
            >
              {isEs
                ? `Crear "${debouncedQuery.trim()}" en la biblioteca`
                : `Create "${debouncedQuery.trim()}" in library`}
            </button>
          ) : null}
        </div>
      </div>
    </WlCenteredModal>
  );
}
