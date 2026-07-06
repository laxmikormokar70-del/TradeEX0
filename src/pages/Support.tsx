import React, { useState, useEffect, useRef } from 'react';
import { Headphones, ArrowLeft, Send, MessageSquare, Shield, Clock, X, Bot, User, Sparkles } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMsg {
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export default function SupportPage({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('General');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Live Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      sender: 'bot',
      text: 'Hello! I am Aura, your instant Support Assistant. How can I assist you with platform security, identity KYC, deposits, or withdrawals today?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bot messages
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [chatMessages, isChatOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Mimic API delay
    await new Promise(r => setTimeout(r, 1000));
    setIsSubmitting(false);
    setSubmitted(true);
    setSubject('');
    setMessage('');
    setTimeout(() => setSubmitted(false), 5000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSending) return;

    const userText = chatInput.trim();
    setChatInput('');

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedMessages: ChatMsg[] = [...chatMessages, { sender: 'user', text: userText, time: timeString }];
    setChatMessages(updatedMessages);
    setIsSending(true);

    try {
      const response = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: updatedMessages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      const data = await response.json();
      const botTimeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (data.success && data.reply) {
        setChatMessages(prev => [...prev, {
          sender: 'bot',
          text: data.reply,
          time: botTimeString
        }]);
      } else {
        setChatMessages(prev => [...prev, {
          sender: 'bot',
          text: 'I apologize, but I experienced a network flutter. Could you please specify your question again?',
          time: botTimeString
        }]);
      }
    } catch (err) {
      const botTimeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages(prev => [...prev, {
        sender: 'bot',
        text: 'I am experiencing a momentary server query delay. Please type your message once more.',
        time: botTimeString
      }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto relative">
      <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6 pb-20">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => setActiveTab('more')}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-brand hover:border-brand/40 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Support & Feedback</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                  <MessageSquare size={22} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Open a New Ticket</h3>
              </div>

              {submitted ? (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <Send size={20} />
                  </div>
                  <h4 className="font-bold text-emerald-900">Ticket Submitted Successfully</h4>
                  <p className="text-sm text-emerald-700 mt-1">Our support team will review your inquiry and respond within 24-48 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                      <select 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 focus:outline-none focus:border-orange-500"
                      >
                        <option>General</option>
                        <option>Technical</option>
                        <option>Billing</option>
                        <option>KYC / Compliance</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                      <input 
                        type="text" 
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Account Security"
                        className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Detail</label>
                    <textarea 
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please describe your issue in detail..."
                      className="w-full min-h-[150px] p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-700 focus:outline-none focus:border-orange-500 resize-none"
                    ></textarea>
                  </div>

                  <button 
                    disabled={isSubmitting}
                    className="w-full h-14 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Processing Dispatch...' : 'Dispatch Support Ticket'}
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
              <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-3">Support Metrics</h4>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Response Time</p>
                    <p className="text-sm font-black text-slate-800 mt-1">~12 Hours</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Shield size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Status</p>
                    <p className="text-sm font-black text-emerald-600 mt-1">Operational</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-orange-600 rounded-3xl p-6 text-white space-y-4 shadow-xl shadow-orange-500/30">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-2">
                <Headphones size={20} />
              </div>
              <h4 className="font-bold leading-tight">Need immediate assistance?</h4>
              <p className="text-xs text-orange-50 font-medium leading-relaxed opacity-80">
                Our automated helper is available 24/7 for common questions regarding platform security and withdrawals.
              </p>
              <button 
                onClick={() => setIsChatOpen(true)}
                className="w-full py-3 bg-white text-orange-600 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-orange-50 transition-colors cursor-pointer"
              >
                Start Live Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Interactive Live Chat overlay modal */}
      <AnimatePresence>
        {isChatOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-lg h-[550px] shadow-2xl flex flex-col overflow-hidden border border-slate-100"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-5 text-white flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center relative">
                    <Bot size={22} className="text-white" />
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-orange-500 rounded-full animate-ping"></span>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-orange-500 rounded-full"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-black text-sm uppercase tracking-wider leading-none">Aura Helper</h3>
                      <Sparkles size={11} className="text-amber-300 animate-pulse" />
                    </div>
                    <p className="text-[10px] text-orange-100 font-semibold opacity-90 mt-1">Automated 24/7 Intel Bot</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4.5 bg-slate-50/50">
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/40">
                        <Bot size={15} />
                      </div>
                    )}
                    <div className="flex flex-col max-w-[80%]">
                      <div className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-3xs ${
                        msg.sender === 'user'
                          ? 'bg-orange-500 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                      }`}>
                        {msg.text}
                      </div>
                      <span className={`text-[9px] text-slate-400 mt-1 px-1.5 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                        {msg.time}
                      </span>
                    </div>
                    {msg.sender === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 border border-slate-300/30">
                        <User size={15} />
                      </div>
                    )}
                  </div>
                ))}
                
                {isSending && (
                  <div className="flex items-start gap-2.5 justify-start">
                    <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                      <Bot size={15} />
                    </div>
                    <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-3xs">
                      <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-orange-450 rounded-full animate-bounce delay-100"></span>
                      <span className="w-2 h-2 bg-orange-500 rounded-full animate-bounce delay-200"></span>
                    </div>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
                <input 
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about platform security, deposits, kyc..."
                  className="flex-1 h-12 px-4.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <button 
                  type="submit" 
                  disabled={!chatInput.trim() || isSending}
                  className="w-12 h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
