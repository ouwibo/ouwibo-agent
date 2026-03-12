"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, MessageSquare, Zap, Globe, Cpu, Database } from 'lucide-react';

const integrations = [
  { id: 'gemini', name: 'Google Gemini', desc: 'Reasoning & Intelligence', icon: <BrainIcon />, status: 'active' },
  { id: 'mistral', name: 'Mistral AI', desc: 'Complex Problem Solving', icon: <Database />, status: 'active' },
  { id: 'huggingface', name: 'Hugging Face', desc: 'Open Source Gateway', icon: <Cpu />, status: 'active' },
  { id: 'web', name: 'Web Search', desc: 'Real-time Information', icon: <Globe />, status: 'ready' },
  { id: 'whatsapp', name: 'WhatsApp', desc: 'User Communication', icon: <MessageSquare />, status: 'ready' },
  { id: 'vault', name: 'System Vault', desc: 'Secure Credential Storage', icon: <Shield />, status: 'locked' },
];

function BrainIcon() {
  return <Zap className="text-primary" />;
}

export default function IntegrationGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {integrations.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="group relative p-6 bg-card border border-border rounded-2xl hover:border-primary/30 transition-all cursor-default overflow-hidden"
        >
          <div className="absolute inset-0 bg-glow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-white/5 rounded-xl border border-white/5 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <span className={`text-[10px] font-black mono px-2 py-0.5 rounded uppercase tracking-widest ${
              item.status === 'active' ? 'text-primary bg-primary/10' : 'text-muted bg-white/5'
            }`}>
              {item.status}
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="font-bold text-zinc-100 mb-1">{item.name}</h3>
            <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
