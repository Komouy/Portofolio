import React, { useState, useEffect, useRef } from 'react';
import { Language, ChatMessage } from '../types';
import { translations, QUICK_REPLIES, SYSTEM_PROMPT } from '../constants/translations';

interface ContactProps {
  lang: Language;
}

export const Contact: React.FC<ContactProps> = ({ lang }) => {
  const t = translations[lang];

  // Chatbot state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const getGreeting = (l: Language) => {
    return l === 'en'
      ? "Hi! I'm KadalApi's AI assistant. Ask me anything about Dhaifan's skills, projects, pricing estimates, or send a consultation form straight to him."
      : "Halo! Saya adalah AI asisten KadalApi. Tanyakan apa saja seputar keahlian, pengalaman, estimasi harga jasa, atau kirimkan form konsultasi langsung ke Dhaifan.";
  };

  useEffect(() => {
    // Initial greeting
    setMessages([
      {
        id: 'greet_1',
        role: 'bot',
        text: getGreeting(lang)
      }
    ]);
  }, [lang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleReset = () => {
    setChatHistory([]);
    setMessages([
      {
        id: `greet_${Date.now()}`,
        role: 'bot',
        text: getGreeting(lang)
      }
    ]);
    setInputVal('');
  };

  const handleSend = async (userText?: string) => {
    const textToSend = (userText || inputVal).trim();
    if (!textToSend || isTyping) return;

    setInputVal('');
    const userMsgId = `user_${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', text: textToSend }]);

    const newHistory = [...chatHistory, { role: 'user', parts: [{ text: textToSend }] }];
    setChatHistory(newHistory);
    setIsTyping(true);

    const isConsultationIntent = /form|formulir|konsultasi|hubungi langsung|kontak dhaifan|kirim pesan/i.test(textToSend);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: newHistory,
          generationConfig: { maxOutputTokens: 512 }
        })
      });

      if (!response.ok) {
        throw new Error('Gagal menghubungi AI');
      }

      const data = await response.json();
      let reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!reply) {
        reply = lang === 'en' ? 'Sorry, I could not understand. Please rephrase.' : 'Maaf, saya tidak mengerti. Silakan ulangi pertanyaan Anda.';
      }

      if (isConsultationIntent && !reply.includes('[SHOW_CONSULTATION_FORM]')) {
        reply += '\n\n[SHOW_CONSULTATION_FORM]';
      }

      setChatHistory((prev) => [...prev, { role: 'model', parts: [{ text: reply }] }].slice(-20));

      const hasForm = reply.includes('[SHOW_CONSULTATION_FORM]');
      const cleanReply = reply.replace(/\[SHOW_CONSULTATION_FORM\]/g, '').trim();

      setMessages((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          role: 'bot',
          text: cleanReply,
          showForm: hasForm
        }
      ]);
    } catch (err) {
      const fallbackMsg =
        lang === 'en'
          ? 'AI assistant connection is busy. You can directly fill out the consultation form below to reach Dhaifan on WhatsApp or Email:'
          : 'Koneksi ke AI asisten sedang sibuk. Namun Anda dapat langsung mengisi formulir konsultasi di bawah ini untuk terhubung ke WhatsApp atau Email Dhaifan:';

      setMessages((prev) => [
        ...prev,
        {
          id: `bot_fallback_${Date.now()}`,
          role: 'bot',
          text: fallbackMsg,
          showForm: true
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderFormattedMarkdown = (text: string) => {
    let html = text
      .replace(/^### (.*$)/gim, '<strong class="chat-md-h3">$1</strong>')
      .replace(/^## (.*$)/gim, '<strong class="chat-md-h2">$1</strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^[•\-\*]\s+(.*)$/gim, '<span class="chat-bullet">•</span> $1')
      .replace(/\n/g, '<br>');

    return { __html: html };
  };

  return (
    <section id="contact">
      <div className="container">
        <div className="contact-wrap reveal-scale in-view">
          <div className="contact-grid">
            {/* Left Contact Links */}
            <div className="contact-copy">
              <div className="eyebrow" style={{ color: 'var(--orange-soft)' }}>
                {t.contact_eyebrow}
              </div>
              <h2>{t.contact_title}</h2>
              <p>{t.contact_sub}</p>
              <div className="contact-links">
                <a className="clink" href="mailto:dhavinal20@gmail.com">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                  dhavinal20@gmail.com
                </a>
                <a className="clink" href="https://github.com/Komouy" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: '#fff' }}>
                    <path d="M12 2a10 10 0 00-3.16 19.5c.5.1.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.1.39-1.99 1.03-2.69-.1-.26-.45-1.29.1-2.68 0 0 .84-.27 2.75 1.02a9.4 9.4 0 015 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.4.2 2.42.1 2.68.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0012 2z" />
                  </svg>
                  github.com/Komouy
                </a>
                <a className="clink" href="https://wa.me/6285862152118" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: '#25D366' }}>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </a>
                <a className="clink" href="https://linktr.ee/kadapapi" target="_blank" rel="noopener">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ color: '#43E660' }}>
                    <path d="M13.736 5.853l4.005-4.177 2.443 2.344-4.229 4.408h5.973v3.359h-6.223l4.35 4.532-2.443 2.344-5.612-5.853-5.612 5.853-2.443-2.344 4.35-4.532h-6.223v-3.359h5.973l-4.229-4.408 2.443-2.344 4.005 4.177v-5.853h3.472v5.853zM10.264 16.586h3.472v7.414h-3.472v-7.414z" />
                  </svg>
                  Linktree
                </a>
              </div>
            </div>

            {/* Right Panel: Embedded AI Chatbot */}
            <div className="contact-right-panel">
              <div className="chat-embed-card" id="chatEmbed">
                {/* Header */}
                <div className="chat-embed-header">
                  <div className="chat-ai-profile">
                    <div className="chat-ai-avatar">
                      <img src="logo.png" alt="KadalApi" className="chat-avatar-img" />
                    </div>
                    <div className="chat-ai-details">
                      <div className="chat-ai-name-row">
                        <h4>KadalApi Assistant</h4>
                      </div>
                      <span className="chat-ai-sub">
                        <span className="status-dot"></span>
                        <span>{t.chat_status_ready}</span>
                      </span>
                    </div>
                  </div>
                  <div className="chat-header-actions">
                    <button
                      type="button"
                      className="chat-reset-btn"
                      id="chatReset"
                      onClick={handleReset}
                      title={t.chat_btn_reset}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                      <span>{t.chat_btn_reset}</span>
                    </button>
                  </div>
                </div>

                {/* Message Log */}
                <div className="chat-embed-messages" id="chatMessages" role="log" aria-live="polite">
                  {messages.map((m) => (
                    <div key={m.id} className={`chat-msg ${m.role === 'user' ? 'user' : ''}`}>
                      <div className="msg-avatar">
                        {m.role === 'user' ? 'U' : <img src="logo.png" alt="KadalApi" className="chat-avatar-img" />}
                      </div>
                      <div className="msg-bubble">
                        <div dangerouslySetInnerHTML={renderFormattedMarkdown(m.text)} />
                        {m.showForm && <ConsultationFormCard lang={lang} />}
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="chat-msg" id="typingIndicator">
                      <div className="msg-avatar">
                        <img src="logo.png" alt="KadalApi" className="chat-avatar-img" />
                      </div>
                      <div className="msg-bubble typing-bubble">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Quick prompt suggestion chips */}
                <div className="chat-gemini-prompts" id="quickReplies">
                  {(QUICK_REPLIES[lang] || QUICK_REPLIES.id).map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="gemini-prompt-chip"
                      onClick={() => handleSend(item.text)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <div className="chat-gemini-input-container">
                  <div className="chat-prompt-pill">
                    <input
                      className="chat-prompt-input"
                      id="chatInput"
                      type="text"
                      placeholder={t.chat_ph}
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="chat-send-btn"
                      id="chatSend"
                      aria-label="Kirim Pesan"
                      disabled={!inputVal.trim() || isTyping}
                      onClick={() => handleSend()}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </button>
                  </div>
                  <div className="chat-disclaimer">{t.chat_disclaimer}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Embedded Consultation Form Component
interface ConsultationFormCardProps {
  lang: Language;
}

const ConsultationFormCard: React.FC<ConsultationFormCardProps> = ({ lang }) => {
  const isEn = lang === 'en';
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [topic, setTopic] = useState(isEn ? 'Modern Website Development' : 'Pembuatan Website Modern');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const validate = () => {
    if (!name.trim() || !contact.trim() || !message.trim()) {
      setStatus({
        type: 'error',
        text: isEn ? 'Please fill in all required fields marked with *' : 'Mohon lengkapi seluruh kolom yang bertanda *'
      });
      return false;
    }
    return true;
  };

  const handleSendWA = () => {
    if (!validate()) return;

    const text = isEn
      ? `Hello Dhaifan, I would like to consult via your portfolio AI form:\n\n*Name:* ${name.trim()}\n*Contact:* ${contact.trim()}\n*Topic:* ${topic}\n\n*Message / Questions:*\n${message.trim()}`
      : `Halo Dhaifan, saya ingin konsultasi dari formulir AI website portofolio Anda:\n\n*Nama:* ${name.trim()}\n*Kontak:* ${contact.trim()}\n*Topik:* ${topic}\n\n*Pesan / Pertanyaan:*\n${message.trim()}`;

    const waUrl = `https://wa.me/6285862152118?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');

    setStatus({
      type: 'success',
      text: isEn ? 'Redirecting to WhatsApp...' : 'Pesan disiapkan dan dialihkan ke WhatsApp Dhaifan.'
    });
  };

  const handleSendEmail = () => {
    if (!validate()) return;

    const subject = isEn ? `[Portfolio Consultation] ${topic} - ${name}` : `[Konsultasi Portofolio] ${topic} - ${name}`;
    const body = isEn
      ? `Hello Dhaifan,\n\nHere is an inquiry submitted from your portfolio website:\n\nName: ${name}\nContact: ${contact}\nTopic: ${topic}\n\nMessage / Questions:\n${message}`
      : `Halo Dhaifan,\n\nBerikut pesan konsultasi dari formulir website portofolio Anda:\n\nNama: ${name}\nKontak: ${contact}\nTopik: ${topic}\n\nPesan / Pertanyaan:\n${message}`;

    const mailtoUrl = `mailto:dhavinal20@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;

    setStatus({
      type: 'success',
      text: isEn ? 'Email client opened to send to dhavinal20@gmail.com' : 'Aplikasi email dibuka untuk mengirimkan pesan ke dhavinal20@gmail.com'
    });
  };

  return (
    <div className="chat-consultation-form-card" style={{ marginTop: '12px' }}>
      <div className="cf-header">
        <div className="cf-title-row">
          <svg className="cf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <h5>{isEn ? 'Consultation & Direct Inquiry Form' : 'Formulir Konsultasi & Tanya Langsung'}</h5>
        </div>
        <span className="cf-badge">{isEn ? 'Sends to WhatsApp / Email' : 'Terkirim ke WhatsApp / Email'}</span>
      </div>

      <div className="cf-body">
        <div className="cf-field">
          <label>
            {isEn ? 'Full Name' : 'Nama Lengkap'} <span className="cf-req">*</span>
          </label>
          <input
            type="text"
            className="cf-input"
            placeholder={isEn ? 'Your name' : 'Nama lengkap Anda'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="cf-field">
          <label>
            {isEn ? 'Your Contact (WhatsApp / Email)' : 'Kontak Anda (WhatsApp / Email)'} <span className="cf-req">*</span>
          </label>
          <input
            type="text"
            className="cf-input"
            placeholder={isEn ? 'e.g. +628... or email@domain.com' : 'Nomor WA atau email Anda'}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
          />
        </div>

        <div className="cf-field">
          <label>{isEn ? 'Topic / Service Needed' : 'Topik Kebutuhan'}</label>
          <div className="cf-radio-group">
            {[
              isEn ? 'Modern Website Development' : 'Pembuatan Website Modern',
              isEn ? 'AI & LLM Integration' : 'Integrasi AI & Large Language Model',
              isEn ? 'Project Consultation & Collaboration' : 'Konsultasi Proyek & Kerjasama',
              isEn ? 'General Question' : 'Pertanyaan Umum Lainnya'
            ].map((item, idx) => (
              <label key={idx} className="cf-radio-item">
                <input
                  type="radio"
                  name="cf-topic"
                  className="cf-radio-input"
                  value={item}
                  checked={topic === item}
                  onChange={() => setTopic(item)}
                />
                <span className="cf-radio-custom"></span>
                <span className="cf-radio-label">{item}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="cf-field">
          <label>
            {isEn ? 'Message / Project Details' : 'Pesan / Detail Kebutuhan'} <span className="cf-req">*</span>
          </label>
          <textarea
            className="cf-input cf-textarea"
            rows={3}
            placeholder={isEn ? 'Describe your project or questions...' : 'Ceritakan ide, pertanyaan, atau kebutuhan project Anda...'}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>

        <div className="cf-actions">
          <button type="button" className="cf-btn cf-btn-wa" onClick={handleSendWA}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span>{isEn ? 'Send to WhatsApp' : 'Kirim ke WhatsApp'}</span>
          </button>
          <button type="button" className="cf-btn cf-btn-email" onClick={handleSendEmail}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
            <span>{isEn ? 'Send to Email' : 'Kirim ke Email'}</span>
          </button>
        </div>

        {status && (
          <div className={`cf-status ${status.type}`} style={{ display: 'block', marginTop: '8px' }}>
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
};
