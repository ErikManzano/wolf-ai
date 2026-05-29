import React, { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import type { SetScheme } from '../../../models/training';
import { CompactNumberField } from '../../session-editor/CompactNumberField';
import { BottomSheet } from './BottomSheet';
import { CoachNumpad } from '../inputs/CoachNumpad';
import { IntensityPresetBar } from '../inputs/IntensityPresetBar';
import '../mobile-wl.css';

const PCT_STEP = 5;

interface SetEditorSheetProps {
  open: boolean;
  onClose: () => void;
  setIndex: number;
  row: SetScheme;
  kg: string;
  exerciseName: string;
  isEs: boolean;
  onPctChange: (pct: number) => void;
  onRepsChange: (reps: number) => void;
  onSetsChange: (sets: number) => void;
  onDuplicate?: () => void;
  pctMin: number;
  pctMax: number;
  repsMin: number;
  repsMax: number;
  setsMin: number;
  setsMax: number;
}

export const SetEditorSheet: React.FC<SetEditorSheetProps> = ({
  open,
  onClose,
  setIndex,
  row,
  kg,
  exerciseName,
  isEs,
  onPctChange,
  onRepsChange,
  onSetsChange,
  onDuplicate,
  pctMin,
  pctMax,
  repsMin,
  repsMax,
  setsMin,
  setsMax,
}) => {
  const [localPct, setLocalPct] = useState(row.percentage);
  const [localReps, setLocalReps] = useState(row.reps);
  const [localSets, setLocalSets] = useState(row.sets);

  useEffect(() => {
    if (open) {
      setLocalPct(row.percentage);
      setLocalReps(row.reps);
      setLocalSets(row.sets);
    }
  }, [open, row.percentage, row.reps, row.sets]);

  const handleSave = () => {
    if (localPct !== row.percentage) onPctChange(localPct);
    if (localReps !== row.reps) onRepsChange(localReps);
    if (localSets !== row.sets) onSetsChange(localSets);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
    onClose();
  };

  const title = isEs
    ? `Serie ${setIndex + 1} · ${exerciseName}`
    : `Set ${setIndex + 1} · ${exerciseName}`;

  const footer = (
    <>
      {onDuplicate ? (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            handleSave();
            onDuplicate();
          }}
        >
          <Copy size={16} aria-hidden />
          {isEs ? 'Duplicar' : 'Duplicate'}
        </button>
      ) : null}
      <button type="button" className="btn-primary" onClick={handleSave}>
        <Check size={16} aria-hidden />
        {isEs ? 'Guardar' : 'Save'}
      </button>
    </>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title={title} snap={0.88} footer={footer}>
      <div className="mwl-set-editor-kg">
        <div className="mwl-set-editor-kg-value">{kg}</div>
        <div className="mwl-set-editor-kg-label">{isEs ? 'Carga calculada (kg)' : 'Computed load (kg)'}</div>
      </div>

      <span className="mwl-field-label">%1RM</span>
      <IntensityPresetBar value={localPct} onChange={setLocalPct} isEs={isEs} />
      <CompactNumberField
        value={localPct}
        min={pctMin}
        max={pctMax}
        step={PCT_STEP}
        suffix="%"
        onChange={setLocalPct}
        aria-label={isEs ? 'Porcentaje 1RM' : '1RM percent'}
      />

      <div className="mwl-dual-numpad" style={{ marginTop: 20 }}>
        <CoachNumpad
          label={isEs ? 'Series' : 'Sets'}
          value={localSets}
          min={setsMin}
          max={setsMax}
          onChange={setLocalSets}
        />
        <CoachNumpad
          label={isEs ? 'Reps' : 'Reps'}
          value={localReps}
          min={repsMin}
          max={repsMax}
          onChange={setLocalReps}
        />
      </div>
    </BottomSheet>
  );
};
