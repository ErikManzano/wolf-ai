import React from 'react';
import type { ExerciseLifecycleStatus } from '../../models/exercise';

export type EiTagTone =
  | ExerciseLifecycleStatus
  | 'category'
  | 'objective'
  | 'meta'
  | 'version'
  | 'complex';

export interface EiTagProps {
  tone: EiTagTone;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  /** Family hue for category tags (SN, SQ, …) */
  accent?: string;
  className?: string;
}

const EiTag: React.FC<EiTagProps> = ({ tone, children, size = 'md', accent, className = '' }) => {
  const cls = [
    'ei-tag',
    `ei-tag--${tone}`,
    size === 'sm' ? 'ei-tag--sm' : '',
    accent ? 'ei-tag--accent' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={cls} style={accent ? ({ '--ei-tag-accent': accent } as React.CSSProperties) : undefined}>
      {children}
    </span>
  );
};

export default EiTag;
