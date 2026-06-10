import type { CoachWlProgramTemplate } from '../../models/training';
import { STORAGE_TEMPLATES } from '../assignments/constants';

export function loadTemplatesFromLocal(): CoachWlProgramTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_TEMPLATES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CoachWlProgramTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistTemplatesLocal(templates: CoachWlProgramTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_TEMPLATES, JSON.stringify(templates));
  } catch {
    /* ignore */
  }
}
