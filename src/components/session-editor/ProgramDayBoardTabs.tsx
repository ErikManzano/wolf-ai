import React from 'react';
import { BarChart3, PenLine } from 'lucide-react';

export type ProgramDayBoardTab = 'session' | 'stats';
export type ProgramStatsScope = 'day' | 'week' | 'program';

export interface ProgramDayBoardControlsProps {
  activeTab: ProgramDayBoardTab;
  statsScope: ProgramStatsScope;
  isEs: boolean;
  onTabChange: (tab: ProgramDayBoardTab) => void;
  onStatsScopeChange: (scope: ProgramStatsScope) => void;
}

export const ProgramDayBoardControls: React.FC<ProgramDayBoardControlsProps> = ({
  activeTab,
  statsScope,
  isEs,
  onTabChange,
  onStatsScopeChange,
}) => {
  const viewLabel = isEs ? 'Vista del día' : 'Day view';
  const scopeLabel = isEs ? 'Alcance de estadísticas' : 'Statistics scope';

  return (
    <div className="wolf-program-day-controls">
      <div className="wolf-program-day-tabs" role="tablist" aria-label={viewLabel}>
        <button
          type="button"
          role="tab"
          id="wolf-program-day-tab-session"
          aria-selected={activeTab === 'session'}
          aria-controls="wolf-program-day-panel-session"
          className={`wolf-program-day-tab${activeTab === 'session' ? ' is-active' : ''}`}
          onClick={() => onTabChange('session')}
        >
          <PenLine size={14} aria-hidden />
          {isEs ? 'Sesión' : 'Session'}
        </button>
        <button
          type="button"
          role="tab"
          id="wolf-program-day-tab-stats"
          aria-selected={activeTab === 'stats'}
          aria-controls="wolf-program-day-panel-stats"
          className={`wolf-program-day-tab${activeTab === 'stats' ? ' is-active' : ''}`}
          onClick={() => onTabChange('stats')}
        >
          <BarChart3 size={14} aria-hidden />
          {isEs ? 'Estadísticas' : 'Statistics'}
        </button>
      </div>
      {activeTab === 'stats' ? (
        <div className="wolf-program-stats-scope-wrap" role="presentation">
        <div className="wolf-program-stats-scope" role="tablist" aria-label={scopeLabel}>
          <button
            type="button"
            role="tab"
            aria-selected={statsScope === 'day'}
            className={`wolf-program-stats-scope__btn${statsScope === 'day' ? ' is-active' : ''}`}
            onClick={() => onStatsScopeChange('day')}
          >
            {isEs ? 'Día' : 'Day'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statsScope === 'week'}
            className={`wolf-program-stats-scope__btn${statsScope === 'week' ? ' is-active' : ''}`}
            onClick={() => onStatsScopeChange('week')}
          >
            {isEs ? 'Semana' : 'Week'}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statsScope === 'program'}
            className={`wolf-program-stats-scope__btn${statsScope === 'program' ? ' is-active' : ''}`}
            onClick={() => onStatsScopeChange('program')}
          >
            {isEs ? 'Programa' : 'Program'}
          </button>
        </div>
        </div>
      ) : null}
    </div>
  );
};

/** @deprecated Use ProgramDayBoardControls in nav head */
export const ProgramDayBoardTabs: React.FC<{
  activeTab: ProgramDayBoardTab;
  isEs: boolean;
  onChange: (tab: ProgramDayBoardTab) => void;
}> = ({ activeTab, isEs, onChange }) => (
  <ProgramDayBoardControls
    activeTab={activeTab}
    statsScope="day"
    isEs={isEs}
    onTabChange={onChange}
    onStatsScopeChange={() => {}}
  />
);
