import { useCallback, useMemo, useState } from 'react';
import { Delete } from 'lucide-react';
import { BottomSheet } from '../mobile-wl/sheets/BottomSheet';
import { WlFormSheet } from '../wl-shared/WlFormSheet';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { PrLiftId } from '../../models/liftLogs';
import { epleyE1rm, formatKg } from './e1rm';
import { liftLabel } from './PrLiftCatalog';

type Step = 'kg' | 'reps';

function appendDigit(current: string, digit: string, allowDot: boolean): string {
  if (digit === '.' && (!allowDot || current.includes('.'))) return current;
  if (digit === '.' && current === '') return '0.';
  if (current === '0' && digit !== '.') return digit;
  if (allowDot) {
    const [ints, dec = ''] = current.split('.');
    if (digit !== '.' && current.includes('.') && dec.length >= 1) return current;
    if (digit !== '.' && ints.replace('-', '').length >= 4 && !current.includes('.')) return current;
  } else if (current.length >= 2) {
    return current;
  }
  return `${current}${digit}`;
}

export function WlPrLogSheet({
  isEs,
  liftId,
  open,
  onClose,
  onSave,
}: {
  isEs: boolean;
  liftId: PrLiftId;
  open: boolean;
  onClose: () => void;
  onSave: (input: { kg: number; reps: number; notes?: string }) => Promise<void> | void;
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [step, setStep] = useState<Step>('kg');
  const [kgText, setKgText] = useState('');
  const [repsText, setRepsText] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setStep('kg');
    setKgText('');
    setRepsText('');
    setNotes('');
    setSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    if (saving) return;
    reset();
    onClose();
  }, [onClose, reset, saving]);

  const kg = Number(kgText);
  const reps = Number(repsText);
  const kgValid = Number.isFinite(kg) && kg > 0 && kg <= 500;
  const repsValid = Number.isInteger(reps) && reps >= 1 && reps <= 30;
  const previewE1 = kgValid && (step === 'kg' || !repsValid) ? epleyE1rm(kg, 1) : kgValid && repsValid ? epleyE1rm(kg, reps) : 0;

  const keys = useMemo(() => ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const, []);

  const onKey = (key: string) => {
    if (key === 'back') {
      if (step === 'kg') setKgText((t) => t.slice(0, -1));
      else setRepsText((t) => t.slice(0, -1));
      return;
    }
    if (step === 'kg') setKgText((t) => appendDigit(t, key, true));
    else if (key !== '.') setRepsText((t) => appendDigit(t, key, false));
  };

  const submit = async () => {
    if (step === 'kg') {
      if (!kgValid) return;
      setStep('reps');
      return;
    }
    if (!kgValid || !repsValid || saving) return;
    setSaving(true);
    try {
      await onSave({ kg, reps, notes: notes.trim() || undefined });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const display = step === 'kg' ? kgText || '0' : repsText || '0';
  const unit = step === 'kg' ? 'kg' : isEs ? 'reps' : 'reps';
  const title = liftLabel(liftId, isEs);
  const kicker = step === 'kg' ? (isEs ? 'Peso' : 'Weight') : isEs ? 'Repeticiones' : 'Reps';

  const keypad = (
    <div className="wl-prs-keypad">
      <p className="wl-prs-keypad__value">
        {display}
        <span>{unit}</span>
      </p>
      {previewE1 > 0 ? (
        <p className="wl-prs-keypad__e1">
          e1RM {formatKg(previewE1)} kg
          {step === 'reps' && kgValid && repsValid ? ` · ${kg} × ${reps}` : ''}
        </p>
      ) : (
        <p className="wl-prs-keypad__e1">{isEs ? 'Introduce el peso del intento' : 'Enter the attempt weight'}</p>
      )}

      <div className="wl-prs-keypad__grid">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            className={`wl-prs-key${key === 'back' ? ' wl-prs-key--back' : ''}`}
            onClick={() => onKey(key)}
            disabled={key === '.' && step === 'reps'}
            aria-label={key === 'back' ? (isEs ? 'Borrar' : 'Backspace') : key}
          >
            {key === 'back' ? <Delete size={20} /> : key === '.' ? (step === 'reps' ? '' : '.') : key}
          </button>
        ))}
      </div>

      {step === 'reps' ? (
        <label className="wl-prs-keypad__notes">
          {isEs ? 'Notas (opcional)' : 'Notes (optional)'}
          <input
            type="text"
            value={notes}
            maxLength={120}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isEs ? 'Competición, RPE…' : 'Meet, RPE…'}
          />
        </label>
      ) : null}

      <div className="wl-prs-keypad__actions">
        {step === 'reps' ? (
          <button type="button" className="wl-prs-keypad__secondary" onClick={() => setStep('kg')} disabled={saving}>
            {isEs ? 'Peso' : 'Weight'}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="wl-prs-keypad__primary"
          onClick={() => void submit()}
          disabled={step === 'kg' ? !kgValid : !repsValid || saving}
        >
          {step === 'kg' ? (isEs ? 'Siguiente' : 'Next') : saving ? (isEs ? 'Guardando…' : 'Saving…') : isEs ? 'Guardar' : 'Save'}
        </button>
      </div>
    </div>
  );

  if (!open) return null;

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onClose={handleClose}
        title={`${kicker} · ${title}`}
        snap={0.78}
        panelClassName="wl-prs-sheet-panel"
        bodyClassName="wl-prs-sheet-body"
      >
        {keypad}
      </BottomSheet>
    );
  }

  return (
    <WlFormSheet
      isEs={isEs}
      kicker={kicker}
      title={title}
      subtitle={isEs ? 'Registra kg × repeticiones' : 'Log kg × reps'}
      onClose={handleClose}
    >
      {keypad}
    </WlFormSheet>
  );
}
