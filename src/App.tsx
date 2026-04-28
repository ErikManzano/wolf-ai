import { useEffect, useMemo, useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import CentralPanel from './components/CentralPanel.tsx';
import ChatPanel from './components/ChatPanel';
import { AppProvider, useAppContext } from './context/AppContext';
import { WolfAssignProvider } from './context/WolfAssignContext';
import { useWolfAssign } from './context/WolfAssignContext';
import { Menu, MessageSquare, X } from 'lucide-react';
import LoginScreen from './components/LoginScreen';

const AUTH_STORAGE = 'wolf_auth_v1';

function AppShell() {
  const [activeView, setActiveView] = useState('wolf-engine');
  const [language, setLanguage] = useState<'ES' | 'EN'>('ES');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  /** Panel AI lateral colapsado solo en vista escritorio (≥1025px). */
  const [chatDesktopCollapsed, setChatDesktopCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => localStorage.getItem(AUTH_STORAGE) === '1');

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
      <div className={`app-container${chatDesktopCollapsed ? ' app-container--chat-collapsed' : ''}`}>
        {/* Mobile Header Overlays */}
        <div className="mobile-header">
          <button
            type="button"
            className="mobile-btn"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => {
              setMobileChatOpen(false);
              setMobileMenuOpen((v) => !v);
            }}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="mobile-title">Wolf AI</div>
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

        <div className={`sidebar-area ${mobileMenuOpen ? 'open' : ''}`}>
          <Sidebar 
            activeView={activeView} 
            setActiveView={(v) => { setActiveView(v); setMobileMenuOpen(false); }} 
            language={language}
            setLanguage={setLanguage}
            onLogout={() => {
              localStorage.removeItem(AUTH_STORAGE);
              setIsAuthenticated(false);
              setMobileMenuOpen(false);
              setMobileChatOpen(false);
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
