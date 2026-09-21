import { useEffect, useMemo, useState } from 'react';
import type {
  ExerciseDefinitionInput,
  ExerciseFamilyCode,
  ExerciseLoadAnchorCode,
  ExerciseModifierCode,
  ExerciseTaxonomyBundle,
  ExerciseVariationCode,
  MergedDefinitionView,
  SingleComposition,
  StartPositionCode,
  TrainingObjectiveCode,
} from '../../models/exercise';
import {
  customFamilyIdFromTags,
  isSingleComposition,
  stripCustomFamilyTags,
} from '../../models/exercise';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useCoachExerciseFamilies } from '../../hooks/useCoachExerciseFamilies';
import { composeDisplayName } from '../../services/exercise';
import { WlCenteredModal } from '../wl-shared/WlCenteredModal';
import { ExerciseFamilyPicker } from './ExerciseFamilyPicker';
import { DISCIPLINE_OPTIONS, type ExerciseDisciplineFilter } from './exerciseListUtils';

export type ExerciseFormMode = 'create' | 'edit' | 'fork' | 'duplicate';

function emptySingle(family: ExerciseFamilyCode = 'snatch'): SingleComposition {
  return {
    kind: 'single',
    family,
    variation: 'classic',
    startPosition: 'floor',
    modifiers: [],
    tempo: null,
  };
}

function seedSingle(initial?: MergedDefinitionView | null): SingleComposition {
  const composition = initial?.composition;
  return composition && isSingleComposition(composition) ? composition : emptySingle();
}

export function WlExerciseFormModal({
  isEs,
  mode,
  taxonomy,
  initial,
  busy,
  onClose,
  onSave,
  onManageFamilies,
}: {
  isEs: boolean;
  mode: ExerciseFormMode;
  taxonomy: ExerciseTaxonomyBundle;
  initial?: MergedDefinitionView | null;
  busy?: boolean;
  onClose: () => void;
  onSave: (input: ExerciseDefinitionInput, opts: { folderId: string | null }) => Promise<void>;
  onManageFamilies?: () => void;
}) {
  const titles: Record<ExerciseFormMode, { es: string; en: string }> = {
    create: { es: 'Nuevo ejercicio', en: 'New exercise' },
    edit: { es: 'Editar ejercicio', en: 'Edit exercise' },
    fork: { es: 'Personalizar ejercicio', en: 'Personalize exercise' },
    duplicate: { es: 'Duplicar ejercicio', en: 'Duplicate exercise' },
  };

  const seeded = seedSingle(initial);
  const [discipline, setDiscipline] = useState<ExerciseDisciplineFilter>(
    initial?.family === 'accessory' ? 'accessory' : 'weightlifting',
  );
  const [family, setFamily] = useState<ExerciseFamilyCode>(seeded.family);
  const [variation, setVariation] = useState<ExerciseVariationCode>(seeded.variation);
  const [startPosition, setStartPosition] = useState<StartPositionCode>(seeded.startPosition);
  const [modifiers, setModifiers] = useState<ExerciseModifierCode[]>(seeded.modifiers);
  const [objective, setObjective] = useState<TrainingObjectiveCode>(initial?.objective ?? 'technique');
  const [loadAnchor, setLoadAnchor] = useState<ExerciseLoadAnchorCode>(initial?.loadAnchor ?? 'auto');
  const [customFamilyId, setCustomFamilyId] = useState<string | null>(() =>
    customFamilyIdFromTags(initial?.tags),
  );
  const { currentUserId } = useWolfAssign();
  const { families: customFamilies } = useCoachExerciseFamilies(currentUserId);
  const isComplex = Boolean(initial && !isSingleComposition(initial.composition));

  useEffect(() => {
    if (customFamilyId && !customFamilies.some((family) => family.id === customFamilyId)) {
      setCustomFamilyId(null);
    }
  }, [customFamilies, customFamilyId]);

  useEffect(() => {
    const single = seedSingle(initial);
    setDiscipline(initial?.family === 'accessory' ? 'accessory' : 'weightlifting');
    setFamily(single.family);
    setVariation(single.variation);
    setStartPosition(single.startPosition);
    setModifiers(single.modifiers);
    setObjective(initial?.objective ?? 'technique');
    setLoadAnchor(initial?.loadAnchor ?? 'auto');
    setCustomFamilyId(customFamilyIdFromTags(initial?.tags));
  }, [initial, mode]);

  const buildTags = (): string[] => stripCustomFamilyTags(initial?.tags);

  const catalogReady = discipline === 'weightlifting' || discipline === 'accessory' || discipline === 'all';

  const composition = useMemo<SingleComposition>(() => {
    const nextFamily = discipline === 'accessory' ? 'accessory' : family;
    return {
      kind: 'single',
      family: nextFamily,
      variation,
      startPosition,
      modifiers,
      tempo: null,
    };
  }, [discipline, family, variation, startPosition, modifiers]);

  const previewName = composeDisplayName(
    isComplex && initial ? initial.composition : composition,
    taxonomy,
    isEs ? 'es' : 'en',
  );

  const toggleModifier = (code: ExerciseModifierCode) => {
    setModifiers((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]));
  };

  const handleSave = async () => {
    if (!catalogReady) return;
    if (isComplex && initial) {
      await onSave(
        {
          kind: 'complex',
          composition: initial.composition,
          objective,
          loadAnchor,
          tags: buildTags(),
        },
        { folderId: customFamilyId },
      );
      return;
    }
    await onSave(
      {
        kind: 'single',
        composition,
        objective,
        loadAnchor,
        tags: buildTags(),
      },
      { folderId: customFamilyId },
    );
  };

  return (
    <WlCenteredModal
      isEs={isEs}
      kicker={isEs ? 'Ejercicios' : 'Exercises'}
      title={isEs ? titles[mode].es : titles[mode].en}
      subtitle={previewName}
      className="wl-centered-modal--exercises-light"
      onClose={onClose}
      footer={
        <div className="wl-form-sheet-footer__actions">
          <button type="button" className="wl-form-sheet-btn wl-form-sheet-btn--ghost" onClick={onClose}>
            {isEs ? 'Cancelar' : 'Cancel'}
          </button>
          <button
            type="button"
            className="wl-form-sheet-btn wl-form-sheet-btn--primary"
            disabled={busy || !catalogReady}
            onClick={() => void handleSave()}
          >
            {isEs ? 'Guardar' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="wl-exercise-form-stack">
        <label className="wl-form-sheet-field">
          <span className="wl-form-sheet-label">{isEs ? 'Disciplina' : 'Discipline'}</span>
          <select
            className="wl-form-sheet-select"
            value={discipline}
            onChange={(event) => setDiscipline(event.target.value as ExerciseDisciplineFilter)}
          >
            {DISCIPLINE_OPTIONS.filter((option) => option.id !== 'all').map((option) => (
              <option key={option.id} value={option.id}>
                {isEs ? option.labelEs : option.labelEn}
              </option>
            ))}
          </select>
        </label>

        {!catalogReady ? (
          <p className="wl-form-sheet-hint">
            {isEs
              ? 'Aún no hay catálogo para esta disciplina. Elige Halterofilia o Accesorios.'
              : 'No catalog yet for this discipline. Choose Weightlifting or Accessories.'}
          </p>
        ) : isComplex && initial ? (
          <>
            <p className="wl-form-sheet-hint">
              {isEs
                ? 'Este movimiento es un complejo. Se conserva la composición; puedes cambiar objetivo y ancla.'
                : 'This movement is a complex. Composition is kept; you can change objective and anchor.'}
            </p>
            <label className="wl-form-sheet-field">
              <span className="wl-form-sheet-label">{isEs ? 'Objetivo' : 'Objective'}</span>
              <select
                className="wl-form-sheet-select"
                value={objective}
                onChange={(event) => setObjective(event.target.value as TrainingObjectiveCode)}
              >
                {taxonomy.objectives.map((item) => (
                  <option key={item.code} value={item.code}>
                    {isEs ? item.labelEs : item.labelEn}
                  </option>
                ))}
              </select>
            </label>
            <label className="wl-form-sheet-field">
              <span className="wl-form-sheet-label">{isEs ? 'Ancla de carga' : 'Load anchor'}</span>
              <select
                className="wl-form-sheet-select"
                value={loadAnchor}
                onChange={(event) => setLoadAnchor(event.target.value as ExerciseLoadAnchorCode)}
              >
                <option value="auto">Auto</option>
                <option value="snatch">Snatch</option>
                <option value="clean_jerk">Clean & Jerk</option>
                <option value="back_squat">{isEs ? 'Sentadilla atrás' : 'Back squat'}</option>
                <option value="front_squat">{isEs ? 'Sentadilla frontal' : 'Front squat'}</option>
              </select>
            </label>
          </>
        ) : (
          <>
            <ExerciseFamilyPicker
              isEs={isEs}
              officialFamily={family}
              customFamilyId={customFamilyId}
              customFamilies={customFamilies}
              onOfficialChange={(nextFamily) => {
                setFamily(nextFamily);
                if (nextFamily === 'accessory') setDiscipline('accessory');
                else if (discipline === 'accessory') setDiscipline('weightlifting');
              }}
              onCustomChange={setCustomFamilyId}
              onManageFamilies={onManageFamilies}
            />
            <label className="wl-form-sheet-field">
              <span className="wl-form-sheet-label">{isEs ? 'Variación' : 'Variation'}</span>
              <select
                className="wl-form-sheet-select"
                value={variation}
                onChange={(event) => setVariation(event.target.value as ExerciseVariationCode)}
              >
                {taxonomy.variations.map((item) => (
                  <option key={item.code} value={item.code}>
                    {isEs ? item.labelEs : item.labelEn}
                  </option>
                ))}
              </select>
            </label>
            <label className="wl-form-sheet-field">
              <span className="wl-form-sheet-label">{isEs ? 'Posición' : 'Position'}</span>
              <select
                className="wl-form-sheet-select"
                value={startPosition}
                onChange={(event) => setStartPosition(event.target.value as StartPositionCode)}
              >
                {taxonomy.startPositions.map((item) => (
                  <option key={item.code} value={item.code}>
                    {isEs ? item.labelEs : item.labelEn}
                  </option>
                ))}
              </select>
            </label>
            <div className="wl-form-sheet-field">
              <span className="wl-form-sheet-label">{isEs ? 'Modificadores' : 'Modifiers'}</span>
              <div className="wl-exercise-modifiers">
                {taxonomy.modifiers.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    className={modifiers.includes(item.code as ExerciseModifierCode) ? 'is-on' : ''}
                    onClick={() => toggleModifier(item.code as ExerciseModifierCode)}
                  >
                    {isEs ? item.labelEs : item.labelEn}
                  </button>
                ))}
              </div>
            </div>
            <label className="wl-form-sheet-field">
              <span className="wl-form-sheet-label">{isEs ? 'Objetivo' : 'Objective'}</span>
              <select
                className="wl-form-sheet-select"
                value={objective}
                onChange={(event) => setObjective(event.target.value as TrainingObjectiveCode)}
              >
                {taxonomy.objectives.map((item) => (
                  <option key={item.code} value={item.code}>
                    {isEs ? item.labelEs : item.labelEn}
                  </option>
                ))}
              </select>
            </label>
            <label className="wl-form-sheet-field">
              <span className="wl-form-sheet-label">{isEs ? 'Ancla de carga' : 'Load anchor'}</span>
              <select
                className="wl-form-sheet-select"
                value={loadAnchor}
                onChange={(event) => setLoadAnchor(event.target.value as ExerciseLoadAnchorCode)}
              >
                <option value="auto">Auto</option>
                <option value="snatch">Snatch</option>
                <option value="clean_jerk">Clean & Jerk</option>
                <option value="back_squat">{isEs ? 'Sentadilla atrás' : 'Back squat'}</option>
                <option value="front_squat">{isEs ? 'Sentadilla frontal' : 'Front squat'}</option>
              </select>
            </label>
            <p className="wl-exercise-preview">
              {isEs ? 'Se guardará como' : 'Will be saved as'} <strong>{previewName}</strong>
            </p>
          </>
        )}
      </div>
    </WlCenteredModal>
  );
}
