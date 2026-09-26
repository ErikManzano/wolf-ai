import type {
  ExerciseFamilyCode,
  ExerciseLoadAnchorCode,
  TrainingObjectiveCode,
} from '../../models/exercise';

/** Vista grid/lista del hub de ejercicios. */
export type ExerciseViewMode = 'grid' | 'list';

/** Densidad de filas en vista lista (default: detailed). */
export type ExerciseListDensity = 'compact' | 'detailed';

/** Acceso rápido fijo al inicio de la fila de chips. */
export type ExerciseQuickFilter = 'none' | 'favorites' | 'recent';

export type ExerciseFamilyId = ExerciseFamilyCode | 'core';

/** Columnas ordenables en la tabla de ejercicios. */
export type ExerciseSortColumn = 'name' | 'family' | 'type' | 'ref' | 'usage' | 'created' | 'updated' | 'recent';

export type ExerciseSortDirection = 'asc' | 'desc';

export interface ExerciseListSortState {
  column: ExerciseSortColumn;
  direction: ExerciseSortDirection;
}

export interface ExerciseListItem {
  id: string;
  name: string;
  family: ExerciseFamilyId;
  familyLabel: string;
  type: TrainingObjectiveCode;
  typeLabel: string;
  /** Etiqueta visible de referencia de intensidad (incluye Propio). */
  intensityRef: string;
  intensityBasis: ExerciseLoadAnchorCode;
  /** Multiplicador 1RM; null si es 1.0 o desconocido. */
  loadScale: number | null;
  usageCount: number;
  isOfficial: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  lastUsedAt?: string;
  mediaUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Nodo de lista virtual: fila de datos o cabecera de grupo. */
export type ExerciseListNode =
  | {
      kind: 'group';
      id: string;
      family: ExerciseFamilyId;
      label: string;
      count: number;
    }
  | {
      kind: 'row';
      id: string;
      item: ExerciseListItem;
    };
