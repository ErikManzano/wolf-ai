import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { GeneratedProgram } from '../../models/training';
import { weekNavigatorLabel } from '../../utils/athleteDayMetrics';
import { CoachNavMoreMenu } from '../session-editor/CoachNavMoreMenu';
import './mobile-plan-nav.css';

export type MobileWeekNavigatorVariant = 'inline' | 'subheader' | 'coach';

interface MobileWeekNavigatorProps {
  weeks: GeneratedProgram['weeks'];
  activeWeek: number;
  isEs: boolean;
  onWeekChange: (week: number) => void;
  /** Renders in the global mobile subheader (no sticky positioning). */
  variant?: MobileWeekNavigatorVariant;
  isDayComplete?: (weekNumber: number, dayNumber: number) => boolean;
  /** Athlete: phase labels; coach/editor chrome: simple "Semana N". */
  labelMode?: 'phase' | 'simple';
  /**
   * Same week chrome as the program editor (ghost arrows + centered uppercase select).
   * Defaults to true for `variant="coach"`.
   */
  editorChrome?: boolean;
  canAddWeek?: boolean;
  onAddWeek?: () => void;
  addWeekTitle?: string;
  canRemoveWeek?: boolean;
  onRemoveWeek?: () => void;
  removeWeekTitle?: string;
}

function weekOptionLabel(
  weekNumber: number,
  totalWeeks: number,
  allDaysDone: boolean,
  isEs: boolean,
  labelMode: 'phase' | 'simple',
): string {
  const base =
    labelMode === 'simple'
      ? isEs
        ? `Semana ${weekNumber}`
        : `Week ${weekNumber}`
      : weekNavigatorLabel(weekNumber, totalWeeks, isEs);
  if (labelMode === 'simple' || !allDaysDone) return base;
  return isEs ? `${base} · Completa` : `${base} · Complete`;
}

export const MobileWeekNavigator: React.FC<MobileWeekNavigatorProps> = ({
  weeks,
  activeWeek,
  isEs,
  onWeekChange,
  variant = 'inline',
  isDayComplete,
  labelMode = 'phase',
  editorChrome,
  canAddWeek = false,
  onAddWeek,
  addWeekTitle,
  canRemoveWeek = false,
  onRemoveWeek,
  removeWeekTitle,
}) => {
  const weekIdx = weeks.findIndex((w) => w.weekNumber === activeWeek);
  const totalWeeks = weeks.length;
  const isCoach = variant === 'coach';
  const useEditorChrome = editorChrome ?? isCoach;

  const goPrevWeek = () => {
    if (weekIdx > 0) onWeekChange(weeks[weekIdx - 1]!.weekNumber);
  };

  const goNextWeek = () => {
    if (weekIdx >= 0 && weekIdx < weeks.length - 1) onWeekChange(weeks[weekIdx + 1]!.weekNumber);
  };

  const weeksLabel = isEs ? 'Semanas' : 'Weeks';

  const row = (
    <div
      className={`wolf-week-select-mobile wolf-athlete-week-select${useEditorChrome ? ' wolf-coach-week-nav' : ''}`}
    >
      <div
        className={`wolf-week-select-mobile__row wolf-athlete-week-select__row${
          useEditorChrome ? ' wolf-athlete-week-select__row--coach' : ''
        }`}
      >
        <button
          type="button"
          className="wolf-athlete-week-arrow"
          disabled={weekIdx <= 0}
          aria-label={isEs ? 'Semana anterior' : 'Previous week'}
          onClick={goPrevWeek}
        >
          <ChevronLeft size={18} />
        </button>

        <label className="wolf-week-select-mobile__field wolf-athlete-week-select__field">
          <div className="wolf-select-wrap wolf-select-wrap--app">
            <select
              value={activeWeek}
              onChange={(e) => onWeekChange(Number(e.target.value))}
              aria-label={weeksLabel}
            >
              {weeks.map((w) => {
                const allDaysDone = isDayComplete
                  ? w.days.every((d) => isDayComplete(w.weekNumber, d.dayNumber))
                  : false;
                return (
                  <option key={w.weekNumber} value={w.weekNumber}>
                    {weekOptionLabel(w.weekNumber, totalWeeks, allDaysDone, isEs, labelMode)}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="wolf-select-chevron" size={16} strokeWidth={2} aria-hidden />
          </div>
        </label>

        <button
          type="button"
          className="wolf-athlete-week-arrow"
          disabled={weekIdx < 0 || weekIdx >= weeks.length - 1}
          aria-label={isEs ? 'Semana siguiente' : 'Next week'}
          onClick={goNextWeek}
        >
          <ChevronRight size={18} />
        </button>

        {isCoach && onAddWeek ? (
          <button
            type="button"
            className="wolf-coach-week-nav__tool wolf-coach-week-nav__tool--add"
            onClick={onAddWeek}
            disabled={!canAddWeek}
            title={addWeekTitle}
            aria-label={addWeekTitle}
          >
            <Plus size={18} strokeWidth={2.25} aria-hidden />
          </button>
        ) : null}

        {isCoach && onRemoveWeek ? (
          <CoachNavMoreMenu
            ariaLabel={isEs ? 'Más opciones de semana' : 'More week options'}
            removeLabel={removeWeekTitle ?? (isEs ? 'Quitar semana' : 'Remove week')}
            canRemove={canRemoveWeek}
            onRemove={onRemoveWeek}
            triggerClassName="wolf-coach-week-nav__tool"
          />
        ) : null}
      </div>
    </div>
  );

  if (isCoach) {
    return (
      <div className="wolf-coach-week-nav-wrap" aria-label={isEs ? 'Semana' : 'Week'}>
        {row}
      </div>
    );
  }

  return (
    <section
      className={`wolf-athlete-week-section${
        variant === 'subheader'
          ? ' wolf-athlete-week-section--subheader'
          : ' wolf-athlete-week-section--sticky'
      }${useEditorChrome ? ' wolf-athlete-week-section--editor-chrome' : ''}`}
      aria-label={isEs ? 'Semana' : 'Week'}
    >
      {row}
    </section>
  );
};
