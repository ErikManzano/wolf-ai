import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  MessageSquare,
  Info,
  Play,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './ChatPanel.css';
import { useAppContext } from '../context/AppContext';
import { useWolfAssign } from '../context/WolfAssignContext';
import { buildExerciseFeatureVector } from '../services/exercise';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface ChatPanelProps {
  language: 'ES' | 'EN';
  desktopCollapsed?: boolean;
  onToggleDesktopCollapse?: () => void;
}

interface Message {
  id: number;
  sender: 'ai' | 'user';
  text: string;
  actions?: string[];
}

const DESKTOP_CHAT_LAYOUT = '(min-width: 1025px)';

const ChatPanel: React.FC<ChatPanelProps> = ({
  language,
  desktopCollapsed = false,
  onToggleDesktopCollapse,
}) => {
  const isEs = language === 'ES';
  const isDesktopChatLayout = useMediaQuery(DESKTOP_CHAT_LAYOUT);
  const showDesktopCollapse = Boolean(isDesktopChatLayout && onToggleDesktopCollapse);

  const { applyDeload, reduceVolume, exerciseLibrary, selectedExerciseId } = useAppContext();
  const { motorExerciseDefinitions, exerciseRelationships } = useWolfAssign();
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'info'>('chat');

  const allExercises = exerciseLibrary.flatMap((cat) => cat.exercises);
  const selectedEx = allExercises.find((ex) => ex.id === selectedExerciseId);

  useEffect(() => {
    if (selectedExerciseId) setActiveTab('info');
  }, [selectedExerciseId]);

  const initialMessages: Message[] = [
    {
      id: 1,
      sender: 'ai',
      text: isEs
        ? '¡Hola Coach! He analizado los datos del atleta de esta semana. Veo un aumento atípico en la fatiga y el RPE reportado ayer fue 9/10 en sentadillas. ¿Cómo quieres proceder?'
        : "Hello Coach! I have analyzed the athlete's data this week. I see an atypical increase in fatigue and yesterday's reported RPE was 9/10 on squats. How would you like to proceed?",
      actions: isEs
        ? ['Ajustar cargas', 'Reducir volumen', 'Agregar deload']
        : ['Adjust loads', 'Reduce volume', 'Add deload'],
    },
  ];

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const msgIdRef = useRef(2);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userId = msgIdRef.current++;
    const newUserMsg: Message = {
      id: userId,
      sender: 'user',
      text: inputText,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');

    const lower = inputText.toLowerCase();
    const wantsExerciseRec =
      lower.includes('ejercicio') ||
      lower.includes('exercise') ||
      lower.includes('snatch') ||
      lower.includes('arranque');

    setTimeout(() => {
      let reply = isEs
        ? 'Entendido. He aplicado los cambios. ¿Hay algo más en lo que pueda ayudar?'
        : 'Understood. I have applied the changes. Is there anything else I can help with?';

      if (wantsExerciseRec && motorExerciseDefinitions.length) {
        const technical = motorExerciseDefinitions.filter((d) => d.objective === 'technique').slice(0, 3);
        const names = technical.map((d) => d.displayName).join(', ');
        const vec = technical[0] ? buildExerciseFeatureVector(technical[0]) : null;
        reply = isEs
          ? `Catálogo WL (${motorExerciseDefinitions.length} defs). Sugerencia técnica: ${names}. Reglas activas: ${exerciseRelationships.filter((r) => r.isActive).length}. Feature vector dims: ${vec ? Object.keys(vec.familyOneHot).length : 0} familias.`
          : `WL catalog (${motorExerciseDefinitions.length} defs). Technical picks: ${names}. Active rules: ${exerciseRelationships.filter((r) => r.isActive).length}. Feature vector families: ${vec ? Object.keys(vec.familyOneHot).length : 0}.`;
      }

      const newAiMsg: Message = {
        id: msgIdRef.current++,
        sender: 'ai',
        text: reply,
      };
      setMessages((prev) => [...prev, newAiMsg]);
    }, 1000);
  };

  const handleAction = (actionStr: string) => {
    const newUserMsg: Message = {
      id: msgIdRef.current++,
      sender: 'user',
      text: actionStr,
    };
    setMessages((prev) => [...prev, newUserMsg]);

    if (actionStr.toLowerCase().includes('deload') || actionStr.toLowerCase().includes('descarga')) {
      applyDeload();
    } else if (actionStr.toLowerCase().includes('volum')) {
      reduceVolume();
    } else {
      reduceVolume();
    }

    setTimeout(() => {
      const newAiMsg: Message = {
        id: msgIdRef.current++,
        sender: 'ai',
        text: isEs
          ? `Listo Coach. Se han actualizado los parámetros para el microciclo basados en la acción: "${actionStr}".`
          : `Done Coach. The parameters for the microcycle have been updated based on the action: "${actionStr}".`,
      };
      setMessages((prev) => [...prev, newAiMsg]);
    }, 800);
  };

  const renderExerciseDetail = () => {
    if (!selectedEx) {
      return (
        <div className="chat-info-empty">
          <Info size={48} />
          <h3>{isEs ? 'Selecciona un ejercicio' : 'Select an exercise'}</h3>
          <p>
            {isEs
              ? 'Toca cualquier ejercicio de la biblioteca para ver su análisis técnico.'
              : 'Tap any exercise in the library to see its technical analysis.'}
          </p>
        </div>
      );
    }

    return (
      <div className="exercise-detail-view">
        <div className="exercise-detail-media">
          {selectedEx.image ? (
            <img src={selectedEx.image} alt={selectedEx.name} />
          ) : (
            <div className="exercise-detail-placeholder">
              <Play size={40} color="var(--color-accent)" />
            </div>
          )}
          <div className="exercise-detail-badge">
            {isEs ? 'Video Instructivo' : 'Instructional Video'}
          </div>
        </div>

        <h2 className="exercise-detail-title">{selectedEx.name}</h2>
        <span className="badge">{selectedEx.category}</span>

        <p className="exercise-detail-desc">{selectedEx.description}</p>

        {selectedEx.muscles && (
          <div className="exercise-detail-section">
            <h4>{isEs ? 'Músculos Implicados' : 'Target Muscles'}</h4>
            <div className="exercise-detail-tags">
              {selectedEx.muscles.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        )}

        {selectedEx.cues && (
          <div className="exercise-detail-section">
            <h4>{isEs ? 'Claves Técnicas' : 'Technical Cues'}</h4>
            <ul className="exercise-detail-cues">
              {selectedEx.cues.map((cue, i) => (
                <li key={i}>
                  <CheckCircle2 size={16} color="var(--color-success)" />
                  <span>{cue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const collapseLabel = isEs ? 'Ocultar panel AI' : 'Collapse AI panel';
  const expandLabel = isEs ? 'Mostrar panel AI' : 'Expand AI panel';

  if (showDesktopCollapse && desktopCollapsed) {
    return (
      <div className="chat-panel chat-panel--rail">
        <button
          type="button"
          className="chat-rail-expand"
          onClick={onToggleDesktopCollapse}
          aria-expanded={false}
          aria-label={expandLabel}
          title={expandLabel}
        >
          <ChevronLeft size={22} strokeWidth={2.25} />
        </button>
        <div className="chat-rail-bot" aria-hidden>
          <Bot size={20} />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-header-tabs">
          <button
            type="button"
            className={`chat-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={18} />
            <span>{isEs ? 'Chat AI' : 'AI Chat'}</span>
          </button>
          <button
            type="button"
            className={`chat-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <Info size={18} />
            <span>{isEs ? 'Análisis' : 'Analysis'}</span>
          </button>
        </div>
        <div className="chat-header-trailing">
          {showDesktopCollapse && (
            <button
              type="button"
              className="chat-header-collapse"
              onClick={onToggleDesktopCollapse}
              aria-expanded
              aria-label={collapseLabel}
              title={collapseLabel}
            >
              <ChevronRight size={20} strokeWidth={2.25} />
            </button>
          )}
          <span className="status-dot" aria-hidden />
        </div>
      </div>

      <div className="chat-body">
        {activeTab === 'chat' ? (
          <>
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                  <div className="message-bubble">
                    <div className="message-sender">
                      {msg.sender === 'ai' ? <Bot size={14} /> : <User size={14} />}
                      <span>{msg.sender === 'ai' ? 'Wolf AI' : 'Coach'}</span>
                    </div>
                    <p className="message-text">{msg.text}</p>
                  </div>

                  {msg.actions && msg.actions.length > 0 && (
                    <div className="action-buttons">
                      {msg.actions.map((action, idx) => (
                        <button key={idx} type="button" className="action-btn" onClick={() => handleAction(action)}>
                          {action}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="chat-input-area">
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder={isEs ? 'Pregúntale a tu Coach IA...' : 'Ask your AI Coach...'}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button type="button" className="send-btn" onClick={handleSend}>
                  <Send size={18} />
                </button>
              </div>
              <div className="prompt-suggestions">
                <span
                  className="suggestion"
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setInputText(isEs ? 'Convierte este mesociclo en peaking' : 'Convert this mesocycle to peaking')
                  }
                  onKeyDown={(e) =>
                    e.key === 'Enter' &&
                    setInputText(isEs ? 'Convierte este mesociclo en peaking' : 'Convert this mesocycle to peaking')
                  }
                >
                  {isEs ? '"Convierte este mesociclo en peaking"' : '"Convert this mesocycle to peaking"'}
                </span>
              </div>
            </div>
          </>
        ) : (
          renderExerciseDetail()
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
