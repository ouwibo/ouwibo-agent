"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  Terminal as TerminalIcon, 
  Cpu, 
  ExternalLink, 
  History, 
  Menu, 
  X,
  Send,
  MoreVertical,
  Hash
} from 'lucide-react';

export default function OpenClawChatSession() {
  const [messages, setMessages] = useState([
    { role: 'agent', content: "Gateway established. Ouwibo Agent is ready to assist.", time: '12:00 PM' }
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages([...messages, { role: 'user', content: input, time }]);
    setInput("");
    
    // Simulate agent response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: "Processing request through neural gateway...", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-[#050505] text-[#ededed] font-mono overflow-hidden selection:bg-primary/30">
      
      {/* Sidebar - Sessions */}
      <aside className="w-72 border-r border-border bg-[#080808] flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black shadow-[0_0_15px_rgba(226,61,40,0.3)] text-xs">O</div>
            <span className="font-black tracking-tighter uppercase text-sm italic">Ouwibo_Agent</span>
          </div>
          <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors">
            <Settings size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <div className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-4 px-2">Sessions</div>
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl mb-2 group transition-all">
              <Plus size={16} className="group-hover:rotate-90 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-tighter italic">New_Session</span>
            </button>
            <SessionItem active label="main_agent_chat" time="now" />
            <SessionItem label="market_analysis_v1" time="2h" />
            <SessionItem label="system_diagnostic" time="5h" />
          </div>

          <div>
            <div className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-4 px-2">Connected_Agents</div>
            <div className="space-y-1">
              <AgentItem name="PRIME_ROOT" status="online" />
              <AgentItem name="MARKET_GEN" status="standby" />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group hover:border-primary/20 cursor-pointer transition-all">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">O</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black truncate text-zinc-300">@ouwibo</p>
              <p className="text-[8px] text-zinc-600 truncate uppercase">Level: Administrator</p>
            </div>
            <ExternalLink size={12} className="text-zinc-700" />
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col relative bg-background">
        
        {/* Chat Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em]">
            <span className="flex items-center gap-2 text-primary">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#E23D28]" />
              SESSION: MAIN_THREAD
            </span>
            <span className="opacity-20">/</span>
            <span className="flex items-center gap-2">
              <Cpu size={12} />
              MODEL: GEMINI_1.5_PRO
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-600 hover:text-white transition-colors"><History size={18}/></button>
            <button className="p-2 text-zinc-600 hover:text-white transition-colors"><MoreVertical size={18}/></button>
          </div>
        </header>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-8 scrollbar-hide">
          <div className="max-w-4xl mx-auto space-y-8">
            {messages.map((m, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-6 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg border ${
                  m.role === 'agent' 
                    ? 'bg-primary/10 border-primary/20 text-primary shadow-[0_0_20px_rgba(226,61,40,0.05)]' 
                    : 'bg-zinc-900 border-border text-zinc-500'
                }`}>
                  {m.role === 'agent' ? '🦞' : '👤'}
                </div>
                <div className={`flex flex-col space-y-2 max-w-2xl ${m.role === 'user' ? 'items-end' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-zinc-500 italic tracking-widest">
                      {m.role === 'agent' ? 'Ouwibo_Agent' : 'Operator_Root'}
                    </span>
                    <span className="text-[9px] text-zinc-700">{m.time}</span>
                  </div>
                  <div className={`p-5 rounded-2xl border leading-relaxed text-sm ${
                    m.role === 'agent' 
                      ? 'bg-white/[0.02] border-border text-zinc-200' 
                      : 'bg-primary/5 border-primary/20 text-zinc-100 shadow-[0_0_30px_rgba(226,61,40,0.02)]'
                  }`}>
                    {m.content}
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-6 lg:p-12 pt-0 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-4xl mx-auto">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-[#0a0a0a] border border-border rounded-2xl p-2 pl-6 focus-within:border-primary/50 transition-all shadow-2xl">
                <input 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Transmit neural command..."
                  className="flex-1 bg-transparent border-none outline-none text-sm py-3 text-zinc-100 placeholder:text-zinc-800"
                />
                <button 
                  onClick={handleSend}
                  className="bg-primary hover:bg-primary/90 text-white p-3 rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(226,61,40,0.3)]"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
            <div className="mt-4 flex justify-center gap-6 text-[9px] font-bold text-zinc-700 uppercase tracking-[0.2em] italic">
              <span>Latency: 14ms</span>
              <span>•</span>
              <span>Encryption: AES-256</span>
              <span>•</span>
              <span>Status: Synchronized</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

function SessionItem({ label, active = false, time }: any) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl cursor-pointer transition-all group ${
      active ? 'bg-white/5 text-zinc-100 border border-border' : 'text-zinc-600 hover:bg-white/[0.02] hover:text-zinc-400'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <Hash size={12} className={active ? 'text-primary' : 'text-zinc-800'} />
        <span className="text-[11px] font-bold truncate tracking-tight">{label}</span>
      </div>
      <span className="text-[9px] mono opacity-0 group-hover:opacity-100 transition-opacity uppercase">{time}</span>
    </div>
  );
}

function AgentItem({ name, status }: any) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer hover:bg-white/[0.02] transition-all group">
      <div className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-zinc-800'}`} />
      <span className="text-[10px] font-black text-zinc-500 group-hover:text-zinc-300 tracking-widest">{name}</span>
    </div>
  );
}
