import type { ProgramEnrollment } from '../../models/coach-architecture';
import { athleteInitials } from './programEnrollmentsUtils';

const MAX_VISIBLE = 4;

export function ProgramEnrolledAvatars({
  enrolledAthletes,
  isEs,
  onClick,
}: {
  enrolledAthletes: ProgramEnrollment[];
  isEs: boolean;
  onClick?: () => void;
}) {
  if (enrolledAthletes.length === 0) {
    return <span className="wl-programs-athletes-empty">{isEs ? 'Sin asignar' : 'Unassigned'}</span>;
  }

  const visible = enrolledAthletes.slice(0, MAX_VISIBLE);
  const overflow = enrolledAthletes.length - visible.length;
  const label =
    enrolledAthletes.length === 1
      ? enrolledAthletes[0]!.athleteName
      : isEs
        ? `${enrolledAthletes.length} atletas`
        : `${enrolledAthletes.length} athletes`;
  const manageLabel = isEs ? 'Gestionar inscritos' : 'Manage enrollments';
  const ariaLabel =
    enrolledAthletes.length === 1
      ? `${enrolledAthletes[0]!.athleteName}. ${manageLabel}.`
      : isEs
        ? `${enrolledAthletes.length} atletas inscritos. ${manageLabel}.`
        : `${enrolledAthletes.length} athletes enrolled. ${manageLabel}.`;

  const content = (
    <>
      <span className="wl-programs-avatar-stack" aria-hidden>
        {visible.map((e, i) => (
          <span
            key={e.assignmentId}
            className="wl-programs-avatar-stack__item"
            style={{ zIndex: MAX_VISIBLE - i }}
            title={e.athleteName}
          >
            {athleteInitials(e.athleteName)}
          </span>
        ))}
        {overflow > 0 ? (
          <span className="wl-programs-avatar-stack__item wl-programs-avatar-stack__item--more">+{overflow}</span>
        ) : null}
      </span>
      <span className="wl-programs-avatar-stack__label">{label}</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="wl-programs-avatar-stack-btn"
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        aria-label={ariaLabel}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="wl-programs-avatar-stack-wrap" aria-label={ariaLabel}>
      {content}
    </div>
  );
}
