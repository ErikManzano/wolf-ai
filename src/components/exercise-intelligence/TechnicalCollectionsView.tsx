import React from 'react';
import type { MergedDefinitionView, TechnicalCollectionWithItems } from '../../models/exercise';

interface TechnicalCollectionsViewProps {
  collections: TechnicalCollectionWithItems[];
  definitions: MergedDefinitionView[];
  isEs: boolean;
  onSelectDefinition: (id: string) => void;
}

const TechnicalCollectionsView: React.FC<TechnicalCollectionsViewProps> = ({
  collections,
  definitions,
  isEs,
  onSelectDefinition,
}) => {
  const defById = new Map(definitions.map((d) => [d.id, d]));
  const defByLegacy = new Map(
    definitions.filter((d) => d.legacyExerciseId).map((d) => [d.legacyExerciseId!, d]),
  );

  const resolveDef = (definitionId: string) => defById.get(definitionId) ?? defByLegacy.get(definitionId);

  return (
    <div className="wolf-ei-pane wolf-ei-collections">
      <div className="wolf-ei-pane__head">{isEs ? 'Colecciones técnicas' : 'Technical collections'}</div>
      <div className="wolf-ei-pane__body wolf-ei-collections__grid">
        {collections.map((col) => (
          <article key={col.id} style={{ border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.75rem' }}>
            <strong>{col.title}</strong>
            <p className="muted" style={{ fontSize: '0.75rem', margin: '0.25rem 0 0.5rem' }}>
              {col.methodology} · {col.objectiveId ?? '—'}
            </p>
            {col.description && <p style={{ fontSize: '0.8rem' }}>{col.description}</p>}
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.82rem' }}>
              {col.items.map((item) => {
                const d = resolveDef(item.definitionId);
                return (
                  <li key={item.definitionId}>
                    {d ? (
                      <button type="button" className="wolf-ei-tree-node" style={{ padding: 0 }} onClick={() => onSelectDefinition(d.id)}>
                        {d.effectiveDisplayName}
                      </button>
                    ) : (
                      item.definitionId
                    )}
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
};

export default TechnicalCollectionsView;
