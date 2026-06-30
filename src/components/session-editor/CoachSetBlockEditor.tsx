import React from 'react';
import type { SetScheme } from '../../models/training';
import { WL_PCT_MAX, WL_PCT_MIN } from '../../services/trainingEngine';
import { WL_SESSION_LIMITS } from '../../services/sessionMutations';
import { ComboNumberField } from './ComboNumberField';
import { ComboPresetField } from './ComboPresetField';
import { purposeForScheme, purposeLabel } from './spreadsheetPurposeUtils';
import { DEFAULT_REST_SEC, formatRestSec } from './setSchemeUtils';
import './exercise-sets-coach-screen.css';

const PCT_PRESETS_LIST = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 120] as const;
const REP_PRESETS_LIST = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20] as const;
const SETS_PRESETS_LIST = [1, 2, 3, 4, 5, 6, 8, 10] as const;
const REST_PRESETS_SEC = [90, 120, 150, 180, 210, 240] as const;
const REST_PRESET_OPTIONS = REST_PRESETS_SEC.map((sec) => ({
  value: sec,
  label: formatRestSec(sec),
}));

export interface CoachSetBlockEditorProps {
  scheme: SetScheme;
  setIndex: number;
  kg: string | number;
  isEs: boolean;
  variant?: 'full' | 'inline' | 'panel';
  onPctChange: (value: number) => void;
  onRepsChange: (value: number) => void;
  onSetsChange: (value: number) => void;
  onRestChange: (value: number) => void;
}

export const CoachSetBlockEditor: React.FC<CoachSetBlockEditorProps> = ({
  scheme,
  setIndex,
  kg,
  isEs,
  variant = 'full',
  onPctChange,
  onRepsChange,
  onSetsChange,
  onRestChange,
}) => {
  const purpose = purposeForScheme(scheme);
  const restSec = scheme.restSec ?? DEFAULT_REST_SEC;
  const si = setIndex;
  const isPanel = variant === 'panel';
  const showHead = variant === 'full' || variant === 'panel';
  const showFooterRest = variant === 'full';

  return (
    <article
      className={`wolf-se-coach-set-block${variant === 'inline' ? ' wolf-se-coach-set-block--inline' : ''}${isPanel ? ' wolf-se-coach-set-block--panel' : ''}`}
    >
      {showHead ? (
        <div className="wolf-se-coach-set-block__head">
          <h3 className="wolf-se-coach-set-block__title">
            {isEs ? `Bloque ${si + 1}` : `Block ${si + 1}`}
          </h3>
          <span className={`wolf-se-coach-set-block__purpose wolf-se-coach-set-block__purpose--${purpose}`}>
            <span className="wolf-se-coach-set-block__purpose-dot" aria-hidden />
            {purposeLabel(purpose, isEs)}
          </span>
        </div>
      ) : null}

      <div className={`wolf-se-coach-set-block__fields${isPanel ? ' wolf-se-coach-set-block__fields--panel' : ''}`}>
        <div className="wolf-se-coach-set-block__field wolf-se-coach-set-block__field--wide">
          <span className="wolf-se-coach-set-block__field-label">
            {isEs ? 'Intensidad' : 'Intensity'}
          </span>
          <div className="wolf-se-coach-set-block__field-value">
            <ComboNumberField
              variant="premium"
              value={scheme.percentage}
              min={WL_PCT_MIN}
              max={WL_PCT_MAX}
              step={5}
              options={[...PCT_PRESETS_LIST]}
              suffix="%"
              onChange={onPctChange}
              aria-label={isEs ? `Intensidad bloque ${si + 1}` : `Intensity block ${si + 1}`}
            />
          </div>
        </div>

        <div className="wolf-se-coach-set-block__field-row">
          <div className="wolf-se-coach-set-block__field">
            <span className="wolf-se-coach-set-block__field-label">{isEs ? 'Reps' : 'Reps'}</span>
            <div className="wolf-se-coach-set-block__field-value">
              <ComboNumberField
                variant="premium"
                value={scheme.reps}
                min={WL_SESSION_LIMITS.MIN_REPS_PER_SET}
                max={WL_SESSION_LIMITS.MAX_REPS_PER_SET}
                step={1}
                options={[...REP_PRESETS_LIST]}
                onChange={onRepsChange}
                aria-label={isEs ? `Reps bloque ${si + 1}` : `Reps block ${si + 1}`}
              />
            </div>
          </div>
          <div className="wolf-se-coach-set-block__field">
            <span className="wolf-se-coach-set-block__field-label">{isEs ? 'Series' : 'Sets'}</span>
            <div className="wolf-se-coach-set-block__field-value">
              <ComboNumberField
                variant="premium"
                value={scheme.sets}
                min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
                max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
                step={1}
                options={[...SETS_PRESETS_LIST]}
                onChange={onSetsChange}
                aria-label={isEs ? `Series bloque ${si + 1}` : `Sets block ${si + 1}`}
              />
            </div>
          </div>
        </div>

        <div className="wolf-se-coach-set-block__field wolf-se-coach-set-block__field--wide">
          <span className="wolf-se-coach-set-block__field-label">{isEs ? 'Descanso' : 'Rest'}</span>
          <div className="wolf-se-coach-set-block__field-value wolf-se-coach-set-block__field-value--rest">
            <ComboPresetField
              variant="premium"
              value={restSec}
              options={REST_PRESET_OPTIONS}
              onChange={onRestChange}
              className="wolf-se-combo-preset--rest"
              aria-label={isEs ? `Descanso bloque ${si + 1}` : `Rest block ${si + 1}`}
            />
          </div>
        </div>
      </div>

      <div className="wolf-se-coach-set-block__footer">
        {showFooterRest ? (
          <span className="wolf-se-coach-set-block__rest">{formatRestSec(restSec)}</span>
        ) : (
          <span className="wolf-se-coach-set-block__rest wolf-se-coach-set-block__rest--muted">
            {isEs ? 'Tonelaje' : 'Load'}
          </span>
        )}
        <span className="wolf-se-coach-set-block__load">
          <strong>{kg}</strong> kg
        </span>
      </div>
    </article>
  );
};
