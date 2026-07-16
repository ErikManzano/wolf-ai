/**
 * Commercial billing — Free / Pro tiers (Sprint 1).
 * Stripe Checkout is optional via env; without keys, coaches can activate Pro via admin/local flag.
 */

export type BillingPlanId = 'free' | 'pro';

export const BILLING_PLAN_LIMITS = {
  free: {
    maxAthletes: 3,
    maxActivePrograms: 1,
  },
  pro: {
    maxAthletes: Number.POSITIVE_INFINITY,
    maxActivePrograms: Number.POSITIVE_INFINITY,
  },
} as const;

export const BILLING_PLAN_LABEL = {
  free: { es: 'Free', en: 'Free' },
  pro: { es: 'Pro', en: 'Pro' },
} as const;

export const BILLING_PRO_PRICE_USD = 39;

const PLAN_STORAGE_KEY = 'wolf_billing_plan_v1';

type PlanMap = Record<string, BillingPlanId>;

function readPlanMap(): PlanMap {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PlanMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePlanMap(map: PlanMap): void {
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(map));
}

/** Coach IDs forced to Pro via Vite env: VITE_PRO_COACH_IDS=id1,id2 */
export function envProCoachIds(): Set<string> {
  const raw = (import.meta.env.VITE_PRO_COACH_IDS as string | undefined)?.trim() ?? '';
  if (!raw) return new Set();
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

export function resolveCoachPlan(
  coachId: string | undefined,
  serverPlan?: BillingPlanId | null,
): BillingPlanId {
  if (!coachId) return 'free';
  if (serverPlan === 'pro' || serverPlan === 'free') return serverPlan;
  if (envProCoachIds().has(coachId)) return 'pro';
  const local = readPlanMap()[coachId];
  return local === 'pro' ? 'pro' : 'free';
}

/** Dev / no-Stripe path: persist Pro locally for this coach. */
export function setLocalCoachPlan(coachId: string, plan: BillingPlanId): void {
  const map = readPlanMap();
  map[coachId] = plan;
  writePlanMap(map);
}

export function canAddAthlete(plan: BillingPlanId, currentAthleteCount: number): boolean {
  return currentAthleteCount < BILLING_PLAN_LIMITS[plan].maxAthletes;
}

export function canCreateActiveProgram(plan: BillingPlanId, activeProgramCount: number): boolean {
  return activeProgramCount < BILLING_PLAN_LIMITS[plan].maxActivePrograms;
}

export function athleteLimitLabel(plan: BillingPlanId, isEs: boolean): string {
  const max = BILLING_PLAN_LIMITS[plan].maxAthletes;
  if (!Number.isFinite(max)) return isEs ? 'Ilimitados' : 'Unlimited';
  return String(max);
}

export function stripeCheckoutEnabled(): boolean {
  return Boolean((import.meta.env.VITE_STRIPE_CHECKOUT_URL as string | undefined)?.trim());
}

export function stripeCheckoutUrl(): string | null {
  const url = (import.meta.env.VITE_STRIPE_CHECKOUT_URL as string | undefined)?.trim();
  return url || null;
}
