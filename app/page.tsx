import Link from 'next/link';
import { ArrowRight, Cpu, Shield, Globe, Zap } from 'lucide-react';
import React from 'react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-transparent text-foreground font-sans relative overflow-hidden selection:bg-primary/30">
      {/* Background elements are handled by layout.tsx (nebula, stars, scanline) */}

      <div className="relative z-10 container mx-auto px-6 pt-20 pb-24 flex flex-col items-center justify-center min-h-screen">
        
        {/* Header/Logo */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black shadow-neon text-xs">O</div>
            <span className="font-bold tracking-tight uppercase text-sm">Ouwibo</span>
          </div>
          <div className="flex gap-6 text-xs font-medium text-zinc-400">
            <Link href="/docs" className="hover:text-primary transition-colors">Documentation</Link>
            <Link href="https://github.com/ouwibo/ouwiboagent" target="_blank" className="hover:text-primary transition-colors">GitHub</Link>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mt-16 mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold mb-8 shadow-neon">
            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            v1.0.0 STABLE RELEASE
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-tight">
            The Autonomous <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">
              Neural Gateway
            </span>
          </h1>
          
          <p className="text-lg text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Ouwibo is an elite AI agent infrastructure. Connect multiple language models, execute real-time web searches, and monitor live crypto markets through a single, secure terminal.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/chat" className="group flex items-center justify-center gap-3 px-8 py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-wide hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-neon w-full sm:w-auto">
              Launch Agent
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="https://github.com/ouwibo/ouwiboagent" target="_blank" className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-zinc-300 rounded-xl font-bold uppercase tracking-wide hover:bg-white/10 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto glass-card">
              View Source
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mx-auto mt-12">
          <FeatureCard 
            icon={<Cpu size={24} className="text-primary" />}
            title="Multi-Brain Routing"
            desc="Seamlessly switch between Gemini 1.5 Pro, Mistral Large, and Llama 3.1 for zero downtime."
          />
          <FeatureCard 
            icon={<Globe size={24} className="text-primary" />}
            title="Real-Time Intel"
            desc="Equipped with autonomous tools to browse the web and fetch live market data instantly."
          />
          <FeatureCard 
            icon={<Shield size={24} className="text-primary" />}
            title="Secure Enclave"
            desc="API keys are managed securely via environment secrets. Local-first architecture."
          />
          <FeatureCard 
            icon={<Zap size={24} className="text-primary" />}
            title="Edge Performance"
            desc="Built on Next.js 15 and optimized for Vercel Edge for sub-50ms latency globally."
          />
        </div>

      </div>

      <footer className="absolute bottom-0 w-full p-6 text-center text-xs text-zinc-600 font-mono tracking-widest uppercase z-50">
        Proprietary Engine // Built for Ouwibo // 2026
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="glass-card p-6 rounded-2xl border border-white/5 hover:border-primary/30 transition-colors group">
      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-zinc-100 mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
    </div>
  );
}
