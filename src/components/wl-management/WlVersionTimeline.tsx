import React, { useMemo, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import type { ProgramAssignment } from '../../models/training';
import ConfirmationModal from '../ConfirmationModal';

interface WlVersionTimelineProps {
  assignment: ProgramAssignment;
  isEs: boolean;
  onRestore: (version: number) => void;
}

const WlVersionTimeline: React.FC<WlVersionTimelineProps> = ({ assignment, isEs, onRestore }) => {
  const [restoreTarget, setRestoreTarget] = useState<number | null>(null);

  const entries = useMemo(() => {
    const hist = [...(assignment.versionHistory ?? [])].sort((a, b) => b.version - a.version);
    const current = {
      version: assignment.version,
      editedAt: assignment.assignedAt,
      program: assignment.program,
      isCurrent: true,
    };
    return [current, ...hist.map((h) => ({ ...h, isCurrent: false }))];
  }, [assignment]);

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(isEs ? 'es' : 'en', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="wl-mgmt-versions" aria-labelledby="wl-mgmt-versions-title">
      <div className="wl-mgmt-versions-head">
        <History size={16} aria-hidden />
        <h3 id="wl-mgmt-versions-title">{isEs ? 'Historial de versiones' : 'Version history'}</h3>
      </div>
      <ul className="wl-mgmt-version-list">
        {entries.map((e) => (
          <li key={e.version} className={`wl-mgmt-version-item ${e.isCurrent ? 'wl-mgmt-version-item--current' : ''}`}>
            <div className="wl-mgmt-version-main">
              <strong>
                v{e.version}
                {e.isCurrent ? (isEs ? ' · Actual' : ' · Current') : ''}
              </strong>
              <span className="wl-mgmt-version-meta">
                {e.program.name} · {e.program.totalWeeks}w · {e.program.daysPerWeek}d/w
              </span>
              <span className="wl-mgmt-version-date">{fmt(e.editedAt)}</span>
            </div>
            {!e.isCurrent && (
              <button
                type="button"
                className="btn-outline wl-mgmt-version-restore"
                onClick={() => setRestoreTarget(e.version)}
              >
                <RotateCcw size={14} aria-hidden />
                {isEs ? 'Restaurar' : 'Restore'}
              </button>
            )}
          </li>
        ))}
      </ul>

      <ConfirmationModal
        open={restoreTarget != null}
        title={isEs ? 'Restaurar versión' : 'Restore version'}
        message={
          isEs
            ? `¿Restaurar la versión v${restoreTarget}? La versión actual pasará al historial.`
            : `Restore version v${restoreTarget}? The current version will be archived in history.`
        }
        confirmLabel={isEs ? 'Restaurar' : 'Restore'}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger
        onCancel={() => setRestoreTarget(null)}
        onConfirm={() => {
          if (restoreTarget != null) onRestore(restoreTarget);
          setRestoreTarget(null);
        }}
      />
    </div>
  );
};

export default WlVersionTimeline;
