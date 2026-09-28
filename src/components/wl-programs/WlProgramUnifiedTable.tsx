import type { UnifiedProgramRow } from './unifiedProgramList';
import { WlProgramUnifiedRow } from './WlProgramUnifiedRow';

export function WlProgramUnifiedTable({
  rows,
  isEs,
  onTemplateRowClick,
  onIndividualRowClick,
  onFilterByTemplate,
  onOpenAthlete,
  getTemplateActions,
  getIndividualActions,
}: {
  rows: UnifiedProgramRow[];
  isEs: boolean;
  onTemplateRowClick: (row: Extract<UnifiedProgramRow, { kind: 'template' }>) => void;
  onIndividualRowClick: (row: Extract<UnifiedProgramRow, { kind: 'individual' }>) => void;
  onFilterByTemplate: (coachProgramId: string) => void;
  onOpenAthlete: (profileId: string) => void;
  getTemplateActions: (row: Extract<UnifiedProgramRow, { kind: 'template' }>) => {
    onAssign: () => void;
    onEdit: () => void;
    onSchedule: () => void;
    onDuplicate: () => void;
    onArchive?: () => void;
    onDelete: () => void;
  };
  getIndividualActions: (row: Extract<UnifiedProgramRow, { kind: 'individual' }>) => {
    onEdit: () => void;
    onSaveAsTemplate: () => void;
    onUpdateTemplate?: () => void;
    showUpdateTemplate: boolean;
    onAssignOther: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
  };
}) {
  return (
    <div className="wl-programs-table-wrap">
      <table className="wl-programs-table wl-programs-table--unified">
        <thead>
          <tr>
            <th>{isEs ? 'Programa' : 'Program'}</th>
            <th>{isEs ? 'Tipo / Atleta' : 'Type / Athlete'}</th>
            <th>{isEs ? 'Semanas' : 'Weeks'}</th>
            <th>{isEs ? 'Adherencia' : 'Adherence'}</th>
            <th className="wl-programs-col-actions">{isEs ? 'Acciones' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <WlProgramUnifiedRow
              key={row.id}
              row={row}
              isEs={isEs}
              onRowClick={() =>
                row.kind === 'template' ? onTemplateRowClick(row) : onIndividualRowClick(row)
              }
              onFilterByTemplate={onFilterByTemplate}
              onOpenAthlete={onOpenAthlete}
              templateActions={row.kind === 'template' ? getTemplateActions(row) : undefined}
              individualActions={row.kind === 'individual' ? getIndividualActions(row) : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
