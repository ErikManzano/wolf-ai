import { useEffect, useState } from 'react';
import type { CoachExerciseFamily } from '../../models/exercise/coachFamily';
import { slugifyFamilyLabel } from '../../services/exercise/coachFamilyStore';

export const FAMILY_FORM_ID = 'wl-family-form';

export function FamilyFormFields({
  isEs,
  initial,
  busy,
  onSubmit,
}: {
  isEs: boolean;
  initial?: CoachExerciseFamily | null;
  busy?: boolean;
  onSubmit: (input: {
    id?: string;
    slug: string;
    labelEs: string;
    labelEn: string;
    color?: string | null;
  }) => void | Promise<void>;
}) {
  const [labelEs, setLabelEs] = useState(initial?.labelEs ?? '');
  const [labelEn, setLabelEn] = useState(initial?.labelEn ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [color, setColor] = useState(initial?.color ?? '#6366f1');

  useEffect(() => {
    setLabelEs(initial?.labelEs ?? '');
    setLabelEn(initial?.labelEn ?? '');
    setSlug(initial?.slug ?? '');
    setColor(initial?.color ?? '#6366f1');
  }, [initial]);

  const handleLabelEnChange = (value: string) => {
    setLabelEn(value);
    if (!initial?.id && !slug.trim()) {
      setSlug(slugifyFamilyLabel(value));
    }
  };

  const canSave = labelEs.trim().length > 0 && labelEn.trim().length > 0;

  return (
    <form
      id={FAMILY_FORM_ID}
      className="wl-exercise-form-stack wl-exercise-family-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!canSave || busy) return;
        void onSubmit({
          id: initial?.id,
          slug: slug.trim() || slugifyFamilyLabel(labelEn || labelEs),
          labelEs: labelEs.trim(),
          labelEn: labelEn.trim(),
          color: color || null,
        });
      }}
    >
      <label className="wl-form-sheet-field">
        <span className="wl-form-sheet-label">{isEs ? 'Nombre (ES)' : 'Name (ES)'}</span>
        <input
          className="wl-form-sheet-input"
          value={labelEs}
          disabled={busy}
          onChange={(event) => setLabelEs(event.target.value)}
        />
      </label>
      <label className="wl-form-sheet-field">
        <span className="wl-form-sheet-label">{isEs ? 'Nombre (EN)' : 'Name (EN)'}</span>
        <input
          className="wl-form-sheet-input"
          value={labelEn}
          disabled={busy}
          onChange={(event) => handleLabelEnChange(event.target.value)}
        />
      </label>
      <label className="wl-form-sheet-field">
        <span className="wl-form-sheet-label">{isEs ? 'Slug' : 'Slug'}</span>
        <input
          className="wl-form-sheet-input"
          value={slug}
          disabled={busy}
          onChange={(event) => setSlug(event.target.value)}
          placeholder={slugifyFamilyLabel(labelEn || labelEs || 'family')}
        />
      </label>
      <label className="wl-form-sheet-field">
        <span className="wl-form-sheet-label">{isEs ? 'Color' : 'Color'}</span>
        <input
          className="wl-form-sheet-input wl-exercise-family-color-input"
          type="color"
          value={color ?? '#6366f1'}
          disabled={busy}
          onChange={(event) => setColor(event.target.value)}
        />
      </label>
    </form>
  );
}
