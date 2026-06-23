import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './App.css';
import './styles/interactive.css';
import './components/navigation/mobile-top-bar.css';
import Sidebar from './components/Sidebar';
import CentralPanel from './components/CentralPanel.tsx';
import ChatPanel from './components/ChatPanel';
import { AppProvider, useAppContext } from './context/AppContext';
import { WolfAssignProvider } from './context/WolfAssignContext';
import { WolfAlertProvider } from './context/WolfAlertContext';
import { useWolfAssign } from './context/WolfAssignContext';
import { ChevronsLeft } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import ConfirmationModal from './components/ConfirmationModal';
import { MobileBottomNav } from './components/navigation/MobileBottomNav';
import { MobileTopBar } from './components/navigation/MobileTopBar';
import { MobileTopBarProvider, useMobileTopBarContext } from './context/MobileTopBarContext';
import type { AppViewId } from './navigation/appNavigation';
import type { WolfAppRole } from './models/training';
import {
  SIDEBAR_COMPACT_WIDTH,
  SIDEBAR_WIDTH_MAX,
  useSidebarResize,
} from './hooks/useSidebarResize';

const AUTH_STORAGE = 'wolf_auth_v1';

function AppShell() {
  const [activeView, setActiveView] = useState('programs');
  const [language, setLanguage] = useState<'ES' | 'EN'>('ES');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => localStorage.getItem('wolf_sidebar_compact_v1') === '1');
  const [sidebarToggleAnimating, setSidebarToggleAnimating] = useState(false);
  const sidebarToggleAnimTimerRef = useRef<number | null>(null);
  /** Asistente AI en drawer lateral (escritorio); el rail derecho queda desactivado. */
  const [sidebarChatOpen, setSidebarChatOpen] = useState(false);
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
  /** Vista inicial por usuario; no resetear al refrescar catálogo API (nuevo ref de `currentUser`). */
  const initialViewUserIdRef = useRef<string | null>(null);

  const { currentUser, loginUser, loginWithGoogle, registerUser, forgotPassword, resetPassword, clearApiSession, programsView, editingProgramId } = useWolfAssign();
  const { config: mobileTopBarConfig } = useMobileTopBarContext();
  const { setUserRole } = useAppContext();

  const appRoleFromWolf = (role: WolfAppRole) => {
    if (role === 'super_admin') return 'admin' as const;
    if (role === 'athlete') return 'athlete' as const;
    return 'coach' as const;
  };

  useEffect(() => {
    if (!isAuthenticated) {
      initialViewUserIdRef.current = null;
      return;
    }
    if (!currentUser) return;
    setUserRole(appRoleFromWolf(currentUser.role));
    if (initialViewUserIdRef.current === currentUser.id) return;
    initialViewUserIdRef.current = currentUser.id;
    setActiveView(
      currentUser.role === 'athlete'
        ? 'dashboard'
        : currentUser.role === 'super_admin'
          ? 'admin-users'
          : 'programs',
    );
  }, [isAuthenticated, currentUser?.id, currentUser?.role, setUserRole]);

  useEffect(() => {
    return () => {
      if (sidebarToggleAnimTimerRef.current != null) {
        window.clearTimeout(sidebarToggleAnimTimerRef.current);
      }
    };
  }, []);

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
  const sidebarResizeEnabled = !isNarrowLayout;
  const {
    width: sidebarWidth,
    isResizing: sidebarResizing,
    nearCollapse: sidebarNearCollapse,
    onPointerDown: onSidebarResizeDown,
    onDoubleClick: onSidebarResizeReset,
    consumeToggleClick: consumeSidebarToggleClick,
  } = useSidebarResize({
    enabled: sidebarResizeEnabled,
    collapsed: effectiveSidebarCollapsed,
    onCollapse: () => setSidebarCollapsed(true),
    onExpand: () => setSidebarCollapsed(false),
  });

  const triggerSidebarToggleAnimation = () => {
    setSidebarToggleAnimating(true);
    if (sidebarToggleAnimTimerRef.current != null) {
      window.clearTimeout(sidebarToggleAnimTimerRef.current);
    }
    sidebarToggleAnimTimerRef.current = window.setTimeout(() => {
      setSidebarToggleAnimating(false);
      sidebarToggleAnimTimerRef.current = null;
    }, 420);
  };

  const showSidebarCollapsed = effectiveSidebarCollapsed && !sidebarResizing;

  const lockMobileEdgeSwipe =
    Boolean(mobileTopBarConfig?.lockEdgeSwipe) ||
    (isNarrowLayout &&
      activeView === 'programs' &&
      programsView === 'editor' &&
      Boolean(editingProgramId));

  const sidebarUsesCustomWidth = sidebarResizeEnabled && (!showSidebarCollapsed || sidebarResizing);
  const appContainerStyle = sidebarUsesCustomWidth
    ? ({ '--sidebar-width': `${sidebarWidth}px` } as CSSProperties)
    : undefined;

  if (!isAuthenticated) {
    return (
      <LoginScreen
        language={language}
        onLogin={async ({ email, password }) => {
          try {
            const resolvedUser = await loginUser(email, password);
            if (!resolvedUser) {
              return language === 'ES' ? 'Credenciales incorrectas.' : 'Invalid credentials.';
            }
            localStorage.setItem(AUTH_STORAGE, '1');
            setIsAuthenticated(true);
            return null;
          } catch (err) {
            return err instanceof Error ? err.message : language === 'ES' ? 'Error de conexión.' : 'Connection error.';
          }
        }}
        onRegister={async ({ name, email, password, role }) => registerUser({ name, email, password, role })}
        onForgotPassword={async ({ email }) => forgotPassword({ email })}
        onResetPassword={async ({ email, token, newPassword }) => resetPassword({ email, token, newPassword })}
        onGoogleLogin={async () => {
          const token = window.prompt(language === 'ES' ? 'Pega aquí tu Google ID Token' : 'Paste your Google ID token');
          if (!token) return language === 'ES' ? 'Token requerido.' : 'Token required.';
          const user = await loginWithGoogle(token);
          if (!user) return language === 'ES' ? 'No se pudo iniciar con Google.' : 'Google login failed.';
          localStorage.setItem(AUTH_STORAGE, '1');
          setIsAuthenticated(true);
          return null;
        }}
      />
    );
  }

  return (
      <div
        className={`app-container${showSidebarCollapsed ? ' app-container--sidebar-collapsed' : ''}${sidebarResizing ? ' app-container--sidebar-resizing' : ''}${lockMobileEdgeSwipe ? ' app-container--program-editor' : ''}`}
        style={appContainerStyle}
        onPointerDown={(e) => {
          if (!isNarrowLayout || e.pointerType === 'mouse' || lockMobileEdgeSwipe) return;
          gestureRef.current = { startX: e.clientX, startY: e.clientY, tracking: true };
        }}
        onPointerUp={(e) => {
          if (!isNarrowLayout || !gestureRef.current.tracking || e.pointerType === 'mouse' || lockMobileEdgeSwipe) return;
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
        <MobileTopBar
          activeView={activeView}
          language={language}
          mobileChatOpen={mobileChatOpen}
          onToggleChat={() => {
            setMobileMenuOpen(false);
            setMobileChatOpen((v) => !v);
          }}
          onNavigate={(view) => {
            setActiveView(view);
            setMobileMenuOpen(false);
            setMobileChatOpen(false);
          }}
        />

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
          className={`sidebar-area${mobileMenuOpen ? ' open' : ''}${sidebarResizing ? ' sidebar-area--resizing' : ''}`}
          inert={isNarrowLayout && !mobileMenuOpen ? true : undefined}
        >
          <Sidebar 
            activeView={activeView} 
            setActiveView={(v) => { setActiveView(v); setMobileMenuOpen(false); setSidebarChatOpen(false); }} 
            language={language}
            collapsed={showSidebarCollapsed}
            showRailToggle={false}
            mobileDrawer={isNarrowLayout}
            assistantOpen={sidebarChatOpen}
            showAssistantEntry={!isNarrowLayout}
            onToggleAssistant={() => setSidebarChatOpen((open) => !open)}
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
          {sidebarResizeEnabled ? (
            <div
              className={`sidebar-resize-handle${sidebarNearCollapse ? ' sidebar-resize-handle--collapse-zone' : ''}${showSidebarCollapsed ? ' sidebar-resize-handle--compact' : ''}${sidebarResizing ? ' sidebar-resize-handle--active' : ''}`}
              role="separator"
              aria-orientation="vertical"
              aria-label={
                language === 'ES'
                  ? 'Redimensionar sidebar; arrastra a la izquierda para plegar a iconos'
                  : 'Resize sidebar; drag left to collapse to icons'
              }
              aria-valuemin={SIDEBAR_COMPACT_WIDTH}
              aria-valuemax={SIDEBAR_WIDTH_MAX}
              aria-valuenow={showSidebarCollapsed && !sidebarResizing ? SIDEBAR_COMPACT_WIDTH : sidebarWidth}
              title={
                language === 'ES'
                  ? 'Arrastra para redimensionar. Suelta estrecho para modo iconos. Doble clic: ancho predeterminado.'
                  : 'Drag to resize. Release narrow for icon mode. Double-click: default width.'
              }
              onPointerDown={onSidebarResizeDown}
              onDoubleClick={onSidebarResizeReset}
            >
              <button
                type="button"
                className={`sidebar-resize-toggle${showSidebarCollapsed ? ' sidebar-resize-toggle--collapsed' : ''}${sidebarToggleAnimating ? ' sidebar-resize-toggle--animating' : ''}${sidebarResizing ? ' sidebar-resize-toggle--resizing' : ''}`}
                aria-label={
                  showSidebarCollapsed
                    ? language === 'ES'
                      ? 'Expandir sidebar'
                      : 'Expand sidebar'
                    : language === 'ES'
                      ? 'Colapsar sidebar'
                      : 'Collapse sidebar'
                }
                onDoubleClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => {
                  if (consumeSidebarToggleClick()) return;
                  triggerSidebarToggleAnimation();
                  setSidebarCollapsed((collapsed) => !collapsed);
                }}
              >
                <span className="sidebar-resize-toggle-icon" aria-hidden>
                  <ChevronsLeft size={14} strokeWidth={2.35} />
                </span>
              </button>
            </div>
          ) : null}
        </div>
        
        {/* Workspace */}
        <div className="workspace-area">
          <CentralPanel
            language={language}
            activeView={activeView}
            setActiveView={setActiveView}
            setLanguage={setLanguage}
            onRequestLogout={() => setLogoutConfirmOpen(true)}
          />
        </div>
        
        {isNarrowLayout ? (
          <div className={`chat-area ${mobileChatOpen ? 'open' : ''}`}>
            <ChatPanel language={language} />
          </div>
        ) : sidebarChatOpen ? (
          <>
            <button
              type="button"
              className="chat-sidebar-backdrop"
              aria-label={language === 'ES' ? 'Cerrar asistente' : 'Close assistant'}
              onClick={() => setSidebarChatOpen(false)}
            />
            <div className="chat-sidebar-drawer">
              <ChatPanel
                language={language}
                variant="drawer"
                onClose={() => setSidebarChatOpen(false)}
              />
            </div>
          </>
        ) : null}

        {isNarrowLayout ? (
          <MobileBottomNav
            activeView={activeView}
            language={language}
            menuOpen={mobileMenuOpen}
            onNavigate={(view: AppViewId) => {
              setActiveView(view);
              setMobileMenuOpen(false);
              setMobileChatOpen(false);
            }}
            onOpenMore={() => {
              setMobileChatOpen(false);
              setMobileMenuOpen((open) => !open);
            }}
          />
        ) : null}

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
      <WolfAlertProvider>
        <WolfAssignProvider>
          <MobileTopBarProvider>
            <AppShell />
          </MobileTopBarProvider>
        </WolfAssignProvider>
      </WolfAlertProvider>
    </AppProvider>
  );
}

export default App;
