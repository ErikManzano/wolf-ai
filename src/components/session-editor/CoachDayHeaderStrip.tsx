import React from 'react';
import { Copy, Target } from 'lucide-react';
import type { Athlete, Exercise, Session } from '../../models/training';

export interface CoachDayHeaderStripProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  dayNumber?: number;
  dayLabel?: string;
  onDuplicateDay?: () => void;
  canDuplicateDay?: boolean;
}

function dayTitle(dayLabel: string | undefined, dayNumber: number | undefined, isEs: boolean): string {
  const trimmed = dayLabel?.trim();
  if (trimmed && !/^D[ií]a\s+\d+$/i.test(trimmed) && !/^Day\s+\d+$/i.test(trimmed)) {
    return trimmed;
  }
  if (dayNumber != null) return isEs ? `Día ${dayNumber}` : `Day ${dayNumber}`;
  return isEs ? 'Sesión del día' : 'Day session';
}

export const CoachDayHeaderStrip: React.FC<CoachDayHeaderStripProps> = ({
  isEs,
  dayNumber,
  dayLabel,
  onDuplicateDay,
  canDuplicateDay = false,
}) => {
  return (
    <header className="wolf-se-coach-day-strip">
      <div className="wolf-se-coach-day-strip__head">
        <span className="wolf-se-coach-day-strip__icon" aria-hidden>
          <Target size={18} strokeWidth={2} />
        </span>
        <div className="wolf-se-coach-day-strip__titles">
          <h2 className="wolf-se-coach-day-strip__title">{dayTitle(dayLabel, dayNumber, isEs)}</h2>
        </div>
        {onDuplicateDay ? (
          <button
            type="button"
            className="wolf-se-coach-day-strip__dup-btn"
            aria-label={isEs ? 'Duplicar día' : 'Duplicate day'}
            disabled={!canDuplicateDay}
            onClick={() => onDuplicateDay()}
          >
            <Copy size={18} aria-hidden />
          </button>
        ) : null}
      </div>
    </header>
  );
};
