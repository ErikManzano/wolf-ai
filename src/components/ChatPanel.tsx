import React, { useMemo, useState } from 'react';
import { Bot, Send, User, X } from 'lucide-react';
import './ChatPanel.css';

interface ChatPanelProps {
  language: 'ES' | 'EN';
  variant?: 'panel' | 'drawer';
  onClose?: () => void;
}

interface Message {
  id: number;
  sender: 'assistant' | 'user';
  text: string;
  actions?: string[];
}

/**
 * Honest coaching tips panel — NOT generative AI.
 * See docs/IA_STRATEGY.md: we do not fake athlete analysis until real action-layer AI ships.
 */
const ChatPanel: React.FC<ChatPanelProps> = ({
  language,
  variant = 'panel',
  onClose,
}) => {
  const isEs = language === 'ES';
  const isDrawer = variant === 'drawer';
  const [inputText, setInputText] = useState('');

  const tips = useMemo(
    () =>
      isEs
        ? [
            'Duplica una semana desde el editor (icono calendario) para clonar microciclos sin regenerar contenido.',
            'Copia un día a otra semana con el atajo «Copiar día a…» (formato semana.día, p. ej. 4.2).',
            'Las estadísticas del día muestran tonnage y K-value — úsalas antes de subir intensidad.',
            'Invita atletas desde Atletas → Añadir; en Free el límite es 3 atletas.',
          ]
        : [
            'Duplicate a week from the editor (calendar icon) to clone microcycles without regenerating content.',
            'Copy a day to another week with “Copy day to…” (week.day format, e.g. 4.2).',
            'Day stats show tonnage and K-value — check them before raising intensity.',
            'Invite athletes from Athletes → Add; Free plan is capped at 3 athletes.',
          ],
    [isEs],
  );

  const initialMessages: Message[] = useMemo(
    () => [
      {
        id: 1,
        sender: 'assistant',
        text: isEs
          ? 'Hola Coach. Soy el asistente de tips de Wolf (aún sin IA generativa). Elige un tip o pregunta por funciones del editor.'
          : 'Hi Coach. I’m the Wolf tips assistant (no generative AI yet). Pick a tip or ask about editor features.',
        actions: isEs
          ? ['Duplicar semana', 'Copiar día', 'K-value', 'Límite Free']
          : ['Duplicate week', 'Copy day', 'K-value', 'Free limit'],
      },
    ],
    [isEs],
  );

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const msgIdRef = React.useRef(2);

  React.useEffect(() => {
    setMessages(initialMessages);
    msgIdRef.current = 2;
  }, [initialMessages]);

  const tipReply = (query: string): string => {
    const lower = query.toLowerCase();
    if (lower.includes('duplic') || lower.includes('semana') || lower.includes('week')) {
      return tips[0]!;
    }
    if (lower.includes('copiar') || lower.includes('copy') || lower.includes('día') || lower.includes('day')) {
      return tips[1]!;
    }
    if (lower.includes('k-value') || lower.includes('k value') || lower.includes('tonnage') || lower.includes('stat')) {
      return tips[2]!;
    }
    if (lower.includes('free') || lower.includes('límite') || lower.includes('limit') || lower.includes('pro') || lower.includes('atleta')) {
      return tips[3]!;
    }
    return isEs
      ? 'Todavía no hay IA que analice fatiga o cambie tu programa. Tips disponibles: duplicar semana, copiar día, K-value, plan Free. La IA con acciones reales llegará cuando pase el criterio de docs/IA_STRATEGY.md.'
      : 'There is no AI that analyzes fatigue or edits your program yet. Available tips: duplicate week, copy day, K-value, Free plan. Real action-layer AI ships when we meet docs/IA_STRATEGY.md.';
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const userId = msgIdRef.current++;
    const text = inputText.trim();
    setMessages((prev) => [...prev, { id: userId, sender: 'user', text }]);
    setInputText('');
    const replyId = msgIdRef.current++;
    setMessages((prev) => [
      ...prev,
      { id: replyId, sender: 'assistant', text: tipReply(text) },
    ]);
  };

  const handleAction = (actionStr: string) => {
    setMessages((prev) => [
      ...prev,
      { id: msgIdRef.current++, sender: 'user', text: actionStr },
      { id: msgIdRef.current++, sender: 'assistant', text: tipReply(actionStr) },
    ]);
  };

  return (
    <div className={`chat-panel${isDrawer ? ' chat-panel--drawer' : ''}`}>
      <div className="chat-header">
        <div className="chat-header-title">
          <Bot size={18} aria-hidden />
          <span>{isEs ? 'Asistente (tips)' : 'Tips assistant'}</span>
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
        </div>
      </div>

      <div className="chat-body">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.sender === 'assistant' ? 'ai' : 'user'}`}>
              <div className="message-bubble">
                <div className="message-sender">
                  {msg.sender === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                  <span>{msg.sender === 'assistant' ? (isEs ? 'Tips' : 'Tips') : 'Coach'}</span>
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
              placeholder={isEs ? 'Pregunta por una función del editor…' : 'Ask about an editor feature…'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button type="button" className="send-btn" onClick={handleSend}>
              <Send size={18} />
            </button>
          </div>
          <p className="prompt-suggestions" style={{ opacity: 0.75, fontSize: '0.75rem' }}>
            {isEs
              ? 'Sin análisis inventado. Sin mutaciones de programa. Ver docs/IA_STRATEGY.md.'
              : 'No invented analysis. No program mutations. See docs/IA_STRATEGY.md.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
