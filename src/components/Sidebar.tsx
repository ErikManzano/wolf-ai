import React from 'react';
import { Bot, LogOut, PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react';
import './Sidebar.css';
import '../styles/interactive.css';
import { useAppContext } from '../context/AppContext';
import { useWolfAssign } from '../context/WolfAssignContext';
import {
  APP_NAV_ITEMS,
  getMobileSecondaryNavItems,
  getVisibleNavItems,
  isNavItemVisible,
} from '../navigation/appNavigation';

const WolfIcon = ({ size = 28, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 22C12 22 5 18 3 11C2 8 3 4 3 4L8 7L12 2L16 7L21 4C21 4 22 8 21 11C19 18 12 22 12 22Z" />
  </svg>
);

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  language: 'ES' | 'EN';
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  showRailToggle?: boolean;
  /** Mobile drawer: only secondary items + account controls. */
  mobileDrawer?: boolean;
  showAssistantEntry?: boolean;
  assistantOpen?: boolean;
  onToggleAssistant?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  language,
  onLogout,
  collapsed,
  onToggleCollapsed,
  showRailToggle = true,
  mobileDrawer = false,
  showAssistantEntry = false,
  assistantOpen = false,
  onToggleAssistant,
}) => {
  const isEs = language === 'ES';
  const { userRole } = useAppContext();
  const { persona, currentUser } = useWolfAssign();

  const visibleMenuItems = getVisibleNavItems(persona, currentUser?.role);
  const accountItem = APP_NAV_ITEMS.find((item) => item.id === 'account');
  const showAccount =
    accountItem && isNavItemVisible('account', persona, currentUser?.role);
  const navItems = (
    mobileDrawer
      ? getMobileSecondaryNavItems(persona, currentUser?.role)
      : visibleMenuItems
  ).filter((item) => item.id !== 'account');
  const AccountIcon = accountItem?.icon;

  return (
    <div className={`sidebar${collapsed ? ' compact' : ''}${mobileDrawer ? ' sidebar--mobile-drawer' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <WolfIcon size={20} className="logo-icon" />
          <h2>{mobileDrawer ? (isEs ? 'Más opciones' : 'More options') : 'Wolf AI'}</h2>
        </div>
        {showRailToggle ? (
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? (isEs ? 'Expandir sidebar' : 'Expand sidebar') : (isEs ? 'Colapsar sidebar' : 'Collapse sidebar')}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        ) : null}
      </div>

      <nav className="sidebar-nav" aria-label={mobileDrawer ? (isEs ? 'Más secciones' : 'More sections') : undefined}>
        {navItems.length === 0 && mobileDrawer ? (
          <p className="sidebar-mobile-empty">
            {isEs ? 'Las secciones principales están en la barra inferior.' : 'Main sections are in the bottom bar.'}
          </p>
        ) : null}
        {navItems.map((item) => {
          const Icon = item.icon;
          const label = isEs ? item.labelEs : item.labelEn;
          return (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? 'active' : ''}${item.id === 'programs' ? ' nav-item--programs' : ''}`}
              onClick={() => setActiveView(item.id)}
              title={label}
              aria-label={label}
            >
              <Icon size={16} className={item.id === 'programs' && activeView === 'programs' ? 'icon-glow' : ''} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {showAssistantEntry && onToggleAssistant ? (
          <button
            type="button"
            className={`sidebar-assistant-btn${assistantOpen ? ' active' : ''}`}
            onClick={onToggleAssistant}
            aria-expanded={assistantOpen}
            aria-label={isEs ? 'Asistente Wolf AI' : 'Wolf AI assistant'}
            title={isEs ? 'Asistente Wolf AI' : 'Wolf AI assistant'}
          >
            <Bot size={collapsed ? 14 : 16} aria-hidden />
            <span>{collapsed ? (isEs ? 'AI' : 'AI') : isEs ? 'Asistente AI' : 'AI assistant'}</span>
          </button>
        ) : null}
        <div
          className="user-profile"
          style={{ transition: 'all 0.2s', border: userRole === 'admin' ? '1px solid var(--color-accent)' : '1px solid transparent' }}
        >
          <div className="avatar" style={{ background: userRole === 'admin' ? 'var(--color-accent-gradient)' : 'var(--color-bg-secondary)' }}>
            {userRole === 'admin' ? <ShieldCheck size={14} /> : currentUser?.name?.[0]?.toUpperCase() ?? (persona === 'athlete' ? 'E' : 'I')}
          </div>
          <div className="user-info">
            <span className="name">
              {currentUser?.name ?? (persona === 'athlete' ? 'Erik Manzano' : 'Ivan Hellequin')}
            </span>
            <span className="role">
              {userRole === 'admin'
                ? isEs
                  ? 'Administrador'
                  : 'Administrator'
                : userRole === 'athlete' || persona === 'athlete'
                  ? isEs
                    ? 'Atleta'
                    : 'Athlete'
                  : 'Head Coach'}
            </span>
          </div>
        </div>
        {showAccount && accountItem && AccountIcon ? (
          <button
            type="button"
            className={`sidebar-account-btn${activeView === 'account' ? ' active' : ''}`}
            onClick={() => setActiveView('account')}
            aria-label={isEs ? accountItem.labelEs : accountItem.labelEn}
            title={isEs ? accountItem.labelEs : accountItem.labelEn}
          >
            <AccountIcon size={collapsed ? 13 : 14} aria-hidden />
            <span>{isEs ? accountItem.labelEs : accountItem.labelEn}</span>
          </button>
        ) : null}
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={onLogout}
          aria-label={isEs ? 'Cerrar sesión' : 'Log out'}
          title={isEs ? 'Cerrar sesión' : 'Log out'}
        >
          <LogOut size={collapsed ? 13 : 14} />
          <span>
            {collapsed
              ? isEs
                ? 'Salir'
                : 'Out'
              : isEs
                ? 'Cerrar sesión'
                : 'Log out'}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
