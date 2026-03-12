"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Settings, 
  Terminal as TerminalIcon, 
  Cpu, 
  History, 
  Send,
  MoreVertical,
  Hash,
  Activity,
  User,
  LayoutDashboard,
  Puzzle,
  ChevronRight,
  Info,
  ShieldCheck,
  Zap
} from 'lucide-react';
import IntegrationGrid from '@/components/IntegrationGrid';
import Terminal from '@/components/Terminal';
import Overview from '@/components/Overview';

export default function OpenClawClone() {
  const [activeTab, setActiveTab] = useState('chat');
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
    
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: "Processing request through neural gateway...", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      }]);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-background text-foreground font-mono overflow-hidden selection:bg-primary/30">
      
      {/* COLUMN 1: NAVIGATION & SESSIONS */}
      <aside className="w-64 border-r border-border bg-[#080808] flex flex-col hidden xl:flex">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black shadow-neon text-xs">O</div>
            <span className="font-black tracking-tighter uppercase text-sm italic">Ouwibo</span>
          </div>
          <button className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors">
            <Settings size={16} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          <NavItem icon={<LayoutDashboard size={16}/>} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavItem icon={<MessageSquare size={16}/>} label="Neural Chat" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
          <NavItem icon={<Puzzle size={16}/>} label="Integrations" active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} />
          <NavItem icon={<TerminalIcon size={16}/>} label="Raw Logs" active={activeTab === 'terminal'} onClick={() => setActiveTab('terminal')} />
        </nav>

        <div className="flex-1 overflow-y-auto p-4 border-t border-border mt-4">
          <div className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] mb-4 px-2">Active_Sessions</div>
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl mb-4 group transition-all">
            <Plus size={14} className="group-hover:rotate-90 transition-transform" />
            <span className="text-[10px] font-bold uppercase tracking-tighter italic">New_Session</span>
          </button>
          <SessionItem active label="main_orchestrator" time="now" />
          <SessionItem label="dev_sandbox_01" time="2h" />
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-border group hover:border-primary/20 cursor-pointer transition-all">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">O</div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black truncate text-zinc-300">@ouwibo</p>
              <p className="text-[8px] text-zinc-600 truncate uppercase">Level: PRIME_ROOT</p>
            </div>
          </div>
        </div>
      </aside>

      {/* COLUMN 2: MAIN WORKSPACE */}
      <main className="flex-1 flex flex-col relative bg-background border-r border-border">
        
        {/* Header Bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em]">
            <span className="flex items-center gap-2 text-primary">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#E23D28]" />
              {activeTab.toUpperCase()}_NODE
            </span>
            <span className="opacity-20">/</span>
            <span className="flex items-center gap-2">
              <Cpu size={12} />
              MODEL: GEMINI_1.5_PRO
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-border text-[9px] mono text-zinc-500">
              <Activity size={10} className="text-primary" />
              HB: 12MS
            </div>
            <button className="p-2 text-zinc-600 hover:text-white transition-colors"><MoreVertical size={18}/></button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' ? (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto space-y-8">
                {messages.map((m, i) => (
                  <MessageBubble key={i} {...m} />
                ))}
                <div ref={chatEndRef} />
              </motion.div>
            ) : activeTab === 'overview' ? (
              <motion.div key="over" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Overview />
              </motion.div>
            ) : activeTab === 'integrations' ? (
              <motion.div key="int" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <IntegrationGrid />
              </motion.div>
            ) : (
              <motion.div key="term" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full min-h-[500px]">
                <Terminal />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Input (Only visible in chat tab) */}
        {activeTab === 'chat' && (
          <div className="p-6 lg:p-10 pt-0 bg-gradient-to-t from-background via-background to-transparent">
            <div className="max-w-4xl mx-auto">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <div className="relative flex items-center bg-[#0a0a0a] border border-border rounded-2xl p-2 pl-6 focus-within:border-primary/50 transition-all shadow-2xl">
                  <input 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Command Ouwibo Agent..."
                    className="flex-1 bg-transparent border-none outline-none text-sm py-3 text-zinc-100 placeholder:text-zinc-800"
                  />
                  <button onClick={handleSend} className="bg-primary hover:bg-primary/90 text-white p-3 rounded-xl transition-all active:scale-95 shadow-neon">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* COLUMN 3: SYSTEM INTELLIGENCE (OpenClaw Detail Panel) */}
      <aside className="w-80 bg-[#080808] p-6 hidden 2xl:flex flex-col gap-8">
        <div>
          <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] mb-6 flex items-center gap-2">
            <Info size={14} /> System_Intelligence
          </h3>
          <div className="space-y-4">
            <InfoCard label="Neural_Status" value="Synchronized" color="text-green-500" />
            <InfoCard label="Gateway_Node" value="Frankfurt_AWS_01" />
            <InfoCard label="Security_Layer" value="AES-256-GCM" />
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-black uppercase text-zinc-600 tracking-[0.2em] mb-6 flex items-center gap-2">
            <ShieldCheck size={14} /> Active_Safeguards
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-border border-l-2 border-l-primary">
              <Zap size={14} className="text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-zinc-200 uppercase">Rate_Limit_Shield</p>
                <p className="text-[8px] text-zinc-600 uppercase">Status: Monitoring</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <p className="text-[9px] font-black text-primary uppercase mb-2">Build_Manifest</p>
            <p className="text-[8px] text-zinc-500 leading-relaxed uppercase">
              OUWIBO_MASTER_V1.0.0<br/>
              DISTRIBUTED_NEURAL_GATEWAY<br/>
              STABLE_RELEASE_2026
            </p>
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
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all group ${
        active ? 'bg-white/5 text-zinc-100 border border-border' : 'text-zinc-600 hover:bg-white/[0.02] hover:text-zinc-400'
      }`}
    >
      <div className={`${active ? 'text-primary' : 'text-zinc-800'}`}>
        {icon}
      </div>
      <span className="text-[11px] font-bold tracking-tight uppercase italic">{label}</span>
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

function InfoCard({ label, value, color = "text-zinc-300" }: any) {
  return (
    <div className="bg-white/5 p-4 rounded-xl border border-border group hover:border-white/10 transition-colors">
      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xs font-bold uppercase italic tracking-tighter ${color}`}>{value}</p>
    </div>
  );
}

function MessageBubble({ role, content, time }: any) {
  const isAgent = role === 'agent';
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-6 ${!isAgent ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg border ${
        isAgent 
          ? 'bg-primary/10 border-primary/20 text-primary shadow-[0_0_20px_rgba(226,61,40,0.05)]' 
          : 'bg-zinc-900 border-border text-zinc-500'
      }`}>
        {isAgent ? '🦞' : '👤'}
      </div>
      <div className={`flex flex-col space-y-2 max-w-2xl ${!isAgent ? 'items-end' : ''}`}>
        <div className="flex items-center gap-3 px-1">
          <span className="text-[9px] font-black uppercase text-zinc-600 italic tracking-widest">
            {isAgent ? 'Ouwibo_Agent' : 'PRIME_OPERATOR'}
          </span>
          <span className="text-[8px] text-zinc-800 font-bold">{time}</span>
        </div>
        <div className={`p-5 rounded-2xl border leading-relaxed text-[13px] ${
          isAgent 
            ? 'bg-white/[0.02] border-border text-zinc-200' 
            : 'bg-primary/5 border-primary/20 text-zinc-100 shadow-[0_0_30px_rgba(226,61,40,0.02)]'
        }`}>
          {content}
        </div>
      </div>
    </motion.div>
  );
}

function MessageSquare(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
