import React, { useEffect, useRef } from 'react';
import type { ProgramDay } from '../../models/training';
import { cn } from '../../lib/utils';

export interface AthleteDayNavigatorProps {
  days: ProgramDay[];
  activeDay: number;
  isEs: boolean;
  isDayComplete: (dayNumber: number) => boolean;
  onDayChange: (dayNumber: number) => void;
}

function dayTabLabel(day: ProgramDay): string {
  const trimmed = day.label?.trim();
  if (
    trimmed &&
    !/^D[ií]a\s+\d+$/i.test(trimmed) &&
    !/^Day\s+\d+$/i.test(trimmed)
  ) {
    return trimmed.length > 14 ? `${trimmed.slice(0, 12)}…` : trimmed;
  }
  return `D${day.dayNumber}`;
}

export const AthleteDayNavigator: React.FC<AthleteDayNavigatorProps> = ({
  days,
  activeDay,
  isEs,
  isDayComplete,
  onDayChange,
}) => {
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('.wa-day-tab.active');
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeDay, days.length]);

  return (
    <section className="wa-day-nav" aria-label={isEs ? 'Días de la semana' : 'Week days'}>
      <div className="wa-day-nav__strip" ref={stripRef} role="tablist">
        {days.map((day) => {
          const active = day.dayNumber === activeDay;
          const done = isDayComplete(day.dayNumber);
          return (
            <button
              key={day.dayNumber}
              type="button"
              role="tab"
              aria-selected={active}
              className={cn('wa-day-tab', active && 'active', done && !active && 'wa-day-tab--done')}
              onClick={() => onDayChange(day.dayNumber)}
            >
              {dayTabLabel(day)}
            </button>
          );
        })}
      </div>
    </section>
  );
};
