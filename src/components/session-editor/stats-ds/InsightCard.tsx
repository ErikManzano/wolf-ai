import React from 'react';
import type { StatsInsight } from '../statsInsights';

export interface InsightCardProps {
  insights: StatsInsight[];
  isEs: boolean;
}

export const InsightCard: React.FC<InsightCardProps> = ({ insights, isEs }) => {
  if (insights.length === 0) {
    return (
      <p className="wl-stats-rank__empty">
        {isEs ? 'Sin insights para este alcance.' : 'No insights for this scope.'}
      </p>
    );
  }

  return (
    <ul className="wl-stats-insights">
      {insights.map((insight) => (
        <li key={insight.id} className={`wl-stats-insight wl-stats-insight--${insight.tone}`}>
          <span className="wl-stats-insight__dot" aria-hidden />
          <p className="wl-stats-insight__text">{insight.text}</p>
        </li>
      ))}
    </ul>
  );
};
