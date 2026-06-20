import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { WlFormSheet } from '../wl-shared/WlFormSheet';

export interface PraxiogramCreateSheetProps {
  isEs: boolean;
  onClose: () => void;
  onCreate: (input: { title: string; sportContext: string }) => Promise<void>;
}

const PraxiogramCreateSheet: React.FC<PraxiogramCreateSheetProps> = ({ isEs, onClose, onCreate }) => {
  const [title, setTitle] = useState(isEs ? 'Nuevo praxiograma' : 'New praxiogram');
  const [sportContext, setSportContext] = useState(
    isEs ? 'Judo — Situaciones de lucha' : 'Judo — Grappling situations',
  );
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && sportContext.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await onCreate({
        title: title.trim(),
        sportContext: sportContext.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <div className="wl-form-sheet-footer__actions">
      <button type="button" className="wl-form-sheet-btn wl-form-sheet-btn--ghost" onClick={onClose}>
        {isEs ? 'Cancelar' : 'Cancel'}
      </button>
      <button
        type="button"
        className="wl-form-sheet-btn wl-form-sheet-btn--primary"
        disabled={!canSave || saving}
        onClick={() => void handleSubmit()}
      >
        <Save size={16} aria-hidden />
        {saving ? (isEs ? 'Creando…' : 'Creating…') : isEs ? 'Crear praxiograma' : 'Create praxiogram'}
      </button>
    </div>
  );

  return (
    <WlFormSheet
      isEs={isEs}
      kicker={isEs ? 'Nuevo praxiograma' : 'New praxiogram'}
      title={isEs ? 'Registro de praxiograma' : 'Praxiogram record'}
      subtitle={
        isEs
          ? 'Define el título y el contexto deportivo. Luego podrás completar las situaciones motrices.'
          : 'Set the title and sport context. Then complete motor situations in the editor.'
      }
      titleId="praxiogram-create-title"
      onClose={onClose}
      footer={footer}
    >
      <div className="wl-form-sheet-grid">
        <label className="wl-form-sheet-field wl-form-sheet-field--full">
          <span className="wl-form-sheet-label">{isEs ? 'Nombre del praxiograma' : 'Praxiogram name'}</span>
          <input
            className="wl-form-sheet-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isEs ? 'Ej. Judo — Situaciones de lucha' : 'e.g. Judo — Grappling situations'}
            autoFocus
          />
        </label>

        <label className="wl-form-sheet-field wl-form-sheet-field--full">
          <span className="wl-form-sheet-label">{isEs ? 'Contexto deportivo' : 'Sport context'}</span>
          <input
            className="wl-form-sheet-input"
            value={sportContext}
            onChange={(event) => setSportContext(event.target.value)}
            placeholder={isEs ? 'Ej. Judo — Combate' : 'e.g. Judo — Competition'}
          />
        </label>
      </div>
    </WlFormSheet>
  );
};

export default PraxiogramCreateSheet;
