import { Info } from 'lucide-react';

export function WlInstanceEditBanner({
  isEs,
  athleteName,
  coachProgramId,
  onViewTemplate,
}: {
  isEs: boolean;
  athleteName: string;
  coachProgramId?: string;
  onViewTemplate: () => void;
}) {
  return (
    <aside className="wl-program-instance-banner" role="note">
      <Info size={16} className="wl-program-instance-banner__icon" aria-hidden />
      <div className="wl-program-instance-banner__copy">
        <p className="wl-program-instance-banner__lead">
          {isEs
            ? `Estás editando el programa de ${athleteName}.`
            : `You are editing ${athleteName}'s program.`}
        </p>
        <p className="wl-program-instance-banner__sub">
          {isEs
            ? 'Los cambios no afectan a otros atletas ni a la plantilla original.'
            : 'Changes do not affect other athletes or the original template.'}
        </p>
      </div>
      {coachProgramId ? (
        <button type="button" className="wl-program-instance-banner__link" onClick={onViewTemplate}>
          {isEs ? 'Ver plantilla' : 'View template'}
        </button>
      ) : null}
    </aside>
  );
}
