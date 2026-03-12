"use client";

import React, { useState } from "react";
import { 
  Terminal, 
  Settings, 
  Shield, 
  Activity, 
  Zap, 
  Puzzle,
  CheckCircle2,
  AlertCircle,
  BrainCircuit
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OuwiboApp() {
  const [activeTab, setActiveTab] = useState("terminal");

  return (
    <div className="flex h-screen bg-[#050505] text-[#ededed] overflow-hidden font-sans">
      
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 border-r border-white/5 bg-[#0a0a0a] flex flex-col p-6">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-black font-black shadow-[0_0_20px_rgba(0,242,255,0.3)]">
            O
          </div>
          <div className="hidden lg:block">
            <h1 className="font-bold text-lg tracking-tighter">OUWIBO</h1>
            <p className="text-[10px] text-accent mono tracking-widest uppercase">Integrated_AI</p>
          </div>
        </div>

        <nav className="flex-1 w-full space-y-2">
          <SideItem icon={<Terminal size={20}/>} label="Terminal" active={activeTab === "terminal"} onClick={() => setActiveTab("terminal")} />
          <SideItem icon={<Puzzle size={20}/>} label="Integrations" active={activeTab === "integrations"} onClick={() => setActiveTab("integrations")} />
          <SideItem icon={<Shield size={20}/>} label="System Vault" active={activeTab === "vault"} onClick={() => setActiveTab("vault")} />
        </nav>

        <div className="hidden lg:block pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-2 bg-accent/5 rounded-xl border border-accent/10">
            <Activity size={14} className="text-accent animate-pulse" />
            <span className="text-[10px] mono text-accent tracking-tighter uppercase">Nexus_Stable</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#050505]">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20 backdrop-blur-xl">
          <div className="flex items-center gap-4 text-[10px] mono text-zinc-500 uppercase tracking-widest">
            <span className="flex items-center gap-2 text-green-500">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
              Link_Established
            </span>
            <span className="opacity-30">/</span>
            <span>Auth: Operator_Root</span>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-900/50 px-4 py-1.5 rounded-full border border-white/5">
            <BrainCircuit size={14} className="text-accent" />
            <span className="text-xs font-bold mono">MULTI_MODEL_SYNC</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <AnimatePresence mode="wait">
            {activeTab === "terminal" && <TerminalTab key="term" />}
            {activeTab === "integrations" && <IntegrationsTab key="int" />}
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
      className={`flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all ${
        active ? 'bg-accent/10 text-accent border border-accent/20' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
      }`}
    >
      {icon}
      <span className="text-sm font-semibold hidden lg:block tracking-tight">{label}</span>
    </div>
  );
}

function TerminalTab() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { role: 'agent', content: "Ouwibo Integrated Systems Online. Ready for cross-model commands.", provider: "System" }
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
      setMessages(prev => [...prev, { role: 'agent', content: data.reply, provider: data.provider }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'agent', content: "⚠️ Neural link failed. Check configurations.", provider: "Error" }]);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="flex-1 space-y-6 mb-8 overflow-y-auto scrollbar-hide">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-6 rounded-2xl border ${
              m.role === 'user' 
                ? 'bg-zinc-900 border-white/5 rounded-tr-none text-zinc-300' 
                : 'bg-accent/5 border-accent/20 rounded-tl-none text-zinc-100 shadow-[0_0_30px_rgba(0,242,255,0.03)]'
            }`}>
              {m.role === 'agent' && <div className="text-[8px] mono uppercase text-accent mb-2 tracking-[0.2em] font-black">Brain_Node: {m.provider}</div>}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative group">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Command your integrated intelligence..."
          className="w-full bg-[#0a0a0a] border border-white/10 rounded-2xl py-5 px-8 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm group-hover:border-white/20 shadow-2xl"
        />
        <button onClick={handleSend} className="absolute right-4 top-4 bottom-4 bg-accent text-black font-bold px-8 rounded-xl hover:brightness-110 active:scale-95 transition-all">
          TRANSMIT
        </button>
      </div>
    </motion.div>
  );
}

function IntegrationsTab() {
  const skills = [
    { name: "Google Gemini", desc: "Primary brain for logic & structured data", status: "Active", icon: "🌐" },
    { name: "Mistral AI", desc: "Elite fallback brain for complex reasoning", status: "Active", icon: "💎" },
    { name: "Hugging Face", desc: "Llama 3.1 & Open Source model gateway", status: "Active", icon: "🤖" },
    { name: "CoinGecko API", desc: "Real-time market data ingestion", status: "Ready", icon: "📊" },
    { name: "Telegram Bot", desc: "Instant alert & notification system", status: "Ready", icon: "📱" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="col-span-full mb-6">
        <h2 className="text-2xl font-bold tracking-tight mb-2 uppercase italic text-zinc-100">Core_Integrations</h2>
        <p className="text-zinc-500 text-sm">Ouwibo Agent is currently synchronized with the following neural nodes.</p>
      </div>
      
      {skills.map((s, i) => (
        <div key={i} className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl flex items-start gap-6 hover:border-accent/30 transition-all cursor-default">
          <div className="text-3xl bg-zinc-900 w-14 h-14 rounded-2xl flex items-center justify-center border border-white/5">{s.icon}</div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-zinc-100">{s.name}</h3>
              <span className="text-[10px] mono bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 uppercase font-black tracking-widest">{s.status}</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">{s.desc}</p>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
