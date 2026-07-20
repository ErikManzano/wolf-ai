import React from 'react';
import type { ProgramAssignment } from '../../models/training';
import { WolfAppSelect } from '../wl-shared/WolfAppSelect';
import './athlete-plan-select.css';

export interface AthletePlanSelectProps {
  assignments: ProgramAssignment[];
  activeAssignmentId: string;
  isEs: boolean;
  onSelect: (assignmentId: string) => void;
  showLabel?: boolean;
  className?: string;
}

export const AthletePlanSelect: React.FC<AthletePlanSelectProps> = ({
  assignments,
  activeAssignmentId,
  isEs,
  onSelect,
  showLabel = true,
  className,
}) => {
  const selectLabel = isEs ? 'Programa' : 'Program';
  const rootClass = ['wolf-athlete-plan-select', className].filter(Boolean).join(' ');
  const options = assignments.map((asg) => ({
    value: asg.id,
    label: asg.program.name,
  }));

  return (
    <div className={rootClass}>
      {showLabel ? (
        <span className="wolf-athlete-plan-select__label">{selectLabel}</span>
      ) : null}
      <WolfAppSelect
        options={options}
        value={activeAssignmentId}
        onChange={onSelect}
        ariaLabel={selectLabel}
      />
    </div>
  );
};

/** @deprecated Use AthletePlanSelect in sticky nav */
export const AthletePlanSwitcher = AthletePlanSelect;
