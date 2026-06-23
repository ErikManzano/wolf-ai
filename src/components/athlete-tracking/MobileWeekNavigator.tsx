import React from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { GeneratedProgram } from '../../models/training';

interface MobileWeekNavigatorProps {
  weeks: GeneratedProgram['weeks'];
  activeWeek: number;
  isEs: boolean;
  isDayComplete: (weekNumber: number, dayNumber: number) => boolean;
  onWeekChange: (week: number) => void;
  /** Renders in the global mobile subheader (no sticky positioning). */
  variant?: 'inline' | 'subheader';
}

function weekOptionLabel(
  weekNumber: number,
  allDaysDone: boolean,
  isEs: boolean,
): string {
  const base = isEs ? `Semana - ${weekNumber}` : `Week - ${weekNumber}`;
  if (!allDaysDone) return base;
  return isEs ? `${base} · Completa` : `${base} · Complete`;
}

export const MobileWeekNavigator: React.FC<MobileWeekNavigatorProps> = ({
  weeks,
  activeWeek,
  isEs,
  isDayComplete,
  onWeekChange,
  variant = 'inline',
}) => {
  const weekIdx = weeks.findIndex((w) => w.weekNumber === activeWeek);

  const goPrevWeek = () => {
    if (weekIdx > 0) onWeekChange(weeks[weekIdx - 1]!.weekNumber);
  };

  const goNextWeek = () => {
    if (weekIdx >= 0 && weekIdx < weeks.length - 1) onWeekChange(weeks[weekIdx + 1]!.weekNumber);
  };

  const weeksLabel = isEs ? 'Semanas' : 'Weeks';

  return (
    <section
      className={`wolf-athlete-week-section${
        variant === 'subheader'
          ? ' wolf-athlete-week-section--subheader'
          : ' wolf-athlete-week-section--sticky'
      }`}
      aria-label={isEs ? 'Semana' : 'Week'}
    >
      <div className="wolf-week-select-mobile wolf-athlete-week-select">
        <div className="wolf-week-select-mobile__row wolf-athlete-week-select__row">
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
            <div className="wolf-select-wrap">
              <select
                value={activeWeek}
                onChange={(e) => onWeekChange(Number(e.target.value))}
                aria-label={weeksLabel}
              >
                {weeks.map((w) => {
                  const allDaysDone = w.days.every((d) =>
                    isDayComplete(w.weekNumber, d.dayNumber),
                  );
                  return (
                    <option key={w.weekNumber} value={w.weekNumber}>
                      {weekOptionLabel(w.weekNumber, allDaysDone, isEs)}
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
        </div>
      </div>
    </section>
  );
};
