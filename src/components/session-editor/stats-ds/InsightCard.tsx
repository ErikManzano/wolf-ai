import React from 'react';
import type { StatsInsight } from '../statsInsights';

export interface InsightCardProps {
  insights: StatsInsight[];
  isEs: boolean;
  /** Compact single-insight hero under KPIs */
  hero?: boolean;
}

function InsightBody({ insight, isEs }: { insight: StatsInsight; isEs: boolean }) {
  return (
    <div className="wl-stats-insight__copy">
      <p className="wl-stats-insight__title">{insight.title}</p>
      {insight.body ? <p className="wl-stats-insight__body">{insight.body}</p> : null}
      {insight.action ? (
        <p className="wl-stats-insight__action">
          <span className="wl-stats-insight__action-label">
            {isEs ? 'Hacer' : 'Do'}
          </span>
          {insight.action}
        </p>
      ) : null}
    </div>
  );
}

export const InsightCard: React.FC<InsightCardProps> = ({ insights, isEs, hero = false }) => {
  if (insights.length === 0) {
    return (
      <p className="wl-stats-rank__empty">
        {isEs ? 'Sin insights para este alcance.' : 'No insights for this scope.'}
      </p>
    );
  }

  if (hero) {
    const insight = insights[0]!;
    return (
      <div
        className={`wl-stats-insight wl-stats-insight--hero wl-stats-insight--${insight.tone}`}
        role="status"
      >
        <span className="wl-stats-insight__dot" aria-hidden />
        <InsightBody insight={insight} isEs={isEs} />
      </div>
    );
  }

  return (
    <ul className="wl-stats-insights">
      {insights.map((insight) => (
        <li key={insight.id} className={`wl-stats-insight wl-stats-insight--${insight.tone}`}>
          <span className="wl-stats-insight__dot" aria-hidden />
          <InsightBody insight={insight} isEs={isEs} />
        </li>
      ))}
    </ul>
  );
};
