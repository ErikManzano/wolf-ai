import React, { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { Exercise, ExerciseCategory } from '../../models/training';
import { filterExercises } from './blockMetrics';

const CAT: Record<ExerciseCategory, string> = {
  snatch: 'SN',
  clean_jerk: 'CJ',
  squat: 'SQ',
  accessory: 'AC',
};

interface ExerciseAutocompleteProps {
  exercises: Exercise[];
  value: string;
  onChange: (exerciseId: string) => void;
  isEs: boolean;
  placeholder?: string;
  compact?: boolean;
}

export const ExerciseAutocomplete: React.FC<ExerciseAutocompleteProps> = ({
  exercises,
  value,
  onChange,
  isEs,
  placeholder,
  compact,
}) => {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = exercises.find((e) => e.id === value);
  const suggestions = filterExercises(exercises, query, 12);

  useEffect(() => {
    if (!open) setQuery(selected?.name ?? '');
  }, [value, selected?.name, open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={rootRef} className="wolf-se-autocomplete">
      <div className={`wolf-se-autocomplete-input-wrap${compact ? ' wolf-se-autocomplete-input-wrap--compact' : ''}`}>
        <Search size={16} aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          className="wolf-se-autocomplete-input"
          placeholder={placeholder ?? (isEs ? 'Buscar movimiento…' : 'Search movement…')}
          value={open ? query : (selected?.name ?? '')}
          onFocus={() => {
            setOpen(true);
            setQuery(selected?.name ?? '');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setQuery(selected?.name ?? '');
            }
            if (e.key === 'Enter' && suggestions[0]) {
              e.preventDefault();
              pick(suggestions[0].id);
            }
          }}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul id={listId} role="listbox" className="wolf-se-autocomplete-menu">
          {suggestions.map((ex) => (
            <li key={ex.id} role="option" aria-selected={ex.id === value}>
              <button
                type="button"
                className={`wolf-se-autocomplete-option${ex.id === value ? ' is-selected' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(ex.id)}
              >
                <span>{ex.name}</span>
                <span className="wolf-se-autocomplete-cat">{CAT[ex.category]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
