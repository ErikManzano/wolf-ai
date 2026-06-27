import React from 'react';

export type ProgramStatsScope = 'day' | 'week' | 'program';

/** @deprecated Use top-level plan tabs (Editor / Tabla / Estadísticas) */
export type ProgramDayBoardTab = 'session' | 'stats';

export interface ProgramStatsScopeControlsProps {
  statsScope: ProgramStatsScope;
  isEs: boolean;
  onStatsScopeChange: (scope: ProgramStatsScope) => void;
  /** Compact pill group for sticky header toolbar actions */
  variant?: 'default' | 'toolbar';
  disabled?: boolean;
}

export const ProgramStatsScopeControls: React.FC<ProgramStatsScopeControlsProps> = ({
  statsScope,
  isEs,
  onStatsScopeChange,
  variant = 'default',
  disabled = false,
}) => {
  const scopeLabel = isEs ? 'Alcance de estadísticas' : 'Statistics scope';
  const isToolbar = variant === 'toolbar';

  return (
    <div
      className={`wolf-program-stats-scope-wrap${isToolbar ? ' wolf-program-stats-scope-wrap--toolbar' : ''}${disabled ? ' wolf-program-stats-scope-wrap--disabled' : ''}`}
      role="group"
      aria-label={scopeLabel}
      aria-disabled={disabled || undefined}
    >
      <div
        className={`wolf-program-stats-scope${isToolbar ? ' wolf-program-stats-scope--toolbar' : ''}${disabled ? ' wolf-program-stats-scope--disabled' : ''}`}
        role="tablist"
        aria-label={scopeLabel}
      >
        <button
          type="button"
          role="tab"
          aria-selected={statsScope === 'day'}
          disabled={disabled}
          className={`wolf-program-stats-scope__btn${statsScope === 'day' ? ' is-active' : ''}`}
          onClick={() => onStatsScopeChange('day')}
        >
          {isEs ? 'Día' : 'Day'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={statsScope === 'week'}
          disabled={disabled}
          className={`wolf-program-stats-scope__btn${statsScope === 'week' ? ' is-active' : ''}`}
          onClick={() => onStatsScopeChange('week')}
        >
          {isEs ? 'Semana' : 'Week'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={statsScope === 'program'}
          disabled={disabled}
          className={`wolf-program-stats-scope__btn${statsScope === 'program' ? ' is-active' : ''}`}
          onClick={() => onStatsScopeChange('program')}
        >
          {isEs ? 'Programa' : 'Program'}
        </button>
      </div>
    </div>
  );
};

/** @deprecated Use ProgramStatsScopeControls */
export const ProgramDayBoardControls: React.FC<{
  activeTab: ProgramDayBoardTab;
  statsScope: ProgramStatsScope;
  isEs: boolean;
  onTabChange: (tab: ProgramDayBoardTab) => void;
  onStatsScopeChange: (scope: ProgramStatsScope) => void;
}> = ({ statsScope, isEs, onStatsScopeChange, activeTab }) =>
  activeTab === 'stats' ? (
    <ProgramStatsScopeControls
      statsScope={statsScope}
      isEs={isEs}
      onStatsScopeChange={onStatsScopeChange}
    />
  ) : null;

/** @deprecated */
export const ProgramDayBoardTabs: React.FC<{
  activeTab: ProgramDayBoardTab;
  isEs: boolean;
  onChange: (tab: ProgramDayBoardTab) => void;
}> = () => null;
