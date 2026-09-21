import React, { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import type { CoachProgramRow } from '../../models/coach-architecture';
import { MAX_ACTIVE_PROGRAMS_PER_ATHLETE } from '../../utils/wlAssignmentRules';
import { WlFormSheet } from '../wl-shared/WlFormSheet';

export interface WlAthleteAssignProgramSheetProps {
  isEs: boolean;
  athleteName: string;
  assignedProgramIds: string[];
  programs: CoachProgramRow[];
  onClose: () => void;
  onAssign: (programId: string) => Promise<void>;
}

const WlAthleteAssignProgramSheet: React.FC<WlAthleteAssignProgramSheetProps> = ({
  isEs,
  athleteName,
  assignedProgramIds,
  programs,
  onClose,
  onAssign,
}) => {
  const options = useMemo(
    () => programs.filter((program) => program.status !== 'archived'),
    [programs],
  );
  const assigned = useMemo(() => new Set(assignedProgramIds), [assignedProgramIds]);
  const firstAvailable = options.find((program) => !assigned.has(program.id))?.id ?? '';
  const [programId, setProgramId] = useState(firstAvailable);
  const [saving, setSaving] = useState(false);

  const selected = options.find((program) => program.id === programId) ?? null;
  const alreadyAssigned = Boolean(selected && assigned.has(selected.id));
  const atLimit = assignedProgramIds.length >= MAX_ACTIVE_PROGRAMS_PER_ATHLETE;
  const canSave = Boolean(programId) && !alreadyAssigned && !saving && !atLimit;

  const handleSubmit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onAssign(programId);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <div className="wl-form-sheet-footer__actions">
      <button type="button" className="wl-form-sheet-btn wl-form-sheet-btn--ghost" onClick={onClose}>
        {isEs ? 'Cancelar' : 'Cancel'}
      </button>
      <button
        type="button"
        className="wl-form-sheet-btn wl-form-sheet-btn--primary"
        disabled={!canSave}
        onClick={() => void handleSubmit()}
      >
        <Save size={16} aria-hidden />
        {saving ? (isEs ? 'Asignando…' : 'Assigning…') : isEs ? 'Asignar programa' : 'Assign program'}
      </button>
    </div>
  );

  return (
    <WlFormSheet
      isEs={isEs}
      kicker={isEs ? 'Asignación' : 'Assignment'}
      title={isEs ? 'Asignar programa' : 'Assign program'}
      subtitle={
        isEs
          ? `Elige un mesociclo para ${athleteName}.`
          : `Choose a mesocycle for ${athleteName}.`
      }
      titleId="wl-athlete-assign-title"
      onClose={onClose}
      footer={footer}
    >
      {atLimit ? (
        <section className="wl-form-sheet-summary wl-form-sheet-summary--note">
          <p className="wl-form-sheet-summary__lead">
            {isEs
              ? `Máximo ${MAX_ACTIVE_PROGRAMS_PER_ATHLETE} programas por atleta. Quita uno para asignar otro.`
              : `Maximum ${MAX_ACTIVE_PROGRAMS_PER_ATHLETE} programs per athlete. Remove one to assign another.`}
          </p>
        </section>
      ) : null}
      {options.length === 0 ? (
        <section className="wl-form-sheet-summary">
          <p className="wl-form-sheet-summary__lead">
            {isEs ? 'No hay programas disponibles. Crea uno en Programas.' : 'No programs available. Create one in Programs.'}
          </p>
        </section>
      ) : (
        <div className="wl-form-sheet-grid wl-form-sheet-grid--single">
          <label className="wl-form-sheet-field">
            <span className="wl-form-sheet-label">{isEs ? 'Programa' : 'Program'}</span>
            <select
              className="wl-form-sheet-select"
              value={programId}
              disabled={atLimit}
              onChange={(event) => setProgramId(event.target.value)}
            >
              {options.map((program) => {
                const taken = assigned.has(program.id);
                return (
                  <option key={program.id} value={program.id} disabled={taken}>
                    {program.name}
                    {taken ? (isEs ? ' (ya asignado)' : ' (already assigned)') : ''}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      )}
    </WlFormSheet>
  );
};

export default WlAthleteAssignProgramSheet;
