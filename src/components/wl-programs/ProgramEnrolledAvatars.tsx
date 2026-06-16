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
      <span className="wl-programs-avatar-stack__label">
        {isEs
          ? `${enrolledAthletes.length} atleta${enrolledAthletes.length === 1 ? '' : 's'}`
          : `${enrolledAthletes.length} athlete${enrolledAthletes.length === 1 ? '' : 's'}`}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="wl-programs-avatar-stack-btn" onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className="wl-programs-avatar-stack-wrap">{content}</div>;
}
