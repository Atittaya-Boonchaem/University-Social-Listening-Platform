import React, { FormEvent, useEffect, useRef, useState } from 'react';
import axios from 'axios';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ApiResponse = {
  success: boolean;
  data?: {
    reply: string;
    ready_for_ticket: boolean;
    is_complete: boolean;
    missing_fields: string[];
    extracted_data: {
      what?: string;
      building?: string;
      room?: string;
      impact?: string;
      location?: string;
      description?: string;
      title?: string;
    };
  };
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'สวัสดีครับ ผมคือ AI ช่วยรวบรวมรายละเอียดปัญหา\\nบอกปัญหาที่พบมาได้เลยครับ',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();

    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: 'user' as const, content: text }];

    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post<ApiResponse>(`${API_URL}/api/chat`, {
        messages: nextMessages,
      });

      const data = response.data.data;

      if (!data) {
        throw new Error('ไม่มีข้อมูลตอบกลับจาก Backend');
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.reply,
        },
      ]);

      // แสดงผลลัพธ์สุดท้ายด้านล่างเฉพาะเมื่อ Backend บอกว่า "ครบแล้ว"
      if (data.is_complete && data.ready_for_ticket) {
        setResult(data.extracted_data.description || '');
      }
    } catch (error) {
      console.error(error);
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content:
            'ไม่สามารถเชื่อมต่อ Backend ได้ครับ กรุณาตรวจสอบว่า Backend เปิดอยู่ที่ http://localhost:8000',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="chat-card">
        <header className="chat-header">
          <div className="bot-icon">🤖</div>
          <div>
            <h1>พูดคุยกับ AI เพื่อแจ้งปัญหา</h1>
            <p>AI จะถามข้อมูลที่ยังขาดก่อนสร้างรายละเอียดปัญหา</p>
          </div>
        </header>

        <div className="messages">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`row ${message.role === 'user' ? 'user' : 'assistant'}`}
            >
              <div className={`bubble ${message.role}`}>
                {message.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="row assistant">
              <div className="bubble assistant">กำลังรวบรวมข้อมูล...</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <form className="composer" onSubmit={sendMessage}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="พิมพ์ปัญหาที่พบ..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            ส่ง
          </button>
        </form>
      </section>

      {result && (
        <section className="result-card">
          <h2>รายละเอียดปัญหาที่ AI รวบรวม</h2>
          <textarea value={result} readOnly />
        </section>
      )}
    </main>
  );
}
