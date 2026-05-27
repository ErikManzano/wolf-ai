import React from 'react';

interface RelationshipGraphProps {
  graph: {
    nodes: { id: string; label: string }[];
    edges: { id: string; from: string; to: string; ratioMean: number; type: string }[];
  };
  isEs: boolean;
}

const RelationshipGraph: React.FC<RelationshipGraphProps> = ({ graph, isEs }) => {
  if (graph.edges.length === 0) {
    return (
      <p className="muted" style={{ fontSize: '0.85rem' }}>
        {isEs ? 'Sin relaciones activas.' : 'No active relationships.'}
      </p>
    );
  }

  return (
    <div className="wolf-ei-graph" role="list">
      {graph.edges.map((e) => (
        <div key={e.id} className="wolf-ei-graph-edge" role="listitem">
          <strong>{e.from}</strong> → <strong>{e.to}</strong>
          <br />
          <span className="muted">
            {(e.ratioMean * 100).toFixed(0)}% · {e.type}
          </span>
        </div>
      ))}
    </div>
  );
};

export default RelationshipGraph;
