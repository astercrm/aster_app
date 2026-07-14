{/* Chatbot.tsx /import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Bot, User, Sparkles, Loader2, Phone, MessageSquare } from 'lucide-react';
import { MOCK_CONTACTS } from '../mockData';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  contacts?: any[];
}

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your ASTER AI assistant. I can help you find contacts, get department info, or answer questions about the team. How can I help you today?",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `
            You are a helpful AI assistant for ASTER, an employee contact management system.
            You have access to a directory of employees.
            When asked about employees, departments, or locations, provide helpful information.
            If the user asks for a specific person or group, you can suggest that you've found them.
            
            Current directory context (sample): ${JSON.stringify(MOCK_CONTACTS.slice(0, 20).map(c => ({
              name: c.customerName,
              staff: c.teleCallingStaff,
              service: c.customerRequirement
            })))}
            Total contacts in system: 100.
            
            Always be professional, concise, and helpful.
          `
        }
      });

      const response = await chat.sendMessage({ message: input });
      const text = response.text;

      // Extract potential contact matches for the UI
      const lowerInput = (input || '').toLowerCase();
      const matches = MOCK_CONTACTS.filter(c => 
        (c.customerName || '').toLowerCase().includes(lowerInput) || 
        (c.teleCallingStaff || '').toLowerCase().includes(lowerInput)
      ).slice(0, 3);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text,
        timestamp: new Date(),
        contacts: matches.length > 0 ? matches : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chatbot Error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again later.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500">
      <header className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Bot size={22} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">ASTER AI</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              <span className="text-[10px] text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors">
          <Sparkles size={20} />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30 dark:bg-slate-900/50">
        {messages.map((msg) => (
          <div key={msg.id} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary" : "bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 shadow-sm"
            )}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={cn("max-w-[80%] space-y-3", msg.role === 'user' ? "text-right" : "text-left")}>
              <div className={cn(
                "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                msg.role === 'user' 
                  ? "bg-primary text-white rounded-tr-none" 
                  : "bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 border border-gray-100 dark:border-slate-700 rounded-tl-none"
              )}>
                {msg.content}
              </div>
              
              {msg.contacts && msg.contacts.length > 0 && (
                <div className="grid grid-cols-1 gap-2 mt-3">
                  {msg.contacts.map(contact => (
                    <div key={contact.id} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary flex items-center justify-center font-bold text-xs">
                          {(contact.customerName || '').split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-gray-900 dark:text-white">{contact.customerName}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <a href={`tel:${contact.customerContactNumber}`} className="p-1.5 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 text-primary dark:text-primary transition-colors">
                          <Phone size={14} />
                        </a>
                        <a href={`https://wa.me/${(contact.customerContactNumber || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="p-1.5 rounded-md hover:bg-primary/10 dark:hover:bg-primary/20 text-primary dark:text-primary transition-colors">
                          <MessageSquare size={14} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 shadow-sm flex items-center justify-center">
              <Bot size={16} />
            </div>
            <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-100 dark:border-slate-700 shadow-sm">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-slate-600 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-300 dark:bg-slate-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800">
        <div className="relative flex items-center gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..." 
            className="flex-1 bg-gray-50 dark:bg-slate-800 border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none dark:text-white"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-primary text-white p-3 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
*/}
// Chatbot section removed as requested.
export default function Chatbot() {
  return null;
}