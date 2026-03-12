"use client";
import React from 'react';
import { Activity, Cpu, HardDrive, Zap, ShieldCheck } from 'lucide-react';

export default function Overview() {
  return (
    <div className="space-y-8 pb-10">
      
      {/* SECTION 1: GLOBAL METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="System Status" value="Online" detail="All nodes operational" icon={<Activity size={16}/>} color="text-green-500" />
        <MetricCard label="Primary Engine" value="Gemini 1.5" detail="Active routing" icon={<Cpu size={16}/>} color="text-primary" />
        <MetricCard label="Fallback Engine" value="Mistral" detail="Standby mode" icon={<HardDrive size={16}/>} color="text-zinc-400" />
        <MetricCard label="Avg Response" value="1.2s" detail="Last 24 hours" icon={<Zap size={16}/>} color="text-yellow-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SECTION 2: SYSTEM INFORMATION */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              System Architecture
            </h3>
          </div>
          
          <div className="bg-[#080808] border border-border rounded-xl p-6 shadow-sm">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-zinc-200 mb-2">Multi-Model Routing</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Ouwibo Agent utilizes a tiered routing system. Incoming requests are processed by Google Gemini 1.5 Pro. If rate limits or timeouts occur, the system automatically falls back to Mistral Large, ensuring continuous operation.
                </p>
              </div>
              
              <div className="pt-4 border-t border-white/5">
                <h4 className="text-sm font-semibold text-zinc-200 mb-2">Next.js Edge Deployment</h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  The frontend interface and API routes are optimized for Vercel's edge network, providing low-latency interactions globally while securely managing API credentials on the server side.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: DEPLOYMENT STATUS */}
        <div className="lg:col-span-4 space-y-6">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <ShieldCheck size={14} className="text-primary" /> Environment Status
          </h3>
          
          <div className="bg-white/5 border border-border rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <span className="text-xs text-zinc-400">Node Environment</span>
              <span className="text-xs font-mono text-zinc-200">Production</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <span className="text-xs text-zinc-400">Framework</span>
              <span className="text-xs font-mono text-zinc-200">Next.js 15.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400">UI Library</span>
              <span className="text-xs font-mono text-zinc-200">Tailwind CSS</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function MetricCard({ label, value, detail, icon, color }: any) {
  return (
    <div className="bg-card border border-border p-5 rounded-xl transition-all">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 bg-white/5 rounded-lg ${color}`}>{icon}</div>
        <span className="text-xs text-zinc-500 font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-zinc-100 mb-1">{value}</div>
      <div className="text-[10px] text-zinc-600">{detail}</div>
    </div>
  );
}
