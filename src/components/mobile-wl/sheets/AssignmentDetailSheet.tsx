import React from 'react';
import { BottomSheet } from './BottomSheet';
import WlAssignmentDetail from '../../wl-management/WlAssignmentDetail';
import type { ProgramAssignment } from '../../../models/training';
import '../mobile-wl.css';

interface AssignmentDetailSheetProps {
  open: boolean;
  assignment: ProgramAssignment | null;
  isEs: boolean;
  nameByProfileId: Record<string, string>;
  onClose: () => void;
  onEdit: (asg: ProgramAssignment) => void;
  onDeleted: () => void;
  onDuplicated?: (newAssignmentId: string) => void;
}

export const AssignmentDetailSheet: React.FC<AssignmentDetailSheetProps> = ({
  open,
  assignment,
  isEs,
  nameByProfileId,
  onClose,
  onEdit,
  onDeleted,
  onDuplicated,
}) => {
  if (!assignment) return null;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={assignment.program.name}
      snap={0.92}
    >
      <div className="wl-mgmt-detail wl-mgmt-detail--sheet">
        <WlAssignmentDetail
          assignment={assignment}
          isEs={isEs}
          nameByProfileId={nameByProfileId}
          onBack={onClose}
          onEdit={(asg) => {
            onClose();
            onEdit(asg);
          }}
          onDeleted={() => {
            onClose();
            onDeleted();
          }}
          onDuplicated={onDuplicated}
        />
      </div>
    </BottomSheet>
  );
};
