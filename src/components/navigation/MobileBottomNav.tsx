import {
  APP_NAV_ITEMS,
  getMobileBottomNavCenterId,
  getMobileBottomNavIds,
  getMobileSecondaryNavItems,
  isMobileBottomNavItemActive,
  MOBILE_MORE_ITEM,
  type AppNavItem,
  type AppViewId,
} from '../../navigation/appNavigation';
import { useWolfAssign } from '../../context/WolfAssignContext';
import './mobile-bottom-nav.css';

const APP_NAV_BY_ID = new Map(APP_NAV_ITEMS.map((item) => [item.id, item] as const));

type MobileBottomNavProps = {
  activeView: string;
  language: 'ES' | 'EN';
  menuOpen: boolean;
  onNavigate: (view: AppViewId) => void;
  onOpenMore: () => void;
};

export function MobileBottomNav({
  activeView,
  language,
  menuOpen,
  onNavigate,
  onOpenMore,
}: MobileBottomNavProps) {
  const isEs = language === 'ES';
  const { persona, currentUser, programsView } = useWolfAssign();
  const role = currentUser?.role;

  const bottomNavIds = getMobileBottomNavIds(persona, role);
  const centerId = getMobileBottomNavCenterId(persona, role);
  const bottomItems = bottomNavIds
    .map((id) => APP_NAV_BY_ID.get(id))
    .filter((item): item is AppNavItem => Boolean(item));

  const secondaryItems = getMobileSecondaryNavItems(persona, role);
  const showMore = secondaryItems.length > 0;
  const secondaryIds = new Set(secondaryItems.map((item) => item.id));
  const moreActive = menuOpen || secondaryIds.has(activeView as AppViewId);

  return (
    <nav
      className={`mobile-bottom-nav${showMore ? '' : ' mobile-bottom-nav--no-more'}`}
      aria-label={isEs ? 'Navegación principal' : 'Main navigation'}
    >
      <div
        className="mobile-bottom-nav__dock"
        style={{
          gridTemplateColumns: `repeat(${bottomItems.length + (showMore ? 1 : 0)}, minmax(0, 1fr))`,
        }}
      >
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const active = isMobileBottomNavItemActive(item.id, activeView, { programsView });
          const isCenter = item.id === centerId;
          const label = isEs ? item.labelEs : item.labelEn;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-bottom-nav__item${active ? ' is-active' : ''}${isCenter ? ' mobile-bottom-nav__item--center' : ''}`}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              onClick={() => onNavigate(item.id)}
            >
              <span className="mobile-bottom-nav__icon-wrap" aria-hidden>
                <Icon size={22} strokeWidth={isCenter ? 2.35 : 1.85} />
              </span>
              <span className="mobile-bottom-nav__label">{label}</span>
            </button>
          );
        })}
        {showMore ? (
          <button
            type="button"
            className={`mobile-bottom-nav__item${moreActive ? ' is-active' : ''}`}
            aria-current={moreActive ? 'page' : undefined}
            aria-expanded={menuOpen}
            aria-label={isEs ? MOBILE_MORE_ITEM.labelEs : MOBILE_MORE_ITEM.labelEn}
            onClick={onOpenMore}
          >
            <span className="mobile-bottom-nav__icon-wrap" aria-hidden>
              <MOBILE_MORE_ITEM.icon size={22} strokeWidth={moreActive ? 2.1 : 1.85} />
            </span>
            <span className="mobile-bottom-nav__label">
              {isEs ? MOBILE_MORE_ITEM.labelEs : MOBILE_MORE_ITEM.labelEn}
            </span>
          </button>
        ) : null}
      </div>
    </nav>
  );
}
