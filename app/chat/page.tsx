"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Settings, Plus, Terminal as TerminalIcon, Menu, X, Cpu } from 'lucide-react';

export default function SimpleAgentChat() {
  const [messages, setMessages] = useState([
    { 
      role: 'agent', 
      content: "Gateway established. I am Ouwibo Agent. My neural links are connected to Gemini, Mistral, and the Web. How can I assist you today?", 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      provider: 'System' 
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = input;
    
    const updatedMessages = [...messages, { role: 'user', content: userMsg, time, provider: 'User' }];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);
    
    try {
      const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });
      
      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: data.reply, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: data.provider || 'Neural Network'
      }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'agent', 
        content: "⚠️ Connection to Neural Gateway failed. Please verify API configuration.", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: 'System Error'
      }]);
      toast.error("Failed to connect to backend API.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([{ 
      role: 'agent', 
      content: "Session purged. New secure connection established. How can I help?", 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 
      provider: 'System' 
    }]);
    toast.success("New session started.");
  };

  return (
    <div className="flex h-screen bg-transparent text-foreground font-sans selection:bg-primary/30 relative z-10">
      
      {/* MOBILE HEADER */}
      <header className="md:hidden h-14 border-b border-white/5 flex items-center justify-between px-4 bg-background/80 backdrop-blur-md absolute top-0 w-full z-30">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-zinc-400">
          <Menu size={20} />
        </button>
        <div className="font-bold text-sm flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-white text-[10px]">O</div>
          Ouwibo Agent
        </div>
        <div className="w-8" />
      </header>

      {/* SIDEBAR */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 z-30 md:hidden"
              />
            )}
            <motion.aside 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed md:static inset-y-0 left-0 w-64 border-r border-border bg-[#050505]/80 backdrop-blur-xl flex flex-col z-40"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-black shadow-neon text-xs">O</div>
                  <span className="font-bold tracking-tight uppercase text-sm">Ouwibo</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setIsSidebarOpen(false); toast("Settings opened"); }} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors hidden md:block">
                    <Settings size={16} />
                  </button>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 transition-colors md:hidden">
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <button 
                  onClick={handleNewChat}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 text-zinc-100 border border-white/10 rounded-xl transition-all shadow-sm"
                >
                  <Plus size={16} className="text-primary" />
                  <span className="text-sm font-medium">New Chat</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
                <div className="text-xs font-semibold text-zinc-500 mb-3 px-2 uppercase tracking-wider">Recent Chats</div>
                <div className="px-4 py-3 text-sm text-zinc-300 bg-white/5 border border-white/5 rounded-xl cursor-pointer truncate">Market Analysis</div>
                <div className="px-4 py-3 text-sm text-zinc-500 hover:bg-white/5 hover:text-zinc-300 rounded-xl cursor-pointer transition-colors truncate">System Diagnostics</div>
                <div className="px-4 py-3 text-sm text-zinc-500 hover:bg-white/5 hover:text-zinc-300 rounded-xl cursor-pointer transition-colors truncate">Generate Python Script</div>
              </div>

              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-all border border-transparent hover:border-white/5">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold border border-primary/20">O</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-zinc-200">@ouwibo</p>
                    <p className="text-[10px] text-zinc-500 truncate uppercase tracking-widest">Operator</p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col relative w-full h-full pt-14 md:pt-0">
        
        {/* Desktop Header */}
        <header className="hidden md:flex h-14 border-b border-border items-center justify-between px-6 bg-background/50 backdrop-blur-md absolute top-0 w-full z-10">
          <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
            <span className="flex items-center gap-2 text-primary">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_#ff4d4d]" />
              Neural Link Active
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-border text-[10px] mono text-zinc-400 glass-card">
            <Cpu size={12} className="text-primary" />
            Auto-Routing
          </div>
        </header>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide pt-20 md:pt-24">
          <div className="max-w-3xl mx-auto space-y-8 pb-32">
            {messages.length === 1 && messages[0].provider === 'System' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center h-64 mt-12 opacity-80">
                <div className="w-20 h-20 bg-primary/5 border border-primary/20 rounded-3xl flex items-center justify-center text-5xl mb-6 shadow-neon">🦍</div>
                <h1 className="text-3xl font-black mb-3 text-zinc-100 tracking-tight text-center">How can I assist you?</h1>
                <p className="text-zinc-500 text-center max-w-md">I am an elite AI agent equipped with Web Search, Crypto Market Data, and Multi-Brain Reasoning capabilities.</p>
              </motion.div>
            )}
            
            {messages.map((m, i) => (
              <MessageBubble key={i} {...m} />
            ))}
            
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 lg:gap-6 justify-start">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl border bg-primary/10 border-primary/20 shadow-neon">🦍</div>
                <div className="flex items-center gap-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-zinc-400 text-sm">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="ml-2 text-xs font-mono">Processing...</span>
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-8 bg-gradient-to-t from-background via-background/90 to-transparent z-20">
          <div className="max-w-3xl mx-auto relative">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-cyan-500/10 to-transparent rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-end bg-[#0a0f1a]/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 pl-4 focus-within:border-primary/50 transition-all shadow-2xl">
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isLoading}
                  placeholder="Message Ouwibo Agent..."
                  className="flex-1 bg-transparent border-none outline-none text-[15px] py-3 text-zinc-100 placeholder:text-zinc-600 font-sans resize-none max-h-48 min-h-[44px] scrollbar-hide disabled:opacity-50"
                  rows={1}
                  style={{ overflow: 'hidden' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                    if (target.scrollHeight > 200) target.style.overflow = 'auto';
                    else target.style.overflow = 'hidden';
                  }}
                />
                <button 
                  onClick={handleSend} 
                  disabled={!input.trim() || isLoading}
                  className="ml-2 bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:hover:bg-primary text-white p-3 rounded-xl transition-all active:scale-95 flex items-center justify-center mb-1 shadow-neon disabled:shadow-none"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
            <div className="text-center mt-3 text-[10px] text-zinc-600 font-medium">
              Ouwibo Agent can make mistakes. Please verify important information before taking action.
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

function MessageBubble({ role, content, provider, time }: any) {
  const isAgent = role === 'agent';
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 lg:gap-6 ${!isAgent ? 'justify-end' : 'justify-start'}`}
    >
      {isAgent && (
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base md:text-xl border bg-primary/10 border-primary/20 shadow-neon">
          🦍
        </div>
      )}
      
      <div className={`flex flex-col space-y-1 max-w-[90%] lg:max-w-[80%] ${!isAgent ? 'items-end' : 'items-start'}`}>
        <div className={`flex items-center gap-2 px-1 mb-1 ${!isAgent ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-bold text-zinc-300">
            {isAgent ? 'Ouwibo Agent' : 'You'}
          </span>
          {isAgent && provider && provider !== 'System' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-500 font-mono flex items-center gap-1">
              <TerminalIcon size={8} /> {provider}
            </span>
          )}
          <span className="text-[10px] text-zinc-600 mx-1">{time}</span>
        </div>
        
        <div className={`p-4 md:p-5 rounded-2xl text-[14.5px] leading-relaxed w-full overflow-x-auto ${
          isAgent 
            ? 'bg-white/[0.02] border border-white/[0.05] text-zinc-200 shadow-sm rounded-tl-sm' 
            : 'bg-zinc-800 text-white rounded-br-sm shadow-md'
        }`}>
          {isAgent ? (
            <div className="prose prose-invert max-w-none prose-sm md:prose-base prose-p:leading-relaxed prose-pre:bg-[#050810] prose-pre:border prose-pre:border-white/10 prose-code:text-primary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{content}</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
