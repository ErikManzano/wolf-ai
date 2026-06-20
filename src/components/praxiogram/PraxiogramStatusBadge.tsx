import type { PraxiogramStatus } from '../../models/praxiogram';

export function PraxiogramStatusBadge({
  status,
  isEs,
}: {
  status: PraxiogramStatus;
  isEs: boolean;
}) {
  const label =
    status === 'published'
      ? isEs
        ? 'Publicado'
        : 'Published'
      : isEs
        ? 'Borrador'
        : 'Draft';

  return (
    <span className={`wl-programs-status-badge wl-programs-status-badge--${status}`}>
      {label}
    </span>
  );
}

export default PraxiogramStatusBadge;
