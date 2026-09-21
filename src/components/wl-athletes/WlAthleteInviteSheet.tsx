import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { WlFormSheet } from '../wl-shared/WlFormSheet';

export interface WlAthleteInviteSheetProps {
  isEs: boolean;
  athleteName: string;
  onClose: () => void;
  onInvite: (input: { email: string; password: string }) => Promise<{ email: string; temporaryPassword: string } | null>;
}

function randomTempPassword(): string {
  return `Wolf${Math.random().toString(36).slice(2, 8)}!`;
}

const WlAthleteInviteSheet: React.FC<WlAthleteInviteSheetProps> = ({
  isEs,
  athleteName,
  onClose,
  onInvite,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(randomTempPassword);
  const [saving, setSaving] = useState(false);
  const [credentialsNote, setCredentialsNote] = useState<string | null>(null);

  const canSave = email.trim().includes('@') && password.length >= 6 && !saving;

  const handleSubmit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const result = await onInvite({
        email: email.trim().toLowerCase(),
        password,
      });
      if (!result) return;
      setCredentialsNote(
        isEs
          ? `Login: ${result.email} / ${result.temporaryPassword} — guárdalo y compártelo con el atleta.`
          : `Login: ${result.email} / ${result.temporaryPassword} — save and share with the athlete.`,
      );
    } finally {
      setSaving(false);
    }
  };

  const footer = credentialsNote ? (
    <div className="wl-form-sheet-footer__actions">
      <button
        type="button"
        className="wl-form-sheet-btn wl-form-sheet-btn--primary"
        onClick={() => {
          void navigator.clipboard?.writeText(credentialsNote);
          onClose();
        }}
      >
        {isEs ? 'Copiar y cerrar' : 'Copy & close'}
      </button>
    </div>
  ) : (
    <div className="wl-form-sheet-footer__actions">
      <button type="button" className="wl-form-sheet-btn wl-form-sheet-btn--ghost" onClick={onClose}>
        {isEs ? 'Cancelar' : 'Cancel'}
      </button>
      <button
        type="button"
        className="wl-form-sheet-btn wl-form-sheet-btn--primary"
        disabled={!canSave}
        onClick={() => void handleSubmit()}
      >
        <Save size={16} aria-hidden />
        {saving ? (isEs ? 'Creando acceso…' : 'Creating access…') : isEs ? 'Dar acceso' : 'Grant access'}
      </button>
    </div>
  );

  return (
    <WlFormSheet
      isEs={isEs}
      kicker={isEs ? 'Cuenta app' : 'App account'}
      title={isEs ? 'Dar acceso' : 'Grant access'}
      subtitle={
        isEs
          ? `Crea email y contraseña para que ${athleteName} entre a la app.`
          : `Create email and password so ${athleteName} can sign in.`
      }
      titleId="wl-athlete-invite-title"
      onClose={onClose}
      footer={footer}
    >
      {credentialsNote ? (
        <section className="wl-form-sheet-summary wl-form-sheet-summary--note">
          <p className="wl-form-sheet-summary__lead">{credentialsNote}</p>
        </section>
      ) : (
        <div className="wl-form-sheet-grid">
          <label className="wl-form-sheet-field wl-form-sheet-field--full">
            <span className="wl-form-sheet-label">Email</span>
            <input
              type="email"
              className="wl-form-sheet-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="atleta@email.com"
              autoFocus
            />
          </label>
          <label className="wl-form-sheet-field wl-form-sheet-field--full">
            <span className="wl-form-sheet-label">{isEs ? 'Contraseña temporal' : 'Temporary password'}</span>
            <input
              className="wl-form-sheet-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
            />
          </label>
        </div>
      )}
    </WlFormSheet>
  );
};

export default WlAthleteInviteSheet;
