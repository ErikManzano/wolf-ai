import React from 'react';

interface EiEmptyStateProps {
  children: React.ReactNode;
  compact?: boolean;
}

const EiEmptyState: React.FC<EiEmptyStateProps> = ({ children, compact }) => (
  <p className={`ei-empty${compact ? ' ei-empty--compact' : ''}`}>{children}</p>
);

export default EiEmptyState;
