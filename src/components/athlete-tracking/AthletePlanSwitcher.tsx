import React from 'react';
import { ChevronDown } from 'lucide-react';
import type { ProgramAssignment } from '../../models/training';

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
  const rootClass = ['wolf-week-select-mobile__field', 'wolf-athlete-plan-select', className]
    .filter(Boolean)
    .join(' ');

  return (
    <label className={rootClass}>
      {showLabel ? (
        <span className="wolf-week-select-mobile__label">{selectLabel}</span>
      ) : null}
      <div className="wolf-select-wrap wolf-select-wrap--app">
        <select
          value={activeAssignmentId}
          onChange={(e) => onSelect(e.target.value)}
          aria-label={selectLabel}
        >
          {assignments.map((asg) => (
            <option key={asg.id} value={asg.id}>
              {asg.program.name}
            </option>
          ))}
        </select>
        <ChevronDown className="wolf-select-chevron" size={16} strokeWidth={2} aria-hidden />
      </div>
    </label>
  );
};

/** @deprecated Use AthletePlanSelect in sticky nav */
export const AthletePlanSwitcher = AthletePlanSelect;
