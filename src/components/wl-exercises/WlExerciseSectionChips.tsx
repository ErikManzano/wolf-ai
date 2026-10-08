import { WlExerciseChipBar, type ExerciseChipItem } from './WlExerciseChipBar';
import { CATALOG_SECTION_OPTIONS, type CatalogSectionFilter } from './exerciseListUtils';

export function WlExerciseSectionChips({
  isEs,
  section,
  counts,
  onChange,
}: {
  isEs: boolean;
  section: CatalogSectionFilter;
  counts: Record<string, number>;
  onChange: (section: CatalogSectionFilter) => void;
}) {
  const items: ExerciseChipItem[] = CATALOG_SECTION_OPTIONS.filter(
    (option) => option.id === 'all' || (counts[option.id] ?? 0) > 0,
  ).map((option) => ({
    id: option.id,
    label: isEs ? option.labelEs : option.labelEn,
    count: counts[option.id] ?? 0,
  }));

  return (
    <WlExerciseChipBar
      ariaLabel={isEs ? 'Secciones del catálogo' : 'Catalog sections'}
      items={items}
      activeId={section}
      moreLabel={isEs ? '+ Más' : '+ More'}
      onChange={(id) => onChange(id as CatalogSectionFilter)}
    />
  );
}
