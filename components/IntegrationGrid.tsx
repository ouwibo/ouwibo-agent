"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  MessageSquare, 
  Zap, 
  Globe, 
  Cpu, 
  Database, 
  Code2, 
  Mail, 
  Terminal, 
  Fingerprint, 
  Github, 
  Slack,
  Settings2,
  Lock
} from 'lucide-react';

const integrations = [
  // --- CHANNELS ---
  { group: 'Channels', items: [
    { id: 'whatsapp', name: 'WhatsApp', desc: 'Secure mobile gateway', icon: <MessageSquare />, status: 'ready' },
    { id: 'discord', name: 'Discord', desc: 'Community & bot link', icon: <Terminal />, status: 'ready' },
    { id: 'slack', name: 'Slack', desc: 'Enterprise workplace', icon: <Slack />, status: 'ready' },
  ]},
  // --- BRAIN NODES ---
  { group: 'Brains', items: [
    { id: 'gemini', name: 'Gemini Pro', desc: 'Primary reasoning engine', icon: <Zap className="text-primary" />, status: 'active' },
    { id: 'mistral', name: 'Mistral Large', desc: 'Complex problem solver', icon: <Database />, status: 'active' },
    { id: 'hf', name: 'Hugging Face', desc: 'OSS model repository', icon: <Cpu />, status: 'active' },
  ]},
  // --- UTILITIES ---
  { group: 'Toolkits', items: [
    { id: 'web', name: 'Web Explorer', desc: 'Real-time browsing', icon: <Globe />, status: 'active' },
    { id: 'github', name: 'GitHub Agent', desc: 'Code repository access', icon: <Github />, status: 'ready' },
    { id: 'shell', name: 'Safe Shell', desc: 'Command execution', icon: <Code2 />, status: 'locked' },
  ]},
  // --- SECURITY ---
  { group: 'Security', items: [
    { id: 'vault', name: 'System Vault', desc: 'Key management', icon: <Lock />, status: 'active' },
    { id: 'auth', name: 'Auth Node', desc: 'Identity verification', icon: <Fingerprint />, status: 'ready' },
    { id: 'config', name: 'Global Config', desc: 'Environment setup', icon: <Settings2 />, status: 'active' },
  ]},
];

export default function IntegrationGrid() {
  return (
    <div className="space-y-12 pb-20">
      {integrations.map((group, idx) => (
        <div key={idx} className="space-y-6">
          <div className="flex items-center gap-4">
            <h3 className="text-[10px] font-black mono text-zinc-600 uppercase tracking-[0.3em]">{group.group}</h3>
            <div className="h-[1px] flex-1 bg-border" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (idx * 0.1) + (i * 0.05) }}
                className="group relative p-6 bg-[#080808] border border-border rounded-2xl hover:border-primary/30 transition-all cursor-default overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:border-primary/20 group-hover:scale-110 transition-all">
                    {React.cloneElement(item.icon as React.ReactElement, { size: 20 })}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-[8px] font-black mono px-2 py-0.5 rounded uppercase tracking-widest border ${
                      item.status === 'active' ? 'text-primary bg-primary/10 border-primary/20 shadow-[0_0_8px_rgba(226,61,40,0.1)]' : 
                      item.status === 'locked' ? 'text-zinc-600 bg-white/5 border-border' :
                      'text-zinc-400 bg-white/5 border-border'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>

                <div className="relative z-10">
                  <h4 className="font-bold text-zinc-100 mb-1 flex items-center gap-2 group-hover:text-primary transition-colors">
                    {item.name}
                    {item.status === 'locked' && <Lock size={10} className="text-zinc-700" />}
                  </h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed min-h-[32px]">{item.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.03] flex items-center justify-between relative z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-[9px] font-black uppercase text-zinc-500 hover:text-zinc-100 transition-colors tracking-tighter italic">Configure_Node</button>
                  <button className={`text-[9px] font-black uppercase transition-colors tracking-tighter italic ${
                    item.status === 'active' ? 'text-zinc-600 hover:text-red-500' : 'text-primary hover:text-white'
                  }`}>
                    {item.status === 'active' ? 'Disconnect' : 'Connect_API'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
