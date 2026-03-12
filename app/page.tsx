"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Settings, 
  Cpu, 
  Send,
  Activity,
  LayoutDashboard,
  Puzzle,
  ChevronRight,
  Info,
  ShieldCheck,
  Zap,
  Terminal as TerminalIcon
} from 'lucide-react';
import IntegrationGrid from '@/components/IntegrationGrid';
import Overview from '@/components/Overview';

export default function OuwiboApp() {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState([
    { role: 'agent', content: "Gateway established. Ouwibo Agent is ready to assist.", time: '12:00 PM', provider: 'System' }
  ]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg, time, provider: 'User' }]);
    setInput("");
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: data.reply, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: data.provider || 'UNKNOWN'
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: "⚠️ Neural link failed. Gateway unreachable.", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'System Error'
      }]);
    }
  };

  return (
    <div className="flex h-screen bg-transparent text-foreground font-sans overflow-hidden selection:bg-primary/30">
      
      {/* COLUMN 1: NAVIGATION */}
      <aside className="w-64 border-r border-border bg-[#050505]/60 backdrop-blur-xl flex flex-col hidden xl:flex z-20">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black shadow-neon text-xs">O</div>
            <span className="font-bold tracking-tight uppercase text-sm">Ouwibo</span>
          </div>
          <button onClick={() => toast("Settings module accessed.")} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors">
            <Settings size={16} />
          </button>
        </div>

        <nav className="p-4 space-y-1 flex-1">
          <NavItem icon={<LayoutDashboard size={16}/>} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavItem icon={<TerminalIcon size={16}/>} label="Neural Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
          <NavItem icon={<Puzzle size={16}/>} label="Integrations" active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} />
        </nav>

        <div className="p-4 border-t border-border">
          <div onClick={() => toast.success("Root Administrator verified.")} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-border group hover:border-primary/20 cursor-pointer transition-all glass-card">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">O</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold truncate text-zinc-300">@ouwibo</p>
              <p className="text-[8px] text-zinc-600 truncate uppercase tracking-widest">PRIME_ROOT</p>
            </div>
          </div>
        </div>
      </aside>

      {/* COLUMN 2: MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col relative bg-transparent z-10 border-r border-border">
        
        {/* Header Bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/20 backdrop-blur-md z-10">
          <div className="flex items-center gap-4 text-xs text-zinc-400 font-medium">
            <span className="flex items-center gap-2 text-primary">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#E23D28]" />
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-border text-[10px] mono text-zinc-400 glass-card">
              <Activity size={12} className="text-primary" />
              Status: Operational
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' ? (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto space-y-8 pb-32">
                {messages.map((m, i) => (
                  <MessageBubble key={i} {...m} />
                ))}
                <div ref={chatEndRef} />
              </motion.div>
            ) : activeTab === 'overview' ? (
              <motion.div key="over" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-5xl mx-auto">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-zinc-100">System Overview</h2>
                  <p className="text-sm text-zinc-500 mt-1">Monitor the health and performance of your autonomous agent infrastructure.</p>
                </div>
                <Overview />
              </motion.div>
            ) : (
              <motion.div key="int" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-5xl mx-auto">
                <IntegrationGrid />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Input */}
        {activeTab === 'chat' && (
          <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10 bg-gradient-to-t from-background via-background/90 to-transparent z-20">
            <div className="max-w-4xl mx-auto">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center bg-[#0a0a0a]/80 backdrop-blur-xl border border-border rounded-2xl p-2 pl-6 focus-within:border-primary/50 transition-all shadow-2xl">
                  <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Enter command for Ouwibo Agent..."
                    className="flex-1 bg-transparent border-none outline-none text-sm py-3 text-zinc-100 placeholder:text-zinc-600 font-sans"
                  />
                  <button onClick={handleSend} className="bg-primary hover:bg-primary/90 text-white p-3 rounded-xl transition-all active:scale-95 shadow-neon flex items-center justify-center">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* COLUMN 3: SYSTEM INTELLIGENCE */}
      <aside className="w-80 bg-[#050505]/60 backdrop-blur-xl p-6 hidden 2xl:flex flex-col gap-8 z-20">
        <div>
          <h3 className="text-xs font-bold text-zinc-400 mb-4 flex items-center gap-2">
            <Info size={16} /> Connection Info
          </h3>
          <div className="space-y-3">
            <InfoCard label="Model Routing" value="Dynamic Failover" color="text-green-500" />
            <InfoCard label="Environment" value="Vercel Edge" />
            <InfoCard label="Latency" value="< 50ms" />
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold text-zinc-400 mb-4 flex items-center gap-2">
            <ShieldCheck size={16} /> Security
          </h3>
          <div className="space-y-3">
            <div className="p-4 bg-white/5 rounded-xl border border-border border-l-2 border-l-primary glass-card">
              <div className="flex items-center gap-3 mb-1">
                <Zap size={14} className="text-primary" />
                <span className="text-[11px] font-bold text-zinc-200">API Gateway</span>
              </div>
              <p className="text-[10px] text-zinc-500 pl-6">Secured and rate-limited.</p>
            </div>
          </div>
        </div>
      </aside>

    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all group ${
        active ? 'bg-white/5 text-zinc-100 border border-white/10 glass-card font-medium' : 'text-zinc-500 hover:bg-white/[0.02] hover:text-zinc-300'
      }`}
    >
      <div className={`${active ? 'text-primary' : 'text-zinc-600'} transition-colors`}>
        {icon}
      </div>
      <span className="text-sm">{label}</span>
    </div>
  );
}

function InfoCard({ label, value, color = "text-zinc-300" }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-xl border border-border group hover:border-white/10 transition-all glass-card flex justify-between items-center">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className={`text-xs font-semibold ${color}`}>{value}</span>
    </div>
  );
}

function MessageBubble({ role, content, time, provider }: any) {
  const isAgent = role === 'agent';
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 ${!isAgent ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl border ${
        isAgent 
          ? 'bg-primary/10 border-primary/20 shadow-[0_0_20px_rgba(226,61,40,0.05)]' 
          : 'bg-zinc-900 border-border text-zinc-500'
      }`}>
        {isAgent ? '🦍' : '👤'}
      </div>
      <div className={`flex flex-col space-y-1 max-w-2xl ${!isAgent ? 'items-end' : ''}`}>
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs font-semibold text-zinc-400">
            {isAgent ? 'Ouwibo Agent' : 'Operator'}
          </span>
          <span className="text-[10px] text-zinc-600">{time}</span>
        </div>
        <div className={`p-4 rounded-2xl border text-[14px] leading-relaxed ${
          isAgent 
            ? 'bg-white/[0.02] border-border text-zinc-200' 
            : 'bg-zinc-900 border-zinc-800 text-zinc-100'
        }`}>
          {isAgent && provider && <div className="text-[10px] font-mono text-primary mb-2 opacity-80">Provider: {provider}</div>}
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    </motion.div>
  );
}
