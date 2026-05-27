import type { TrainingObjectiveCode } from './taxonomy';

export interface TechnicalCollection {
  id: string;
  coachId?: string | null;
  code: string;
  title: string;
  methodology?: string | null;
  objectiveId?: TrainingObjectiveCode | null;
  tags: string[];
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface TechnicalCollectionItem {
  collectionId: string;
  definitionId: string;
  position: number;
  progressionNotes?: string | null;
}

export interface TechnicalCollectionWithItems extends TechnicalCollection {
  items: TechnicalCollectionItem[];
}
