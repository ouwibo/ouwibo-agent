"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Database, Cpu } from 'lucide-react';
import { toast } from 'sonner';

const integrations = [
  { 
    id: 'gemini', 
    name: 'Google Gemini', 
    desc: 'Primary reasoning engine powered by Gemini 1.5 Pro.', 
    icon: <Zap size={20} className="text-primary" />, 
    status: 'connected' 
  },
  { 
    id: 'mistral', 
    name: 'Mistral AI', 
    desc: 'Fallback engine for complex problem solving.', 
    icon: <Database size={20} className="text-zinc-300" />, 
    status: 'connected' 
  },
  { 
    id: 'hf', 
    name: 'Hugging Face', 
    desc: 'Gateway to Llama 3.1 open-source models.', 
    icon: <Cpu size={20} className="text-zinc-300" />, 
    status: 'connected' 
  },
];

export default function IntegrationGrid() {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-zinc-100">Neural Providers</h2>
        <p className="text-sm text-zinc-500 mt-1">Configure active language models and API gateways.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-6 bg-[#080808] border border-border rounded-xl hover:border-primary/30 transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                {item.icon}
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wide">
                {item.status}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-zinc-100 mb-2">{item.name}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
            </div>
            
            <div className="mt-6 pt-4 border-t border-white/5 flex justify-end">
              <button 
                onClick={() => toast.success(`${item.name} configuration opened.`)}
                className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors"
              >
                Configure
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
