import React from 'react';

export interface StatRowItem {
  label: string;
  value: React.ReactNode;
}

export interface StatRowProps {
  rows: StatRowItem[];
}

export const StatRow: React.FC<StatRowProps> = ({ rows }) => {
  if (rows.length === 0) return null;
  return (
    <ul className="wl-stats-rows">
      {rows.map((row) => (
        <li key={row.label} className="wl-stats-row">
          <span className="wl-stats-row__label">{row.label}</span>
          <span className="wl-stats-row__value">{row.value}</span>
        </li>
      ))}
    </ul>
  );
};
