import type { UnifiedProgramRow } from './unifiedProgramList';
import { WlProgramIndividualActions } from './WlProgramIndividualActions';
import { WlProgramTemplateActions } from './WlProgramTemplateActions';

function athleteInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

export function WlProgramUnifiedRow({
  row,
  isEs,
  onRowClick,
  onFilterByTemplate,
  onOpenAthlete,
  templateActions,
  individualActions,
}: {
  row: UnifiedProgramRow;
  isEs: boolean;
  onRowClick: () => void;
  onFilterByTemplate: (coachProgramId: string) => void;
  onOpenAthlete: (profileId: string) => void;
  templateActions?: {
    onAssign: () => void;
    onEdit: () => void;
    onSchedule: () => void;
    onDuplicate: () => void;
    onArchive?: () => void;
    onDelete: () => void;
  };
  individualActions?: {
    onEdit: () => void;
    onSaveAsTemplate: () => void;
    onUpdateTemplate?: () => void;
    showUpdateTemplate: boolean;
    onAssignOther: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
  };
}) {
  const adherence =
    row.kind === 'template'
      ? row.adherencePct != null
        ? `${row.adherencePct}%`
        : '—'
      : row.adherencePct != null
        ? `${row.adherencePct}%`
        : '—';

  const weeks = row.weekCount;

  return (
    <tr
      className="wl-programs-table-row wl-programs-table-row--unified"
      tabIndex={0}
      onClick={(e) => {
        if (programRowClickIgnores(e.target)) return;
        onRowClick();
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (programRowClickIgnores(e.target)) return;
        e.preventDefault();
        onRowClick();
      }}
    >
      <td className="wl-programs-unified-col-program">
        <strong className="wl-programs-table-row__name">{row.displayName}</strong>
        {row.dateRange ? <p className="wl-programs-table-row__dates">{row.dateRange}</p> : null}
        {row.kind === 'individual' ? (
          <p className="wl-programs-table-row__origin">{row.originLabel}</p>
        ) : null}
        {row.kind === 'template' && row.assignmentCount > 0 ? (
          <p className="wl-programs-table-row__origin">
            <button
              type="button"
              className="wl-programs-unified-link"
              onClick={(e) => {
                e.stopPropagation();
                onFilterByTemplate(row.template.id);
              }}
            >
              {isEs
                ? `${row.assignmentCount} atleta${row.assignmentCount === 1 ? '' : 's'} asignado${row.assignmentCount === 1 ? '' : 's'}`
                : `${row.assignmentCount} assigned athlete${row.assignmentCount === 1 ? '' : 's'}`}
            </button>
          </p>
        ) : null}
      </td>
      <td className="wl-programs-unified-col-type">
        {row.kind === 'template' ? (
          <span
            className="wl-programs-badge wl-programs-badge--template"
            title={
              isEs
                ? 'Base reutilizable. Se puede asignar a múltiples atletas.'
                : 'Reusable base. Can be assigned to multiple athletes.'
            }
          >
            {isEs ? 'Plantilla' : 'Template'}
          </span>
        ) : (
          <button
            type="button"
            className="wl-programs-unified-athlete"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAthlete(row.athleteProfileId);
            }}
          >
            <span className="wl-programs-unified-athlete__avatar" aria-hidden>
              {athleteInitials(row.athleteName)}
            </span>
            <span className="wl-programs-unified-athlete__name">{row.athleteName}</span>
          </button>
        )}
      </td>
      <td className="wl-programs-unified-col-weeks">{row.kind === 'template' ? '—' : weeks}</td>
      <td className="wl-programs-unified-col-adherence">
        {row.kind === 'template' ? '—' : (
          <div className="wl-programs-adherence-cell">
            <span>{adherence}</span>
            {row.adherencePct != null ? (
              <div className="wl-programs-adherence-bar" aria-hidden>
                <i style={{ width: `${row.adherencePct}%` }} />
              </div>
            ) : null}
          </div>
        )}
      </td>
      <td className="wl-programs-col-actions">
        {row.kind === 'template' && templateActions ? (
          <WlProgramTemplateActions isEs={isEs} {...templateActions} />
        ) : null}
        {row.kind === 'individual' && individualActions ? (
          <WlProgramIndividualActions isEs={isEs} {...individualActions} />
        ) : null}
      </td>
    </tr>
  );
}

function programRowClickIgnores(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, input, select, textarea, label, [role="combobox"], .wl-programs-unified-actions, .wl-programs-actions-menu',
    ),
  );
}
