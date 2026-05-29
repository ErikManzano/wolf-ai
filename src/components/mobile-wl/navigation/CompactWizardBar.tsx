import React from 'react';
import { ClipboardList, Gauge, Settings2, UserCog } from 'lucide-react';
import '../mobile-wl.css';

type StepId = 1 | 2 | 3 | 4;

interface StepItem {
  id: StepId;
  label: string;
  enabled: boolean;
}

interface CompactWizardBarProps {
  activeStep: StepId;
  stepItems: readonly StepItem[];
  progressPct: number;
  isEs: boolean;
  onGoToStep: (step: StepId) => void;
}

const STEP_ICONS: Record<StepId, React.ReactNode> = {
  1: <UserCog size={18} aria-hidden />,
  2: <Gauge size={18} aria-hidden />,
  3: <Settings2 size={18} aria-hidden />,
  4: <ClipboardList size={18} aria-hidden />,
};

export const CompactWizardBar: React.FC<CompactWizardBarProps> = ({
  activeStep,
  stepItems,
  progressPct,
  isEs,
  onGoToStep,
}) => {
  const current = stepItems.find((s) => s.id === activeStep);

  return (
    <div className="mwl-wizard-bar" aria-label={isEs ? 'Progreso del asistente' : 'Wizard progress'}>
      <div className="mwl-wizard-bar-track" aria-hidden>
        <div className="mwl-wizard-bar-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="mwl-wizard-bar-row">
        <div>
          <p className="mwl-wizard-bar-label">{current?.label ?? ''}</p>
          <p className="mwl-wizard-bar-step">
            {isEs ? 'Paso' : 'Step'} {activeStep}/4
          </p>
        </div>
        <div className="mwl-wizard-dots" role="tablist">
          {stepItems.map((step) => {
            const isActive = activeStep === step.id;
            const isDone = activeStep > step.id;
            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={step.label}
                className={`mwl-wizard-dot${isActive ? ' is-active' : ''}${isDone ? ' is-done' : ''}`}
                disabled={!step.enabled}
                onClick={() => onGoToStep(step.id)}
              >
                {isDone ? '✓' : STEP_ICONS[step.id]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
