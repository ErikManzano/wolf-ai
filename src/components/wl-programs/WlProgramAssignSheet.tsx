import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import type { CoachProgramRow } from '../../models/coach-architecture';
import ProgramEnrollmentsPanel, { type EnrollmentSheetFooterState } from './ProgramEnrollmentsPanel';

interface WlProgramAssignSheetProps {
  isEs: boolean;
  program: CoachProgramRow;
  preselectedAthleteId?: string;
  onClose: () => void;
  onAssigned?: () => void;
}

const WlProgramAssignSheet: React.FC<WlProgramAssignSheetProps> = ({
  isEs,
  program,
  preselectedAthleteId,
  onClose,
  onAssigned,
}) => {
  const [footer, setFooter] = useState<EnrollmentSheetFooterState | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const weekCount = program.program.weeks?.length
    ? (program.program.totalWeeks ?? program.program.weeks.length)
    : 0;
  const structureLabel = weekCount > 0
    ? `${weekCount} ${isEs ? 'sem' : 'wk'}`
    : isEs
      ? 'Sin estructura'
      : 'No structure';

  const handleFooterChange = useCallback((state: EnrollmentSheetFooterState) => {
    setFooter(state);
  }, []);

  const handleSave = async () => {
    if (!footer) {
      onClose();
      return;
    }
    if (footer.assignableCount > 0) {
      await footer.save();
      return;
    }
    onClose();
  };

  const selectedLabel =
    footer && footer.selectedCount > 0
      ? isEs
        ? `${footer.selectedCount} atleta${footer.selectedCount === 1 ? '' : 's'} seleccionado${footer.selectedCount === 1 ? '' : 's'}`
        : `${footer.selectedCount} athlete${footer.selectedCount === 1 ? '' : 's'} selected`
      : isEs
        ? 'Ningún atleta seleccionado'
        : 'No athletes selected';

  return createPortal(
    <div className="wl-program-assign-overlay" role="presentation" onClick={onClose}>
      <div
        className="wl-program-assign-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wl-program-assign-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wl-program-assign-sheet-handle" aria-hidden />
        <header className="wl-program-assign-head">
          <div className="wl-program-assign-head__content">
            <p className="wl-program-assign-kicker">{isEs ? 'Gestionar inscritos' : 'Manage enrollments'}</p>
            <h2 id="wl-program-assign-title" className="wl-program-assign-title">
              {program.name}
            </h2>
            <p className="wl-program-assign-meta">
              {structureLabel}
              <span className="wl-program-assign-meta__sep" aria-hidden>
                |
              </span>
              {program.enrolledAthletes.length} {isEs ? 'inscritos' : 'enrolled'}
            </p>
          </div>
          <button
            type="button"
            className="wl-program-assign-close"
            onClick={onClose}
            aria-label={isEs ? 'Cerrar' : 'Close'}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="wl-program-assign-body">
          <ProgramEnrollmentsPanel
            isEs={isEs}
            program={program}
            variant="sheet"
            preselectedAthleteId={preselectedAthleteId}
            onSheetFooterChange={handleFooterChange}
            onAssigned={() => {
              onAssigned?.();
              onClose();
            }}
          />
        </div>

        <footer className="wl-program-assign-footer">
          <p className="wl-program-assign-footer__count">{selectedLabel}</p>
          <div className="wl-program-assign-footer__actions">
            <button type="button" className="wl-program-assign-btn wl-program-assign-btn--ghost" onClick={onClose}>
              {isEs ? 'Cerrar' : 'Close'}
            </button>
            <button
              type="button"
              className="wl-program-assign-btn wl-program-assign-btn--primary"
              disabled={footer?.saving}
              onClick={() => void handleSave()}
            >
              <Save size={16} aria-hidden />
              {footer?.saving ? (isEs ? 'Guardando…' : 'Saving…') : isEs ? 'Guardar' : 'Save'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default WlProgramAssignSheet;
