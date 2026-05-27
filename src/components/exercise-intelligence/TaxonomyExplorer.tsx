import React from 'react';
import type { RegistryTreeNode } from '../../models/exercise';

interface TaxonomyExplorerProps {
  tree: RegistryTreeNode[];
  selectedFamily: string;
  isEs: boolean;
  onSelectFamily: (code: string) => void;
}

const TaxonomyExplorer: React.FC<TaxonomyExplorerProps> = ({ tree, selectedFamily, isEs, onSelectFamily }) => {
  return (
    <aside className="wolf-ei-pane">
      <div className="wolf-ei-pane__head">{isEs ? 'Taxonomía' : 'Taxonomy'}</div>
      <div className="wolf-ei-pane__body">
        <button
          type="button"
          className={`wolf-ei-tree-node${selectedFamily === 'all' ? ' active' : ''}`}
          onClick={() => onSelectFamily('all')}
        >
          <span>{isEs ? 'Todas las familias' : 'All families'}</span>
        </button>
        {tree.map((node) => (
          <button
            key={node.id}
            type="button"
            className={`wolf-ei-tree-node${selectedFamily === node.code ? ' active' : ''}`}
            onClick={() => onSelectFamily(node.code)}
          >
            <span>{node.label}</span>
            <span className="muted" style={{ fontSize: '0.7rem' }}>
              {node.count ?? 0}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default TaxonomyExplorer;
