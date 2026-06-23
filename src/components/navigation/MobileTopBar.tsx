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
import './mobile-top-bar.css';

const WolfHeaderIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className="mobile-header-logo"
    aria-hidden
  >
    <path d="M12 22C12 22 5 18 3 11C2 8 3 4 3 4L8 7L12 2L16 7L21 4C21 4 22 8 21 11C19 18 12 22 12 22Z" />
  </svg>
);

type MobileTopBarProps = {
  activeView: string;
  language: 'ES' | 'EN';
  mobileChatOpen: boolean;
  onToggleChat: () => void;
  onNavigate: (view: AppViewId) => void;
};

export function MobileTopBar({
  activeView,
  language,
  mobileChatOpen,
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
    <div className={`mobile-header${config?.belowTitle ? ' mobile-header--inline-plan' : ''}`}>
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
        <WolfHeaderIcon />
        <div className="mobile-header-brand-copy">
          <div className="mobile-header-title">{title}</div>
          {config?.belowTitle ? (
            <div className="mobile-header-inline-slot">{config.belowTitle}</div>
          ) : null}
        </div>
      </div>
      <div className="mobile-header-actions">
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
