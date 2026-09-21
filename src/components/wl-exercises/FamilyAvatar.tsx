import type { ExerciseFamilyId } from './types';

/** Colores suaves por familia — distinguen el grid sin degradados pesados. */
export const FAMILY_AVATAR: Record<
  ExerciseFamilyId,
  { abbr: string; background: string; color: string }
> = {
  snatch: { abbr: 'SN', background: '#ffedd5', color: '#c2410c' },
  clean: { abbr: 'CL', background: '#fef3c7', color: '#b45309' },
  jerk: { abbr: 'JK', background: '#dbeafe', color: '#1d4ed8' },
  pull: { abbr: 'TR', background: '#dcfce7', color: '#15803d' },
  squat: { abbr: 'SQ', background: '#f3e8ff', color: '#7e22ce' },
  press: { abbr: 'PR', background: '#fce7f3', color: '#be185d' },
  accessory: { abbr: 'AC', background: '#f3f4f6', color: '#374151' },
  core: { abbr: 'CO', background: '#cffafe', color: '#0e7490' },
};

export function FamilyAvatar({
  family,
  size = 40,
}: {
  family: ExerciseFamilyId | null;
  size?: number;
}) {
  const token = family ? FAMILY_AVATAR[family] : null;
  const abbr = token?.abbr ?? 'EX';

  return (
    <span
      className="wl-exercise-avatar"
      style={{
        width: size,
        height: size,
        background: token?.background ?? '#f3f4f6',
        color: token?.color ?? '#374151',
      }}
      aria-hidden
    >
      {abbr}
    </span>
  );
}
