import { ChevronDown, UserRound } from 'lucide-react';
import './program-context.css';

export interface ProgramAthleteOption {
  athleteProfileId: string;
  name: string;
}

export function ProgramAthleteSelector({
  isEs,
  value,
  options,
  onChange,
  disabled,
}: {
  isEs: boolean;
  /** '' = sin atleta (solo %1RM) */
  value: string;
  options: ProgramAthleteOption[];
  onChange: (athleteProfileId: string) => void;
  disabled?: boolean;
}) {
  const label = isEs ? 'Atleta' : 'Athlete';
  const selectedName =
    value === ''
      ? isEs
        ? 'Sin atleta'
        : 'No athlete'
      : (options.find((o) => o.athleteProfileId === value)?.name ?? value);

  return (
    <label className="wl-program-athlete-select">
      <span className="wl-program-athlete-select__label">
        <UserRound size={14} aria-hidden />
        {label}
      </span>
      <span className="wl-program-athlete-select__wrap">
        <select
          className="wl-program-athlete-select__control"
          value={value}
          disabled={disabled || options.length === 0}
          aria-label={isEs ? 'Atleta para preview de carga' : 'Athlete for load preview'}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{isEs ? 'Sin atleta' : 'No athlete'}</option>
          {options.map((opt) => (
            <option key={opt.athleteProfileId} value={opt.athleteProfileId}>
              {opt.name}
            </option>
          ))}
        </select>
        <ChevronDown size={14} aria-hidden className="wl-program-athlete-select__chev" />
      </span>
      <span className="wl-program-athlete-select__value" aria-hidden>
        {selectedName}
      </span>
    </label>
  );
}
