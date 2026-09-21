/** Coach-defined exercise family (parallel to official taxonomy families). */
export interface CoachExerciseFamily {
  id: string;
  coachId: string;
  slug: string;
  labelEs: string;
  labelEn: string;
  color?: string | null;
  icon?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const CUSTOM_FAMILY_TAG_PREFIX = 'cf:';

export function customFamilyTag(familyId: string): string {
  return `${CUSTOM_FAMILY_TAG_PREFIX}${familyId}`;
}

export function parseCustomFamilyTag(tag: string): string | null {
  if (!tag.startsWith(CUSTOM_FAMILY_TAG_PREFIX)) return null;
  const id = tag.slice(CUSTOM_FAMILY_TAG_PREFIX.length).trim();
  return id || null;
}

export function customFamilyIdFromTags(tags: string[] | undefined | null): string | null {
  if (!tags?.length) return null;
  for (const tag of tags) {
    const id = parseCustomFamilyTag(tag);
    if (id) return id;
  }
  return null;
}

export function stripCustomFamilyTags(tags: string[] | undefined | null): string[] {
  return (tags ?? []).filter((tag) => !tag.startsWith(CUSTOM_FAMILY_TAG_PREFIX));
}

/** Prefijo de filtro en chips del hub (`folder:<familyId>`). */
export const CUSTOM_FAMILY_FILTER_PREFIX = 'folder:';

export function customFamilyFilterKey(familyId: string): string {
  return `${CUSTOM_FAMILY_FILTER_PREFIX}${familyId}`;
}

export function parseCustomFamilyFilterKey(value: string): string | null {
  if (!value.startsWith(CUSTOM_FAMILY_FILTER_PREFIX)) return null;
  const id = value.slice(CUSTOM_FAMILY_FILTER_PREFIX.length).trim();
  return id || null;
}

export function isCustomFamilyFilter(value: string): boolean {
  return value.startsWith(CUSTOM_FAMILY_FILTER_PREFIX);
}
