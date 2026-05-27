import React from 'react';
import type { ExerciseLifecycleStatus } from '../../models/exercise';
import { lifecycleBadgeLabel } from '../../services/exercise';
import EiTag from './EiTag';

interface LifecycleBadgeProps {
  status: ExerciseLifecycleStatus;
  kind?: 'single' | 'complex';
  isEs: boolean;
  size?: 'sm' | 'md';
}

const LifecycleBadge: React.FC<LifecycleBadgeProps> = ({ status, kind, isEs, size = 'sm' }) => {
  const label = lifecycleBadgeLabel(status, isEs);
  return (
    <span className="ei-lifecycle-group" style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap' }}>
      {kind === 'complex' ? (
        <EiTag tone="complex" size={size}>
          C+
        </EiTag>
      ) : null}
      <EiTag tone={status} size={size}>
        {label}
      </EiTag>
    </span>
  );
};

export default LifecycleBadge;
