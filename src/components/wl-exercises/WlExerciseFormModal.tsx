import { Plus, Trash2 } from 'lucide-react';
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
import { ExerciseTechnicalFamilySelect } from './ExerciseTechnicalFamilySelect';
import { ExerciseMedia } from './ExerciseMedia';
import type { ExerciseFamilyId } from './types';

export type ExerciseFormMode = 'create' | 'edit' | 'fork' | 'duplicate';

export type ExerciseFormSaveOpts = {
  folderId: string | null;
  videoUrl?: string;
  cues?: string[];
};

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

function normalizeCues(cues: string[]): string[] {
  return cues.map((cue) => cue.trim()).filter(Boolean);
}

const LOAD_ANCHOR_OPTIONS: { value: ExerciseLoadAnchorCode; labelEs: string; labelEn: string }[] = [
  { value: 'auto', labelEs: 'Propio', labelEn: 'Own' },
  { value: 'snatch', labelEs: 'Snatch', labelEn: 'Snatch' },
  { value: 'clean_jerk', labelEs: 'C&J', labelEn: 'C&J' },
  { value: 'back_squat', labelEs: 'Sentadilla atrás', labelEn: 'Back squat' },
  { value: 'front_squat', labelEs: 'Sentadilla frontal', labelEn: 'Front squat' },
];

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
  onSave: (input: ExerciseDefinitionInput, opts: ExerciseFormSaveOpts) => Promise<void>;
  onManageFamilies?: () => void;
}) {
  const titles: Record<ExerciseFormMode, { es: string; en: string }> = {
    create: { es: 'Nuevo ejercicio', en: 'New exercise' },
    edit: { es: 'Editar ejercicio', en: 'Edit exercise' },
    fork: { es: 'Personalizar ejercicio', en: 'Personalize exercise' },
    duplicate: { es: 'Duplicar ejercicio', en: 'Duplicate exercise' },
  };

  const seeded = seedSingle(initial);
  const [discipline, setDiscipline] = useState<'weightlifting' | 'accessory'>(
    initial?.family === 'accessory' ? 'accessory' : 'weightlifting',
  );
  const [family, setFamily] = useState<ExerciseFamilyCode>(seeded.family);
  const [variation, setVariation] = useState<ExerciseVariationCode>(seeded.variation);
  const [startPosition, setStartPosition] = useState<StartPositionCode>(seeded.startPosition);
  const [modifiers, setModifiers] = useState<ExerciseModifierCode[]>(seeded.modifiers);
  const [objective, setObjective] = useState<TrainingObjectiveCode>(initial?.objective ?? 'technique');
  const [loadAnchor, setLoadAnchor] = useState<ExerciseLoadAnchorCode>(initial?.loadAnchor ?? 'auto');
  const [displayName, setDisplayName] = useState(initial?.effectiveDisplayName ?? '');
  const [videoUrl, setVideoUrl] = useState(initial?.coachOverride?.override.videoUrl ?? '');
  const [cues, setCues] = useState<string[]>(() => {
    const saved = initial?.coachOverride?.override.cues?.filter(Boolean) ?? [];
    return saved.length ? saved : [''];
  });
  const [customFamilyId, setCustomFamilyId] = useState<string | null>(() =>
    customFamilyIdFromTags(initial?.tags),
  );
  const { currentUserId } = useWolfAssign();
  const { families: customFamilies } = useCoachExerciseFamilies(currentUserId);
  const isComplex = Boolean(initial && !isSingleComposition(initial.composition));
  const isFullForm = mode === 'create' || mode === 'edit' || mode === 'duplicate';

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
    setDisplayName(initial?.effectiveDisplayName ?? '');
    setVideoUrl(initial?.coachOverride?.override.videoUrl ?? '');
    const savedCues = initial?.coachOverride?.override.cues?.filter(Boolean) ?? [];
    setCues(savedCues.length ? savedCues : ['']);
    setCustomFamilyId(customFamilyIdFromTags(initial?.tags));
  }, [initial, mode]);

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

  const resolvedName = displayName.trim() || previewName;
  const previewFamily = (discipline === 'accessory' ? 'accessory' : family) as ExerciseFamilyId;

  const toggleModifier = (code: ExerciseModifierCode) => {
    setModifiers((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]));
  };

  const handleSave = async () => {
    const tags = stripCustomFamilyTags(initial?.tags);
    const payload: ExerciseDefinitionInput = isComplex && initial
      ? {
          kind: 'complex',
          composition: initial.composition,
          objective,
          loadAnchor,
          displayName: isFullForm ? displayName.trim() || undefined : undefined,
          tags,
        }
      : {
          kind: 'single',
          composition,
          objective,
          loadAnchor,
          displayName: isFullForm ? displayName.trim() || undefined : undefined,
          tags,
        };

    await onSave(payload, {
      folderId: customFamilyId,
      videoUrl: videoUrl.trim() || undefined,
      cues: normalizeCues(cues),
    });
  };

  const compositionBlock = (
    <div className="wl-exercise-detail__meta-block wl-exercise-detail__meta-block--spec">
      <div className="wl-exercise-form-spec-head">
        <h3 className="wl-exercise-detail__intel-title">
          {isEs ? 'Composición y carga' : 'Composition & load'}
        </h3>

        <div className="wl-exercise-form-spec-head__row">
          <label className="wl-exercise-compose__field">
            <span className="wl-exercise-compose__label">{isEs ? 'Disciplina' : 'Discipline'}</span>
            <select
              className="wl-exercise-compose__input"
              value={discipline}
              onChange={(event) => {
                const next = event.target.value as 'weightlifting' | 'accessory';
                setDiscipline(next);
                if (next === 'accessory') {
                  setFamily('accessory');
                } else if (family === 'accessory') {
                  setFamily('snatch');
                }
              }}
            >
              <option value="weightlifting">{isEs ? 'Halterofilia' : 'Weightlifting'}</option>
              <option value="accessory">{isEs ? 'Accesorios' : 'Accessories'}</option>
            </select>
          </label>

          {!isComplex ? (
            discipline === 'weightlifting' ? (
              <div className="wl-exercise-compose__field">
                <span className="wl-exercise-compose__label">{isEs ? 'Familia técnica' : 'Technical family'}</span>
                <ExerciseTechnicalFamilySelect
                  isEs={isEs}
                  value={family}
                  onChange={(nextFamily) => {
                    setFamily(nextFamily);
                    if (nextFamily === 'accessory') setDiscipline('accessory');
                  }}
                />
              </div>
            ) : (
              <label className="wl-exercise-compose__field">
                <span className="wl-exercise-compose__label">{isEs ? 'Familia técnica' : 'Technical family'}</span>
                <select className="wl-exercise-compose__input" value="accessory" disabled>
                  <option value="accessory">{isEs ? 'Accesorios' : 'Accessories'}</option>
                </select>
              </label>
            )
          ) : null}
        </div>
      </div>

      {isComplex && initial ? (
        <p className="wl-exercise-compose__hint">
          {isEs
            ? 'Complejo: conserva la composición; puedes ajustar objetivo y referencia.'
            : 'Complex: composition is fixed; adjust objective and intensity reference.'}
        </p>
      ) : null}

      <div className="wl-exercise-compose__grid wl-exercise-compose__grid--detail">
        {!isComplex ? (
          <>
            <label className="wl-exercise-compose__field">
              <span className="wl-exercise-compose__label">{isEs ? 'Variación' : 'Variation'}</span>
              <select
                className="wl-exercise-compose__input"
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
            <label className="wl-exercise-compose__field">
              <span className="wl-exercise-compose__label">{isEs ? 'Posición' : 'Position'}</span>
              <select
                className="wl-exercise-compose__input"
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
            <label className="wl-exercise-compose__field">
              <span className="wl-exercise-compose__label">
                {isEs ? 'Referencia de intensidad' : 'Intensity reference'}
              </span>
              <select
                className="wl-exercise-compose__input"
                value={loadAnchor}
                onChange={(event) => setLoadAnchor(event.target.value as ExerciseLoadAnchorCode)}
              >
                {LOAD_ANCHOR_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {isEs ? item.labelEs : item.labelEn}
                  </option>
                ))}
              </select>
            </label>
            <label className="wl-exercise-compose__field">
              <span className="wl-exercise-compose__label">{isEs ? 'Objetivo' : 'Objective'}</span>
              <select
                className="wl-exercise-compose__input"
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
            <div className="wl-exercise-compose__field wl-exercise-compose__field--full">
              <span className="wl-exercise-compose__label">{isEs ? 'Modificadores' : 'Modifiers'}</span>
              <div
                className="wl-exercise-modifiers"
                role="group"
                aria-label={isEs ? 'Modificadores del ejercicio' : 'Exercise modifiers'}
              >
                {taxonomy.modifiers.map((item) => {
                  const code = item.code as ExerciseModifierCode;
                  const selected = modifiers.includes(code);
                  const label = isEs ? item.labelEs : item.labelEn;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      className={`wl-exercise-modifiers__chip${selected ? ' is-on' : ''}`}
                      aria-pressed={selected}
                      aria-label={
                        selected
                          ? isEs
                            ? `Quitar ${label}`
                            : `Remove ${label}`
                          : isEs
                            ? `Añadir ${label}`
                            : `Add ${label}`
                      }
                      onClick={() => toggleModifier(code)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <>
            <label className="wl-exercise-compose__field">
              <span className="wl-exercise-compose__label">
                {isEs ? 'Referencia de intensidad' : 'Intensity reference'}
              </span>
              <select
                className="wl-exercise-compose__input"
                value={loadAnchor}
                onChange={(event) => setLoadAnchor(event.target.value as ExerciseLoadAnchorCode)}
              >
                {LOAD_ANCHOR_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {isEs ? item.labelEs : item.labelEn}
                  </option>
                ))}
              </select>
            </label>
            <label className="wl-exercise-compose__field">
              <span className="wl-exercise-compose__label">{isEs ? 'Objetivo' : 'Objective'}</span>
              <select
                className="wl-exercise-compose__input"
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
          </>
        )}
      </div>
    </div>
  );

  return (
    <WlCenteredModal
      isEs={isEs}
      kicker={isEs ? 'Ejercicios' : 'Exercises'}
      title={isEs ? titles[mode].es : titles[mode].en}
      subtitle={resolvedName}
      className="wl-centered-modal--exercises-light wl-centered-modal--exercises-compose"
      onClose={onClose}
      footer={
        <div className="wl-form-sheet-footer__actions wl-exercise-form-footer">
          <p className="wl-exercise-form-footer__hint">
            {isEs
              ? 'Lo que guardes se verá igual en la ficha del ejercicio.'
              : 'What you save will match the exercise detail view.'}
          </p>
          <div className="wl-exercise-form-footer__actions">
            <button type="button" className="wl-form-sheet-btn wl-form-sheet-btn--ghost" onClick={onClose}>
              {isEs ? 'Cancelar' : 'Cancel'}
            </button>
            <button
              type="button"
              className="wl-form-sheet-btn wl-form-sheet-btn--primary"
              disabled={busy}
              onClick={() => void handleSave()}
            >
              {isEs ? 'Guardar ejercicio' : 'Save exercise'}
            </button>
          </div>
        </div>
      }
    >
      <div className="wl-exercise-compose wl-exercise-compose--form">
        <aside className="wl-exercise-compose__media">
          <ExerciseMedia
            name={resolvedName}
            family={previewFamily}
            mediaUrl={videoUrl}
            isEs={isEs}
            className="wl-exercise-detail__media wl-exercise-detail__media--form"
            showTabs
            allowImageUpload={isFullForm}
            editing={isFullForm}
            videoUrl={videoUrl}
            onVideoUrlChange={setVideoUrl}
          />
        </aside>

        <div className="wl-exercise-compose__main">
          {isFullForm ? (
            <div className="wl-exercise-form-hero">
              <label className="wl-exercise-form-hero__field">
                <span className="wl-exercise-compose__label">{isEs ? 'Nombre del ejercicio' : 'Exercise name'}</span>
                <input
                  className="wl-exercise-form-hero__input"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder={previewName}
                  autoComplete="off"
                />
              </label>
              <p className="wl-exercise-form-hero__note">
                {displayName.trim()
                  ? isEs
                    ? `Nombre personalizado · automático: ${previewName}`
                    : `Custom name · auto: ${previewName}`
                  : isEs
                    ? `Se usará el nombre automático: ${previewName}`
                    : `Auto name will be used: ${previewName}`}
              </p>
            </div>
          ) : null}

          {compositionBlock}

          <div className="wl-exercise-detail__meta-block wl-exercise-detail__meta-block--cues">
            <h3 className="wl-exercise-detail__intel-title">{isEs ? 'Indicaciones' : 'Cues'}</h3>
            <p className="wl-exercise-form-cues__lead">
              {isEs
                ? 'Opcional. Aparecerán en la ficha como bullets para tus atletas.'
                : 'Optional. They appear as bullets on the exercise detail.'}
            </p>
            <div className="wl-exercise-detail__cues-edit">
              {cues.map((cue, index) => (
                <div className="wl-exercise-cues__row" key={`form-cue-${index}`}>
                  <span className="wl-exercise-detail__cue-marker" aria-hidden>
                    •
                  </span>
                  <input
                    value={cue}
                    onChange={(event) => {
                      const next = [...cues];
                      next[index] = event.target.value;
                      setCues(next);
                    }}
                    placeholder={
                      isEs
                        ? 'Ej. Mantén la espalda neutra durante todo el movimiento'
                        : 'E.g. Keep a neutral spine throughout the movement'
                    }
                  />
                  <button
                    type="button"
                    className="wl-exercise-cues__remove"
                    title={isEs ? 'Eliminar indicación' : 'Remove cue'}
                    aria-label={isEs ? 'Eliminar indicación' : 'Remove cue'}
                    onClick={() => setCues((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={15} strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="wl-exercise-cues__add wl-exercise-cues__add--inline"
                onClick={() => setCues((current) => [...current, ''])}
              >
                <Plus size={14} strokeWidth={2.25} aria-hidden />
                {isEs ? 'Añadir indicación' : 'Add cue'}
              </button>
            </div>
          </div>

          <details className="wl-exercise-form-advanced">
            <summary>{isEs ? 'Carpeta y organización' : 'Folder & organization'}</summary>
            <div className="wl-exercise-form-advanced__body">
              <ExerciseFamilyPicker
                isEs={isEs}
                officialFamily={family}
                customFamilyId={customFamilyId}
                customFamilies={customFamilies}
                sections="folder"
                onOfficialChange={setFamily}
                onCustomChange={setCustomFamilyId}
                onManageFamilies={onManageFamilies}
              />
            </div>
          </details>
        </div>
      </div>
    </WlCenteredModal>
  );
}
