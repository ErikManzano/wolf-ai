import type { AthleteLevel } from '../../models/training';

const LABELS: Record<AthleteLevel, { es: string; en: string }> = {
  beginner: { es: 'Principiante', en: 'Beginner' },
  intermediate: { es: 'Intermedio', en: 'Intermediate' },
  advanced: { es: 'Avanzado', en: 'Advanced' },
};

export function LevelBadge({ level, isEs }: { level: AthleteLevel; isEs: boolean }) {
  const label = isEs ? LABELS[level].es : LABELS[level].en;
  return (
    <span className={`wl-athletes-level-badge wl-athletes-level-badge--${level}`}>
      {label}
    </span>
  );
}
