import type { CoachProgramStatus } from '../../models/coach-architecture';

export function ProgramStatusBadge({
  status,
  isEs,
}: {
  status: CoachProgramStatus;
  isEs: boolean;
}) {
  const label =
    status === 'published'
      ? isEs
        ? 'Publicado'
        : 'Published'
      : status === 'archived'
        ? isEs
          ? 'Archivado'
          : 'Archived'
        : isEs
          ? 'Borrador'
          : 'Draft';

  return (
    <span className={`wl-programs-status-badge wl-programs-status-badge--${status}`}>
      {label}
    </span>
  );
}
