import React from 'react';
import type { ExerciseDefinitionVersion } from '../../models/exercise';
import EiEmptyState from './EiEmptyState';

interface DefinitionVersionTimelineProps {
  versions: ExerciseDefinitionVersion[];
  isEs: boolean;
}

const DefinitionVersionTimeline: React.FC<DefinitionVersionTimelineProps> = ({ versions, isEs }) => {
  if (versions.length === 0) {
    return (
      <EiEmptyState compact>
        {isEs ? 'Sin historial de versiones publicadas.' : 'No published version history yet.'}
      </EiEmptyState>
    );
  }

  return (
    <ul className="wolf-ei-version-list">
      {versions.map((v) => (
        <li key={v.id}>
          <strong>v{v.version}</strong> · {v.displayName}
          {v.changeReason ? <span className="muted"> — {v.changeReason}</span> : null}
          <br />
          <span className="muted" style={{ fontSize: '0.72rem' }}>
            {new Date(v.createdAt).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
};

export default DefinitionVersionTimeline;
