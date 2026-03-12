"use client";

import React, { useState, useEffect } from "react";
import { 
  Terminal, 
  TrendingUp, 
  Shield, 
  Activity, 
  Zap, 
  Cpu, 
  MessageSquare,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OuwiboApp() {
  const [activeTab, setActiveTab] = useState("terminal");
  const [isOnline, setIsOnline] = useState(true);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      
      {/* Sidebar - Navigation */}
      <aside className="w-20 lg:w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col items-center lg:items-start p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(0,242,255,0.3)]">
            O
          </div>
          <div className="hidden lg:block">
            <h1 className="font-bold text-lg leading-tight tracking-tighter">OUWIBO</h1>
            <p className="text-[10px] text-accent mono tracking-widest uppercase">Agent_Master</p>
          </div>
        </div>

        <nav className="flex-1 w-full space-y-2">
          <SideItem icon={<Terminal size={20}/>} label="Terminal" active={activeTab === "terminal"} onClick={() => setActiveTab("terminal")} />
          <SideItem icon={<TrendingUp size={20}/>} label="Analysis" active={activeTab === "analysis"} onClick={() => setActiveTab("analysis")} />
          <SideItem icon={<Shield size={20}/>} label="Vault" active={activeTab === "vault"} onClick={() => setActiveTab("vault")} />
        </nav>

        <div className="w-full pt-6 border-t border-white/5 space-y-4">
          <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-accent/5 rounded-xl border border-accent/10">
            <Activity size={14} className="text-accent animate-pulse" />
            <span className="text-[10px] mono text-accent">SYSTEM_HEALTH: 100%</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#050505]">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-xl">
          <div className="flex items-center gap-4 text-xs mono text-zinc-500">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              NETWORK: ENCRYPTED
            </span>
            <span className="opacity-30">|</span>
            <span>ID: OWB-PRIME-01</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-full border border-white/5">
              <Zap size={12} className="text-accent" />
              <span className="text-xs font-bold mono">95,234.00 BTC</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === "terminal" && <TerminalTab key="term" />}
            {activeTab === "analysis" && <AnalysisTab key="anal" />}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function SideItem({ icon, label, active, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all group ${
        active ? 'bg-accent/10 text-accent border border-accent/20' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
      }`}
    >
      <div className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
        {icon}
      </div>
      <span className="text-sm font-semibold hidden lg:block tracking-tight">{label}</span>
    </div>
  );
}

function TerminalTab() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: 'agent', content: "Ouwibo Agent Initialized. Waiting for Neural Command..." }
  ]);

  const handleSend = async () => {
    if(!input) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput("");

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'agent', content: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'agent', content: "⚠️ Link failure. System unstable." }]);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto h-full flex flex-col"
    >
      <div className="flex-1 space-y-6 mb-8 pr-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-5 rounded-2xl border ${
              m.role === 'user' 
                ? 'bg-zinc-900 border-white/5 rounded-tr-none text-zinc-300' 
                : 'bg-accent/5 border-accent/20 rounded-tl-none text-zinc-100'
            }`}>
              <p className="text-sm leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Transmit command to Ouwibo..."
          className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all mono text-sm"
        />
        <button 
          onClick={handleSend}
          className="absolute right-3 top-3 bottom-3 bg-accent text-black font-black px-6 rounded-xl hover:brightness-110 transition-all active:scale-95"
        >
          SEND
        </button>
      </div>
    </motion.div>
  );
}

function AnalysisTab() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      <div className="card bg-zinc-900/50 border border-white/5 p-6 rounded-2xl h-64 flex flex-col justify-center items-center text-zinc-500">
        <Globe size={40} className="mb-4 opacity-20" />
        <p className="mono text-[10px] uppercase tracking-widest">Awaiting_Data_Feed</p>
      </div>
      <div className="card bg-zinc-900/50 border border-white/5 p-6 rounded-2xl h-64 flex flex-col justify-center items-center text-zinc-500">
        <Activity size={40} className="mb-4 opacity-20" />
        <p className="mono text-[10px] uppercase tracking-widest">Neural_Scanning...</p>
      </div>
      <div className="card bg-zinc-900/50 border border-white/5 p-6 rounded-2xl h-64 flex flex-col justify-center items-center text-zinc-500">
        <Cpu size={40} className="mb-4 opacity-20" />
        <p className="mono text-[10px] uppercase tracking-widest">Processor_Standby</p>
      </div>
    </motion.div>
  );
}
