import React, { useMemo } from 'react';
import type { ExerciseRelationshipRule } from '../../models/exercise';
import { FAMILY_TOKEN } from './familyTokens';
import type { ExerciseFamilyCode } from '../../models/exercise';
import EiEmptyState from './EiEmptyState';

interface LoadRelationshipMiniGraphProps {
  family: string | null;
  relationships: ExerciseRelationshipRule[];
  isEs: boolean;
}

const LoadRelationshipMiniGraph: React.FC<LoadRelationshipMiniGraphProps> = ({ family, relationships, isEs }) => {
  const edges = useMemo(() => {
    if (!family) return [];
    return relationships.filter(
      (r) =>
        r.isActive &&
        r.relationshipType === 'percentage' &&
        ((r.fromRef.type === 'family' && r.fromRef.code === family) ||
          (r.toRef.type === 'family' && r.toRef.code === family)),
    );
  }, [family, relationships]);

  if (!family || edges.length === 0) {
    return (
      <EiEmptyState compact>
        {isEs
          ? 'Sin relaciones de carga para esta familia. Añade reglas en Relaciones.'
          : 'No load relationships for this family. Add rules in Relationships.'}
      </EiEmptyState>
    );
  }

  const rootTok = FAMILY_TOKEN[family as ExerciseFamilyCode];

  return (
    <div className="wolf-ei-load-tree">
      <div className="wolf-ei-load-tree__root">
        <span className="wolf-ei-load-tree__node" style={{ borderColor: rootTok?.hue }}>
          {family}
        </span>
      </div>
      <div className="wolf-ei-load-tree__branches">
        {edges.map((e) => {
          const childCode = e.fromRef.code === family ? e.toRef.code : e.fromRef.code;
          const pct = Math.round(e.ratioMean * 100);
          const conf = Math.round(e.confidence * 100);
          return (
            <div key={e.id} className="wolf-ei-load-tree__branch">
              <div className="wolf-ei-load-tree__line" />
              <div className="wolf-ei-load-tree__child">
                <span className="wolf-ei-load-tree__node wolf-ei-load-tree__node--child">{childCode}</span>
                <div className="wolf-ei-load-tree__badges">
                  <span className="wolf-ei-load-badge">{pct}%</span>
                  <span className="wolf-ei-load-badge wolf-ei-load-badge--method">{e.methodology}</span>
                  <span className="wolf-ei-load-badge wolf-ei-load-badge--conf" title={`${conf}% confidence`}>
                    {conf}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LoadRelationshipMiniGraph;
