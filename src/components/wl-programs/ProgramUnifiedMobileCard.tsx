import type { ComponentProps } from 'react';
import type { UnifiedProgramRow } from './unifiedProgramList';
import { WlProgramIndividualActions } from './WlProgramIndividualActions';
import { WlProgramTemplateActions } from './WlProgramTemplateActions';

export function ProgramUnifiedMobileCard({
  row,
  isEs,
  onOpen,
  templateActions,
  individualActions,
}: {
  row: UnifiedProgramRow;
  isEs: boolean;
  onOpen: () => void;
  templateActions?: Omit<ComponentProps<typeof WlProgramTemplateActions>, 'isEs'>;
  individualActions?: Omit<ComponentProps<typeof WlProgramIndividualActions>, 'isEs'>;
}) {
  return (
    <article
      className="wl-program-card wl-program-card--unified"
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <header className="wl-program-card__header">
        <div className="wl-program-card__title-row">
          <h3>{row.displayName}</h3>
          {row.kind === 'template' ? (
            <span className="wl-programs-badge wl-programs-badge--template">{isEs ? 'Plantilla' : 'Template'}</span>
          ) : (
            <span className="wl-programs-unified-athlete__name">{row.athleteName}</span>
          )}
        </div>
      </header>
      {row.dateRange ? <p className="wl-program-card__dates">{row.dateRange}</p> : null}
      {row.kind === 'individual' ? (
        <p className="wl-program-card__origin">{row.originLabel}</p>
      ) : null}
      <div
        className="wl-program-card__footer-actions"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        {row.kind === 'template' && templateActions ? (
          <WlProgramTemplateActions isEs={isEs} {...templateActions} />
        ) : null}
        {row.kind === 'individual' && individualActions ? (
          <WlProgramIndividualActions isEs={isEs} {...individualActions} />
        ) : null}
      </div>
    </article>
  );
}
