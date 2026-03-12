"use client";

import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Cpu, ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-transparent text-foreground font-sans relative overflow-hidden flex items-center justify-center selection:bg-primary/30">
      
      <Link href="/" className="absolute top-8 left-8 text-zinc-500 hover:text-zinc-300 flex items-center gap-2 transition-colors text-sm font-medium">
        <ArrowLeft size={16} /> Back to Gateway
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md p-8 md:p-12 glass-card rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
        
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary font-black shadow-neon text-2xl mb-6">
            🦍
          </div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100 mb-2">Welcome Back</h1>
          <p className="text-sm text-zinc-400">Authenticate to access the Neural Gateway.</p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => signIn("google", { callbackUrl: "/chat" })}
            className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-zinc-200 py-3.5 px-4 rounded-xl font-semibold transition-all active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg>
            Continue with Google
          </button>

          <button 
            onClick={() => signIn("twitter", { callbackUrl: "/chat" })}
            className="w-full flex items-center justify-center gap-3 bg-[#1DA1F2] text-white hover:bg-[#1a8cd8] py-3.5 px-4 rounded-xl font-semibold transition-all active:scale-[0.98]"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            Continue with X / Twitter
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 mb-2">
            <ShieldAlert size={14} /> Security Notice
          </div>
          <p className="text-[11px] text-zinc-600 leading-relaxed max-w-[280px] mx-auto">
            Access is restricted to authorized operators. All sessions are monitored and encrypted.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
