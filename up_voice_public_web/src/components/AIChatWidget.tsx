import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
const CAMPUS_MAP_PATH = '/static/campus_map.jpg';

const LOCATION_KEYWORDS = [
  'อยู่ไหน',
  'อยู่ตรงไหน',
  'ไปยังไง',
  'ไปทางไหน',
  'ตั้งอยู่ตรงไหน',
  'ทางไป',
  'แผนที่',
  'แผนผัง',
  'อาคาร',
  'ตึก',
  'คณะ',
  'วิทย์',
  'ตึกวิทย์',
  'สงวน',
  'ตึกสงวน',
  'ตึกรวม',
  'อาคารเรียนรวม',
  'เรียนรวม',
  'บรรยายรวม',
  'อาคารบรรยายรวม',
  'ประตู',
  'ประตู1',
  'ประตู2',
  'ประตู3',
  'ประตู 1',
  'ประตู 2',
  'ประตู 3',
  'ประตูสาม',
  'ประตูสอง',
  'ประตูหนึ่ง',
  'gate 1',
  'gate 2',
  'gate 3',
  'ict',
  'ไอซีที',
  'สำนัก',
  'โรงพยาบาล',
  'หอ',
  'โรงอาหาร',
  'ce',
  'ub',
  'pk'
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

interface AIExtractedData {
  title?: string;
  description?: string;
  category_id?: number | string;
  category_name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  location_confidence?: number;
  needs_location_confirmation?: boolean;
  map_image?: string;
}

interface AIChatResponseData {
  reply?: string;
  intent?: 'report_issue' | 'location_inquiry' | 'general_inquiry';
  is_complete?: boolean;
  is_inquiry?: boolean;
  map_image?: string;
  extracted_data?: AIExtractedData;
}

interface AIChatResponse {
  success: boolean;
  data: AIChatResponseData;
}

interface AICompletionData {
  description: string;
  title: string;
  category_id?: number | string;
  category_name?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  location_confidence?: number;
  needs_location_confirmation?: boolean;
  is_inquiry: boolean;
}

interface AIChatWidgetProps {
  onComplete: (data: AICompletionData) => void;
}

const isLocationQuery = (text: string, customKeywords?: string[]) => {
  const lower = text.toLowerCase();
  const validCustom = (customKeywords || []).filter(k => k && !k.includes(''));
  const keywords = Array.from(new Set([...LOCATION_KEYWORDS, ...validCustom]));
  return keywords.some(keyword => keyword && lower.includes(keyword.toLowerCase()));
};

const toAbsoluteUrl = (rawUrl?: string) => {
  if (!rawUrl) return undefined;

  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl;
  }

  const apiRoot = API_BASE.replace(/\/api\/v1\/?$/, '');
  return `${apiRoot}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
};

export default function AIChatWidget({ onComplete }: AIChatWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'กำลังโหลดข้อมูล...' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapConfig, setMapConfig] = useState<{ is_auto_map_enabled: boolean; map_trigger_keywords: string[]; default_map_image_url: string }>({
    is_auto_map_enabled: true,
    map_trigger_keywords: LOCATION_KEYWORDS,
    default_map_image_url: CAMPUS_MAP_PATH
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios.get(`${API_BASE}/settings/public-llm-settings`)
      .then(res => {
        const item = res.data?.data?.item;
        if (res.data?.success && item) {
          if (item.chatbot_opening_message) {
            setMessages([{ role: 'assistant', content: item.chatbot_opening_message }]);
          } else {
            setMessages([{ role: 'assistant', content: 'สวัสดีครับ มีปัญหาหรือข้อร้องเรียนอะไร แจ้งผมได้เลยครับ' }]);
          }

          setMapConfig({
            is_auto_map_enabled: item.is_auto_map_enabled ?? true,
            map_trigger_keywords: item.map_trigger_keywords || LOCATION_KEYWORDS,
            default_map_image_url: item.default_map_image_url || CAMPUS_MAP_PATH
          });
        } else {
          setMessages([{ role: 'assistant', content: 'สวัสดีครับ มีปัญหาหรือข้อร้องเรียนอะไร แจ้งผมได้เลยครับ' }]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch public LLM settings', err);
        setMessages([{ role: 'assistant', content: 'สวัสดีครับ มีปัญหาหรือข้อร้องเรียนอะไร แจ้งผมได้เลยครับ' }]);
      });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    const userMsg: Message = { role: 'user', content: userText };
    const newMessages = [...messages, userMsg];

    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post<AIChatResponse>(
        `${API_BASE}/problems/ai/chat-assist`,
        {
          messages: newMessages,
          context: {
            page: 'report_issue',
            allow_map_response: mapConfig.is_auto_map_enabled
          }
        },
        { headers }
      );

      if (!res.data.success) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: 'ขออภัยครับ เกิดข้อผิดพลาดในการเชื่อมต่อ' }
        ]);
        return;
      }

      const data = res.data.data || {};
      const replyText =
        data.reply ||
        'ขอบคุณครับ ระบบได้รับข้อมูลแล้ว';

      const combinedText = `${userText} ${replyText}`;
      let rawImgUrl = data.map_image || data.extracted_data?.map_image;

      const isLocationInquiry =
        Boolean(rawImgUrl) ||
        data.intent === 'location_inquiry' ||
        data.is_inquiry === true ||
        isLocationQuery(combinedText, mapConfig.map_trigger_keywords);

      const locationIntent =
        mapConfig.is_auto_map_enabled && isLocationInquiry;

      if (!rawImgUrl && locationIntent) {
        rawImgUrl = mapConfig.default_map_image_url || CAMPUS_MAP_PATH;
      }

      const imgUrl = locationIntent ? toAbsoluteUrl(rawImgUrl) : undefined;

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: replyText,
          image: imgUrl
        }
      ]);

      const extracted = data.extracted_data;

      // สำคัญมาก:
      // ถ้าเป็น inquiry / location question ห้ามเอาไปกรอกฟอร์มแจ้งปัญหา
      const shouldAutofill =
        !isLocationInquiry &&
        Boolean(data.is_complete) &&
        Boolean(extracted) &&
        !data.is_inquiry &&
        data.intent !== 'location_inquiry';

      if (shouldAutofill && extracted) {
        const fallbackDesc = userText;
        const generatedDescription =
          extracted.description?.trim() ||
          fallbackDesc;

        const generatedTitle =
          extracted.title?.trim() ||
          (generatedDescription.length > 60
            ? generatedDescription.substring(0, 60) + '...'
            : generatedDescription);

        onComplete({
          description: generatedDescription,
          title: generatedTitle,
          category_id: extracted.category_id,
          category_name: extracted.category_name,
          location: extracted.location,
          latitude: extracted.latitude,
          longitude: extracted.longitude,
          location_confidence: extracted.location_confidence,
          needs_location_confirmation: extracted.needs_location_confirmation,
          is_inquiry: false
        });
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'ขออภัยครับ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] w-full bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm mt-4">
      <div className="px-4 py-3 border-b border-outline-variant/30 bg-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">smart_toy</span>
        <h3 className="font-label-lg font-bold text-primary">พูดคุยกับ AI เพื่อช่วยกรอกอัตโนมัติ</h3>
      </div>

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

              {msg.image && (
                <div className="mt-3 overflow-hidden rounded-xl border border-outline-variant/40 shadow-sm bg-surface">
                  <div className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold flex items-center gap-1.5 border-b border-outline-variant/20">
                    <span>🗺️</span>
                    <span>ผังแนะนำการเดินทาง (Campus Map)</span>
                  </div>
                  <img
                    src={msg.image}
                    alt="Campus Map"
                    className="w-full h-auto object-cover hover:opacity-95 transition-opacity cursor-pointer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = CAMPUS_MAP_PATH;
                    }}
                    onClick={() => window.open(msg.image, '_blank')}
                  />
                </div>
              )}
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