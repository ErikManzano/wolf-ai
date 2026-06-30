import React from 'react';
import { AlertCircle, Check, Cloud, CloudOff, Loader2, Plus, RefreshCw } from 'lucide-react';
import type { Session } from '../../models/training';
import type { ProgramSyncState } from '../wl-programs/programSync';

interface StickySessionBarProps {
  session: Session;
  isEs: boolean;
  draftSavedAt: string | null;
  syncPending: boolean;
  saveState?: ProgramSyncState;
  onRetrySave?: () => void;
  canAddExercise: boolean;
  onAddExercise: () => void;
  addLabel?: string;
  hideMetrics?: boolean;
}

function formatSavedAt(iso: string | null, isEs: boolean): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString(isEs ? 'es' : 'en', { hour: '2-digit', minute: '2-digit' });
}

export const StickySessionBar: React.FC<StickySessionBarProps> = ({
  session,
  isEs,
  draftSavedAt,
  syncPending,
  saveState,
  onRetrySave,
  canAddExercise,
  onAddExercise,
  addLabel,
  hideMetrics = false,
}) => {
  const savedLabel = formatSavedAt(draftSavedAt, isEs);
  const cloudMode = saveState != null;

  const status = (() => {
    if (cloudMode) {
      if (saveState === 'saving') {
        return {
          tone: 'saving' as const,
          icon: <Loader2 size={12} className="wolf-se-sticky-spin" aria-hidden />,
          label: isEs ? 'Guardando en la nube…' : 'Saving to cloud…',
        };
      }
      if (saveState === 'pending') {
        return {
          tone: 'pending' as const,
          icon: <Cloud size={12} aria-hidden />,
          label: isEs ? 'Cambios pendientes' : 'Unsaved changes',
        };
      }
      return {
        tone: 'saved' as const,
        icon: <Check size={12} aria-hidden />,
        label: savedLabel
          ? isEs
            ? `Guardado ${savedLabel}`
            : `Saved ${savedLabel}`
          : isEs
            ? 'Guardado'
            : 'Saved',
      };
    }
    if (syncPending) {
      return {
        tone: 'saving' as const,
        icon: <Loader2 size={12} className="wolf-se-sticky-spin" aria-hidden />,
        label: isEs ? 'Guardando copia local…' : 'Saving local backup…',
      };
    }
    if (savedLabel) {
      return {
        tone: 'saved' as const,
        icon: <Cloud size={12} aria-hidden />,
        label: isEs ? `Copia local ${savedLabel}` : `Local backup ${savedLabel}`,
      };
    }
    return {
      tone: 'idle' as const,
      icon: <CloudOff size={12} aria-hidden />,
      label: isEs ? 'Sin copia local' : 'No local backup',
    };
  })();

  const showRetry = cloudMode && saveState === 'pending' && onRetrySave;

  return (
    <div
      className={`wolf-se-sticky-bar${hideMetrics ? ' wolf-se-sticky-bar--cta-only' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy={status.tone === 'saving'}
    >
      <div className="wolf-se-sticky-inner">
        {hideMetrics ? null : (
          <div className="wolf-se-sticky-meta">
            <p className="wolf-se-sticky-metrics">
              {session.load} kg · K {session.kValue.toFixed(1)}
            </p>
            <p className={`wolf-se-sticky-sub wolf-se-sticky-sub--${status.tone}`}>
              {status.icon}
              <span>{status.label}</span>
              {showRetry ? (
                <button
                  type="button"
                  className="wolf-se-sticky-retry"
                  onClick={onRetrySave}
                  aria-label={isEs ? 'Reintentar guardado' : 'Retry save'}
                >
                  <RefreshCw size={12} aria-hidden />
                  {isEs ? 'Reintentar' : 'Retry'}
                </button>
              ) : null}
            </p>
            {cloudMode && saveState === 'pending' ? (
              <p className="wolf-se-sticky-hint">
                <AlertCircle size={11} aria-hidden />
                {isEs
                  ? 'Si cambias de día, espera a que diga Guardado.'
                  : 'Wait for Saved before switching days.'}
              </p>
            ) : null}
          </div>
        )}
        <button
          type="button"
          className={`wolf-se-btn wolf-se-btn--primary wolf-se-btn--sm${hideMetrics ? ' wolf-se-btn--block' : ''}`}
          disabled={!canAddExercise}
          onClick={onAddExercise}
        >
          <Plus size={16} />
          {addLabel ?? (isEs ? 'Ejercicio' : 'Exercise')}
        </button>
      </div>
    </div>
  );
};
