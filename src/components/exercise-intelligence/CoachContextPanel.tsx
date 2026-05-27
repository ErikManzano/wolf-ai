import React, { useState } from 'react';
import type { MergedDefinitionView, OverridePatch } from '../../models/exercise';
import { Button } from '../ui/button';

interface CoachContextPanelProps {
  def: MergedDefinitionView | null;
  isEs: boolean;
  onSaveOverride: (baseId: string, patch: OverridePatch) => Promise<string | null>;
}

const CoachContextPanel: React.FC<CoachContextPanelProps> = ({ def, isEs, onSaveOverride }) => {
  const [notes, setNotes] = useState('');
  const [customName, setCustomName] = useState('');
  const [hidden, setHidden] = useState(false);

  if (!def || def.coachId) return null;

  const handleSave = async () => {
    const err = await onSaveOverride(def.id, {
      notes: notes.trim() || undefined,
      displayName: customName.trim() || undefined,
      hidden,
    });
    if (!err) {
      setNotes('');
      setCustomName('');
    }
  };

  return (
    <div className="wolf-ei-section" style={{ marginTop: 0, paddingTop: 0, border: 'none' }}>
      <h3>{isEs ? 'Capa coach' : 'Coach layer'}</h3>
      <p className="muted" style={{ fontSize: '0.75rem', marginBottom: 8 }}>
        {isEs
          ? 'Overrides sin modificar el ejercicio oficial.'
          : 'Overrides without editing the official exercise.'}
      </p>
      <label className="wolf-composer__field">
        <span>{isEs ? 'Nombre custom' : 'Custom name'}</span>
        <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={def.displayName} />
      </label>
      <label className="wolf-composer__field">
        <span>{isEs ? 'Notas' : 'Notes'}</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem' }}>
        <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} />
        {isEs ? 'Ocultar de mi biblioteca' : 'Hide from my library'}
      </label>
      <Button type="button" size="sm" variant="secondary" onClick={() => void handleSave()} style={{ marginTop: 8 }}>
        {isEs ? 'Guardar override' : 'Save override'}
      </Button>
    </div>
  );
};

export default CoachContextPanel;
