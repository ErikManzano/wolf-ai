import React from 'react';
import type { Session } from '../../models/training';

interface SessionDayHeroProps {
  session: Session;
  isEs: boolean;
  dayLabel?: string;
  weekNumber?: number;
  dayNumber?: number;
  syncPending?: boolean;
  draftSavedAt?: string | null;
}

export const SessionDayHero: React.FC<SessionDayHeroProps> = ({
  session,
  isEs,
  dayLabel,
  weekNumber,
  dayNumber,
  syncPending,
  draftSavedAt,
}) => {
  const title =
    dayLabel?.trim() ||
    (weekNumber != null && dayNumber != null
      ? isEs
        ? `Semana ${weekNumber} · Día ${dayNumber}`
        : `Week ${weekNumber} · Day ${dayNumber}`
      : isEs
        ? 'Sesión'
        : 'Session');

  const backup =
    syncPending
      ? isEs
        ? 'Guardando…'
        : 'Saving…'
      : draftSavedAt
        ? `${isEs ? 'Copia' : 'Backup'} ${new Date(draftSavedAt).toLocaleTimeString(isEs ? 'es' : 'en', { hour: '2-digit', minute: '2-digit' })}`
        : null;

  return (
    <header className="wolf-se-day-hero">
      <div className="wolf-se-day-hero-main">
        <p className="wolf-se-day-hero-kicker">{isEs ? 'Programación del día' : "Today's plan"}</p>
        <h2 className="wolf-se-day-hero-title">{title}</h2>
        <p className="wolf-se-day-hero-reps">
          <span className="wolf-se-day-hero-reps-num">{session.totalReps}</span>
          {isEs ? ' repeticiones' : ' reps'}
          <span className="wolf-se-day-hero-reps-sub">
            · {session.exercises.length} {isEs ? 'ejercicios' : 'exercises'}
          </span>
        </p>
      </div>
      <div className="wolf-se-day-hero-stats">
        <div className="wolf-se-hero-stat">
          <span className="wolf-se-hero-stat-val">{session.load}</span>
          <span className="wolf-se-hero-stat-lbl">kg</span>
        </div>
        <div className="wolf-se-hero-stat">
          <span className="wolf-se-hero-stat-val">{session.kValue.toFixed(1)}</span>
          <span className="wolf-se-hero-stat-lbl">K</span>
        </div>
        <div className="wolf-se-hero-stat">
          <span className="wolf-se-hero-stat-val">{session.avgRelativeIntensity.toFixed(0)}</span>
          <span className="wolf-se-hero-stat-lbl">%∅</span>
        </div>
      </div>
      {backup && <p className="wolf-se-day-hero-backup">{backup}</p>}
    </header>
  );
};
