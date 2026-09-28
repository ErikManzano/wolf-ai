import { FolderTree, Plus } from 'lucide-react';
import type { CoachExerciseFamily } from '../../models/exercise/coachFamily';
import { familyLabel } from '../../services/exercise/coachFamilyStore';

export function ExerciseFormFolderChips({
  isEs,
  customFamilyId,
  customFamilies,
  onCustomChange,
  onManageFamilies,
}: {
  isEs: boolean;
  customFamilyId: string | null;
  customFamilies: CoachExerciseFamily[];
  onCustomChange: (id: string | null) => void;
  onManageFamilies?: () => void;
}) {
  return (
    <div className="wl-exercise-form-folders">
      <div className="wl-exercise-form-folders__head">
        <span className="wl-exercise-form-folders__title">
          <FolderTree size={14} aria-hidden />
          {isEs ? 'Carpeta' : 'Folder'}
        </span>
        {onManageFamilies && customFamilies.length > 0 ? (
          <button type="button" className="wl-exercise-form-folders__manage" onClick={onManageFamilies}>
            {isEs ? 'Gestionar carpetas' : 'Manage folders'}
          </button>
        ) : null}
      </div>

      {customFamilies.length === 0 ? (
        <p className="wl-exercise-form-folders__hint">
          {isEs
            ? 'Opcional. Crea carpetas para organizar tu biblioteca.'
            : 'Optional. Create folders to organize your library.'}
        </p>
      ) : null}

      <div
        className="wl-exercise-form-folders__chips"
        role="radiogroup"
        aria-label={isEs ? 'Carpeta del ejercicio' : 'Exercise folder'}
      >
        <button
          type="button"
          role="radio"
          aria-checked={customFamilyId == null}
          className={`wl-exercise-form-folder-chip${customFamilyId == null ? ' is-on' : ''}`}
          onClick={() => onCustomChange(null)}
        >
          {isEs ? 'Sin carpeta' : 'No folder'}
        </button>
        {customFamilies.map((family) => {
          const selected = customFamilyId === family.id;
          const label = familyLabel(family, isEs);
          const swatch = family.color?.trim() || '#d6d3d1';
          return (
            <button
              key={family.id}
              type="button"
              role="radio"
              aria-checked={selected}
              className={`wl-exercise-form-folder-chip wl-exercise-form-folder-chip--named${selected ? ' is-on' : ''}`}
              onClick={() => onCustomChange(family.id)}
            >
              <span className="wl-exercise-form-folder-chip__swatch" style={{ background: swatch }} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {customFamilies.length === 0 && onManageFamilies ? (
        <button type="button" className="wl-exercise-form-folders__create" onClick={onManageFamilies}>
          <Plus size={15} strokeWidth={2.25} aria-hidden />
          {isEs ? 'Crear carpeta' : 'Create folder'}
        </button>
      ) : null}
    </div>
  );
}
