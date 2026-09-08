import React, { useMemo } from 'react';
import type { GeneratedProgram } from '../../models/training';
import { programAthleteAcwr, type AcwrStatus } from './programScienceStats';
import { StatusBadge, type StatusBadgeTone } from './stats-ds';

export interface AthleteAcwrRow {
  athleteProfileId: string;
  name: string;
}

export interface AthletesAcwrRosterProps {
  program: GeneratedProgram;
  weekNumber: number;
  athletes: AthleteAcwrRow[];
  isEs: boolean;
  selectedAthleteId?: string;
  onSelectAthlete?: (athleteProfileId: string) => void;
}

function acwrTone(status: AcwrStatus | null): StatusBadgeTone {
  if (status === 'OPTIMAL') return 'optimal';
  if (status === 'ATENCION') return 'heavy';
  if (status === 'RIESGO') return 'intense';
  return 'none';
}

/**
 * Roster ACWR from prescribed mesocycle TL (same program shape per enrollment).
 * Not calendar rolling load from logs.
 */
export const AthletesAcwrRoster: React.FC<AthletesAcwrRosterProps> = ({
  program,
  weekNumber,
  athletes,
  isEs,
  selectedAthleteId,
  onSelectAthlete,
}) => {
  const rows = useMemo(() => {
    const metrics = programAthleteAcwr(program, weekNumber);
    return athletes.map((a) => ({
      ...a,
      weeklyTl: metrics.weeklyTl,
      acwr: metrics.acwr,
      acwrStatus: metrics.acwrStatus,
    }));
  }, [athletes, program, weekNumber]);

  if (athletes.length === 0) {
    return (
      <p className="wl-stats-rank__empty">
        {isEs
          ? 'Sin atletas inscritos. El ACWR de roster aparece al asignar el programa.'
          : 'No enrolled athletes. Roster ACWR appears after assignment.'}
      </p>
    );
  }

  return (
    <div className="wl-stats-roster">
      <p className="wl-stats-roster__hint">
        {isEs
          ? 'ACWR de mesociclo prescrito (no días calendario ni logs).'
          : 'Prescribed mesocycle ACWR (not calendar days or logs).'}
      </p>
      <ul className="wl-stats-roster__list">
        {rows.map((row) => {
          const selected = selectedAthleteId === row.athleteProfileId;
          const initials = row.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase() ?? '')
            .join('');
          const content = (
            <>
              <span className="wl-stats-roster__thumb" aria-hidden>
                {initials || '?'}
              </span>
              <span className="wl-stats-roster__meta">
                <span className="wl-stats-roster__name">{row.name}</span>
                <span className="wl-stats-roster__tl">
                  {isEs ? 'TL semanal' : 'Weekly TL'}: {row.weeklyTl} AU
                </span>
              </span>
              <span className="wl-stats-roster__acwr">
                {row.acwr != null ? (
                  <StatusBadge label={String(row.acwr)} tone={acwrTone(row.acwrStatus)} />
                ) : (
                  '—'
                )}
              </span>
            </>
          );

          if (onSelectAthlete) {
            return (
              <li key={row.athleteProfileId}>
                <button
                  type="button"
                  className={`wl-stats-roster__row${selected ? ' is-selected' : ''}`}
                  onClick={() => onSelectAthlete(row.athleteProfileId)}
                >
                  {content}
                </button>
              </li>
            );
          }

          return (
            <li key={row.athleteProfileId} className="wl-stats-roster__row">
              {content}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
