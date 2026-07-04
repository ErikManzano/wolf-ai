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
  const active = alerts[alerts.length - 1];

  return (
    <div className="wolf-alert-host" aria-live="polite" aria-relevant="additions text">
      <AnimatePresence initial={false} mode="wait">
        {active ? (
          <motion.div
            key={active.id}
            className={`wolf-alert wolf-alert--${active.tone}`}
            role="status"
            initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <span className="wolf-alert__icon">{toneIcon(active.tone)}</span>
            <div className="wolf-alert__body">
              {active.title ? <p className="wolf-alert__title">{active.title}</p> : null}
              <p className="wolf-alert__message">{active.message}</p>
            </div>
            <button
              type="button"
              className="wolf-alert__close"
              onClick={() => onDismiss(active.id)}
              aria-label="Close"
            >
              <X size={18} strokeWidth={2} aria-hidden />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default WolfAlertHost;
