import React from 'react';
import { LayoutDashboard, Users, CalendarRange, BotMessageSquare as IntakeIcon, BookOpen, ShieldCheck, Gauge, ClipboardCheck, Zap, Dumbbell, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import './Sidebar.css';
import { useAppContext } from '../context/AppContext';
import { useWolfAssign } from '../context/WolfAssignContext';

const WolfIcon = ({ size = 28, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L10 7L4 9L8 12L6 19L12 16L18 19L16 12L20 9L14 7L12 2Z" style={{ display: 'none' }} /> {/* Refined geometric wolf head below */}
    <path d="M12 2L9 8L3 11L7 14L5 22L12 18L19 22L17 14L21 11L15 8L12 2Z" style={{ display: 'none' }} />
    <path d="M12 22C12 22 5 18 3 11C2 8 3 4 3 4L8 7L12 2L16 7L21 4C21 4 22 8 21 11C19 18 12 22 12 22Z" />
  </svg>
);

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  language: 'ES' | 'EN';
  setLanguage: (lang: 'ES' | 'EN') => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** When false (e.g. mobile drawer), rail collapse lives in the app header instead. */
  showRailToggle?: boolean;
}

const COACH_ONLY_NAV = new Set(['wolf-engine', 'wl-quick', 'wl-templates', 'athletes']);
/** Formulario de Stats/PRs — solo sentido en primera persona como atleta. */
const ATHLETE_ONLY_NAV = new Set(['my-wl-plan', 'onboarding']);
const SUPER_ADMIN_ONLY_NAV = new Set(['admin-users']);

const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  language,
  setLanguage,
  onLogout,
  collapsed,
  onToggleCollapsed,
  showRailToggle = true,
}) => {
  const isEs = language === 'ES';
  const { userRole } = useAppContext();
  const { persona, currentUser } = useWolfAssign();

  const menuItems = [
    { id: 'dashboard', label: isEs ? 'Dashboard' : 'Dashboard', icon: LayoutDashboard },
    { id: 'my-wl-plan', label: isEs ? 'Mi plan WL' : 'My WL plan', icon: ClipboardCheck },
    { id: 'athletes', label: isEs ? 'Atletas' : 'Athletes', icon: Users },
    { id: 'wolf-engine', label: isEs ? 'Motor Weightlifting' : 'Weightlifting Engine', icon: Gauge },
    { id: 'wl-quick', label: isEs ? 'Sesión rápida' : 'Quick session', icon: Zap },
    { id: 'wl-templates', label: isEs ? 'Plantillas Pro' : 'Pro templates', icon: Dumbbell },
    { id: 'global-calendar', label: isEs ? 'Calendario' : 'Calendar', icon: CalendarRange },
    { id: 'admin-users', label: isEs ? 'Panel maestro' : 'Master panel', icon: ShieldCheck },
    { id: 'onboarding', label: isEs ? 'Stats y PRs' : 'Stats & PRs', icon: IntakeIcon },
    { id: 'library', label: isEs ? 'Biblioteca' : 'Library', icon: BookOpen },
  ];

  const visibleMenuItems = menuItems.filter((item) => {
    if (SUPER_ADMIN_ONLY_NAV.has(item.id)) return currentUser?.role === 'super_admin';
    if (ATHLETE_ONLY_NAV.has(item.id)) return persona === 'athlete';
    if (currentUser?.role === 'super_admin') {
      // Super admin stays focused on account governance by default.
      return !ATHLETE_ONLY_NAV.has(item.id);
    }
    if (persona === 'athlete' && COACH_ONLY_NAV.has(item.id)) return false;
    return true;
  });

  return (
    <div className={`sidebar${collapsed ? ' compact' : ''}`}>
      <div className="sidebar-header">
        <div className="logo">
          <WolfIcon size={28} className="logo-icon" />
          <h2>Wolf AI</h2>
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

      <nav className="sidebar-nav">
        {visibleMenuItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
            title={item.label}
            aria-label={item.label}
          >
            <item.icon size={20} className={item.id === 'wolf-engine' && activeView === 'wolf-engine' ? 'icon-glow' : ''} />
            <span
              style={{
                fontWeight: item.id === 'wolf-engine' ? 'bold' : 'normal',
                color: item.id === 'wolf-engine' && activeView !== 'wolf-engine' ? 'var(--color-accent)' : 'inherit',
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="lang-toggle">
          <button
            className={language === 'ES' ? 'active' : ''}
            onClick={() => setLanguage('ES')}
          >
            ES
          </button>
          <button
            className={language === 'EN' ? 'active' : ''}
            onClick={() => setLanguage('EN')}
          >
            EN
          </button>
        </div>
        <div
          className="user-profile"
          style={{ transition: 'all 0.2s', border: userRole === 'admin' ? '1px solid var(--color-accent)' : '1px solid transparent' }}
        >
          <div className="avatar" style={{ background: userRole === 'admin' ? 'var(--color-accent-gradient)' : 'var(--color-bg-secondary)' }}>
            {userRole === 'admin' ? <ShieldCheck size={16} /> : currentUser?.name?.[0]?.toUpperCase() ?? (persona === 'athlete' ? 'E' : 'I')}
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
                : persona === 'athlete'
                  ? isEs
                    ? 'Atleta'
                    : 'Athlete'
                  : 'Head Coach'}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-logout-btn"
          onClick={onLogout}
          aria-label={isEs ? 'Cerrar sesión' : 'Log out'}
          title={isEs ? 'Cerrar sesión' : 'Log out'}
        >
          <LogOut size={15} />
          <span>{isEs ? 'Cerrar sesión' : 'Log out'}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
