import {
  APP_NAV_ITEMS,
  getMobileBottomNavCenterId,
  getMobileBottomNavIds,
  getMobileSecondaryNavItems,
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
  const { persona, currentUser } = useWolfAssign();
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
      style={{
        gridTemplateColumns: `repeat(${bottomItems.length + (showMore ? 1 : 0)}, minmax(0, 1fr))`,
      }}
      aria-label={isEs ? 'Navegación principal' : 'Main navigation'}
    >
      {bottomItems.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.id;
        const isCenter = item.id === centerId;
        return (
          <button
            key={item.id}
            type="button"
            className={`mobile-bottom-nav__item${active ? ' is-active' : ''}${isCenter ? ' mobile-bottom-nav__item--center' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onNavigate(item.id)}
          >
            <span className="mobile-bottom-nav__icon-wrap" aria-hidden>
              <Icon size={isCenter ? 22 : 20} strokeWidth={active ? 2.25 : 2} />
            </span>
            <span>{isEs ? item.labelEs : item.labelEn}</span>
          </button>
        );
      })}
      {showMore ? (
        <button
          type="button"
          className={`mobile-bottom-nav__item${moreActive ? ' is-active' : ''}`}
          aria-current={moreActive ? 'page' : undefined}
          aria-expanded={menuOpen}
          onClick={onOpenMore}
        >
          <span className="mobile-bottom-nav__icon-wrap" aria-hidden>
            <MOBILE_MORE_ITEM.icon size={20} strokeWidth={moreActive ? 2.25 : 2} />
          </span>
          <span>{isEs ? MOBILE_MORE_ITEM.labelEs : MOBILE_MORE_ITEM.labelEn}</span>
        </button>
      ) : null}
    </nav>
  );
}
