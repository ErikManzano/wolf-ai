import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import CentralPanel from './components/CentralPanel.tsx';
import ChatPanel from './components/ChatPanel';
import { AppProvider, useAppContext } from './context/AppContext';
import { WolfAssignProvider } from './context/WolfAssignContext';
import { useWolfAssign } from './context/WolfAssignContext';
import { MessageSquare, X } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import ConfirmationModal from './components/ConfirmationModal';

const AUTH_STORAGE = 'wolf_auth_v1';

function AppShell() {
  const [activeView, setActiveView] = useState('wolf-engine');
  const [language, setLanguage] = useState<'ES' | 'EN'>('ES');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => localStorage.getItem('wolf_sidebar_compact_v1') === '1');
  /** Panel AI lateral colapsado solo en vista escritorio (≥1025px). */
  const [chatDesktopCollapsed, setChatDesktopCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem(AUTH_STORAGE) === '1');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isNarrowLayout, setIsNarrowLayout] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1024px)').matches : false,
  );
  const gestureRef = useRef<{ startX: number; startY: number; tracking: boolean }>({
    startX: 0,
    startY: 0,
    tracking: false,
  });

  const { users, setCurrentUserId, currentUser } = useWolfAssign();
  const { setUserRole } = useAppContext();

  const loginUsers = useMemo(
    () => [
      {
        id: 'user-coach',
        name: 'Ivan Hellequin',
        email: 'ivan.hellequin@wolf-ai.local',
        password: 'wolf2026',
        roleLabel: language === 'ES' ? 'Head Coach' : 'Head Coach',
      },
      {
        id: 'user-athlete',
        name: 'Erik Manzano',
        email: 'erik.manzano@wolf-ai.local',
        password: 'wolf2026',
        roleLabel: language === 'ES' ? 'Atleta' : 'Athlete',
      },
      {
        id: 'user-athlete-2',
        name: 'Laura Méndez',
        email: 'laura.mendez@wolf-ai.local',
        password: 'wolf2026',
        roleLabel: language === 'ES' ? 'Atleta' : 'Athlete',
      },
    ],
    [language],
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!currentUser) return;
    setUserRole('coach');
    setActiveView(currentUser.role === 'athlete' ? 'my-wl-plan' : 'wolf-engine');
  }, [isAuthenticated, currentUser, setUserRole]);

  useEffect(() => {
    localStorage.setItem('wolf_sidebar_compact_v1', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)');
    const apply = () => {
      const next = media.matches;
      setIsNarrowLayout(next);
      if (!next) {
        setMobileMenuOpen(false);
        setMobileChatOpen(false);
      }
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);

  const effectiveSidebarCollapsed = isNarrowLayout ? !mobileMenuOpen : sidebarCollapsed;

  if (!isAuthenticated) {
    return (
      <LoginScreen
        language={language}
        identities={loginUsers}
        onLogin={(userId) => {
          if (!users.some((u) => u.id === userId)) return;
          setCurrentUserId(userId);
          localStorage.setItem(AUTH_STORAGE, '1');
          setIsAuthenticated(true);
        }}
      />
    );
  }

  return (
      <div
        className={`app-container${chatDesktopCollapsed ? ' app-container--chat-collapsed' : ''}${effectiveSidebarCollapsed ? ' app-container--sidebar-collapsed' : ''}`}
        onPointerDown={(e) => {
          if (!isNarrowLayout || e.pointerType === 'mouse') return;
          gestureRef.current = { startX: e.clientX, startY: e.clientY, tracking: true };
        }}
        onPointerUp={(e) => {
          if (!isNarrowLayout || !gestureRef.current.tracking || e.pointerType === 'mouse') return;
          const dx = e.clientX - gestureRef.current.startX;
          const dy = e.clientY - gestureRef.current.startY;
          gestureRef.current.tracking = false;
          if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 42) return;
          if (dx > 0 && !mobileMenuOpen && gestureRef.current.startX <= 44) {
            setMobileChatOpen(false);
            setMobileMenuOpen(true);
          } else if (dx < 0 && mobileMenuOpen) {
            setMobileMenuOpen(false);
          }
        }}
        onPointerCancel={() => {
          gestureRef.current.tracking = false;
        }}
      >
        {/* Mobile Header Overlays */}
        <div className="mobile-header">
          <button
            type="button"
            className="mobile-btn"
            aria-expanded={mobileChatOpen}
            aria-label={mobileChatOpen ? 'Cerrar chat' : 'Abrir chat'}
            onClick={() => {
              setMobileMenuOpen(false);
              setMobileChatOpen((v) => !v);
            }}
          >
            {mobileChatOpen ? <X size={22} /> : <MessageSquare size={22} />}
          </button>
        </div>

        {(mobileMenuOpen || mobileChatOpen) && (
          <button
            type="button"
            className="mobile-backdrop"
            aria-label="Cerrar panel"
            onClick={() => {
              setMobileMenuOpen(false);
              setMobileChatOpen(false);
            }}
          />
        )}

        <div className={`sidebar-area ${mobileMenuOpen ? 'open' : ''}${effectiveSidebarCollapsed ? ' collapsed' : ''}`}>
          <Sidebar 
            activeView={activeView} 
            setActiveView={(v) => { setActiveView(v); setMobileMenuOpen(false); }} 
            language={language}
            setLanguage={setLanguage}
            collapsed={effectiveSidebarCollapsed}
            onToggleCollapsed={() => {
              if (isNarrowLayout) {
                setMobileMenuOpen((v) => !v);
                return;
              }
              setSidebarCollapsed((v) => !v);
            }}
            onLogout={() => {
              setLogoutConfirmOpen(true);
            }}
          />
        </div>
        
        {/* Workspace */}
        <div className="workspace-area">
          <CentralPanel language={language} activeView={activeView} setActiveView={setActiveView} />
        </div>
        
        {/* Chat Panel */}
        <div className={`chat-area ${mobileChatOpen ? 'open' : ''}`}>
          <ChatPanel
            language={language}
            desktopCollapsed={chatDesktopCollapsed}
            onToggleDesktopCollapse={() => setChatDesktopCollapsed((c) => !c)}
          />
        </div>

        <ConfirmationModal
          open={logoutConfirmOpen}
          title={language === 'ES' ? 'Cerrar sesión' : 'Log out'}
          message={
            language === 'ES'
              ? '¿Seguro que quieres cerrar sesión? Tendrás que volver a iniciar sesión para continuar.'
              : 'Are you sure you want to log out? You will need to sign in again to continue.'
          }
          confirmLabel={language === 'ES' ? 'Sí, cerrar sesión' : 'Yes, log out'}
          cancelLabel={language === 'ES' ? 'Cancelar' : 'Cancel'}
          danger
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={() => {
            localStorage.removeItem(AUTH_STORAGE);
            setIsAuthenticated(false);
            setMobileMenuOpen(false);
            setMobileChatOpen(false);
            setLogoutConfirmOpen(false);
          }}
        />
      </div>
  );
}

function App() {
  return (
    <AppProvider>
      <WolfAssignProvider>
        <AppShell />
      </WolfAssignProvider>
    </AppProvider>
  );
}

export default App;
