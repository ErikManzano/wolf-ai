import { useState } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import CentralPanel from './components/CentralPanel.tsx';
import ChatPanel from './components/ChatPanel';
import { AppProvider } from './context/AppContext';
import { Menu, MessageSquare, X } from 'lucide-react';

function App() {
  const [activeView, setActiveView] = useState('onboarding');
  const [language, setLanguage] = useState<'ES' | 'EN'>('ES');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  return (
    <AppProvider>
      <div className="app-container">
        {/* Mobile Header Overlays */}
        <div className="mobile-header">
          <button className="mobile-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="mobile-title">Wolf AI</div>
          <button className="mobile-btn" onClick={() => setMobileChatOpen(!mobileChatOpen)}>
            {mobileChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
          </button>
        </div>

        <div className={`sidebar-area ${mobileMenuOpen ? 'open' : ''}`}>
          <Sidebar 
            activeView={activeView} 
            setActiveView={(v) => { setActiveView(v); setMobileMenuOpen(false); }} 
            language={language}
            setLanguage={setLanguage}
          />
        </div>
        
        {/* Workspace */}
        <div className="workspace-area">
          <CentralPanel language={language} activeView={activeView} />
        </div>
        
        {/* Chat Panel */}
        <div className={`chat-area ${mobileChatOpen ? 'open' : ''}`}>
          <ChatPanel language={language} />
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
