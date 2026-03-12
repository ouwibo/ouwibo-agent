"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, HardDrive, Zap, MessageSquare, History } from 'lucide-react';

export default function Overview() {
  return (
    <div className="space-y-8">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Cpu size={16}/>} label="Processor_Load" value="14.2%" detail="4 Nodes Active" color="text-primary" />
        <MetricCard icon={<HardDrive size={16}/>} label="Memory_Usage" value="4.8 GB" detail="of 16 GB" color="text-zinc-400" />
        <MetricCard icon={<Zap size={16}/>} label="Neural_Latency" value="14 ms" detail="Secure Link" color="text-yellow-500" />
        <MetricCard icon={<MessageSquare size={16}/>} label="Total_Requests" value="1,284" detail="Today" color="text-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs mono font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <History size={14} /> Recent_System_Logs
            </h3>
            <span className="text-[10px] text-primary cursor-pointer hover:underline uppercase">View_All</span>
          </div>
          <div className="space-y-4">
            <LogItem status="SUCCESS" msg="Gemini_1.5_Flash: Pattern analysis complete for Session_09" time="2m ago" />
            <LogItem status="INFO" msg="Gateway: Incoming message from WhatsApp_Node_01" time="14m ago" />
            <LogItem status="ERROR" msg="Tool_Call: Search_Web failed (Timeout) - Retrying..." time="28m ago" />
            <LogItem status="SUCCESS" msg="System: Automated backup successful" time="1h ago" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h3 className="text-xs mono font-black uppercase tracking-widest text-zinc-500 px-2">Quick_Deployment</h3>
          <ActionCard title="Deploy New Agent" desc="Spawn a specialized autonomous agent." />
          <ActionCard title="Neural Diagnostic" desc="Run full system health check." />
          <ActionCard title="Export Sessions" desc="Download all chat logs as JSON." />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, detail, color }: any) {
  return (
    <div className="bg-card border border-border p-6 rounded-2xl hover:border-primary/20 transition-all group">
      <div className="flex items-center gap-3 mb-4 opacity-50 group-hover:opacity-100 transition-opacity">
        <div className={`p-2 bg-white/5 rounded-lg ${color}`}>{icon}</div>
        <span className="text-[10px] mono uppercase font-bold tracking-tighter">{label}</span>
      </div>
      <div className="text-2xl font-black tracking-tighter text-zinc-100 mb-1 italic uppercase">{value}</div>
      <div className="text-[10px] text-muted mono uppercase">{detail}</div>
    </div>
  );
}

function LogItem({ status, msg, time }: any) {
  return (
    <div className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-border cursor-default">
      <div className={`text-[8px] mono font-black px-2 py-0.5 rounded ${
        status === 'SUCCESS' ? 'text-green-400 bg-green-400/10' :
        status === 'ERROR' ? 'text-red-400 bg-red-400/10' : 'text-primary bg-primary/10'
      }`}>
        {status}
      </div>
      <div className="flex-1 text-xs text-zinc-300 truncate">{msg}</div>
      <div className="text-[10px] text-zinc-600 mono">{time}</div>
    </div>
  );
}

function ActionCard({ title, desc }: any) {
  return (
    <div className="bg-white/5 border border-border p-4 rounded-xl hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer group">
      <h4 className="text-xs font-bold text-zinc-200 group-hover:text-primary transition-colors">{title}</h4>
      <p className="text-[10px] text-muted mt-1 leading-relaxed">{desc}</p>
    </div>
  );
}
