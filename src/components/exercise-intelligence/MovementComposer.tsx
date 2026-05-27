import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Layers, Save, Sparkles, X } from 'lucide-react';
import type {
  ExerciseComposition,
  ExerciseDefinition,
  ExerciseDefinitionInput,
  ExerciseFamilyCode,
  ExerciseLoadAnchorCode,
  ExerciseModifierCode,
  ExerciseVariationCode,
  SingleComposition,
  StartPositionCode,
  TrainingObjectiveCode,
} from '../../models/exercise';
import { isSingleComposition } from '../../models/exercise';
import { mockAthletes } from '../../data/loadMockData';
import { composeDisplayName, getExerciseTaxonomy, toLegacyExercise } from '../../services/exercise';
import { kgForExercise } from '../session-editor/blockMetrics';
import { familyClass, FAMILY_TOKEN } from './familyTokens';
import ComplexBuilderModal from '../exercise-composer/ComplexBuilderModal';
import type { ComposerDrawerMode } from '../exercise-composer/ExerciseComposerDrawer';

const DEMO = mockAthletes[0]!;

const ANCHORS: { value: ExerciseLoadAnchorCode; labelEs: string; labelEn: string }[] = [
  { value: 'auto', labelEs: 'Auto', labelEn: 'Auto' },
  { value: 'snatch', labelEs: 'Snatch', labelEn: 'Snatch' },
  { value: 'clean_jerk', labelEs: 'C&J', labelEn: 'C&J' },
  { value: 'back_squat', labelEs: 'BS', labelEn: 'BS' },
  { value: 'front_squat', labelEs: 'FS', labelEn: 'FS' },
];

function emptySingle(): SingleComposition {
  return { kind: 'single', family: 'snatch', variation: 'classic', startPosition: 'floor', modifiers: [], tempo: null };
}

type ComposerStep = 'family' | 'variation' | 'position' | 'modifiers' | 'meta';

interface MovementComposerProps {
  open: boolean;
  isEs: boolean;
  mode: ComposerDrawerMode;
  initial?: ExerciseDefinition | null;
  onClose: () => void;
  onSave: (input: ExerciseDefinitionInput, ctx: { mode: ComposerDrawerMode; editingId: string | null; forkParentId: string | null }) => Promise<string | null>;
  forkParentId?: string | null;
}

const MovementComposer: React.FC<MovementComposerProps> = ({
  open,
  isEs,
  mode,
  initial,
  onClose,
  onSave,
  forkParentId,
}) => {
  const taxonomy = getExerciseTaxonomy();
  const [step, setStep] = useState<ComposerStep>('family');
  const [composition, setComposition] = useState<ExerciseComposition>(emptySingle());
  const [objective, setObjective] = useState<TrainingObjectiveCode>('technique');
  const [loadAnchor, setLoadAnchor] = useState<ExerciseLoadAnchorCode>('auto');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [complexOpen, setComplexOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setEditingId(mode === 'fork' ? null : initial.id);
      setComposition(JSON.parse(JSON.stringify(initial.composition)) as ExerciseComposition);
      setObjective(initial.objective);
      setLoadAnchor(initial.loadAnchor);
      setStep('variation');
    } else {
      setEditingId(null);
      setComposition(emptySingle());
      setObjective('technique');
      setLoadAnchor('auto');
      setStep('family');
    }
  }, [open, initial, mode]);

  const locale = isEs ? 'es' : 'en';
  const previewName = useMemo(() => composeDisplayName(composition, taxonomy, locale), [composition, taxonomy, locale]);
  const single = isSingleComposition(composition);

  const previewKg = useMemo(() => {
    const draft: ExerciseDefinition = {
      id: 'preview',
      kind: single ? 'single' : 'complex',
      objective,
      loadAnchor,
      composition,
      displayName: previewName,
      signature: '',
      searchText: '',
      tags: [],
    };
    return kgForExercise(DEMO, toLegacyExercise(draft, taxonomy), 80);
  }, [composition, objective, loadAnchor, previewName, single, taxonomy]);

  const steps: ComposerStep[] = ['family', 'variation', 'position', 'modifiers', 'meta'];
  const stepIndex = steps.indexOf(step);

  const toggleModifier = (code: ExerciseModifierCode) => {
    if (!single) return;
    const has = composition.modifiers.includes(code);
    setComposition({
      ...composition,
      modifiers: has ? composition.modifiers.filter((m) => m !== code) : [...composition.modifiers, code],
    });
  };

  const handleSave = useCallback(async () => {
    const input: ExerciseDefinitionInput = {
      kind: single ? 'single' : 'complex',
      composition,
      objective,
      loadAnchor,
      tags: single ? [composition.family, objective] : ['complex', objective],
    };
    setBusy(true);
    const err = await onSave(input, { mode, editingId, forkParentId: forkParentId ?? null });
    setBusy(false);
    return err;
  }, [composition, editingId, forkParentId, loadAnchor, mode, objective, onSave, single]);

  if (!open) return null;

  const title =
    mode === 'fork'
      ? isEs
        ? 'Fork movimiento'
        : 'Fork movement'
      : editingId
        ? isEs
          ? 'Editar composición'
          : 'Edit composition'
        : isEs
          ? 'Componer movimiento'
          : 'Compose movement';

  return (
    <div className="wolf-ei-composer-overlay" role="presentation" onClick={onClose}>
      <div className="wolf-ei-composer" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <header className="wolf-ei-composer__header">
          <div>
            <span className="wolf-ei-composer__eyebrow">
              <Sparkles size={14} /> {isEs ? 'Composition Engine' : 'Composition Engine'}
            </span>
            <h2>{title}</h2>
          </div>
          <button type="button" className="wolf-ei-icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="wolf-ei-composer__progress">
          {steps.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`wolf-ei-composer__step-dot${i <= stepIndex ? ' done' : ''}${s === step ? ' active' : ''}`}
              onClick={() => setStep(s)}
            />
          ))}
        </div>

        <div className="wolf-ei-composer__body">
          <div className="wolf-ei-composer__workspace">
            {single && step === 'family' && (
              <section className="wolf-ei-composer__section">
                <h3>{isEs ? 'Familia del movimiento' : 'Movement family'}</h3>
                <div className="wolf-ei-family-grid">
                  {taxonomy.families.map((f) => {
                    const tok = FAMILY_TOKEN[f.code as ExerciseFamilyCode] ?? FAMILY_TOKEN.accessory;
                    const active = composition.family === f.code;
                    return (
                      <button
                        key={f.code}
                        type="button"
                        className={`wolf-ei-family-card ${familyClass(f.code)}${active ? ' active' : ''}`}
                        onClick={() => {
                          setComposition({ ...composition, family: f.code as ExerciseFamilyCode });
                          setStep('variation');
                        }}
                      >
                        <span className="wolf-ei-family-card__abbr" style={{ background: tok.gradient }}>
                          {tok.abbr}
                        </span>
                        <span className="wolf-ei-family-card__label">{isEs ? f.labelEs : f.labelEn}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {single && step === 'variation' && (
              <section className="wolf-ei-composer__section">
                <h3>{isEs ? 'Variación' : 'Variation'}</h3>
                <div className="wolf-ei-pill-row">
                  {taxonomy.variations.map((v) => (
                    <button
                      key={v.code}
                      type="button"
                      className={`wolf-ei-pill${composition.variation === v.code ? ' active' : ''}`}
                      onClick={() => setComposition({ ...composition, variation: v.code as ExerciseVariationCode })}
                    >
                      {isEs ? v.labelEs : v.labelEn}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {single && step === 'position' && (
              <section className="wolf-ei-composer__section">
                <h3>{isEs ? 'Posición de inicio' : 'Start position'}</h3>
                <div className="wolf-ei-segmented">
                  {taxonomy.startPositions.map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      className={composition.startPosition === p.code ? 'active' : ''}
                      onClick={() => setComposition({ ...composition, startPosition: p.code as StartPositionCode })}
                    >
                      {isEs ? p.labelEs : p.labelEn}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {single && step === 'modifiers' && (
              <section className="wolf-ei-composer__section">
                <h3>{isEs ? 'Modificadores' : 'Modifiers'}</h3>
                <div className="wolf-ei-mod-grid">
                  {taxonomy.modifiers.map((m) => {
                    const on = composition.modifiers.includes(m.code as ExerciseModifierCode);
                    return (
                      <button
                        key={m.code}
                        type="button"
                        className={`wolf-ei-mod-chip${on ? ' active' : ''}`}
                        onClick={() => toggleModifier(m.code as ExerciseModifierCode)}
                      >
                        {on ? '✓ ' : '+ '}
                        {isEs ? m.labelEs : m.labelEn}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {step === 'meta' && (
              <section className="wolf-ei-composer__section">
                <h3>{isEs ? 'Prescripción' : 'Prescription'}</h3>
                <div className="wolf-ei-pill-row">
                  {taxonomy.objectives.map((o) => (
                    <button
                      key={o.code}
                      type="button"
                      className={`wolf-ei-pill wolf-ei-pill--obj${objective === o.code ? ' active' : ''}`}
                      onClick={() => setObjective(o.code as TrainingObjectiveCode)}
                    >
                      {isEs ? o.labelEs : o.labelEn}
                    </button>
                  ))}
                </div>
                <div className="wolf-ei-segmented wolf-ei-segmented--anchors">
                  {ANCHORS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      className={loadAnchor === a.value ? 'active' : ''}
                      onClick={() => setLoadAnchor(a.value)}
                    >
                      {isEs ? a.labelEs : a.labelEn}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {!single && (
              <section className="wolf-ei-composer__section">
                <p className="muted">{isEs ? 'Complejo activo' : 'Complex mode active'}</p>
                <button type="button" className="wolf-ei-btn-secondary" onClick={() => setComplexOpen(true)}>
                  <Layers size={16} /> {isEs ? 'Editar segmentos' : 'Edit segments'}
                </button>
              </section>
            )}

            <footer className="wolf-ei-composer__nav">
              <button
                type="button"
                className="wolf-ei-btn-ghost"
                disabled={stepIndex === 0}
                onClick={() => setStep(steps[Math.max(0, stepIndex - 1)]!)}
              >
                <ArrowLeft size={16} /> {isEs ? 'Atrás' : 'Back'}
              </button>
              {stepIndex < steps.length - 1 ? (
                <button type="button" className="wolf-ei-btn-primary" onClick={() => setStep(steps[stepIndex + 1]!)}>
                  {isEs ? 'Siguiente' : 'Next'} <ArrowRight size={16} />
                </button>
              ) : (
                <button type="button" className="wolf-ei-btn-primary" disabled={busy} onClick={() => void handleSave()}>
                  <Save size={16} /> {isEs ? 'Guardar movimiento' : 'Save movement'}
                </button>
              )}
            </footer>
          </div>

          <aside className="wolf-ei-composer__preview-panel">
            <span className="wolf-ei-composer__preview-label">{isEs ? 'Vista en vivo' : 'Live preview'}</span>
            <h3 className="wolf-ei-composer__preview-name">{previewName}</h3>
            <div className="wolf-ei-composer__preview-tags">
              {single && (
                <>
                  <span className={`wolf-ei-preview-tag ${familyClass(composition.family)}`}>{composition.family}</span>
                  <span className="wolf-ei-preview-tag">{composition.variation}</span>
                  <span className="wolf-ei-preview-tag">{composition.startPosition}</span>
                  {composition.modifiers.map((m) => (
                    <span key={m} className="wolf-ei-preview-tag wolf-ei-preview-tag--mod">
                      {m}
                    </span>
                  ))}
                </>
              )}
              <span className="wolf-ei-preview-tag wolf-ei-preview-tag--obj">{objective}</span>
            </div>
            <div className="wolf-ei-composer__preview-load">
              <span className="wolf-ei-composer__preview-load-label">@ 80% 1RM</span>
              <strong>{previewKg}</strong>
              <span>kg</span>
            </div>
            <button type="button" className="wolf-ei-btn-ghost wolf-ei-composer__complex-link" onClick={() => setComplexOpen(true)}>
              <Layers size={14} /> {isEs ? 'Modo complejo' : 'Complex mode'}
            </button>
          </aside>
        </div>

        <ComplexBuilderModal
          open={complexOpen}
          isEs={isEs}
          taxonomy={taxonomy}
          initial={composition.kind === 'complex' ? composition : null}
          onClose={() => setComplexOpen(false)}
          onApply={(c) => {
            setComposition(c);
            setComplexOpen(false);
            setStep('meta');
          }}
        />
      </div>
    </div>
  );
};

export default MovementComposer;
