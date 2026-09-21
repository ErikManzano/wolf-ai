import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react';
import type { CoachExerciseFamily } from '../../models/exercise/coachFamily';
import { familyLabel } from '../../services/exercise/coachFamilyStore';

export function ExerciseFamiliesPanel({
  isEs,
  families,
  busy,
  variant = 'full',
  onOpenFamilyForm,
  onDeleteFamily,
}: {
  isEs: boolean;
  families: CoachExerciseFamily[];
  busy?: boolean;
  variant?: 'full' | 'modal';
  onOpenFamilyForm: (family: CoachExerciseFamily | null) => void;
  onDeleteFamily: (id: string) => Promise<void>;
}) {
  const steps = isEs
    ? [
        'Crea familias propias (Prehab, Hombros, Core…).',
        'Abre cualquier ejercicio — oficial o tuyo — y pulsa Editar o Personalizar.',
        'En el campo Familia, elige una de tus familias personalizadas.',
      ]
    : [
        'Create your own families (Prehab, Shoulders, Core…).',
        'Open any exercise — official or yours — and tap Edit or Personalize.',
        'In the Family field, pick one of your custom families.',
      ];

  const isModal = variant === 'modal';

  return (
    <section className={`wl-exercise-families-panel${isModal ? ' wl-exercise-families-panel--modal' : ''}`}>
      {isModal ? (
        <details className="wl-exercise-families-panel__howto">
          <summary>{isEs ? '¿Cómo asignar una familia a un ejercicio?' : 'How to assign a family to an exercise?'}</summary>
          <ol className="wl-exercise-families-panel__steps">
            {steps.map((step, index) => (
              <li key={step}>
                <span className="wl-exercise-families-panel__step-num">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </details>
      ) : (
        <>
          <div className="wl-exercise-families-panel__intro">
            <div className="wl-exercise-families-panel__icon" aria-hidden>
              <FolderTree size={22} />
            </div>
            <div>
              <h3 className="wl-exercise-families-panel__title">
                {isEs ? 'Organiza con familias propias' : 'Organize with custom families'}
              </h3>
              <p className="wl-exercise-families-panel__lead">
                {isEs
                  ? 'Crea grupos propios y asígnalos al editar cualquier ejercicio — oficial o personalizado.'
                  : 'Create your own groups and assign them when editing any exercise — official or custom.'}
              </p>
            </div>
          </div>
          <ol className="wl-exercise-families-panel__steps">
            {steps.map((step, index) => (
              <li key={step}>
                <span className="wl-exercise-families-panel__step-num">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="wl-exercise-families-panel__toolbar">
        <button
          type="button"
          className="wl-exercise-library-action-card wl-exercise-library-action-card--family wl-exercise-families-panel__add"
          onClick={() => onOpenFamilyForm(null)}
        >
          <span className="wl-exercise-library-action-card__icon" aria-hidden>
            <Plus size={18} strokeWidth={2.25} />
          </span>
          <span className="wl-exercise-library-action-card__copy">
            <strong>{isEs ? 'Nueva familia' : 'New family'}</strong>
            <span>
              {isEs
                ? 'Crea un grupo propio y asígnalo al editar cualquier ejercicio.'
                : 'Create your own group and assign it when editing any exercise.'}
            </span>
          </span>
        </button>
        <span className="wl-exercise-families-panel__count">
          {isEs
            ? `${families.length} familia${families.length === 1 ? '' : 's'} personalizada${families.length === 1 ? '' : 's'}`
            : `${families.length} custom famil${families.length === 1 ? 'y' : 'ies'}`}
        </span>
      </div>

      {families.length === 0 ? (
        <div className="wl-exercise-families-panel__empty">
          <p>
            {isEs
              ? 'Empieza creando una familia. Luego podrás elegirla al editar cualquier ejercicio de la biblioteca.'
              : 'Start by creating a family. Then you can pick it when editing any exercise in the library.'}
          </p>
        </div>
      ) : (
        <ul className="wl-exercise-family-list">
          {families.map((family) => (
            <li key={family.id} className="wl-exercise-family-list__item">
              <span
                className="wl-exercise-family-list__swatch"
                style={{ background: family.color ?? '#6366f1' }}
                aria-hidden
              />
              <span className="wl-exercise-family-list__label">
                <FolderTree size={14} aria-hidden />
                {familyLabel(family, isEs)}
              </span>
              <span className="wl-exercise-family-list__slug">{family.slug}</span>
              <div className="wl-exercise-family-list__actions">
                <button
                  type="button"
                  className="wl-exercise-family-list__btn"
                  aria-label={isEs ? 'Editar' : 'Edit'}
                  onClick={() => onOpenFamilyForm(family)}
                >
                  <Pencil size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  className="wl-exercise-family-list__btn wl-exercise-family-list__btn--danger"
                  aria-label={isEs ? 'Eliminar' : 'Delete'}
                  disabled={busy}
                  onClick={() => void onDeleteFamily(family.id)}
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
