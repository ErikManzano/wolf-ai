import { Copy, Lock, MoreVertical, Pencil } from 'lucide-react';
import { useState } from 'react';
import type { ExerciseTaxonomyBundle, MergedDefinitionView } from '../../models/exercise';
import { isSingleComposition } from '../../models/exercise';
import { customFamilyIdFromTags } from '../../models/exercise/coachFamily';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useCoachExerciseFamilies } from '../../hooks/useCoachExerciseFamilies';
import { familyLabel } from '../../services/exercise/coachFamilyStore';
import { cuesToBullets } from '../../utils/exerciseDisplayName';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import { displayIntensityReference } from './exerciseDetailDisplay';
import { ExerciseMedia } from './ExerciseMedia.tsx';
import { FamilyAvatar } from './FamilyAvatar';
import { definitionFamily, familyDisplayLabel, taxonomyLabel } from './exerciseListUtils';
import type { ExerciseFamilyId } from './types';

export function WlExerciseDetail({
  def,
  isEs,
  taxonomy,
  usageCount,
  onBack,
  onEdit,
  onPersonalize,
  onDuplicate,
  onArchive,
  onDelete,
}: {
  def: MergedDefinitionView;
  isEs: boolean;
  taxonomy: ExerciseTaxonomyBundle;
  usageCount: number;
  onBack: () => void;
  onEdit?: () => void;
  onPersonalize?: () => void;
  onDuplicate?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { currentUserId } = useWolfAssign();
  const { families: customFamilies } = useCoachExerciseFamilies(currentUserId);

  const cueText = (isEs ? def.cuesEs : def.cuesEn) ?? def.cuesEn ?? def.cuesEs;
  const officialCueBullets = cuesToBullets(cueText);
  const family = definitionFamily(def);
  const familyLabelText = familyDisplayLabel(family);
  const typeLabel = taxonomyLabel(taxonomy.objectives, def.objective, isEs);
  const isOfficial = !def.coachId;
  const intensityRefLabel = isEs ? 'Referencia de intensidad' : 'Intensity reference';
  const intensityDisplay = displayIntensityReference(def, isEs);
  const openEditor = isOfficial ? onPersonalize : onEdit;

  const customFolderId = customFamilyIdFromTags(def.tags);
  const customFolder = customFolderId
    ? customFamilies.find((entry) => entry.id === customFolderId) ?? null
    : null;

  const displayCues =
    def.coachOverride?.override.cues?.map((cue) => cue.trim()).filter(Boolean) ?? officialCueBullets;

  const modifierChips =
    isSingleComposition(def.composition) && def.composition.modifiers.length
      ? def.composition.modifiers.map((code) => taxonomyLabel(taxonomy.modifiers, code, isEs))
      : [];

  return (
    <section className="wl-exercises-detail">
      <header className="wl-exercise-detail__toolbar">
        <AppBreadcrumb
          isEs={isEs}
          className="app-breadcrumb--icon-back"
          onBack={onBack}
          backLabel={isEs ? 'Volver' : 'Back'}
          items={[]}
        />
        <div className="wl-exercise-detail__toolbar-actions">
          {isOfficial && onPersonalize ? (
            <button type="button" className="wl-exercise-detail__ghost-btn" onClick={onPersonalize}>
              <Pencil size={14} aria-hidden />
              {isEs ? 'Personalizar' : 'Personalize'}
            </button>
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
            <h1 className="wl-exercise-detail__title">{def.effectiveDisplayName}</h1>
            <span className={`wl-exercise-detail__badge${isOfficial ? '' : ' wl-exercise-detail__badge--custom'}`}>
              {isOfficial ? (isEs ? 'Oficial' : 'Official') : isEs ? 'Custom' : 'Custom'}
            </span>
          </div>
          <p className="wl-exercise-detail__meta">
            {familyLabelText} · {typeLabel}
            {usageCount > 0
              ? isEs
                ? ` · Usado en ${usageCount === 1 ? '1 programa' : `${usageCount} programas`}`
                : ` · Used in ${usageCount === 1 ? '1 program' : `${usageCount} programs`}`
              : ''}
          </p>
        </div>
      </div>

      <div className="wl-exercise-detail__snapshot wl-exercise-compose">
        <div className="wl-exercise-compose__media wl-exercise-detail__media-wrap">
          <ExerciseMedia
            name={def.effectiveDisplayName}
            family={family}
            mediaUrl={def.coachOverride?.override.videoUrl ?? ''}
            isEs={isEs}
            className="wl-exercise-detail__media"
            showTabs
          />
        </div>
        <div className="wl-exercise-compose__main wl-exercise-detail__snapshot-main">
          <div className="wl-exercise-compose__panel wl-exercise-detail__snapshot-meta">
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
                  {openEditor ? (
                    <button
                      type="button"
                      className="wl-exercise-detail__section-edit"
                      onClick={openEditor}
                      aria-label={isEs ? (isOfficial ? 'Personalizar ejercicio' : 'Editar ejercicio') : isOfficial ? 'Personalize exercise' : 'Edit exercise'}
                    >
                      <Pencil size={14} aria-hidden />
                    </button>
                  ) : null}
                </div>
              </div>
              <dl className="wl-exercise-detail__kv wl-exercise-detail__kv--horizontal">
                <div className="wl-exercise-detail__kv-row">
                  <dt>{isEs ? 'Familia' : 'Family'}</dt>
                  <dd>{familyLabelText}</dd>
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
                  <dd>{intensityDisplay}</dd>
                </div>
                <div className="wl-exercise-detail__kv-row">
                  <dt>{isEs ? 'Objetivo' : 'Objective'}</dt>
                  <dd>{typeLabel}</dd>
                </div>
                <div className="wl-exercise-detail__kv-row">
                  <dt>{isEs ? 'Carpeta' : 'Folder'}</dt>
                  <dd>{customFolder ? familyLabel(customFolder, isEs) : '—'}</dd>
                </div>
              </dl>
            </div>

            <div className="wl-exercise-detail__meta-block wl-exercise-detail__meta-block--cues">
              <div className="wl-exercise-detail__block-head">
                <h3>{isEs ? 'Indicaciones' : 'Cues'}</h3>
                {openEditor ? (
                  <button
                    type="button"
                    className="wl-exercise-detail__section-edit"
                    onClick={openEditor}
                    aria-label={isEs ? (isOfficial ? 'Personalizar indicaciones' : 'Editar indicaciones') : isOfficial ? 'Personalize cues' : 'Edit cues'}
                  >
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
          </div>
        </div>
      </div>
    </section>
  );
}
