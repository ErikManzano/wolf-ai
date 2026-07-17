import React from 'react';
import type { DayVerdictTone } from '../programStatsVerdict';

export type StatusBadgeTone = DayVerdictTone | 'none' | 'pending' | 'in_progress' | 'completed';

export interface StatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ label, tone = 'none' }) => (
  <span className={`wl-stats-status wl-stats-status--${tone}`}>
    <span className="wl-stats-status__dot" aria-hidden />
    {label}
  </span>
);
