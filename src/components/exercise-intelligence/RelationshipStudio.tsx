import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import type { ExerciseRelationshipRule, ExerciseTaxonomyBundle } from '../../models/exercise';
import { Button } from '../ui/button';
import RelationshipGraph from './RelationshipGraph';

interface RelationshipStudioProps {
  rules: ExerciseRelationshipRule[];
  taxonomy: ExerciseTaxonomyBundle;
  isEs: boolean;
  relFrom: string;
  relTo: string;
  relMean: string;
  onRelFrom: (v: string) => void;
  onRelTo: (v: string) => void;
  onRelMean: (v: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}

const RelationshipStudio: React.FC<RelationshipStudioProps> = ({
  rules,
  taxonomy,
  isEs,
  relFrom,
  relTo,
  relMean,
  onRelFrom,
  onRelTo,
  onRelMean,
  onAdd,
  onDelete,
}) => {
  const graph = useMemo(
    () => ({
      nodes: [...new Set(rules.flatMap((r) => [r.fromRef.code, r.toRef.code]))].map((code) => ({
        id: code,
        label: code,
      })),
      edges: rules.filter((r) => r.isActive).map((r) => ({
        id: r.id,
        from: r.fromRef.code,
        to: r.toRef.code,
        ratioMean: r.ratioMean,
        type: r.relationshipType,
      })),
    }),
    [rules],
  );

  return (
    <div className="wolf-ei-relationship-studio">
      <RelationshipGraph graph={graph} isEs={isEs} />
      <div className="wolf-composer__rel-form">
        <label className="wolf-composer__field">
          <span>{isEs ? 'Desde' : 'From'}</span>
          <select value={relFrom} onChange={(e) => onRelFrom(e.target.value)}>
            {taxonomy.families.map((f) => (
              <option key={f.code} value={f.code}>
                {f.code}
              </option>
            ))}
          </select>
        </label>
        <label className="wolf-composer__field">
          <span>{isEs ? 'Hacia' : 'To'}</span>
          <select value={relTo} onChange={(e) => onRelTo(e.target.value)}>
            {taxonomy.families.map((f) => (
              <option key={f.code} value={f.code}>
                {f.code}
              </option>
            ))}
          </select>
        </label>
        <label className="wolf-composer__field">
          <span>Ratio</span>
          <input type="number" step="0.01" value={relMean} onChange={(e) => onRelMean(e.target.value)} />
        </label>
        <Button type="button" size="sm" onClick={onAdd}>
          {isEs ? 'Añadir regla' : 'Add rule'}
        </Button>
      </div>
      {rules.map((r) => (
        <div key={r.id} className="wolf-composer__rel-row">
          <strong>
            {r.fromRef.code} → {r.toRef.code}
          </strong>
          <span className="muted">
            {' '}
            · {r.relationshipType} · {(r.ratioMean * 100).toFixed(0)}%
          </span>
          {r.coachId ? (
            <button type="button" className="btn-icon danger" onClick={() => onDelete(r.id)}>
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default RelationshipStudio;
