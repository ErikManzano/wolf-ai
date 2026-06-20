import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  X,
} from 'lucide-react';
import './ChatPanel.css';
import { useAppContext } from '../context/AppContext';
import { useWolfAssign } from '../context/WolfAssignContext';
import { buildExerciseFeatureVector } from '../services/exercise';

interface ChatPanelProps {
  language: 'ES' | 'EN';
  variant?: 'panel' | 'drawer';
  onClose?: () => void;
}

interface Message {
  id: number;
  sender: 'ai' | 'user';
  text: string;
  actions?: string[];
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  language,
  variant = 'panel',
  onClose,
}) => {
  const isEs = language === 'ES';
  const isDrawer = variant === 'drawer';

  const { applyDeload, reduceVolume } = useAppContext();
  const { motorExerciseDefinitions, exerciseRelationships } = useWolfAssign();
  const [inputText, setInputText] = useState('');

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

  useEffect(() => {
    setMessages(initialMessages);
    msgIdRef.current = 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset copy when locale changes
  }, [isEs]);

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

  return (
    <div className={`chat-panel${isDrawer ? ' chat-panel--drawer' : ''}`}>
      <div className="chat-header">
        <div className="chat-header-title">
          <Bot size={18} aria-hidden />
          <span>{isEs ? 'Asistente Wolf AI' : 'Wolf AI assistant'}</span>
        </div>
        <div className="chat-header-trailing">
          {isDrawer && onClose ? (
            <button
              type="button"
              className="chat-header-close"
              onClick={onClose}
              aria-label={isEs ? 'Cerrar asistente' : 'Close assistant'}
              title={isEs ? 'Cerrar' : 'Close'}
            >
              <X size={18} />
            </button>
          ) : null}
          <span className="status-dot" aria-hidden />
        </div>
      </div>

      <div className="chat-body">
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

              {msg.actions && msg.actions.length > 0 ? (
                <div className="action-buttons">
                  {msg.actions.map((action, idx) => (
                    <button key={idx} type="button" className="action-btn" onClick={() => handleAction(action)}>
                      {action}
                    </button>
                  ))}
                </div>
              ) : null}
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
      </div>
    </div>
  );
};

export default ChatPanel;
