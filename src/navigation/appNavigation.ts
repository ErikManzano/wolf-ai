import type { ComponentType } from 'react';
import {
  BookMarked,
  BotMessageSquare,
  CalendarRange,
  CircleUser,
  ClipboardCheck,
  LayoutDashboard,
  ListTree,
  MoreHorizontal,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { WolfAppRole } from '../models/training';

export type AppViewId =
  | 'dashboard'
  | 'my-wl-plan'
  | 'athletes'
  | 'programs'
  | 'exercise-intelligence'
  | 'global-calendar'
  | 'account'
  | 'admin-users'
  | 'onboarding';

export type AppNavItem = {
  id: AppViewId;
  labelEs: string;
  labelEn: string;
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
};

const COACH_ONLY_NAV = new Set<AppViewId>(['programs', 'exercise-intelligence', 'athletes', 'onboarding']);
const COACH_HIDDEN_NAV = new Set<AppViewId>(['global-calendar']);
const ATHLETE_ONLY_NAV = new Set<AppViewId>(['my-wl-plan']);
const SUPER_ADMIN_ONLY_NAV = new Set<AppViewId>(['admin-users']);

/** Coach mobile bottom bar — left → center (principal) → right */
const COACH_MOBILE_BOTTOM: AppViewId[] = [
  'dashboard',
  'exercise-intelligence',
  'programs',
  'athletes',
  'account',
];

const ATHLETE_MOBILE_BOTTOM: AppViewId[] = ['my-wl-plan', 'account'];
const SUPER_ADMIN_MOBILE_BOTTOM: AppViewId[] = [
  'dashboard',
  'exercise-intelligence',
  'programs',
  'athletes',
  'account',
];

export const APP_NAV_ITEMS: AppNavItem[] = [
  { id: 'dashboard', labelEs: 'Inicio', labelEn: 'Home', icon: LayoutDashboard },
  { id: 'my-wl-plan', labelEs: 'Mi plan WL', labelEn: 'My WL plan', icon: ClipboardCheck },
  { id: 'athletes', labelEs: 'Atletas', labelEn: 'Athletes', icon: Users },
  { id: 'programs', labelEs: 'Programas', labelEn: 'Programs', icon: BookMarked },
  { id: 'exercise-intelligence', labelEs: 'Ejercicios', labelEn: 'Exercises', icon: ListTree },
  { id: 'global-calendar', labelEs: 'Calendario', labelEn: 'Calendar', icon: CalendarRange },
  { id: 'account', labelEs: 'Cuenta', labelEn: 'Account', icon: CircleUser },
  { id: 'admin-users', labelEs: 'Panel maestro', labelEn: 'Master panel', icon: ShieldCheck },
  { id: 'onboarding', labelEs: 'Stats y PRs', labelEn: 'Stats & PRs', icon: BotMessageSquare },
];

export const MOBILE_MORE_ITEM: AppNavItem = {
  id: 'dashboard',
  labelEs: 'Más',
  labelEn: 'More',
  icon: MoreHorizontal,
};

export function isNavItemVisible(
  id: AppViewId,
  persona: 'coach' | 'athlete',
  role: WolfAppRole | undefined,
): boolean {
  if (SUPER_ADMIN_ONLY_NAV.has(id)) return role === 'super_admin';
  if (ATHLETE_ONLY_NAV.has(id)) return persona === 'athlete';
  if (role === 'super_admin') return !ATHLETE_ONLY_NAV.has(id);
  if (persona === 'athlete' && COACH_ONLY_NAV.has(id)) return false;
  if (persona === 'coach' && COACH_HIDDEN_NAV.has(id)) return false;
  return true;
}

export function getVisibleNavItems(
  persona: 'coach' | 'athlete',
  role: WolfAppRole | undefined,
): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => isNavItemVisible(item.id, persona, role));
}

export function getMobileBottomNavIds(
  persona: 'coach' | 'athlete',
  role: WolfAppRole | undefined,
): AppViewId[] {
  const base =
    role === 'super_admin'
      ? SUPER_ADMIN_MOBILE_BOTTOM
      : persona === 'athlete'
        ? ATHLETE_MOBILE_BOTTOM
        : COACH_MOBILE_BOTTOM;
  return base.filter((id) => isNavItemVisible(id, persona, role));
}

export function getMobileBottomNavCenterId(
  persona: 'coach' | 'athlete',
  role: WolfAppRole | undefined,
): AppViewId {
  if (persona === 'athlete') return 'my-wl-plan';
  if (role === 'super_admin' || persona === 'coach') return 'programs';
  return 'programs';
}

/** @deprecated Use getMobileBottomNavIds */
export function getMobilePrimaryNavIds(
  persona: 'coach' | 'athlete',
  role: WolfAppRole | undefined,
): AppViewId[] {
  return getMobileBottomNavIds(persona, role);
}

export function getMobileSecondaryNavItems(
  persona: 'coach' | 'athlete',
  role: WolfAppRole | undefined,
): AppNavItem[] {
  const primary = new Set(getMobileBottomNavIds(persona, role));
  return getVisibleNavItems(persona, role).filter((item) => !primary.has(item.id));
}

export function getNavLabel(id: string, isEs: boolean): string {
  const item = APP_NAV_ITEMS.find((nav) => nav.id === id);
  if (!item) return id;
  return isEs ? item.labelEs : item.labelEn;
}

/** Maps nested views (editor, plantillas, etc.) to the bottom-nav tab that should look active. */
export function isMobileBottomNavItemActive(
  navId: AppViewId,
  activeView: string,
  ctx?: { programsView?: 'hub' | 'editor' },
): boolean {
  switch (navId) {
    case 'programs':
      return (
        activeView === 'programs' ||
        activeView === 'wolf-engine' ||
        ctx?.programsView === 'editor'
      );
    case 'exercise-intelligence':
      return (
        activeView === 'exercise-intelligence' ||
        activeView === 'wl-exercises' ||
        activeView === 'library'
      );
    case 'athletes':
      return activeView === 'athletes' || activeView === 'planning' || activeView === 'global-calendar';
    case 'account':
      return activeView === 'account';
    case 'admin-users':
      return activeView === 'admin-users';
    default:
      return activeView === navId;
  }
}
