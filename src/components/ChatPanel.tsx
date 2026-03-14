import React, { useState } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import './ChatPanel.css';
import { useAppContext } from '../context/AppContext';

interface ChatPanelProps {
  language: 'ES' | 'EN';
}

interface Message {
  id: number;
  sender: 'ai' | 'user';
  text: string;
  actions?: string[];
}

const ChatPanel: React.FC<ChatPanelProps> = ({ language }) => {
  const isEs = language === 'ES';
  const { applyDeload, reduceVolume } = useAppContext();
  const [inputText, setInputText] = useState('');
  
  const initialMessages: Message[] = [
    {
      id: 1,
      sender: 'ai',
      text: isEs 
        ? '¡Hola Coach! He analizado los datos del atleta de esta semana. Veo un aumento atípico en la fatiga y el RPE reportado ayer fue 9/10 en sentadillas. ¿Cómo quieres proceder?'
        : 'Hello Coach! I have analyzed the athlete\'s data this week. I see an atypical increase in fatigue and yesterday\'s reported RPE was 9/10 on squats. How would you like to proceed?',
      actions: isEs 
        ? ['Ajustar cargas', 'Reducir volumen', 'Agregar deload'] 
        : ['Adjust loads', 'Reduce volume', 'Add deload']
    }
  ];

  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    const newUserMsg: Message = {
      id: Date.now(),
      sender: 'user',
      text: inputText
    };
    
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    
    // Simulate AI response
    setTimeout(() => {
      const newAiMsg: Message = {
        id: Date.now() + 1,
        sender: 'ai',
        text: isEs 
          ? 'Entendido. He aplicado los cambios. ¿Hay algo más en lo que pueda ayudar?'
          : 'Understood. I have applied the changes. Is there anything else I can help with?',
      };
      setMessages(prev => [...prev, newAiMsg]);
    }, 1000);
  };

  const handleAction = (actionStr: string) => {
    // Send a message as user when clicking an action
    const newUserMsg: Message = {
      id: Date.now(),
      sender: 'user',
      text: actionStr
    };
    setMessages(prev => [...prev, newUserMsg]);

    // Apply the change
    if (actionStr.toLowerCase().includes('deload') || actionStr.toLowerCase().includes('descarga')) {
      applyDeload();
    } else if (actionStr.toLowerCase().includes('volum')) {
      reduceVolume();
    } else {
      reduceVolume(); // default mock
    }

    // AI confirmation
    setTimeout(() => {
      const newAiMsg: Message = {
        id: Date.now() + 1,
        sender: 'ai',
        text: isEs 
          ? `Listo Coach. Se han actualizado los parámetros para el microciclo basados en la acción: "${actionStr}".`
          : `Done Coach. The parameters for the microcycle have been updated based on the action: "${actionStr}".`,
      };
      setMessages(prev => [...prev, newAiMsg]);
    }, 800);
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-title">
          <Sparkles size={18} className="ai-icon" />
          <h3>{isEs ? 'Coach IA' : 'AI Coach'}</h3>
        </div>
        <span className="status-dot"></span>
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
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
                  <button 
                    key={idx} 
                    className="action-btn"
                    onClick={() => handleAction(action)}
                  >
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
          <button className="send-btn" onClick={handleSend}>
            <Send size={18} />
          </button>
        </div>
        <div className="prompt-suggestions">
          <span className="suggestion" onClick={() => setInputText(isEs ? 'Convierte este mesociclo en peaking' : 'Convert this mesocycle to peaking')}>
            {isEs ? '"Convierte este mesociclo en peaking"' : '"Convert this mesocycle to peaking"'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
