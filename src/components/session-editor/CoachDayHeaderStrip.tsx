import React, { useEffect, useRef, useState } from 'react';
import { Activity, Copy, Dumbbell, MoreVertical, Target, TrendingUp } from 'lucide-react';
import type { Athlete, Exercise, Session } from '../../models/training';
import {
  sessionAvgIntensity,
  sessionFatigueLabel,
  sessionFatigueTier,
  sessionTonnage,
} from './blockMetrics';

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
  session,
  athlete,
  exercises,
  isEs,
  dayNumber,
  dayLabel,
  onDuplicateDay,
  canDuplicateDay = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickAway = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onClickAway);
    return () => window.removeEventListener('mousedown', onClickAway);
  }, [menuOpen]);

  const tonnage = sessionTonnage(session, athlete, exercises);
  const avgPct = sessionAvgIntensity(session.exercises);
  const fatigueTier = sessionFatigueTier(session, athlete, exercises);
  const fatigue = sessionFatigueLabel(fatigueTier, isEs);
  const dayEyebrow =
    dayNumber != null ? (isEs ? `DÍA ${dayNumber}` : `DAY ${dayNumber}`) : isEs ? 'DÍA' : 'DAY';

  return (
    <header className="wolf-se-coach-day-strip">
      <div className="wolf-se-coach-day-strip__head">
        <span className="wolf-se-coach-day-strip__icon" aria-hidden>
          <Target size={18} strokeWidth={2} />
        </span>
        <div className="wolf-se-coach-day-strip__titles">
          <span className="wolf-se-coach-day-strip__eyebrow">{dayEyebrow}</span>
          <h2 className="wolf-se-coach-day-strip__title">{dayTitle(dayLabel, dayNumber, isEs)}</h2>
        </div>
        {onDuplicateDay ? (
          <div className="wolf-se-coach-day-strip__menu" ref={menuRef}>
            <button
              type="button"
              className="wolf-se-coach-day-strip__menu-btn"
              aria-label={isEs ? 'Acciones del día' : 'Day actions'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreVertical size={20} aria-hidden />
            </button>
            {menuOpen ? (
              <div className="wolf-se-coach-day-strip__menu-list" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  disabled={!canDuplicateDay}
                  onClick={() => {
                    setMenuOpen(false);
                    onDuplicateDay();
                  }}
                >
                  <Copy size={16} aria-hidden />
                  {isEs ? 'Duplicar día' : 'Duplicate day'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="wolf-se-coach-day-strip__kpis" aria-label={isEs ? 'Resumen del día' : 'Day summary'}>
        <div className="wolf-se-coach-day-strip__kpi wolf-se-coach-day-strip__kpi--volume">
          <Dumbbell size={14} aria-hidden className="wolf-se-coach-day-strip__kpi-icon" />
          <span className="wolf-se-coach-day-strip__kpi-label">{isEs ? 'Volumen' : 'Volume'}</span>
          <strong className="wolf-se-coach-day-strip__kpi-value">
            {tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—'}
          </strong>
        </div>
        <div className="wolf-se-coach-day-strip__kpi wolf-se-coach-day-strip__kpi--intensity">
          <TrendingUp size={14} aria-hidden className="wolf-se-coach-day-strip__kpi-icon" />
          <span className="wolf-se-coach-day-strip__kpi-label">{isEs ? 'Intensidad' : 'Intensity'}</span>
          <strong className="wolf-se-coach-day-strip__kpi-value">{avgPct > 0 ? `${avgPct}%` : '—'}</strong>
        </div>
        <div className={`wolf-se-coach-day-strip__kpi wolf-se-coach-day-strip__kpi--fatigue wolf-se-coach-day-strip__kpi--${fatigueTier}`}>
          <Activity size={14} aria-hidden className="wolf-se-coach-day-strip__kpi-icon" />
          <span className="wolf-se-coach-day-strip__kpi-label">
            {isEs ? 'Fatiga estimada' : 'Est. fatigue'}
          </span>
          <strong className="wolf-se-coach-day-strip__kpi-value">{fatigue}</strong>
        </div>
      </div>
    </header>
  );
};
