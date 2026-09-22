import { Copy, Lock, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ExerciseLoadAnchorCode,
  ExerciseTaxonomyBundle,
  MergedDefinitionView,
  OverridePatch,
  TrainingObjectiveCode,
} from '../../models/exercise';
import { isSingleComposition } from '../../models/exercise';
import { cuesToBullets } from '../../utils/exerciseDisplayName';
import ConfirmationModal from '../ConfirmationModal';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import { displayIntensityReference } from './exerciseDetailDisplay';
import { ExerciseMedia } from './ExerciseMedia.tsx';
import { FamilyAvatar } from './FamilyAvatar';
import { definitionFamily, familyDisplayLabel, taxonomyLabel } from './exerciseListUtils';
import type { ExerciseFamilyId } from './types';

type DetailTab = 'intel' | 'personalize';

const OVERRIDE_ANCHORS: { value: ExerciseLoadAnchorCode; labelEs: string; labelEn: string }[] = [
  { value: 'auto', labelEs: 'Propio', labelEn: 'Own' },
  { value: 'snatch', labelEs: 'Snatch', labelEn: 'Snatch' },
  { value: 'clean_jerk', labelEs: 'C&J', labelEn: 'C&J' },
  { value: 'back_squat', labelEs: 'Sentadilla atrás', labelEn: 'Back squat' },
  { value: 'front_squat', labelEs: 'Sentadilla frontal', labelEn: 'Front squat' },
];

function overrideDraftKey(defId: string): string {
  return `wolf_exercise_override_draft_${defId}`;
}

type OverrideFormState = {
  displayName: string;
  videoUrl: string;
  loadAnchor: ExerciseLoadAnchorCode;
  objective: TrainingObjectiveCode;
  hidden: boolean;
  cues: string[];
};

function normalizeCues(cues: string[]): string[] {
  return cues.map((cue) => cue.trim()).filter(Boolean);
}

function cuesEqual(a: string[], b: string[]): boolean {
  const left = normalizeCues(a);
  const right = normalizeCues(b);
  return left.length === right.length && left.every((cue, index) => cue === right[index]);
}

function seedOverrideForm(def: MergedDefinitionView, officialCueBullets: string[]): OverrideFormState {
  const savedCues = def.coachOverride?.override.cues?.filter(Boolean);
  const cueSeed = savedCues?.length ? savedCues : officialCueBullets.length ? officialCueBullets : [''];
  return {
    displayName: def.coachOverride?.override.displayName ?? '',
    videoUrl: def.coachOverride?.override.videoUrl ?? '',
    loadAnchor: def.coachOverride?.override.loadAnchor ?? def.loadAnchor,
    objective: def.coachOverride?.override.objective ?? def.objective,
    hidden: Boolean(def.coachOverride?.override.hidden),
    cues: cueSeed,
  };
}

function overridePatchFromForm(form: OverrideFormState, officialCueBullets: string[]): OverridePatch {
  const cues = normalizeCues(form.cues);
  const patch: OverridePatch = {
    displayName: form.displayName.trim() || undefined,
    videoUrl: form.videoUrl.trim() || null,
    loadAnchor: form.loadAnchor,
    objective: form.objective,
    hidden: form.hidden,
  };
  patch.cues = cuesEqual(cues, officialCueBullets) ? [] : cues;
  return patch;
}

function formsEqual(a: OverrideFormState, b: OverrideFormState, officialCueBullets: string[]): boolean {
  return (
    JSON.stringify(overridePatchFromForm(a, officialCueBullets)) ===
    JSON.stringify(overridePatchFromForm(b, officialCueBullets))
  );
}

export function WlExerciseDetail({
  def,
  isEs,
  taxonomy,
  usageCount,
  initialTab = 'intel',
  onBack,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onSaveOverride,
}: {
  def: MergedDefinitionView;
  isEs: boolean;
  taxonomy: ExerciseTaxonomyBundle;
  usageCount: number;
  initialTab?: DetailTab;
  onBack: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onSaveOverride: (baseId: string, patch: OverridePatch) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(initialTab === 'personalize');
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'back' | 'stop-editing' | null>(null);

  const cueText = (isEs ? def.cuesEs : def.cuesEn) ?? def.cuesEn ?? def.cuesEs;
  const officialCueBullets = useMemo(() => cuesToBullets(cueText), [cueText]);

  const baseline = useMemo(() => seedOverrideForm(def, officialCueBullets), [def, officialCueBullets]);
  const [form, setForm] = useState<OverrideFormState>(() => seedOverrideForm(def, officialCueBullets));

  useEffect(() => {
    const seeded = seedOverrideForm(def, officialCueBullets);
    if (!def.coachId) {
      try {
        const raw = localStorage.getItem(overrideDraftKey(def.id));
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<OverrideFormState>;
          setForm({
            displayName: parsed.displayName ?? seeded.displayName,
            videoUrl: parsed.videoUrl ?? seeded.videoUrl,
            loadAnchor: parsed.loadAnchor ?? seeded.loadAnchor,
            objective: parsed.objective ?? seeded.objective,
            hidden: parsed.hidden ?? seeded.hidden,
            cues: parsed.cues?.length ? parsed.cues : seeded.cues,
          });
          setEditing(initialTab === 'personalize');
          return;
        }
      } catch {
        /* ignore corrupt draft */
      }
    }
    setForm(seeded);
    setEditing(initialTab === 'personalize');
  }, [def, initialTab, officialCueBullets]);

  const isDirty = useMemo(
    () => !formsEqual(form, baseline, officialCueBullets),
    [form, baseline, officialCueBullets],
  );
  const family = definitionFamily(def);
  const familyLabel = familyDisplayLabel(family);
  const typeLabel = taxonomyLabel(taxonomy.objectives, def.objective, isEs);
  const editingTypeLabel = taxonomyLabel(taxonomy.objectives, form.objective, isEs);
  const isOfficial = !def.coachId;
  const intensityRefLabel = isEs ? 'Referencia de intensidad' : 'Intensity reference';
  const intensityDisplay = displayIntensityReference(def, isEs);
  const displayCues = useMemo(() => {
    const custom = def.coachOverride?.override.cues?.map((c) => c.trim()).filter(Boolean) ?? [];
    return custom.length ? custom : officialCueBullets;
  }, [def.coachOverride?.override.cues, officialCueBullets]);

  useEffect(() => {
    if (!isOfficial || !isDirty) return;
    const timer = window.setInterval(() => {
      try {
        localStorage.setItem(overrideDraftKey(def.id), JSON.stringify(form));
      } catch {
        /* ignore quota */
      }
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [def.id, form, isDirty, isOfficial]);

  const runPendingAction = useCallback(() => {
    if (pendingAction === 'back') {
      onBack();
    } else if (pendingAction === 'stop-editing') {
      setForm(baseline);
      setEditing(false);
    }
    setPendingAction(null);
    setDiscardOpen(false);
  }, [baseline, onBack, pendingAction]);

  const requestLeaveEditing = (action: 'back' | 'stop-editing') => {
    if (isDirty && editing) {
      setPendingAction(action);
      setDiscardOpen(true);
      return;
    }
    if (action === 'back') onBack();
    else {
      setForm(baseline);
      setEditing(false);
    }
  };

  const startEditing = () => setEditing(true);

  const handleSaveOverride = async () => {
    setBusy(true);
    const patch = overridePatchFromForm(form, officialCueBullets);
    const err = await onSaveOverride(def.id, patch);
    setBusy(false);
    if (!err) {
      try {
        localStorage.removeItem(overrideDraftKey(def.id));
      } catch {
        /* ignore */
      }
      setEditing(false);
    }
  };

  const modifierChips =
    isSingleComposition(def.composition) && def.composition.modifiers.length
      ? def.composition.modifiers.map((code) => taxonomyLabel(taxonomy.modifiers, code, isEs))
      : [];

  const titleDisplay = form.displayName.trim() || def.effectiveDisplayName;

  return (
    <section className={`wl-exercises-detail${editing && isOfficial ? ' wl-exercises-detail--editing' : ''}`}>
      <header className="wl-exercise-detail__toolbar">
        <AppBreadcrumb
          isEs={isEs}
          className="app-breadcrumb--icon-back"
          onBack={() => requestLeaveEditing('back')}
          backLabel={isEs ? 'Volver' : 'Back'}
          items={[]}
        />
        <div className="wl-exercise-detail__toolbar-actions">
          {isDirty && editing ? (
            <span className="wl-exercise-detail__dirty-badge">
              ● {isEs ? 'Cambios sin guardar' : 'Unsaved changes'}
            </span>
          ) : null}
          {isOfficial ? (
            editing ? (
              <button
                type="button"
                className="wl-exercise-detail__ghost-btn"
                onClick={() => requestLeaveEditing('stop-editing')}
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>
            ) : (
              <button type="button" className="wl-exercise-detail__ghost-btn" onClick={startEditing}>
                <Pencil size={14} aria-hidden />
                {isEs ? 'Personalizar' : 'Personalize'}
              </button>
            )
          ) : onEdit ? (
            <button type="button" className="wl-exercise-detail__ghost-btn" onClick={onEdit}>
              <Pencil size={14} aria-hidden />
              {isEs ? 'Editar' : 'Edit'}
            </button>
          ) : null}
          {onDuplicate ? (
            <button type="button" className="wl-exercise-detail__ghost-btn" onClick={onDuplicate}>
              <Copy size={14} aria-hidden />
              {isEs ? 'Duplicar' : 'Duplicate'}
            </button>
          ) : null}
          <div className="wl-exercise-detail__menu-wrap">
            <button
              type="button"
              className="wl-exercise-detail__icon-btn"
              aria-expanded={menuOpen}
              aria-label={isEs ? 'Más acciones' : 'More actions'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreVertical size={18} aria-hidden />
            </button>
            {menuOpen ? (
              <div className="wl-exercise-detail__menu" role="menu">
                {onArchive ? (
                  <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onArchive(); }}>
                    {isEs ? 'Archivar' : 'Archive'}
                  </button>
                ) : null}
                {onDelete ? (
                  <button type="button" role="menuitem" className="is-danger" onClick={() => { setMenuOpen(false); onDelete(); }}>
                    {isEs ? 'Eliminar' : 'Delete'}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="wl-exercise-detail__hero">
        <FamilyAvatar family={(family ?? 'accessory') as ExerciseFamilyId} size={44} />
        <div className="wl-exercise-detail__hero-text">
          <div className="wl-exercise-detail__hero-top">
            {editing && isOfficial ? (
              <label className="wl-exercise-detail__title-edit">
                <span className="sr-only">{isEs ? 'Nombre propio' : 'Custom name'}</span>
                <input
                  className="wl-exercise-detail__title-input"
                  value={form.displayName}
                  onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                  placeholder={def.displayName}
                  autoComplete="off"
                />
              </label>
            ) : (
              <h1 className="wl-exercise-detail__title">{titleDisplay}</h1>
            )}
            <span className={`wl-exercise-detail__badge${isOfficial ? '' : ' wl-exercise-detail__badge--custom'}`}>
              {isOfficial ? (isEs ? 'Oficial' : 'Official') : isEs ? 'Custom' : 'Custom'}
            </span>
          </div>
          <p className="wl-exercise-detail__meta">
            {familyLabel} · {editing && isOfficial ? editingTypeLabel : typeLabel}
            {usageCount > 0
              ? isEs
                ? ` · Usado en ${usageCount === 1 ? '1 programa' : `${usageCount} programas`}`
                : ` · Used in ${usageCount === 1 ? '1 program' : `${usageCount} programs`}`
              : ''}
          </p>
        </div>
        {!editing && isOfficial ? (
          <button
            type="button"
            className="wl-exercise-detail__section-edit"
            aria-label={isEs ? 'Personalizar nombre' : 'Personalize name'}
            onClick={startEditing}
          >
            <Pencil size={14} aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="wl-exercise-detail__snapshot">
        <div className="wl-exercise-detail__media-wrap">
          <ExerciseMedia
            name={titleDisplay}
            family={family}
            mediaUrl={form.videoUrl || def.coachOverride?.override.videoUrl}
            isEs={isEs}
            className="wl-exercise-detail__media"
          />
          {editing && isOfficial ? (
            <label className="wl-exercise-detail__inline-field wl-exercise-detail__inline-field--media">
              <span>{isEs ? 'Video propio' : 'Custom video'}</span>
              <input
                type="url"
                inputMode="url"
                value={form.videoUrl}
                onChange={(event) => setForm((current) => ({ ...current, videoUrl: event.target.value }))}
                placeholder="https://youtube.com/…"
                autoComplete="off"
              />
            </label>
          ) : null}
        </div>
        <div className="wl-exercise-detail__snapshot-main">
        <div className="wl-exercise-detail__snapshot-meta">
          <div className="wl-exercise-detail__meta-block wl-exercise-detail__meta-block--spec">
            <div className="wl-exercise-detail__block-head">
              <h3 className="wl-exercise-detail__intel-title">
                {isEs ? 'Composición y carga' : 'Composition & load'}
              </h3>
              <div className="wl-exercise-detail__block-head-actions">
                {isOfficial ? (
                  <span className="wl-exercise-detail__locked" title={isEs ? 'Definición oficial' : 'Official definition'}>
                    <Lock size={13} aria-hidden />
                  </span>
                ) : null}
                {isOfficial && !editing ? (
                  <button
                    type="button"
                    className="wl-exercise-detail__section-edit"
                    onClick={startEditing}
                    aria-label={isEs ? 'Personalizar carga' : 'Personalize load'}
                  >
                    <Pencil size={14} aria-hidden />
                  </button>
                ) : !isOfficial && onEdit ? (
                  <button type="button" className="wl-exercise-detail__section-edit" onClick={onEdit} aria-label={isEs ? 'Editar ejercicio' : 'Edit exercise'}>
                    <Pencil size={14} aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
            <dl className="wl-exercise-detail__kv wl-exercise-detail__kv--horizontal">
              <div className="wl-exercise-detail__kv-row">
                <dt>{isEs ? 'Familia' : 'Family'}</dt>
                <dd>{familyLabel}</dd>
              </div>
              {isSingleComposition(def.composition) ? (
                <>
                  <div className="wl-exercise-detail__kv-row">
                    <dt>{isEs ? 'Variación' : 'Variation'}</dt>
                    <dd>{taxonomyLabel(taxonomy.variations, def.composition.variation, isEs)}</dd>
                  </div>
                  <div className="wl-exercise-detail__kv-row">
                    <dt>{isEs ? 'Posición' : 'Position'}</dt>
                    <dd>{taxonomyLabel(taxonomy.startPositions, def.composition.startPosition, isEs)}</dd>
                  </div>
                  <div className="wl-exercise-detail__kv-row">
                    <dt>{isEs ? 'Modificadores' : 'Modifiers'}</dt>
                    <dd>
                      {modifierChips.length ? (
                        <span className="wl-exercise-detail__chips">
                          {modifierChips.map((label) => (
                            <span key={label} className="wl-exercise-detail__chip">
                              {label}
                            </span>
                          ))}
                        </span>
                      ) : (
                        '—'
                      )}
                    </dd>
                  </div>
                </>
              ) : null}
              <div className="wl-exercise-detail__kv-row">
                <dt>{intensityRefLabel}</dt>
                <dd>
                  {editing && isOfficial ? (
                    <select
                      className="wl-exercise-detail__inline-select"
                      value={form.loadAnchor}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, loadAnchor: event.target.value as ExerciseLoadAnchorCode }))
                      }
                    >
                      {OVERRIDE_ANCHORS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {isEs ? item.labelEs : item.labelEn}
                        </option>
                      ))}
                    </select>
                  ) : (
                    intensityDisplay
                  )}
                </dd>
              </div>
              <div className="wl-exercise-detail__kv-row">
                <dt>{isEs ? 'Objetivo' : 'Objective'}</dt>
                <dd>
                  {editing && isOfficial ? (
                    <select
                      className="wl-exercise-detail__inline-select"
                      value={form.objective}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, objective: event.target.value as TrainingObjectiveCode }))
                      }
                    >
                      {taxonomy.objectives.map((item) => (
                        <option key={item.code} value={item.code}>
                          {isEs ? item.labelEs : item.labelEn}
                        </option>
                      ))}
                    </select>
                  ) : (
                    typeLabel
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {!editing || !isOfficial ? (
            <div className="wl-exercise-detail__meta-block wl-exercise-detail__meta-block--cues">
              <div className="wl-exercise-detail__block-head">
                <h3>{isEs ? 'Indicaciones' : 'Cues'}</h3>
                {isOfficial ? (
                  <button
                    type="button"
                    className="wl-exercise-detail__section-edit"
                    onClick={startEditing}
                    aria-label={isEs ? 'Personalizar indicaciones' : 'Personalize cues'}
                  >
                    <Pencil size={14} aria-hidden />
                  </button>
                ) : onEdit ? (
                  <button type="button" className="wl-exercise-detail__section-edit" onClick={onEdit} aria-label={isEs ? 'Editar indicaciones' : 'Edit cues'}>
                    <Pencil size={14} aria-hidden />
                  </button>
                ) : null}
              </div>
              {displayCues.length > 0 ? (
                <ul className="wl-exercise-detail__bullets">
                  {displayCues.map((bullet, index) => (
                    <li key={`display-cue-${index}`}>{bullet}</li>
                  ))}
                </ul>
              ) : (
                <p className="wl-exercise-detail__empty">{isEs ? 'Sin indicaciones' : 'No cues'}</p>
              )}
            </div>
          ) : (
            <div className="wl-exercise-detail__cues-edit">
              {form.cues.map((cue, index) => (
                <div className="wl-exercise-cues__row" key={`cue-${index}`}>
                  <span className="wl-exercise-detail__cue-marker" aria-hidden>
                    •
                  </span>
                  <input
                    value={cue}
                    onChange={(event) => {
                      const next = [...form.cues];
                      next[index] = event.target.value;
                      setForm((current) => ({ ...current, cues: next }));
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
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        cues: current.cues.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <Trash2 size={15} strokeWidth={2.25} aria-hidden />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="wl-exercise-cues__add wl-exercise-cues__add--inline"
                onClick={() => setForm((current) => ({ ...current, cues: [...current.cues, ''] }))}
              >
                <Plus size={14} strokeWidth={2.25} aria-hidden />
                {isEs ? 'Añadir indicación' : 'Add cue'}
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {editing && isOfficial ? (
        <footer className="wl-exercise-detail__save-bar">
          <div className="wl-exercise-detail__save-bar-start">
            <p className="wl-exercise-detail__save-hint">
              {isEs
                ? 'Los cambios son privados y no modifican el ejercicio oficial.'
                : 'Changes are private and do not alter the official exercise.'}
            </p>
            <label className="wl-exercise-check wl-exercise-detail__visibility">
              <input
                type="checkbox"
                checked={form.hidden}
                onChange={(event) => setForm((current) => ({ ...current, hidden: event.target.checked }))}
              />
              {isEs ? 'Ocultar de mi vista' : 'Hide from my view'}
            </label>
          </div>
          <button
            type="button"
            className="wl-exercise-detail__cta"
            disabled={busy || !isDirty}
            onClick={() => void handleSaveOverride()}
          >
            {isEs ? 'Guardar personalización' : 'Save personalization'}
          </button>
        </footer>
      ) : null}

      <ConfirmationModal
        open={discardOpen}
        title={isEs ? 'Cambios sin guardar' : 'Unsaved changes'}
        message={
          isEs
            ? 'Tienes cambios sin guardar. ¿Descartar?'
            : 'You have unsaved changes. Discard them?'
        }
        confirmLabel={isEs ? 'Descartar' : 'Discard'}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger
        onCancel={() => {
          setDiscardOpen(false);
          setPendingAction(null);
        }}
        onConfirm={runPendingAction}
      />
    </section>
  );
}
