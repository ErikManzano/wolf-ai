import React from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import type { WolfAlertItem, WolfAlertTone } from '../context/WolfAlertContext';
import './WolfAlertHost.css';

interface WolfAlertHostProps {
  alerts: WolfAlertItem[];
  onDismiss: (id: string) => void;
}

function toneIcon(tone: WolfAlertTone) {
  switch (tone) {
    case 'success':
      return <CheckCircle2 size={20} strokeWidth={2.25} aria-hidden />;
    case 'error':
      return <AlertCircle size={20} strokeWidth={2.25} aria-hidden />;
    case 'warning':
      return <AlertTriangle size={20} strokeWidth={2.25} aria-hidden />;
    default:
      return <Info size={20} strokeWidth={2.25} aria-hidden />;
  }
}

const WolfAlertHost: React.FC<WolfAlertHostProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) return null;

  return (
    <div className="wolf-alert-host" aria-live="polite" aria-relevant="additions">
      {alerts.map((alert) => (
        <div key={alert.id} className={`wolf-alert wolf-alert--${alert.tone}`} role="status">
          <span className="wolf-alert__icon">{toneIcon(alert.tone)}</span>
          <div className="wolf-alert__body">
            {alert.title ? <p className="wolf-alert__title">{alert.title}</p> : null}
            <p className="wolf-alert__message">{alert.message}</p>
          </div>
          <button
            type="button"
            className="wolf-alert__close"
            onClick={() => onDismiss(alert.id)}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2} aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
};

export default WolfAlertHost;
