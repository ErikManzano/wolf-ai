import type { SessionPickerOption } from '../../services/exercise';

export interface SessionCatalogProps {
  pickerOptions: SessionPickerOption[];
  pickerSingles: SessionPickerOption[];
  recentIds?: string[];
}
