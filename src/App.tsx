import { useEffect, useRef, useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import CentralPanel from './components/CentralPanel.tsx';
import ChatPanel from './components/ChatPanel';
import { AppProvider, useAppContext } from './context/AppContext';
import { WolfAssignProvider } from './context/WolfAssignContext';
import { useWolfAssign } from './context/WolfAssignContext';
import { MessageSquare, Menu, X } from 'lucide-react';
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
  const [chatDesktopCollapsed, setChatDesktopCollapsed] = useState(true);
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

  const { setCurrentUserId, currentUser, loginUser, registerUser, changePassword, clearApiSession } = useWolfAssign();
  const { setUserRole } = useAppContext();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!currentUser) return;
    setUserRole(currentUser.role === 'super_admin' ? 'admin' : 'coach');
    setActiveView(currentUser.role === 'athlete' ? 'my-wl-plan' : currentUser.role === 'super_admin' ? 'admin-users' : 'wolf-engine');
  }, [isAuthenticated, currentUser, setUserRole]);

  useEffect(() => {
    localStorage.setItem('wolf_sidebar_compact_v1', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    const onSessionExpired = () => {
      setIsAuthenticated(false);
      setMobileMenuOpen(false);
      setMobileChatOpen(false);
    };
    window.addEventListener('wolf:session-expired', onSessionExpired);
    return () => window.removeEventListener('wolf:session-expired', onSessionExpired);
  }, []);

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

  const effectiveSidebarCollapsed = isNarrowLayout ? false : sidebarCollapsed;

  if (!isAuthenticated) {
    return (
      <LoginScreen
        language={language}
        onLogin={async ({ email, password }) => {
          const resolvedUser = await loginUser(email, password);
          if (!resolvedUser) {
            return language === 'ES' ? 'Credenciales incorrectas.' : 'Invalid credentials.';
          }
          setCurrentUserId(resolvedUser.id);
          localStorage.setItem(AUTH_STORAGE, '1');
          setIsAuthenticated(true);
          return null;
        }}
        onRegister={async ({ name, email, password, role }) => registerUser({ name, email, password, role })}
        onChangePassword={async ({ email, currentPassword, newPassword }) =>
          changePassword({ email, currentPassword, newPassword })
        }
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
            className="mobile-header-btn mobile-header-btn--menu"
            aria-expanded={mobileMenuOpen}
            aria-label={
              mobileMenuOpen
                ? language === 'ES'
                  ? 'Cerrar menú'
                  : 'Close menu'
                : language === 'ES'
                  ? 'Abrir menú'
                  : 'Open menu'
            }
            onClick={() => {
              setMobileChatOpen(false);
              setMobileMenuOpen((v) => !v);
            }}
          >
            {mobileMenuOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
          </button>
          <button
            type="button"
            className="mobile-header-btn mobile-header-btn--chat"
            aria-expanded={mobileChatOpen}
            aria-label={mobileChatOpen ? 'Cerrar chat' : 'Abrir chat'}
            onClick={() => {
              setMobileMenuOpen(false);
              setMobileChatOpen((v) => !v);
            }}
          >
            {mobileChatOpen ? <X size={22} strokeWidth={2} /> : <MessageSquare size={22} strokeWidth={2} />}
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

        <div
          className={`sidebar-area${mobileMenuOpen ? ' open' : ''}`}
          inert={isNarrowLayout && !mobileMenuOpen ? true : undefined}
        >
          <Sidebar 
            activeView={activeView} 
            setActiveView={(v) => { setActiveView(v); setMobileMenuOpen(false); }} 
            language={language}
            setLanguage={setLanguage}
            collapsed={effectiveSidebarCollapsed}
            showRailToggle={!isNarrowLayout}
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
            clearApiSession();
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
