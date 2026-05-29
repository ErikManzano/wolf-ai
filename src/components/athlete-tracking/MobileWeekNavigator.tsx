import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { GeneratedProgram } from '../../models/training';
import { cn } from '../../lib/utils';

interface MobileWeekNavigatorProps {
  weeks: GeneratedProgram['weeks'];
  activeWeek: number;
  totalWeeks: number;
  isEs: boolean;
  isDayComplete: (weekNumber: number, dayNumber: number) => boolean;
  onWeekChange: (week: number) => void;
}

export const MobileWeekNavigator: React.FC<MobileWeekNavigatorProps> = ({
  weeks,
  activeWeek,
  totalWeeks,
  isEs,
  isDayComplete,
  onWeekChange,
}) => {
  const weekIdx = weeks.findIndex((w) => w.weekNumber === activeWeek);

  const goPrevWeek = () => {
    if (weekIdx > 0) onWeekChange(weeks[weekIdx - 1]!.weekNumber);
  };

  const goNextWeek = () => {
    if (weekIdx >= 0 && weekIdx < weeks.length - 1) onWeekChange(weeks[weekIdx + 1]!.weekNumber);
  };

  return (
    <section
      className="wolf-athlete-week-section wolf-athlete-week-section--sticky"
      aria-label={isEs ? 'Navegación semanal' : 'Weekly navigation'}
    >
      <div className="wolf-athlete-week-section-head">
        <span className="wolf-athlete-week-label">
          {isEs ? 'Semana' : 'Week'} {activeWeek} {isEs ? 'de' : 'of'} {totalWeeks}
        </span>
        <div className="wolf-athlete-week-arrows">
          <button
            type="button"
            className="wolf-athlete-week-arrow"
            disabled={weekIdx <= 0}
            aria-label={isEs ? 'Semana anterior' : 'Previous week'}
            onClick={goPrevWeek}
          >
            <ChevronLeft size={18} />
          </button>
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

      <div className="wolf-athlete-week-nav" role="tablist" aria-label={isEs ? 'Semanas' : 'Weeks'}>
        {weeks.map((w) => {
          const active = w.weekNumber === activeWeek;
          const allDaysDone = w.days.every((d) => isDayComplete(w.weekNumber, d.dayNumber));
          return (
            <button
              key={w.weekNumber}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn(
                'wolf-athlete-week-pill',
                active && 'active',
                allDaysDone && !active && 'wolf-athlete-week-pill--complete',
              )}
              onClick={() => onWeekChange(w.weekNumber)}
            >
              W{w.weekNumber}
            </button>
          );
        })}
      </div>
    </section>
  );
};
