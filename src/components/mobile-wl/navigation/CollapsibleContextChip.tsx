import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SessionGoal } from '../../../models/training';
import '../mobile-wl.css';

interface PrStat {
  key: string;
  label: string;
  value: string;
  unit: string;
}

interface CollapsibleContextChipProps {
  athleteName: string;
  goalLabel: string;
  kBand?: string;
  level?: string;
  prStats?: PrStat[];
  isEs: boolean;
}

export const CollapsibleContextChip: React.FC<CollapsibleContextChipProps> = ({
  athleteName,
  goalLabel,
  kBand,
  level,
  prStats = [],
  isEs,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="mwl-context-chip">
      <button
        type="button"
        className="mwl-context-chip-btn"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mwl-context-chip-summary">
          <span className="mwl-context-chip-tag">{athleteName}</span>
          <span className="mwl-context-chip-tag">{goalLabel}</span>
          {kBand ? (
            <span className="mwl-context-chip-tag">
              K {kBand}
              {level ? ` · ${level}` : ''}
            </span>
          ) : null}
        </span>
        {open ? <ChevronUp size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
      </button>
      {open && prStats.length > 0 && (
        <div className="mwl-context-chip-panel">
          <p className="mwl-context-chip-hint" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            {isEs ? 'PRs usados para calcular cargas' : 'PRs used to compute loads'}
          </p>
          <div className="mwl-context-chip-prs">
            {prStats.map((pr) => (
              <div key={pr.key} className="mwl-context-chip-pr">
                <span>{pr.label}</span>
                <strong>
                  {pr.value}
                  {pr.unit}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export type { SessionGoal };
