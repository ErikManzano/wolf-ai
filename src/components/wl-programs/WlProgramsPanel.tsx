import React from 'react';
import { useWolfAssign } from '../../context/WolfAssignContext';
import WlProgramsHub from './WlProgramsHub';
import WlProgramEditor from './WlProgramEditor';
import '../wl-shared/wl-list-toolbar.css';
import './wl-programs.css';

interface WlProgramsPanelProps {
  language: 'ES' | 'EN';
}

const WlProgramsPanel: React.FC<WlProgramsPanelProps> = ({ language }) => {
  const isEs = language === 'ES';
  const { programsView, editingProgramId, closeProgramEditor } = useWolfAssign();

  if (programsView === 'editor' && editingProgramId) {
    return (
      <WlProgramEditor language={language} programId={editingProgramId} onBack={closeProgramEditor} />
    );
  }

  return <WlProgramsHub isEs={isEs} />;
};

export default WlProgramsPanel;
