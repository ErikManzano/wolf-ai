import { FolderTree, Plus } from 'lucide-react';
import type { ExerciseFamilyCode } from '../../models/exercise';
import type { CoachExerciseFamily } from '../../models/exercise/coachFamily';
import { familyLabel } from '../../services/exercise/coachFamilyStore';
import { FamilyAvatar } from './FamilyAvatar';
import { FAMILY_CHIP_ORDER, FAMILY_DISPLAY_LABEL } from './exerciseListUtils';
import type { ExerciseFamilyId } from './types';

export function ExerciseFamilyPicker({
  isEs,
  officialFamily,
  customFamilyId,
  customFamilies,
  onOfficialChange,
  onCustomChange,
  onManageFamilies,
}: {
  isEs: boolean;
  officialFamily: ExerciseFamilyCode;
  customFamilyId: string | null;
  customFamilies: CoachExerciseFamily[];
  onOfficialChange: (family: ExerciseFamilyCode) => void;
  onCustomChange: (id: string | null) => void;
  onManageFamilies?: () => void;
}) {
  const selectedCustom = customFamilyId
    ? customFamilies.find((family) => family.id === customFamilyId) ?? null
    : null;

  return (
    <div className="wl-exercise-family-pick">
      <div className="wl-exercise-family-pick__section">
        <div className="wl-exercise-family-pick__head">
          <span className="wl-form-sheet-label">{isEs ? 'Familia técnica' : 'Technical family'}</span>
          <span className="wl-exercise-family-pick__head-note">
            {isEs ? 'Define el movimiento en el catálogo' : 'Defines the movement in the catalog'}
          </span>
        </div>
        <div
          className="wl-exercise-family-pick__grid"
          role="radiogroup"
          aria-label={isEs ? 'Familia técnica' : 'Technical family'}
        >
          {FAMILY_CHIP_ORDER.map((code) => {
            const active = officialFamily === code;
            const label = FAMILY_DISPLAY_LABEL[code as ExerciseFamilyId] ?? code;
            return (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={active}
                className={`wl-exercise-family-pick__chip${active ? ' is-active' : ''}`}
                onClick={() => onOfficialChange(code)}
              >
                <FamilyAvatar family={code as ExerciseFamilyId} size={30} />
                <span className="wl-exercise-family-pick__chip-label">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="wl-exercise-family-pick__divider" aria-hidden />

      <div className="wl-exercise-family-pick__section">
        <div className="wl-exercise-family-pick__head">
          <span className="wl-form-sheet-label">
            <FolderTree size={14} aria-hidden />
            {isEs ? 'Carpeta (opcional)' : 'Folder (optional)'}
          </span>
          <span className="wl-exercise-family-pick__head-note">
            {isEs
              ? 'Organiza tu biblioteca sin cambiar la familia técnica'
              : 'Organize your library without changing the technical family'}
          </span>
        </div>

        {customFamilies.length === 0 ? (
          <div className="wl-exercise-family-pick__empty">
            <p>{isEs ? 'Aún no tienes carpetas propias.' : 'You have no custom folders yet.'}</p>
            {onManageFamilies ? (
              <button type="button" className="wl-exercise-family-pick__create" onClick={onManageFamilies}>
                <Plus size={16} aria-hidden />
                {isEs ? 'Crear carpeta' : 'Create folder'}
              </button>
            ) : null}
          </div>
        ) : (
          <div
            className="wl-exercise-family-pick__custom"
            role="radiogroup"
            aria-label={isEs ? 'Carpeta de ejercicios' : 'Exercise folder'}
          >
            <button
              type="button"
              role="radio"
              aria-checked={customFamilyId == null}
              className={`wl-exercise-family-pick__folder${customFamilyId == null ? ' is-active' : ''}`}
              onClick={() => onCustomChange(null)}
            >
              <span className="wl-exercise-family-pick__folder-icon wl-exercise-family-pick__folder-icon--none">
                —
              </span>
              <span className="wl-exercise-family-pick__folder-label">
                {isEs ? 'Sin carpeta' : 'No folder'}
              </span>
            </button>
            {customFamilies.map((family) => {
              const active = customFamilyId === family.id;
              const label = familyLabel(family, isEs);
              const swatch = family.color?.trim() || '#d6d3d1';
              return (
                <button
                  key={family.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`wl-exercise-family-pick__folder${active ? ' is-active' : ''}`}
                  onClick={() => onCustomChange(family.id)}
                >
                  <span
                    className="wl-exercise-family-pick__folder-icon"
                    style={{ background: swatch }}
                    aria-hidden
                  />
                  <span className="wl-exercise-family-pick__folder-label">{label}</span>
                </button>
              );
            })}
          </div>
        )}

        {customFamilies.length > 0 && onManageFamilies ? (
          <button type="button" className="wl-exercise-family-pick__manage" onClick={onManageFamilies}>
            {isEs ? 'Gestionar carpetas' : 'Manage folders'}
          </button>
        ) : null}
      </div>

      {selectedCustom ? (
        <p className="wl-form-sheet-hint wl-exercise-family-pick__hint">
          {isEs
            ? `Se listará en la carpeta «${familyLabel(selectedCustom, isEs)}». La familia técnica (${FAMILY_DISPLAY_LABEL[officialFamily as ExerciseFamilyId] ?? officialFamily}) no cambia.`
            : `Will appear in folder “${familyLabel(selectedCustom, isEs)}”. Technical family (${FAMILY_DISPLAY_LABEL[officialFamily as ExerciseFamilyId] ?? officialFamily}) stays the same.`}
        </p>
      ) : (
        <p className="wl-form-sheet-hint wl-exercise-family-pick__hint">
          {isEs
            ? 'Puedes crear carpetas como Prehab, Hombros o Core para organizar tu biblioteca.'
            : 'Create folders like Prehab, Shoulders, or Core to organize your library.'}
        </p>
      )}
    </div>
  );
}
