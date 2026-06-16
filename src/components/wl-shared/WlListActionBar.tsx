import { Plus, type LucideIcon } from 'lucide-react';
import { WlListFieldSelect } from './WlListFieldSelect';
import { WlSearchField } from './WlSearchField';

export type WlListActionBarOption = {
  id: string;
  label: string;
  shortLabel?: string;
};

export function WlListActionBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  searchAriaLabel,
  filterIcon,
  filterValue,
  onFilterChange,
  filterAriaLabel,
  filterOptions,
  filterActive = false,
  primaryLabel,
  primaryAriaLabel,
  onPrimaryClick,
  showPrimary = true,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchAriaLabel: string;
  filterIcon: LucideIcon;
  filterValue: string;
  onFilterChange: (value: string) => void;
  filterAriaLabel: string;
  filterOptions: WlListActionBarOption[];
  filterActive?: boolean;
  primaryLabel: string;
  primaryAriaLabel: string;
  onPrimaryClick: () => void;
  showPrimary?: boolean;
}) {
  return (
    <div className="wl-list-toolbar wl-list-toolbar--action-bar">
      <WlSearchField
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        ariaLabel={searchAriaLabel}
      />
      <WlListFieldSelect
        icon={filterIcon}
        value={filterValue}
        onChange={onFilterChange}
        ariaLabel={filterAriaLabel}
        active={filterActive}
        title={filterOptions.find((option) => option.id === filterValue)?.label}
      >
        {filterOptions.map((option) => (
          <option key={option.id} value={option.id} title={option.label}>
            {option.shortLabel ?? option.label}
          </option>
        ))}
      </WlListFieldSelect>
      {showPrimary ? (
        <button
          type="button"
          className="btn-primary wl-list-toolbar__cta"
          onClick={onPrimaryClick}
          aria-label={primaryAriaLabel}
        >
          <Plus size={16} strokeWidth={2.25} aria-hidden />
          <span className="wl-list-toolbar__cta-label">{primaryLabel}</span>
        </button>
      ) : null}
    </div>
  );
}
