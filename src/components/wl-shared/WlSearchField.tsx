import { Search } from 'lucide-react';

export function WlSearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  return (
    <div className="wl-list-search">
      <Search size={16} className="wl-list-search__icon" aria-hidden />
      <input
        type="search"
        className="wl-list-search__input"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
      />
    </div>
  );
}
