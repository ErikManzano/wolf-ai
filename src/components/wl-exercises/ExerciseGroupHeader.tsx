import type { ExerciseListNode } from './types';

export function ExerciseGroupHeader({ node }: { node: Extract<ExerciseListNode, { kind: 'group' }> }) {
  return (
    <div className="wl-exercise-table-group" role="row">
      <span className="wl-exercise-table-group__label">
        {node.label} ({node.count})
      </span>
    </div>
  );
}
