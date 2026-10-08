import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { fuzzySearchPickerOptions, getExerciseTaxonomy, type SessionPickerOption } from '../../services/exercise';
import { WlCenteredModal } from '../wl-shared/WlCenteredModal';
import { FamilyAvatar } from '../wl-exercises/FamilyAvatar';
import type { ExerciseFamilyId } from '../wl-exercises/types';
import type { ExerciseVariationCode } from '../../models/exercise';
import {
  buildBrowseModalSections,
  formatHoverPreview,
  highlightTokens,
  HOVER_PREVIEW_MS,
  pickerCatalogGroup,
  pickerCatalogGroupLabel,
  SEARCH_DEBOUNCE_MS,
} from './exerciseAutocompleteUtils';
import type { CatalogGrupoFilter } from '../../data/wlCatalogGroups';
import type { MuscleGroupFilter } from '../wl-exercises/exerciseListUtils';
import type { ExerciseQuickFilter } from '../wl-exercises/types';
import { ExercisePickerActiveFilterChip } from './ExercisePickerActiveFilterChip';
import { ExercisePickerCatalogSidebar } from './ExercisePickerCatalogSidebar';
import { ExercisePickerPanelSplit } from './ExercisePickerPanelSplit';
import { readExerciseRecents } from '../wl-exercises/exerciseLibraryPrefs';
import { pickerMuscleGroupForOption, type PickerVariationFilter } from './ExercisePickerFamilyFilters';
import { computePickerOptionPool, type PickerCatalogSection } from './exercisePickerCatalogUtils';

const VIRTUAL_THRESHOLD = 50;
const ROW_HEIGHT = 48;

interface ExercisePickerBrowseModalProps {
  isEs: boolean;
  open: boolean;
  options: SessionPickerOption[];
  initialQuery: string;
  initialSection?: PickerCatalogSection;
  initialCatalogGrupo?: CatalogGrupoFilter;
  initialMuscleFilter?: MuscleGroupFilter;
  initialVariationFilter?: PickerVariationFilter;
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
  const meta = `${pickerCatalogGroupLabel(pickerCatalogGroup(opt), isEs)} · ${opt.typeLabel}`;

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
            {highlightTokens(opt.name, query).map((part, index) =>
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
  initialSection = 'all',
  initialCatalogGrupo = 'all',
  initialMuscleFilter = 'all',
  initialVariationFilter = 'all',
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
  const [catalogGrupoFilter, setCatalogGrupoFilter] = useState<CatalogGrupoFilter>(initialCatalogGrupo);
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroupFilter>('all');
  const [variationFilter, setVariationFilter] = useState<PickerVariationFilter>('all');
  const [section, setSection] = useState<PickerCatalogSection>(initialSection);
  const [quickFilter, setQuickFilter] = useState<ExerciseQuickFilter>('none');
  const listRef = useRef<HTMLDivElement>(null);

  const variationLabels = useMemo(() => {
    const taxonomy = getExerciseTaxonomy();
    const map = {} as Record<ExerciseVariationCode, string>;
    for (const item of taxonomy.variations) {
      map[item.code as ExerciseVariationCode] = isEs ? item.labelEs : item.labelEn;
    }
    return map;
  }, [isEs]);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery);
    setCatalogGrupoFilter(initialCatalogGrupo);
    setMuscleFilter(initialMuscleFilter);
    setVariationFilter(initialVariationFilter);
    setSection(initialSection);
    setQuickFilter('none');
    setActiveIndex(0);
  }, [open, initialQuery, initialCatalogGrupo, initialSection, initialMuscleFilter, initialVariationFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const libraryRecentIds = useMemo(() => readExerciseRecents(), []);

  const optionPool = useMemo(() => {
    let pool = computePickerOptionPool(options, {
      section,
      familyFilter: 'all',
      muscleFilter,
      variationFilter,
      catalogGrupoFilter,
    });
    if (quickFilter === 'favorites') {
      pool = pool.filter((opt) => favoriteSet.has(opt.id) || favoriteSet.has(opt.definitionId));
    } else if (quickFilter === 'recent') {
      const recentSet = new Set(libraryRecentIds);
      pool = pool.filter((opt) => recentSet.has(opt.id) || recentSet.has(opt.definitionId));
    }
    return pool;
  }, [options, section, catalogGrupoFilter, muscleFilter, variationFilter, quickFilter, favoriteSet, libraryRecentIds]);

  const handleSectionChange = (next: PickerCatalogSection) => {
    setSection(next);
    setCatalogGrupoFilter('all');
    setMuscleFilter('all');
    setVariationFilter('all');
    setQuickFilter('none');
  };

  const matched = useMemo(
    () => fuzzySearchPickerOptions(optionPool, debouncedQuery, 500),
    [optionPool, debouncedQuery],
  );

  const browseSections = useMemo(
    () =>
      buildBrowseModalSections(matched, debouncedQuery, {
        section,
        familyFilter: 'all',
        catalogGrupoFilter,
        muscleKey: pickerMuscleGroupForOption,
        variationLabel: (code) => variationLabels[code] ?? code,
      }),
    [matched, debouncedQuery, section, catalogGrupoFilter, variationLabels],
  );

  const flatMatched = useMemo(() => browseSections.flatMap((s) => s.items), [browseSections]);

  const normalizedQuery = debouncedQuery.trim().toLowerCase();
  const showCreate =
    normalizedQuery.length > 0 &&
    !flatMatched.some((opt) => opt.name.trim().toLowerCase() === normalizedQuery);

  const navigableCount = flatMatched.length + (showCreate ? 1 : 0);

  useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, catalogGrupoFilter, muscleFilter, variationFilter, section]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const row = listRef.current.querySelector('.wolf-se-picker-row.is-active');
    row?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  if (!open) return null;

  const useSimpleScroll = flatMatched.length <= VIRTUAL_THRESHOLD;
  let flatRowIndex = 0;

  return (
    <WlCenteredModal
      isEs={isEs}
      kicker={isEs ? 'Biblioteca' : 'Library'}
      title={isEs ? 'Buscar ejercicio' : 'Browse exercises'}
      subtitle={
        flatMatched.length > 0
          ? isEs
            ? `${flatMatched.length} resultados`
            : `${flatMatched.length} results`
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
                if (activeIndex < flatMatched.length) {
                  onSelect(flatMatched[activeIndex]!.id);
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

        <div className="wolf-se-picker-browse-split">
          <ExercisePickerPanelSplit
            showSidebar={!debouncedQuery.trim()}
            sidebar={
              <ExercisePickerCatalogSidebar
                isEs={isEs}
                options={options}
                section={section}
                onSectionChange={handleSectionChange}
                catalogGrupoFilter={catalogGrupoFilter}
                onCatalogGrupoChange={(grupo) => {
                  setCatalogGrupoFilter(grupo);
                  setVariationFilter('all');
                }}
                muscleFilter={muscleFilter}
                onMuscleChange={setMuscleFilter}
                variationFilter={variationFilter}
                onVariationChange={setVariationFilter}
                variationLabels={variationLabels}
                onQuickFilterChange={setQuickFilter}
              />
            }
            filterBar={
              debouncedQuery.trim() ? (
                <ExercisePickerActiveFilterChip
                  isEs={isEs}
                  section={section}
                  catalogGrupo={catalogGrupoFilter}
                  muscle={muscleFilter}
                  variation={variationFilter}
                  onClearFilters={() => {
                    setSection('all');
                    setCatalogGrupoFilter('all');
                    setMuscleFilter('all');
                    setVariationFilter('all');
                    setQuickFilter('none');
                  }}
                  onShowCatalog={() => setQuery('')}
                />
              ) : null
            }
          >
            {hoverPreview ? <p className="wolf-se-picker-browse-preview">{hoverPreview}</p> : null}

            <div
              ref={listRef}
              className="wolf-se-picker-browse-list"
              style={useSimpleScroll ? undefined : { maxHeight: ROW_HEIGHT * 12 }}
            >
              {flatMatched.length === 0 ? (
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
                browseSections.map((group) => (
                  <section key={group.key ?? group.labelEn} className="wolf-se-picker-section" role="presentation">
                    {browseSections.length > 1 || debouncedQuery.trim() ? (
                      <p className="wolf-se-picker-section-label">
                        {isEs ? group.labelEs : group.labelEn}
                        <span className="wolf-se-picker-section-count">({group.items.length})</span>
                      </p>
                    ) : null}
                    {group.items.map((opt) => {
                      const index = flatRowIndex++;
                      return (
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
                      );
                    })}
                  </section>
                ))
              )}

              {showCreate && onCreate ? (
                <button
                  type="button"
                  className={`wolf-se-picker-create${activeIndex === flatMatched.length ? ' is-active' : ''}`}
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
          </ExercisePickerPanelSplit>
        </div>
      </div>
    </WlCenteredModal>
  );
}
