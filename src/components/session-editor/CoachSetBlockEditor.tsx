import React, { useCallback, useRef } from 'react';
import { ChevronDown, Copy, Trash2 } from 'lucide-react';
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
  /** Hide block header when parent already shows block title (overview accordion). */
  compactPanel?: boolean;
  onPctChange: (value: number) => void;
  onRepsChange: (value: number) => void;
  onSetsChange: (value: number) => void;
  onRestChange: (value: number) => void;
  onDuplicate?: () => void;
  onRemove?: () => void;
  canDuplicate?: boolean;
  canRemove?: boolean;
}

function MobileFieldRow({
  value,
  label,
  ariaLabel,
  children,
}: {
  value: string;
  label: string;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);

  const activatePicker = useCallback(() => {
    const root = pickerRef.current;
    if (!root) return;
    const trigger = root.querySelector<HTMLButtonElement>('button.wolf-se-combo-preset__trigger');
    if (trigger) {
      trigger.click();
      return;
    }
    const chevron = root.querySelector<HTMLButtonElement>('button.wolf-se-combo-select__chevron');
    if (chevron) {
      chevron.click();
    }
  }, []);

  return (
    <div className="wolf-se-coach-mobile-row" role="group" aria-label={ariaLabel}>
      <div className="wolf-se-coach-mobile-row__face" aria-hidden>
        <span className="wolf-se-coach-mobile-row__value">{value}</span>
        <div className="wolf-se-coach-mobile-row__control">
          <span className="wolf-se-coach-mobile-row__label">{label}</span>
          <ChevronDown size={16} className="wolf-se-coach-mobile-row__chev" />
        </div>
      </div>
      <button
        type="button"
        className="wolf-se-coach-mobile-row__hit"
        aria-label={ariaLabel}
        onClick={activatePicker}
      />
      <div ref={pickerRef} className="wolf-se-coach-mobile-row__picker" aria-hidden>
        {children}
      </div>
    </div>
  );
}

function CoachRestMetricRow({
  restSec,
  isEs,
  setIndex,
  onRestChange,
}: {
  restSec: number;
  isEs: boolean;
  setIndex: number;
  onRestChange: (value: number) => void;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const ariaLabel = isEs ? `Descanso bloque ${setIndex + 1}` : `Rest block ${setIndex + 1}`;

  const activatePicker = useCallback(() => {
    const root = pickerRef.current;
    if (!root) return;
    const trigger = root.querySelector<HTMLButtonElement>('button.wolf-se-combo-preset__trigger');
    if (trigger) {
      trigger.click();
      return;
    }
    const chevron = root.querySelector<HTMLButtonElement>('button.wolf-se-combo-select__chevron');
    chevron?.click();
  }, []);

  return (
    <div className="wolf-se-coach-mobile-metric wolf-se-coach-mobile-metric--rest wolf-se-coach-mobile-metric--editable">
      <div className="wolf-se-coach-mobile-metric__face" aria-hidden>
        <span className="wolf-se-coach-mobile-metric__value">{formatRestSec(restSec)}</span>
        <span className="wolf-se-coach-mobile-metric__control">
          <span className="wolf-se-coach-mobile-metric__label">{isEs ? 'DESCANSO' : 'REST'}</span>
          <ChevronDown size={16} className="wolf-se-coach-mobile-metric__chev" aria-hidden />
        </span>
      </div>
      <button type="button" className="wolf-se-coach-mobile-metric__hit" aria-label={ariaLabel} onClick={activatePicker} />
      <div ref={pickerRef} className="wolf-se-coach-mobile-metric__picker" aria-hidden>
        <ComboPresetField
          variant="premium"
          value={restSec}
          options={REST_PRESET_OPTIONS}
          onChange={onRestChange}
          className="wolf-se-combo-select--coach-mobile"
          aria-label={ariaLabel}
        />
      </div>
    </div>
  );
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
  onDuplicate,
  onRemove,
  canDuplicate = true,
  canRemove = true,
  compactPanel = false,
}) => {
  const purpose = purposeForScheme(scheme);
  const restSec = scheme.restSec ?? DEFAULT_REST_SEC;
  const si = setIndex;
  const isPanel = variant === 'panel';
  const showHead = variant === 'full' || variant === 'panel';
  const showFooterRest = variant === 'full';

  if (isPanel) {
    const showPanelHead = showHead && !compactPanel;
    return (
      <article className="wolf-se-coach-set-block wolf-se-coach-set-block--panel">
        {showPanelHead ? (
          <div className="wolf-se-coach-set-block__head">
            <div className="wolf-se-coach-set-block__head-top">
              <h3 className="wolf-se-coach-set-block__title">
                {isEs ? `Bloque ${si + 1}` : `Block ${si + 1}`}
              </h3>
              {onDuplicate || onRemove ? (
                <div className="wolf-se-coach-set-block__head-actions">
                  {onDuplicate ? (
                    <button
                      type="button"
                      className="wolf-se-coach-set-block__action-btn"
                      disabled={!canDuplicate}
                      title={isEs ? 'Duplicar bloque' : 'Duplicate block'}
                      aria-label={isEs ? `Duplicar bloque ${si + 1}` : `Duplicate block ${si + 1}`}
                      onClick={onDuplicate}
                    >
                      <Copy size={16} aria-hidden />
                    </button>
                  ) : null}
                  {onRemove ? (
                    <button
                      type="button"
                      className="wolf-se-coach-set-block__action-btn wolf-se-coach-set-block__action-btn--danger"
                      disabled={!canRemove}
                      title={isEs ? 'Eliminar bloque' : 'Remove block'}
                      aria-label={isEs ? `Eliminar bloque ${si + 1}` : `Remove block ${si + 1}`}
                      onClick={onRemove}
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <span className={`wolf-se-coach-set-block__purpose wolf-se-coach-set-block__purpose--${purpose}`}>
              <span className="wolf-se-coach-set-block__purpose-dot" aria-hidden />
              {purposeLabel(purpose, isEs)}
            </span>
          </div>
        ) : null}

        {compactPanel ? (
          <div className="wolf-se-coach-set-block__panel-toolbar">
            <span className={`wolf-se-coach-set-block__purpose wolf-se-coach-set-block__purpose--${purpose}`}>
              <span className="wolf-se-coach-set-block__purpose-dot" aria-hidden />
              {purposeLabel(purpose, isEs)}
            </span>
            {onDuplicate || onRemove ? (
              <div className="wolf-se-coach-set-block__head-actions">
                {onDuplicate ? (
                  <button
                    type="button"
                    className="wolf-se-coach-set-block__action-btn"
                    disabled={!canDuplicate}
                    title={isEs ? 'Duplicar bloque' : 'Duplicate block'}
                    aria-label={isEs ? `Duplicar bloque ${si + 1}` : `Duplicate block ${si + 1}`}
                    onClick={onDuplicate}
                  >
                    <Copy size={16} aria-hidden />
                  </button>
                ) : null}
                {onRemove ? (
                  <button
                    type="button"
                    className="wolf-se-coach-set-block__action-btn wolf-se-coach-set-block__action-btn--danger"
                    disabled={!canRemove}
                    title={isEs ? 'Eliminar bloque' : 'Remove block'}
                    aria-label={isEs ? `Eliminar bloque ${si + 1}` : `Remove block ${si + 1}`}
                    onClick={onRemove}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="wolf-se-coach-set-block__fields-intro">
          <p className="wolf-se-coach-set-block__fields-title">
            {isEs ? 'Prescripción del bloque' : 'Block prescription'}
          </p>
          <p className="wolf-se-coach-set-block__fields-hint">
            {isEs ? 'Toca cada campo para cambiar intensidad, series y reps.' : 'Tap each field to change intensity, sets, and reps.'}
          </p>
        </div>

        <div className="wolf-se-coach-set-block__mobile-rows">
          <MobileFieldRow
            value={`${scheme.percentage}%`}
            label={isEs ? 'INTENSIDAD' : 'INTENSITY'}
            ariaLabel={isEs ? `Intensidad bloque ${si + 1}` : `Intensity block ${si + 1}`}
          >
            <ComboNumberField
              variant="premium"
              className="wolf-se-combo-select--coach-mobile"
              value={scheme.percentage}
              min={WL_PCT_MIN}
              max={WL_PCT_MAX}
              step={5}
              options={[...PCT_PRESETS_LIST]}
              suffix="%"
              onChange={onPctChange}
              aria-label={isEs ? `Intensidad bloque ${si + 1}` : `Intensity block ${si + 1}`}
            />
          </MobileFieldRow>

          <MobileFieldRow
            value={String(scheme.sets)}
            label={isEs ? 'SERIES' : 'SETS'}
            ariaLabel={isEs ? `Series bloque ${si + 1}` : `Sets block ${si + 1}`}
          >
            <ComboNumberField
              variant="premium"
              className="wolf-se-combo-select--coach-mobile"
              value={scheme.sets}
              min={WL_SESSION_LIMITS.MIN_SETS_PER_SCHEME}
              max={WL_SESSION_LIMITS.MAX_SETS_PER_SCHEME}
              step={1}
              options={[...SETS_PRESETS_LIST]}
              onChange={onSetsChange}
              aria-label={isEs ? `Series bloque ${si + 1}` : `Sets block ${si + 1}`}
            />
          </MobileFieldRow>

          <MobileFieldRow
            value={String(scheme.reps)}
            label="REPS"
            ariaLabel={isEs ? `Reps bloque ${si + 1}` : `Reps block ${si + 1}`}
          >
            <ComboNumberField
              variant="premium"
              className="wolf-se-combo-select--coach-mobile"
              value={scheme.reps}
              min={WL_SESSION_LIMITS.MIN_REPS_PER_SET}
              max={WL_SESSION_LIMITS.MAX_REPS_PER_SET}
              step={1}
              options={[...REP_PRESETS_LIST]}
              onChange={onRepsChange}
              aria-label={isEs ? `Reps bloque ${si + 1}` : `Reps block ${si + 1}`}
            />
          </MobileFieldRow>
        </div>

        <div className="wolf-se-coach-set-block__mobile-footer">
          <CoachRestMetricRow
            restSec={restSec}
            isEs={isEs}
            setIndex={si}
            onRestChange={onRestChange}
          />
          <div className="wolf-se-coach-mobile-metric wolf-se-coach-mobile-metric--tonnage wolf-se-coach-mobile-metric--readonly">
            <span className="wolf-se-coach-mobile-metric__value">
              {kg}
              <span className="wolf-se-coach-mobile-metric__unit"> kg</span>
            </span>
            <span className="wolf-se-coach-mobile-metric__label">{isEs ? 'TONELAJE' : 'LOAD'}</span>
            <span className="wolf-se-coach-mobile-metric__readonly-hint">
              {isEs ? 'Calculado' : 'Calculated'}
            </span>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`wolf-se-coach-set-block${variant === 'inline' ? ' wolf-se-coach-set-block--inline' : ''}`}
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

      <div className="wolf-se-coach-set-block__fields">
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
