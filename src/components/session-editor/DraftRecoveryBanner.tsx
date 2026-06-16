import React from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface DraftRecoveryBannerProps {
  isEs: boolean;
  savedAt?: string;
  onRestore: () => void;
  onDismiss: () => void;
}

export const DraftRecoveryBanner: React.FC<DraftRecoveryBannerProps> = ({
  isEs,
  savedAt,
  onRestore,
  onDismiss,
}) => {
  const when = savedAt
    ? new Date(savedAt).toLocaleString(isEs ? 'es' : 'en', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <div className="wolf-se-draft-banner" role="alert">
      <div className="wolf-se-draft-banner__main">
        <AlertTriangle size={18} className="wolf-se-draft-banner__icon" aria-hidden />
        <div className="wolf-se-draft-banner__copy">
          <strong>
            {isEs ? 'Hay un borrador más reciente en este dispositivo' : 'A more recent draft exists on this device'}
          </strong>
          {when ? (
            <span>
              {isEs ? `Guardado: ${when}` : `Saved: ${when}`}
            </span>
          ) : null}
        </div>
      </div>
      <div className="wolf-se-draft-banner__actions">
        <button type="button" className="btn-secondary wolf-se-draft-banner__restore" onClick={onRestore}>
          <RotateCcw size={14} aria-hidden /> {isEs ? 'Restaurar' : 'Restore'}
        </button>
        <button type="button" className="wolf-se-icon" onClick={onDismiss} aria-label={isEs ? 'Descartar' : 'Dismiss'}>
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
};
