"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Zap, 
  MessageSquare, 
  History, 
  Server, 
  ShieldCheck,
  Globe2,
  Lock,
  ArrowUpRight
} from 'lucide-react';

export default function Overview() {
  return (
    <div className="space-y-10 pb-20">
      
      {/* SECTION 1: GLOBAL METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="CPU_LOAD" value="12.4%" trend="+0.2" icon={<Cpu size={14}/>} color="text-primary" />
        <MetricCard label="RAM_ALLOC" value="4.2GB" trend="-0.1" icon={<Server size={14}/>} color="text-zinc-400" />
        <MetricCard label="NEURAL_LATENCY" value="14MS" trend="Stable" icon={<Zap size={14}/>} color="text-yellow-500" />
        <MetricCard label="ACTIVE_THREADS" value="08" trend="+2" icon={<Activity size={14}/>} color="text-green-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SECTION 2: LIVE ACTIVITY FEED */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black mono text-zinc-600 uppercase tracking-[0.3em] flex items-center gap-2">
              <History size={12} /> Neural_Activity_Log
            </h3>
            <div className="flex gap-4">
              <span className="text-[9px] font-bold text-primary cursor-pointer hover:underline uppercase italic">Live_Stream</span>
              <span className="text-[9px] font-bold text-zinc-700 cursor-pointer hover:underline uppercase italic">Export</span>
            </div>
          </div>
          
          <div className="bg-[#080808] border border-border rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-white/5 border-b border-border grid grid-cols-12 text-[9px] font-black mono text-zinc-500 uppercase tracking-widest">
              <div className="col-span-2">Timestamp</div>
              <div className="col-span-2">Source</div>
              <div className="col-span-6">Action_Payload</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            <div className="divide-y divide-white/[0.03]">
              <ActivityRow time="22:41:04" source="GEMINI_PRO" payload="Market_Analysis: BTC/USDT (H1) completed" status="SUCCESS" />
              <ActivityRow time="22:38:12" source="GATEWAY" payload="WhatsApp_Handshake: Node_772 established" status="STABLE" />
              <ActivityRow time="22:35:55" source="WEB_SCAN" payload="DuckDuckGo: Scraping results for 'Mistral Large 2'" status="SUCCESS" />
              <ActivityRow time="22:30:01" source="SYSTEM" payload="Automated_Sync: Data_Vault to Frankfurt_AWS" status="SUCCESS" />
              <ActivityRow time="22:25:40" source="MISTRAL" payload="Neural_Computation: Position_Sizing_V2" status="SUCCESS" />
              <ActivityRow time="22:14:02" source="GATEWAY" payload="Discord_Emitter: Broadcast signal sent" status="SUCCESS" />
            </div>
          </div>
        </div>

        {/* SECTION 3: SYSTEM INTELLIGENCE & SECURITY */}
        <div className="lg:col-span-4 space-y-8">
          <div className="space-y-4">
            <h3 className="text-[10px] font-black mono text-zinc-600 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
              <ShieldCheck size={12} /> Protection_Layer
            </h3>
            <SecurityCard title="AES-256 Encryption" status="Active" desc="All neural links are tunnelled through secure TLS." />
            <SecurityCard title="Rate Limit Shield" status="Monitoring" desc="Protects API endpoints from overflow attacks." />
            <SecurityCard title="Auth Guard" status="Verified" desc="PRIME_ROOT access control active." />
          </div>

          <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
              <Globe2 size={80} />
            </div>
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4">Deployment_Status</h4>
            <div className="space-y-2 relative z-10">
              <div className="flex justify-between text-[11px] font-bold italic">
                <span className="text-zinc-400 underline">Vercel_Edge</span>
                <span className="text-primary uppercase">Connected</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold italic">
                <span className="text-zinc-400 underline">Main_Gateway</span>
                <span className="text-primary uppercase">Active</span>
              </div>
            </div>
            <button className="w-full mt-6 py-2 bg-primary text-black text-[10px] font-black uppercase tracking-tighter rounded-lg hover:scale-[1.02] transition-transform">
              Deploy_New_Node
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function MetricCard({ label, value, trend, icon, color }: any) {
  return (
    <div className="bg-card border border-border p-6 rounded-2xl group hover:border-primary/20 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 bg-white/5 rounded-lg ${color} group-hover:scale-110 transition-transform`}>{icon}</div>
        <span className={`text-[9px] font-bold mono ${trend.startsWith('+') ? 'text-green-500' : trend === 'Stable' ? 'text-zinc-500' : 'text-red-500'}`}>
          {trend}
        </span>
      </div>
      <div className="text-[10px] mono text-zinc-600 uppercase font-black tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-black text-zinc-100 italic uppercase tracking-tighter">{value}</div>
    </div>
  );
}

function ActivityRow({ time, source, payload, status }: any) {
  return (
    <div className="p-4 grid grid-cols-12 items-center gap-4 hover:bg-white/[0.02] transition-colors cursor-default group">
      <div className="col-span-2 text-[10px] mono text-zinc-600">{time}</div>
      <div className="col-span-2 text-[10px] font-black text-zinc-400 tracking-tighter italic">{source}</div>
      <div className="col-span-6 text-[11px] text-zinc-200 truncate group-hover:text-primary transition-colors">{payload}</div>
      <div className="col-span-2 text-right">
        <span className={`text-[8px] font-black px-2 py-0.5 rounded border ${
          status === 'SUCCESS' || status === 'STABLE' ? 'text-green-500 bg-green-500/10 border-green-500/20' : 'text-primary bg-primary/10 border-primary/20'
        }`}>
          {status}
        </span>
      </div>
    </div>
  );
}

function SecurityCard({ title, status, desc }: any) {
  return (
    <div className="p-4 bg-white/5 border border-border rounded-xl flex gap-4 items-start hover:border-zinc-700 transition-colors">
      <div className="mt-1"><Lock size={12} className="text-zinc-600" /></div>
      <div>
        <div className="flex justify-between items-center mb-1">
          <h5 className="text-[11px] font-bold text-zinc-200">{title}</h5>
          <span className="text-[8px] font-black text-primary uppercase">{status}</span>
        </div>
        <p className="text-[9px] text-zinc-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
