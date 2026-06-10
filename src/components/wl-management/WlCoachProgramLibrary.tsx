import React, { useMemo, useState } from 'react';
import { BookOpen, Pencil, Search, Trash2, UserPlus } from 'lucide-react';
import type { CoachWlProgramTemplate, GeneratedProgram } from '../../models/training';
import { mockAthletes } from '../../data/loadMockData';
import { useWlAssignments } from '../../modules/assignments';
import ConfirmationModal from '../ConfirmationModal';
import WlViewModeToggle, { useWlListViewMode } from './WlViewModeToggle';

interface WlCoachProgramLibraryProps {
  isEs: boolean;
  coachId: string | undefined;
  onAssigned: (assignmentId: string) => void;
  onOpenInEngine: (program: GeneratedProgram) => void;
}

const WlCoachProgramLibrary: React.FC<WlCoachProgramLibraryProps> = ({
  isEs,
  coachId,
  onAssigned,
  onOpenInEngine,
}) => {
  const { coachTemplates, assignFromTemplate, deleteCoachTemplate } = useWlAssignments();
  const [viewMode, setViewMode] = useWlListViewMode('library');
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignTplId, setAssignTplId] = useState<string | null>(null);
  const [targetAthleteId, setTargetAthleteId] = useState(mockAthletes[0]?.id ?? '');

  const templates = useMemo(() => {
    const scoped = !coachId ? coachTemplates : coachTemplates.filter((t) => t.coachId === coachId);
    const q = search.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter((t) => t.name.toLowerCase().includes(q));
  }, [coachTemplates, coachId, search]);

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(isEs ? 'es' : 'en', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const tplToDelete = templates.find((t) => t.id === deleteId);

  const renderActions = (tpl: CoachWlProgramTemplate, compact?: boolean) => (
    <div className={`wl-mgmt-row-actions${compact ? ' wl-mgmt-row-actions--compact' : ''}`}>
      <button type="button" className="btn-primary wl-mgmt-crud-btn" onClick={() => setAssignTplId(tpl.id)}>
        <UserPlus size={14} aria-hidden />
        {isEs ? 'Asignar' : 'Assign'}
      </button>
      <button type="button" className="btn-secondary wl-mgmt-crud-btn" onClick={() => onOpenInEngine(tpl.program)}>
        <Pencil size={14} aria-hidden />
        {isEs ? 'Motor' : 'Engine'}
      </button>
      <button
        type="button"
        className="btn-outline wl-mgmt-crud-btn wl-mgmt-danger-btn"
        onClick={() => setDeleteId(tpl.id)}
        aria-label={isEs ? 'Eliminar' : 'Delete'}
      >
        <Trash2 size={14} aria-hidden />
      </button>
    </div>
  );

  return (
    <div className="wl-mgmt-library wl-mgmt-crud-panel">
      <div className="wl-mgmt-crud-toolbar">
        <p className="wl-mgmt-library-hint">
          {isEs
            ? 'Plantillas reutilizables. Asígnalas o ábrelas en el motor.'
            : 'Reusable templates. Assign or open in the engine.'}
        </p>
        <div className="wl-mgmt-crud-toolbar-row">
          <label className="wl-mgmt-search">
            <Search size={16} aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isEs ? 'Buscar plantilla…' : 'Search template…'}
            />
          </label>
          <WlViewModeToggle storageKey="library" isEs={isEs} value={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {templates.length === 0 ? (
        <p className="wl-mgmt-empty">{isEs ? 'No hay plantillas guardadas.' : 'No saved templates yet.'}</p>
      ) : viewMode === 'table' ? (
        <div className="wl-mgmt-table-wrap">
          <table className="wl-mgmt-crud-table">
            <thead>
              <tr>
                <th>{isEs ? 'Nombre' : 'Name'}</th>
                <th>{isEs ? 'Semanas' : 'Weeks'}</th>
                <th>{isEs ? 'Días/sem' : 'Days/wk'}</th>
                <th>{isEs ? 'Guardado' : 'Saved'}</th>
                <th className="wl-mgmt-crud-table__actions">{isEs ? 'Acciones' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr key={tpl.id}>
                  <td data-label={isEs ? 'Nombre' : 'Name'}>
                    <span className="wl-mgmt-table-name">
                      <BookOpen size={16} aria-hidden />
                      {tpl.name}
                    </span>
                  </td>
                  <td data-label={isEs ? 'Semanas' : 'Weeks'}>{tpl.program.totalWeeks}</td>
                  <td data-label={isEs ? 'Días/sem' : 'Days/wk'}>{tpl.program.daysPerWeek}</td>
                  <td data-label={isEs ? 'Guardado' : 'Saved'}>{fmt(tpl.updatedAt)}</td>
                  <td data-label={isEs ? 'Acciones' : 'Actions'}>{renderActions(tpl, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="wl-mgmt-library-grid">
          {templates.map((tpl) => (
            <li key={tpl.id} className="wl-mgmt-library-card">
              <div className="wl-mgmt-library-card-head">
                <BookOpen size={18} aria-hidden />
                <strong>{tpl.name}</strong>
              </div>
              <span className="wl-mgmt-library-meta">
                {tpl.program.totalWeeks}w · {tpl.program.daysPerWeek}d/w
              </span>
              <span className="wl-mgmt-library-date">
                {isEs ? 'Guardado' : 'Saved'}: {fmt(tpl.updatedAt)}
              </span>
              {renderActions(tpl)}
            </li>
          ))}
        </ul>
      )}

      {assignTplId && (
        <div className="wl-mgmt-inline-form wl-mgmt-inline-form--modal">
          <p className="wl-mgmt-inline-form-title">{isEs ? 'Asignar plantilla' : 'Assign template'}</p>
          <label className="wolf-engine-field">
            <span>{isEs ? 'Atleta' : 'Athlete'}</span>
            <select value={targetAthleteId} onChange={(e) => setTargetAthleteId(e.target.value)}>
              {mockAthletes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <div className="wl-mgmt-inline-form-btns">
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                try {
                  const id = await assignFromTemplate(assignTplId, targetAthleteId);
                  if (id) {
                    onAssigned(id);
                    setAssignTplId(null);
                  }
                } catch {
                  /* alerta mostrada en el provider */
                }
              }}
            >
              {isEs ? 'Confirmar' : 'Confirm'}
            </button>
            <button type="button" className="btn-outline" onClick={() => setAssignTplId(null)}>
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      <ConfirmationModal
        open={deleteId != null}
        title={isEs ? 'Eliminar plantilla' : 'Delete template'}
        message={
          isEs
            ? `¿Eliminar «${tplToDelete?.name ?? ''}» de la biblioteca?`
            : `Delete "${tplToDelete?.name ?? ''}" from the library?`
        }
        confirmLabel={isEs ? 'Eliminar' : 'Delete'}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteCoachTemplate(deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
};

export default WlCoachProgramLibrary;
