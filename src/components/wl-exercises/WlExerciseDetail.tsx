import { useEffect, useMemo, useState } from 'react';
import type {
  ExerciseDefinitionVersion,
  ExerciseLoadAnchorCode,
  ExerciseRelationshipRule,
  ExerciseTaxonomyBundle,
  MergedDefinitionView,
  OverridePatch,
} from '../../models/exercise';
import { isSingleComposition } from '../../models/exercise';
import { intensityRangeForDefinition } from '../../services/exercise';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import '../wl-shared/wl-form-sheet.css';
import { definitionFamily, taxonomyLabel } from './exerciseListUtils';

type DetailTab = 'intel' | 'override';

const ANCHORS: { value: ExerciseLoadAnchorCode; labelEs: string; labelEn: string }[] = [
  { value: 'auto', labelEs: 'Auto', labelEn: 'Auto' },
  { value: 'snatch', labelEs: 'Snatch', labelEn: 'Snatch' },
  { value: 'clean_jerk', labelEs: 'C&J', labelEn: 'C&J' },
  { value: 'back_squat', labelEs: 'Sentadilla atrás', labelEn: 'Back squat' },
  { value: 'front_squat', labelEs: 'Sentadilla frontal', labelEn: 'Front squat' },
];

export function WlExerciseDetail({
  def,
  isEs,
  taxonomy,
  relationships,
  versions,
  usageCount,
  onBack,
  onPrimary,
  onSaveOverride,
}: {
  def: MergedDefinitionView;
  isEs: boolean;
  taxonomy: ExerciseTaxonomyBundle;
  relationships: ExerciseRelationshipRule[];
  versions: ExerciseDefinitionVersion[];
  usageCount: number;
  onBack: () => void;
  onPrimary: () => void;
  onSaveOverride: (baseId: string, patch: OverridePatch) => Promise<string | null>;
}) {
  const [tab, setTab] = useState<DetailTab>('intel');
  const [notes, setNotes] = useState(def.coachOverride?.override.notes ?? '');
  const [displayName, setDisplayName] = useState(def.coachOverride?.override.displayName ?? '');
  const [videoUrl, setVideoUrl] = useState(def.coachOverride?.override.videoUrl ?? '');
  const [loadAnchor, setLoadAnchor] = useState<ExerciseLoadAnchorCode>(
    def.coachOverride?.override.loadAnchor ?? def.loadAnchor,
  );
  const [hidden, setHidden] = useState(Boolean(def.coachOverride?.override.hidden));
  const [cues, setCues] = useState<string[]>(def.coachOverride?.override.cues?.length ? def.coachOverride.override.cues : ['']);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNotes(def.coachOverride?.override.notes ?? '');
    setDisplayName(def.coachOverride?.override.displayName ?? '');
    setVideoUrl(def.coachOverride?.override.videoUrl ?? '');
    setLoadAnchor(def.coachOverride?.override.loadAnchor ?? def.loadAnchor);
    setHidden(Boolean(def.coachOverride?.override.hidden));
    setCues(def.coachOverride?.override.cues?.length ? def.coachOverride.override.cues : ['']);
    setTab('intel');
  }, [def]);

  const family = definitionFamily(def);
  const familyLabel = taxonomyLabel(taxonomy.families, family, isEs);
  const typeLabel = taxonomyLabel(taxonomy.objectives, def.objective, isEs);
  const band = intensityRangeForDefinition(def, taxonomy);
  const isOfficial = !def.coachId;
  const primaryLabel = isOfficial ? (isEs ? 'Personalizar' : 'Personalize') : isEs ? 'Editar' : 'Edit';

  const relationEdges = useMemo(() => {
    if (!family) return [];
    return relationships.filter(
      (rule) =>
        rule.isActive &&
        ((rule.fromRef.type === 'family' && rule.fromRef.code === family) ||
          (rule.toRef.type === 'family' && rule.toRef.code === family)),
    );
  }, [family, relationships]);

  const handleSaveOverride = async () => {
    setBusy(true);
    const err = await onSaveOverride(def.id, {
      notes: notes.trim() || undefined,
      displayName: displayName.trim() || undefined,
      videoUrl: videoUrl.trim() || null,
      loadAnchor,
      hidden,
      cues: cues.map((cue) => cue.trim()).filter(Boolean),
    });
    setBusy(false);
    return err;
  };

  return (
    <section className="wl-exercises-detail">
      <AppBreadcrumb
        isEs={isEs}
        className="app-breadcrumb--icon-back"
        onBack={onBack}
        backLabel={isEs ? 'Ejercicios' : 'Exercises'}
        items={[{ label: isEs ? 'Ejercicios' : 'Exercises' }, { label: def.effectiveDisplayName }]}
      />

      <header className="wl-exercise-detail__head">
        <div>
          <p className="wl-exercises-head__desc">{isOfficial ? (isEs ? 'Oficial' : 'Official') : isEs ? 'Custom' : 'Custom'}</p>
          <h1 className="wl-exercise-detail__title">{def.effectiveDisplayName}</h1>
          <p className="wl-exercise-detail__meta">
            {familyLabel} · {typeLabel}
          </p>
        </div>
        <button type="button" className="btn-primary wl-list-toolbar__cta" onClick={onPrimary}>
          {primaryLabel}
        </button>
      </header>

      <div className="wl-exercise-detail__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'intel'}
          className={`wl-exercise-detail__tab${tab === 'intel' ? ' is-active' : ''}`}
          onClick={() => setTab('intel')}
        >
          Intel
        </button>
        {isOfficial ? (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'override'}
            className={`wl-exercise-detail__tab${tab === 'override' ? ' is-active' : ''}`}
            onClick={() => setTab('override')}
          >
            Override
          </button>
        ) : null}
      </div>

      {tab === 'intel' ? (
        <>
          <section className="wl-exercise-detail__section">
            <h3>{isEs ? 'Composición' : 'Composition'}</h3>
            <dl className="wl-exercise-detail__dl">
              <dt>{isEs ? 'Familia' : 'Family'}</dt>
              <dd>{familyLabel}</dd>
              {isSingleComposition(def.composition) ? (
                <>
                  <dt>{isEs ? 'Variación' : 'Variation'}</dt>
                  <dd>{taxonomyLabel(taxonomy.variations, def.composition.variation, isEs)}</dd>
                  <dt>{isEs ? 'Posición' : 'Position'}</dt>
                  <dd>{taxonomyLabel(taxonomy.startPositions, def.composition.startPosition, isEs)}</dd>
                  <dt>{isEs ? 'Modificadores' : 'Modifiers'}</dt>
                  <dd>
                    {def.composition.modifiers.length
                      ? def.composition.modifiers
                          .map((code) => taxonomyLabel(taxonomy.modifiers, code, isEs))
                          .join(', ')
                      : '—'}
                  </dd>
                </>
              ) : (
                <>
                  <dt>{isEs ? 'Tipo' : 'Kind'}</dt>
                  <dd>{isEs ? 'Complejo' : 'Complex'}</dd>
                  <dt>{isEs ? 'Segmentos' : 'Segments'}</dt>
                  <dd>{def.composition.segments.length}</dd>
                </>
              )}
            </dl>
          </section>

          {def.cuesEs || def.cuesEn ? (
            <section className="wl-exercise-detail__section">
              <h3>{isEs ? 'Indicaciones' : 'Cues'}</h3>
              <p className="wl-exercise-detail__cues">
                {(isEs ? def.cuesEs : def.cuesEn) ?? def.cuesEn ?? def.cuesEs}
              </p>
            </section>
          ) : null}

          <section className="wl-exercise-detail__section">
            <h3>{isEs ? 'Carga' : 'Load'}</h3>
            <dl className="wl-exercise-detail__dl">
              <dt>{isEs ? 'Ancla' : 'Anchor'}</dt>
              <dd>{ANCHORS.find((item) => item.value === def.loadAnchor)?.[isEs ? 'labelEs' : 'labelEn'] ?? def.loadAnchor}</dd>
              <dt>{isEs ? 'Objetivo' : 'Objective'}</dt>
              <dd>{typeLabel}</dd>
              <dt>{isEs ? 'Banda' : 'Band'}</dt>
              <dd>
                {band[0]}–{band[1]}%
              </dd>
              {usageCount > 0 ? (
                <>
                  <dt>{isEs ? 'Uso' : 'Usage'}</dt>
                  <dd>
                    {usageCount} {isEs ? 'programas' : 'programs'}
                  </dd>
                </>
              ) : null}
            </dl>
          </section>

          {relationEdges.length > 0 ? (
            <section className="wl-exercise-detail__section">
              <h3>{isEs ? 'Relaciones de carga' : 'Load relationships'}</h3>
              <ul className="wl-exercise-detail__relations">
                {relationEdges.map((edge) => {
                  const other = edge.fromRef.code === family ? edge.toRef.code : edge.fromRef.code;
                  return (
                    <li key={edge.id}>
                      {other} · {Math.round(edge.ratioMean * 100)}%
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {versions.length > 0 ? (
            <section className="wl-exercise-detail__section">
              <h3>{isEs ? 'Versiones' : 'Versions'}</h3>
              <ul className="wl-exercise-detail__relations">
                {versions.map((version) => (
                  <li key={version.id}>
                    v{version.version} · {version.displayName}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <section className="wl-exercise-detail__section">
          <h3>{isEs ? 'Override del coach' : 'Coach override'}</h3>
          <label className="wl-exercise-override-field">
            <span>{isEs ? 'Nombre custom' : 'Custom name'}</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={def.displayName} />
          </label>
          <label className="wl-exercise-override-field">
            <span>{isEs ? 'Notas' : 'Notes'}</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
          </label>
          <label className="wl-exercise-override-field">
            <span>Video URL</span>
            <input value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://" />
          </label>
          <label className="wl-exercise-override-field">
            <span>{isEs ? 'Ancla de intensidad' : 'Intensity anchor'}</span>
            <select value={loadAnchor} onChange={(event) => setLoadAnchor(event.target.value as ExerciseLoadAnchorCode)}>
              {ANCHORS.map((item) => (
                <option key={item.value} value={item.value}>
                  {isEs ? item.labelEs : item.labelEn}
                </option>
              ))}
            </select>
          </label>
          <div className="wl-exercise-override-field">
            <span>Cues</span>
            <div className="wl-exercise-cues">
              {cues.map((cue, index) => (
                <div className="wl-exercise-cues__row" key={`cue-${index}`}>
                  <input
                    value={cue}
                    onChange={(event) => {
                      const next = [...cues];
                      next[index] = event.target.value;
                      setCues(next);
                    }}
                  />
                  <button
                    type="button"
                    className="wl-form-sheet-btn wl-form-sheet-btn--ghost"
                    onClick={() => setCues(cues.filter((_, i) => i !== index))}
                    aria-label={isEs ? 'Quitar cue' : 'Remove cue'}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="wl-form-sheet-btn wl-form-sheet-btn--ghost"
                onClick={() => setCues([...cues, ''])}
              >
                {isEs ? '+ Añadir cue' : '+ Add cue'}
              </button>
            </div>
          </div>
          <label className="wl-exercise-check">
            <input type="checkbox" checked={hidden} onChange={(event) => setHidden(event.target.checked)} />
            {isEs ? 'Ocultar de mi biblioteca' : 'Hide from my library'}
          </label>
          <button
            type="button"
            className="btn-primary wl-list-toolbar__cta"
            disabled={busy}
            onClick={() => void handleSaveOverride()}
          >
            {isEs ? 'Guardar override' : 'Save override'}
          </button>
        </section>
      )}

      {!isOfficial ? (
        <p className="wl-exercises-head__desc">{isEs ? 'Este ejercicio es tuyo. Úsalo Editar para cambiar la composición.' : 'This is your exercise. Use Edit to change composition.'}</p>
      ) : null}
    </section>
  );
}
