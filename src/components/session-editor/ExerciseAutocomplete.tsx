import React, { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { ExerciseCategory } from '../../models/training';
import type { ExerciseLifecycleStatus } from '../../models/exercise';
import { filterPickerOptions, type SessionPickerOption } from '../../services/exercise';

const CAT: Record<ExerciseCategory, string> = {
  snatch: 'SN',
  clean_jerk: 'CJ',
  squat: 'SQ',
  accessory: 'AC',
};

function lifecycleBadgeClass(status: ExerciseLifecycleStatus): string {
  return `wolf-ei-badge wolf-ei-badge--${status}`;
}

const SHORT_LIFECYCLE: Record<ExerciseLifecycleStatus, [string, string]> = {
  official: ['Of.', 'Off.'],
  coach_modified: ['Coach', 'Coach'],
  experimental: ['Propio', 'Cust.'],
  deprecated: ['Dep.', 'Dep.'],
  ai_suggested: ['IA', 'AI'],
};

interface ExerciseAutocompleteProps {
  options: SessionPickerOption[];
  value: string;
  onChange: (exerciseId: string) => void;
  isEs: boolean;
  placeholder?: string;
  compact?: boolean;
}

export const ExerciseAutocomplete: React.FC<ExerciseAutocompleteProps> = ({
  options,
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

  const selected = options.find((o) => o.id === value);
  const suggestions = filterPickerOptions(options, query, 12);

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
          {suggestions.map((opt) => (
            <li key={opt.id} role="option" aria-selected={opt.id === value}>
              <button
                type="button"
                className={`wolf-se-autocomplete-option${opt.id === value ? ' is-selected' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(opt.id)}
              >
                <span>{opt.name}</span>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {opt.kind === 'complex' ? (
                    <span className="wolf-ei-badge wolf-ei-badge--coach_modified" style={{ fontSize: '0.6rem' }}>
                      C+
                    </span>
                  ) : null}
                  <span className={lifecycleBadgeClass(opt.lifecycleStatus)} style={{ fontSize: '0.6rem' }}>
                    {SHORT_LIFECYCLE[opt.lifecycleStatus][isEs ? 0 : 1]}
                  </span>
                  <span className="wolf-se-autocomplete-cat">{CAT[opt.category]}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
