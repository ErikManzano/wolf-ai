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
    <div className="wolf-program-edit-banner wolf-se-draft-banner" role="alert">
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
        <AlertTriangle size={20} style={{ flexShrink: 0, color: '#facc15' }} aria-hidden />
        <div>
          <strong style={{ display: 'block', color: '#fde68a', fontSize: '0.88rem' }}>
            {isEs ? 'Hay un borrador más reciente en este dispositivo' : 'A more recent draft exists on this device'}
          </strong>
          {when && (
            <span style={{ display: 'block', marginTop: 4, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {isEs ? `Guardado: ${when}` : `Saved: ${when}`}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={onRestore}>
          <RotateCcw size={14} /> {isEs ? 'Restaurar' : 'Restore'}
        </button>
        <button type="button" className="wolf-se-icon" onClick={onDismiss} aria-label={isEs ? 'Descartar' : 'Dismiss'}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
