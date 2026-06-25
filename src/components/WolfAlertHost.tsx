import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
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
  const reduceMotion = useReducedMotion();

  return (
    <div className="wolf-alert-host" aria-live="polite" aria-relevant="additions">
      <AnimatePresence initial={false} mode="popLayout">
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            layout={reduceMotion ? false : 'position'}
            className={`wolf-alert wolf-alert--${alert.tone}`}
            role="status"
            initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
            }
          >
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
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default WolfAlertHost;
