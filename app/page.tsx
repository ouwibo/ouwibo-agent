"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Puzzle, Terminal as TerminalIcon, Settings, Activity, User, ChevronRight } from 'lucide-react';
import IntegrationGrid from '@/components/IntegrationGrid';
import Terminal from '@/components/Terminal';

export default function OpenClawClone() {
  const [activeTab, setActiveTab] = useState('integrations');

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-[#080808] flex flex-col p-6 hidden lg:flex">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-black font-black shadow-[0_0_15px_rgba(0,240,255,0.2)]">O</div>
          <h1 className="font-bold text-lg tracking-tight uppercase">Ouwibo Agent</h1>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem icon={<LayoutDashboard size={18}/>} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
          <NavItem icon={<Puzzle size={18}/>} label="Integrations" active={activeTab === 'integrations'} onClick={() => setActiveTab('integrations')} />
          <NavItem icon={<TerminalIcon size={18}/>} label="Terminal" active={activeTab === 'terminal'} onClick={() => setActiveTab('terminal')} />
          <NavItem icon={<Settings size={18}/>} label="Configuration" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="pt-6 border-t border-border mt-auto">
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary"><User size={16}/></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">@ouwibo</p>
              <p className="text-[10px] text-muted truncate">PRIME_ROOT</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Header Bar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-8 bg-background/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4 text-[10px] mono text-muted uppercase tracking-widest font-bold">
            <span className="flex items-center gap-2 text-primary">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#00f0ff]" />
              NETWORK_STABLE
            </span>
            <span className="opacity-20">/</span>
            <span>GATEWAY_ACTIVE</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-border text-[10px] mono">
            <Activity size={12} className="text-primary" />
            HEARTBEAT: 14MS
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12 scrollbar-hide">
          <div className="max-w-6xl mx-auto space-y-12">
            
            {/* Page Title Section */}
            <div>
              <div className="flex items-center gap-2 text-[10px] mono text-primary mb-2 font-black uppercase tracking-[0.3em]">
                System_Node <ChevronRight size={10} /> {activeTab}
              </div>
              <h2 className="text-3xl font-black text-zinc-100 uppercase italic tracking-tighter">
                {activeTab === 'integrations' ? 'Core_Integrations' : 
                 activeTab === 'terminal' ? 'Neural_Terminal' : 'System_Overview'}
              </h2>
              <p className="text-muted text-sm mt-2 max-w-2xl leading-relaxed">
                Seamlessly connect your autonomous agents to the digital world. Toggle integrations to expand neural capabilities.
              </p>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
              {activeTab === 'integrations' && (
                <motion.div key="int" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <IntegrationGrid />
                </motion.div>
              )}
              {activeTab === 'terminal' && (
                <motion.div key="term" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[600px]">
                  <Terminal />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Footer */}
        <footer className="h-10 border-t border-border bg-black/20 flex items-center px-8 justify-between text-[9px] mono text-zinc-700 uppercase tracking-widest">
          <div>Ouwibo Agent // Distributed Systems // Node_01</div>
          <div className="flex gap-6">
            <span className="hover:text-zinc-400 cursor-pointer">Documentation</span>
            <span className="hover:text-zinc-400 cursor-pointer">Security_Audit</span>
          </div>
        </footer>

      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: any) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-all duration-200 group ${
        active ? 'bg-primary/10 text-primary border border-primary/20' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
      }`}
    >
      <div className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>
        {icon}
      </div>
      <span className="text-sm font-bold tracking-tight">{label}</span>
    </div>
  );
}
