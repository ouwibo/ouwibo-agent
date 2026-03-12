"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Log {
  type: 'info' | 'error' | 'success' | 'agent';
  message: string;
  timestamp: string;
}

export default function Terminal() {
  const [logs, setLogs] = useState<Log[]>([
    { type: 'info', message: 'OUWIBO_GATEWAY_INITIALIZED', timestamp: new Date().toLocaleTimeString() },
    { type: 'success', message: 'NEURAL_LINKS_STABLE', timestamp: new Date().toLocaleTimeString() },
  ]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-[#080808] border border-border rounded-2xl overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_#00f0ff]" />
          <span className="font-bold text-zinc-400">AGENT_TERMINAL</span>
        </div>
        <span className="text-[10px] text-zinc-600">v1.0.0-stable</span>
      </div>
      
      <div ref={containerRef} className="flex-1 p-6 space-y-2 overflow-y-auto scrollbar-hide">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-4 opacity-80 hover:opacity-100 transition-opacity">
            <span className="text-zinc-700">[{log.timestamp}]</span>
            <span className={
              log.type === 'error' ? 'text-red-500' :
              log.type === 'success' ? 'text-primary' :
              log.type === 'agent' ? 'text-zinc-100 font-bold' : 'text-zinc-500'
            }>
              {log.type === 'agent' ? '⟩' : '::'} {log.message}
            </span>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 border-t border-border bg-white/5 flex gap-3">
        <span className="text-primary font-bold">⟩</span>
        <input 
          className="bg-transparent border-none outline-none flex-1 text-zinc-100 placeholder:text-zinc-800"
          placeholder="Enter command or talk to agents..."
        />
      </div>
    </div>
  );
}
