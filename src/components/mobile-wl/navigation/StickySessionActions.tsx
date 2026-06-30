import React from 'react';
import { StickySessionBar } from '../../session-editor/StickySessionBar';
import type { Session } from '../../../models/training';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

import type { ProgramSyncState } from '../../wl-programs/programSync';

interface StickySessionActionsProps {
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

export const StickySessionActions: React.FC<StickySessionActionsProps> = (props) => {
  const isMobile = useMediaQuery('(max-width: 1024px)');
  if (!isMobile) return null;
  return <StickySessionBar {...props} />;
};
