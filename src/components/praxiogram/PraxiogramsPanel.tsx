import React, { useState } from 'react';
import PraxiogramaPage from './PraxiogramaPage';
import PraxiogramsHub from './PraxiogramsHub';

interface PraxiogramsPanelProps {
  language: 'ES' | 'EN';
}

const PraxiogramsPanel: React.FC<PraxiogramsPanelProps> = ({ language }) => {
  const isEs = language === 'ES';
  const [editingId, setEditingId] = useState<string | null>(null);

  if (editingId) {
    return (
      <PraxiogramaPage
        isEs={isEs}
        praxiogramId={editingId}
        onBack={() => setEditingId(null)}
      />
    );
  }

  return <PraxiogramsHub isEs={isEs} onOpenEditor={setEditingId} />;
};

export default PraxiogramsPanel;
