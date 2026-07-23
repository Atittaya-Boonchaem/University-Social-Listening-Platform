import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatWidgetProps {
  onComplete: (data: any) => void;
}

export default function AIChatWidget({ onComplete }: AIChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'กำลังโหลดข้อมูล...' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch opening message from public settings
    axios.get(`${API_BASE}/settings/public-llm-settings`)
      .then(res => {
        if (res.data?.success && res.data?.data?.item?.chatbot_opening_message) {
          setMessages([{ role: 'assistant', content: res.data.data.item.chatbot_opening_message }]);
        } else {
          setMessages([{ role: 'assistant', content: 'สวัสดีครับ มีปัญหาหรือข้อร้องเรียนอะไร แจ้งผมได้เลยครับ' }]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch public LLM settings", err);
        setMessages([{ role: 'assistant', content: 'สวัสดีครับ มีปัญหาหรือข้อร้องเรียนอะไร แจ้งผมได้เลยครับ' }]);
      });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = { role: 'user', content: inputText.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const res = await axios.post(`${API_BASE}/problems/ai/chat-assist`, {
        messages: newMessages.filter(m => m.role === 'user' || m.role === 'assistant')
      }, { headers });

      if (res.data.success) {
        const data = res.data.data;
        const replyText = data.reply || 'ขอบคุณครับ ระบบกำลังบันทึกข้อมูลให้';
        setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
        
        // Pass extracted_data or fallback user input so form auto-fills immediately
        const extracted = data.extracted_data || {};
        const fallbackDesc = userMsg.content;
        
        onComplete({
          description: extracted.description || fallbackDesc,
          title: extracted.title || (fallbackDesc.length > 50 ? fallbackDesc.substring(0, 50) + '...' : fallbackDesc),
          category_id: extracted.category_id,
          category_name: extracted.category_name,
          location: extracted.location,
          latitude: extracted.latitude,
          longitude: extracted.longitude,
          location_confidence: extracted.location_confidence,
          needs_location_confirmation: extracted.needs_location_confirmation
        });
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ' }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'ขออภัยครับ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] w-full bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm mt-4">
      {/* Header */}
      <div className="px-4 py-3 border-b border-outline-variant/30 bg-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">smart_toy</span>
        <h3 className="font-label-lg font-bold text-primary">พูดคุยกับ AI เพื่อช่วยกรอกอัตโนมัติ</h3>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[85%] rounded-2xl p-3 ${
                msg.role === 'user' 
                  ? 'bg-primary text-white rounded-br-sm' 
                  : 'bg-surface-variant text-on-surface-variant rounded-bl-sm border border-outline-variant/20 shadow-sm'
              }`}
            >
              <p className="font-body-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface-variant text-on-surface-variant rounded-2xl rounded-bl-sm p-4 border border-outline-variant/20 shadow-sm">
              <div className="flex gap-1.5 items-center h-6">
                <div className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-outline rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-outline rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-surface border-t border-outline-variant/30">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="พิมพ์บอกปัญหาที่นี่..."
            className="w-full bg-surface-container-highest text-on-surface text-body-sm border-none rounded-full py-2.5 pl-4 pr-12 focus:ring-2 focus:ring-primary/50 outline-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            className="absolute right-1 p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:hover:bg-primary flex items-center justify-center h-8 w-8"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
