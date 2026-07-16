import React, { useState } from 'react';
import { Save } from 'lucide-react';
import type { AthleteLevel } from '../../models/training';
import { WlFormSheet } from '../wl-shared/WlFormSheet';

const LEVELS: AthleteLevel[] = ['beginner', 'intermediate', 'advanced'];

export interface WlAthleteCreateInput {
  id: string;
  name: string;
  level: AthleteLevel;
  bodyweight: number;
  oneRM: {
    snatch: number;
    cleanJerk: number;
    backSquat: number;
    frontSquat: number;
  };
  /** Optional login so the athlete can sign in without Master panel. */
  inviteEmail?: string;
  invitePassword?: string;
}

export interface WlAthleteCreateSheetProps {
  isEs: boolean;
  onClose: () => void;
  onCreate: (input: WlAthleteCreateInput) => Promise<void>;
  /** Shown when Free plan blocks another athlete */
  limitReachedMessage?: string | null;
}

function randomTempPassword(): string {
  return `Wolf${Math.random().toString(36).slice(2, 8)}!`;
}

const WlAthleteCreateSheet: React.FC<WlAthleteCreateSheetProps> = ({
  isEs,
  onClose,
  onCreate,
  limitReachedMessage,
}) => {
  const [name, setName] = useState('');
  const [level, setLevel] = useState<AthleteLevel>('intermediate');
  const [bodyweight, setBodyweight] = useState(75);
  const [snatch, setSnatch] = useState(60);
  const [cleanJerk, setCleanJerk] = useState(80);
  const [backSquat, setBackSquat] = useState(100);
  const [frontSquat, setFrontSquat] = useState(85);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState(randomTempPassword);
  const [createLogin, setCreateLogin] = useState(true);
  const [saving, setSaving] = useState(false);
  const [credentialsNote, setCredentialsNote] = useState<string | null>(null);

  const canSave =
    name.trim().length > 0 &&
    (!createLogin || (inviteEmail.trim().includes('@') && invitePassword.length >= 6));

  const handleSubmit = async () => {
    if (!canSave || saving || limitReachedMessage) return;
    setSaving(true);
    try {
      const email = createLogin ? inviteEmail.trim().toLowerCase() : undefined;
      const password = createLogin ? invitePassword : undefined;
      await onCreate({
        id: `ath-${Date.now()}`,
        name: name.trim(),
        level,
        bodyweight,
        oneRM: { snatch, cleanJerk, backSquat, frontSquat },
        inviteEmail: email,
        invitePassword: password,
      });
      if (email && password) {
        setCredentialsNote(
          isEs
            ? `Login: ${email} / ${password} — guárdalo y compártelo con el atleta.`
            : `Login: ${email} / ${password} — save and share with the athlete.`,
        );
      } else {
        onClose();
      }
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
        disabled={!canSave || saving || Boolean(limitReachedMessage)}
        onClick={() => void handleSubmit()}
      >
        <Save size={16} aria-hidden />
        {saving
          ? isEs
            ? 'Guardando…'
            : 'Saving…'
          : isEs
            ? 'Invitar atleta'
            : 'Invite athlete'}
      </button>
    </div>
  );

  return (
    <WlFormSheet
      isEs={isEs}
      kicker={isEs ? 'Invitar atleta' : 'Invite athlete'}
      title={isEs ? 'Añadir al roster' : 'Add to roster'}
      subtitle={
        isEs
          ? 'Perfil WL + opcional cuenta de acceso (sin panel maestro).'
          : 'WL profile + optional login account (no master panel).'
      }
      titleId="wl-athlete-create-title"
      onClose={onClose}
      footer={footer}
    >
      {limitReachedMessage ? (
        <section className="wl-form-sheet-summary wl-form-sheet-summary--note">
          <p className="wl-form-sheet-summary__lead">{limitReachedMessage}</p>
        </section>
      ) : null}

      {credentialsNote ? (
        <section className="wl-form-sheet-summary wl-form-sheet-summary--note">
          <p className="wl-form-sheet-summary__lead">{credentialsNote}</p>
        </section>
      ) : (
        <div className="wl-form-sheet-grid">
          <label className="wl-form-sheet-field wl-form-sheet-field--full">
            <span className="wl-form-sheet-label">{isEs ? 'Nombre' : 'Name'}</span>
            <input
              className="wl-form-sheet-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isEs ? 'Nombre del atleta' : 'Athlete name'}
              autoFocus
            />
          </label>

          <label className="wl-form-sheet-field">
            <span className="wl-form-sheet-label">{isEs ? 'Nivel' : 'Level'}</span>
            <select
              className="wl-form-sheet-select"
              value={level}
              onChange={(e) => setLevel(e.target.value as AthleteLevel)}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>

          <label className="wl-form-sheet-field">
            <span className="wl-form-sheet-label">{isEs ? 'Peso corporal (kg)' : 'Bodyweight (kg)'}</span>
            <input
              type="number"
              className="wl-form-sheet-input"
              min={30}
              max={200}
              value={bodyweight}
              onChange={(e) => setBodyweight(Number(e.target.value))}
            />
          </label>

          <label className="wl-form-sheet-field">
            <span className="wl-form-sheet-label">Snatch (kg)</span>
            <input
              type="number"
              className="wl-form-sheet-input"
              min={0}
              value={snatch}
              onChange={(e) => setSnatch(Number(e.target.value))}
            />
          </label>

          <label className="wl-form-sheet-field">
            <span className="wl-form-sheet-label">C&J (kg)</span>
            <input
              type="number"
              className="wl-form-sheet-input"
              min={0}
              value={cleanJerk}
              onChange={(e) => setCleanJerk(Number(e.target.value))}
            />
          </label>

          <label className="wl-form-sheet-field">
            <span className="wl-form-sheet-label">{isEs ? 'Sentadilla trasera' : 'Back squat'} (kg)</span>
            <input
              type="number"
              className="wl-form-sheet-input"
              min={0}
              value={backSquat}
              onChange={(e) => setBackSquat(Number(e.target.value))}
            />
          </label>

          <label className="wl-form-sheet-field">
            <span className="wl-form-sheet-label">{isEs ? 'Sentadilla frontal' : 'Front squat'} (kg)</span>
            <input
              type="number"
              className="wl-form-sheet-input"
              min={0}
              value={frontSquat}
              onChange={(e) => setFrontSquat(Number(e.target.value))}
            />
          </label>

          <label className="wl-form-sheet-field wl-form-sheet-field--full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={createLogin}
              onChange={(e) => setCreateLogin(e.target.checked)}
            />
            <span className="wl-form-sheet-label" style={{ margin: 0 }}>
              {isEs ? 'Crear cuenta de acceso (email + contraseña)' : 'Create login account (email + password)'}
            </span>
          </label>

          {createLogin ? (
            <>
              <label className="wl-form-sheet-field wl-form-sheet-field--full">
                <span className="wl-form-sheet-label">Email</span>
                <input
                  type="email"
                  className="wl-form-sheet-input"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="atleta@email.com"
                />
              </label>
              <label className="wl-form-sheet-field wl-form-sheet-field--full">
                <span className="wl-form-sheet-label">{isEs ? 'Contraseña temporal' : 'Temporary password'}</span>
                <input
                  className="wl-form-sheet-input"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  minLength={6}
                />
              </label>
            </>
          ) : null}
        </div>
      )}
    </WlFormSheet>
  );
};

export default WlAthleteCreateSheet;
