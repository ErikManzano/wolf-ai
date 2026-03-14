import React from 'react';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  Calendar,
  CalendarRange,
  Activity,
  LineChart,
  BotMessageSquare as IntakeIcon
} from 'lucide-react';
import './Sidebar.css';

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
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, language, setLanguage }) => {
  const isEs = language === 'ES';

  const menuItems = [
    { id: 'dashboard', label: isEs ? 'Dashboard' : 'Dashboard', icon: LayoutDashboard },
    { id: 'athletes', label: isEs ? 'Atletas' : 'Athletes', icon: Users },
    { id: 'programs', label: isEs ? 'Programas' : 'Programs', icon: Dumbbell },
    { id: 'planning', label: isEs ? 'Planificación' : 'Planning', icon: Calendar },
    { id: 'global-calendar', label: isEs ? 'Calendario' : 'Calendar', icon: CalendarRange },
    { id: 'onboarding', label: isEs ? 'Onboarding' : 'Onboarding', icon: IntakeIcon },
    { id: 'sessions', label: isEs ? 'Sesiones' : 'Sessions', icon: Activity },
    { id: 'performance', label: isEs ? 'Rendimiento' : 'Performance', icon: LineChart }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <WolfIcon size={28} className="logo-icon" />
          <h2>Wolf AI</h2>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setActiveView(item.id)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
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
        <div className="user-profile">
          <div className="avatar">C</div>
          <div className="user-info">
            <span className="name">Coach Pro</span>
            <span className="role">Head Coach</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
