import React from 'react';
import { Cloud, CloudOff, Loader2, Plus } from 'lucide-react';
import type { Session } from '../../models/training';

interface StickySessionBarProps {
  session: Session;
  isEs: boolean;
  draftSavedAt: string | null;
  syncPending: boolean;
  canAddExercise: boolean;
  onAddExercise: () => void;
}

export const StickySessionBar: React.FC<StickySessionBarProps> = ({
  session,
  isEs,
  draftSavedAt,
  syncPending,
  canAddExercise,
  onAddExercise,
}) => {
  const savedLabel = draftSavedAt
    ? new Date(draftSavedAt).toLocaleTimeString(isEs ? 'es' : 'en', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="wolf-se-sticky-bar" role="status" aria-live="polite">
      <div className="wolf-se-sticky-inner">
        <div>
          <p className="wolf-se-sticky-metrics">
            {session.load} kg · K {session.kValue.toFixed(1)}
          </p>
          <p className="wolf-se-sticky-sub">
            {syncPending ? (
              <>
                <Loader2 size={12} />
                {isEs ? 'Guardando…' : 'Saving…'}
              </>
            ) : savedLabel ? (
              <>
                <Cloud size={12} />
                {isEs ? `Copia ${savedLabel}` : `Backup ${savedLabel}`}
              </>
            ) : (
              <>
                <CloudOff size={12} />
                {isEs ? 'Sin copia' : 'No backup'}
              </>
            )}
          </p>
        </div>
        <button type="button" className="wolf-se-btn wolf-se-btn--primary wolf-se-btn--sm" disabled={!canAddExercise} onClick={onAddExercise}>
          <Plus size={16} />
          {isEs ? 'Ejercicio' : 'Exercise'}
        </button>
      </div>
    </div>
  );
};
