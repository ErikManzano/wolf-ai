import React, { useEffect, useState } from 'react';

export interface DayCoachNoteCardProps {
  note: string;
  isEs: boolean;
  onChange: (note: string) => void;
  readOnly?: boolean;
}

/** Day-level coach note / objective (Phase C — ProgramDay.coachNote). */
export const DayCoachNoteCard: React.FC<DayCoachNoteCardProps> = ({
  note,
  isEs,
  onChange,
  readOnly = false,
}) => {
  const [draft, setDraft] = useState(note);

  useEffect(() => {
    setDraft(note);
  }, [note]);

  return (
    <div className="wl-day-coach-note">
      <label className="wl-day-coach-note__label" htmlFor="wl-day-coach-note-input">
        {isEs ? 'Notas y objetivo del día' : 'Day notes & objective'}
      </label>
      {readOnly ? (
        <p className="wl-day-coach-note__body">
          {note.trim() || (isEs ? 'Sin notas' : 'No notes')}
        </p>
      ) : (
        <textarea
          id="wl-day-coach-note-input"
          className="wl-day-coach-note__input"
          rows={2}
          value={draft}
          placeholder={
            isEs
              ? 'Ej. Técnica de snatch + squat volumen moderado'
              : 'e.g. Snatch technique + moderate squat volume'
          }
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft !== note) onChange(draft);
          }}
        />
      )}
    </div>
  );
};
