import type { Session } from '../../models/training';
import type { SessionPickerOption } from '../../services/exercise';

export type SessionApplyFn = (fn: (current: Session) => Session) => void;

export interface SessionCatalogProps {
  pickerOptions: SessionPickerOption[];
  pickerSingles: SessionPickerOption[];
  recentIds?: string[];
}
