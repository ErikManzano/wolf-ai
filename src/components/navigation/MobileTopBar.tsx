import { ArrowLeft, MessageSquare } from 'lucide-react';
import {
  APP_NAV_ITEMS,
  getNavLabel,
  isMobileBottomNavItemActive,
  isNavItemVisible,
  type AppViewId,
} from '../../navigation/appNavigation';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useMobileTopBarContext } from '../../context/MobileTopBarContext';
import { NotificationsBell } from '../notifications/NotificationsBell';
import { WolfBrandIcon } from '../WolfBrandIcon';
import './mobile-top-bar.css';

const WolfHeaderIcon = ({ size = 18 }: { size?: number }) => (
  <WolfBrandIcon size={size} className="mobile-header-logo" />
);

type MobileTopBarProps = {
  activeView: string;
  language: 'ES' | 'EN';
  mobileChatOpen: boolean;
  notificationsOpen: boolean;
  onNotificationsOpenChange: (open: boolean) => void;
  onToggleChat: () => void;
  onNavigate: (view: AppViewId) => void;
};

export function MobileTopBar({
  activeView,
  language,
  mobileChatOpen,
  notificationsOpen,
  onNotificationsOpenChange,
  onToggleChat,
  onNavigate,
}: MobileTopBarProps) {
  const isEs = language === 'ES';
  const { config } = useMobileTopBarContext();
  const { persona, currentUser } = useWolfAssign();
  const accountItem = APP_NAV_ITEMS.find((item) => item.id === 'account');
  const showAccount =
    accountItem && isNavItemVisible('account', persona, currentUser?.role);
  const accountActive = isMobileBottomNavItemActive('account', activeView);
  const AccountIcon = accountItem?.icon;
  const defaultTitle = getNavLabel(activeView, isEs);
  const title = config?.title?.trim() || defaultTitle;
  const back = config?.back ?? null;

  return (
    <>
    <div
      className={`mobile-header${config?.belowTitle ? ' mobile-header--stacked' : ''}${config?.inlinePlan ? ' mobile-header--inline-plan' : ''}`}
    >
      <div className="mobile-header-brand" aria-live="polite">
        {back ? (
          <button
            type="button"
            className="mobile-header-btn mobile-header-btn--back"
            aria-label={back.label}
            onClick={back.onBack}
          >
            <ArrowLeft size={22} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
        {config?.hideBrandIcon ? null : <WolfHeaderIcon />}
        <div className={`mobile-header-brand-copy${config?.belowTitle ? ' mobile-header-brand-copy--stacked' : ''}`}>
          {config?.titleContent ?? <div className="mobile-header-title">{title}</div>}
          {config?.belowTitle ? (
            <div className="mobile-header-below-title">{config.belowTitle}</div>
          ) : null}
        </div>
      </div>
      <div className="mobile-header-actions">
        {config?.headerActions ? (
          <div className="mobile-header-custom-actions">{config.headerActions}</div>
        ) : null}
        <NotificationsBell
          variant="mobile"
          isEs={isEs}
          open={notificationsOpen}
          onOpenChange={onNotificationsOpenChange}
          className="wolf-notifications-bell--header"
        />
        {showAccount && accountItem && AccountIcon ? (
          <button
            type="button"
            className={`mobile-header-btn mobile-header-btn--account${accountActive ? ' is-active' : ''}`}
            aria-current={accountActive ? 'page' : undefined}
            aria-label={isEs ? accountItem.labelEs : accountItem.labelEn}
            onClick={() => onNavigate('account')}
          >
            <AccountIcon size={22} strokeWidth={accountActive ? 2.35 : 2} />
          </button>
        ) : null}
        <button
          type="button"
          className="mobile-header-btn mobile-header-btn--chat"
          aria-expanded={mobileChatOpen}
          aria-label={
            mobileChatOpen
              ? isEs
                ? 'Cerrar chat'
                : 'Close chat'
              : isEs
                ? 'Abrir chat'
                : 'Open chat'
          }
          onClick={onToggleChat}
        >
          <MessageSquare size={22} strokeWidth={2} />
        </button>
      </div>
    </div>
    {config?.pinnedBelowHeader ? (
      <div className="mobile-subheader">{config.pinnedBelowHeader}</div>
    ) : null}
    </>
  );
}
