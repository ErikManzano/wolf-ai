import type { MergedDefinitionView } from '../../models/exercise';
import { ExerciseBulkBar } from './ExerciseBulkBar';
import { ExerciseGroupHeader } from './ExerciseGroupHeader';
import { ExerciseListHeader } from './ExerciseListHeader';
import { ExerciseRow } from './ExerciseRow';
import { ExerciseVirtualList } from './ExerciseVirtualList';
import type { ExerciseListNode, ExerciseListSortState, ExerciseSortColumn } from './types';

export function ExerciseListTable({
  isEs,
  isMobile,
  nodes,
  sort,
  defById,
  selectedIds,
  visibleRowIds,
  onSortColumn,
  onToggleAll,
  onToggleSelect,
  onShiftSelect,
  bindItem,
  bulkBusy,
  onBulkFavorite,
  onBulkArchive,
  onBulkDelete,
  onBulkClear,
}: {
  isEs: boolean;
  isMobile: boolean;
  nodes: ExerciseListNode[];
  sort: ExerciseListSortState;
  defById: Map<string, MergedDefinitionView>;
  selectedIds: Set<string>;
  visibleRowIds: string[];
  onSortColumn: (column: ExerciseSortColumn) => void;
  onToggleAll: () => void;
  onToggleSelect: (id: string) => void;
  onShiftSelect: (id: string) => void;
  bindItem: (def: MergedDefinitionView) => {
    def: MergedDefinitionView;
    isEs: boolean;
    onOpen: () => void;
    onEdit: () => void;
    onPersonalize: () => void;
    onDuplicate: () => void;
    onArchive: () => void;
    onDelete: () => void;
  };
  bulkBusy?: boolean;
  onBulkFavorite: () => void;
  onBulkArchive: () => void;
  onBulkDelete: () => void;
  onBulkClear: () => void;
}) {
  const selectedVisible = visibleRowIds.filter((id) => selectedIds.has(id)).length;
  const allSelected = visibleRowIds.length > 0 && selectedVisible === visibleRowIds.length;
  const someSelected = selectedVisible > 0;
  const bulkCount = selectedIds.size;

  return (
    <div className="wl-exercise-table-stack">
      {bulkCount > 0 ? (
        <div className="wl-exercise-table-bulk-slot">
          <ExerciseBulkBar
            isEs={isEs}
            count={bulkCount}
            busy={bulkBusy}
            onFavorite={onBulkFavorite}
            onArchive={onBulkArchive}
            onDelete={onBulkDelete}
            onClear={onBulkClear}
          />
        </div>
      ) : null}
      <div
        className={`wl-exercise-table-wrap${isMobile ? ' wl-exercise-table-wrap--mobile' : ''}`}
        role="grid"
      >
        <ExerciseListHeader
          isEs={isEs}
          sort={sort}
          allSelected={allSelected}
          someSelected={someSelected}
          onToggleAll={onToggleAll}
          onSortColumn={onSortColumn}
        />
        <ExerciseVirtualList
          nodes={nodes}
          density="compact"
          renderNode={(node) => {
            if (node.kind === 'group') {
              return <ExerciseGroupHeader node={node} />;
            }
            const def = defById.get(node.item.id);
            if (!def) return null;
            return (
              <ExerciseRow
                item={node.item}
                selected={selectedIds.has(node.item.id)}
                onToggleSelect={() => onToggleSelect(node.item.id)}
                onShiftSelect={() => onShiftSelect(node.item.id)}
                {...bindItem(def)}
              />
            );
          }}
        />
      </div>
    </div>
  );
}
