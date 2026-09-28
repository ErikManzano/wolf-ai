import type { ProgramEnrollment } from '../../../models/coach-architecture';
import { ProgramContextSection } from './ProgramContextSection';

export function TemplateInstancesPanel({
  isEs,
  enrollments,
  onOpenAssignment,
}: {
  isEs: boolean;
  enrollments: ProgramEnrollment[];
  onOpenAssignment?: (assignmentId: string) => void;
}) {
  if (enrollments.length === 0) {
    return (
      <div className="wl-program-context-tab">
        <ProgramContextSection title={isEs ? 'Instancias' : 'Instances'}>
          <p className="wl-program-context-empty">
            {isEs
              ? 'Ningún atleta tiene aún una copia de esta plantilla. Usa Inscritos para asignar.'
              : 'No athlete copies yet. Use Enrollments to assign.'}
          </p>
        </ProgramContextSection>
      </div>
    );
  }

  const sorted = [...enrollments].sort((a, b) =>
    a.athleteName.localeCompare(b.athleteName, undefined, { sensitivity: 'base' }),
  );

  return (
    <div className="wl-program-context-tab">
      <ProgramContextSection
        title={isEs ? 'Instancias asignadas' : 'Assigned instances'}
        subtitle={`${sorted.length} ${isEs ? 'atletas' : 'athletes'}`}
      >
        <ul className="wl-template-instances-list">
          {sorted.map((e) => (
            <li key={e.assignmentId} className="wl-template-instances-list__row">
              <div className="wl-template-instances-list__meta">
                <span className="wl-template-instances-list__name">{e.athleteName}</span>
                {e.completionPct != null ? (
                  <span className="wl-template-instances-list__pct">
                    {Math.round(e.completionPct)}%
                  </span>
                ) : null}
              </div>
              {onOpenAssignment ? (
                <button
                  type="button"
                  className="btn-outline wl-template-instances-list__open"
                  onClick={() => onOpenAssignment(e.assignmentId)}
                >
                  {isEs ? 'Abrir plan' : 'Open plan'}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </ProgramContextSection>
    </div>
  );
}
