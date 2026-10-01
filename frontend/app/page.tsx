"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [health, setHealth] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => setError(err.message));
  }, []);

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center bg-zinc-950 p-4 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/30 via-zinc-950 to-zinc-950 z-0" />
      
      {/* Hero Section */}
      <div className="z-10 flex flex-col items-center text-center space-y-8 max-w-3xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="inline-block rounded-full bg-zinc-900/80 border border-zinc-800 px-4 py-1.5 text-sm text-zinc-400 mb-2 shadow-sm backdrop-blur-sm">
          Welcome to the future of data pipelines
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-white to-zinc-500 tracking-tight pb-2">
          DataForge AI
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
          The autonomous AI agent pipeline for intelligent data collection, normalization, and generation. Ready for enterprise production.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 pt-6 w-full justify-center">
          <Link href="/login" className="group flex items-center justify-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-semibold hover:bg-zinc-200 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.15)]">
            Login to Workspace
            <svg className="transform group-hover:translate-x-1 transition-transform" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
          <Link href="/register" className="flex items-center justify-center gap-2 bg-zinc-900 text-white border border-zinc-800 px-8 py-4 rounded-xl font-semibold hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-300 shadow-lg">
            Create Account
          </Link>
        </div>
      </div>

      {/* Floating Status Corner (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-5 rounded-2xl shadow-2xl flex flex-col gap-3 min-w-[260px] transform transition-transform hover:-translate-y-1 hover:border-zinc-700">
          <div className="flex items-center gap-2 border-b border-zinc-800/50 pb-3">
            <div className={`w-2.5 h-2.5 rounded-full ${health ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : error ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-yellow-500'} animate-pulse`}></div>
            <h3 className="text-sm font-semibold text-zinc-200 tracking-wide">System Status</h3>
          </div>
          
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-zinc-400 font-medium">Backend API</span>
            {error ? (
              <span className="text-red-400 font-bold px-2.5 py-1 bg-red-500/10 rounded-md text-[10px] tracking-wider border border-red-500/20">OFFLINE</span>
            ) : health ? (
              <span className="text-emerald-400 font-bold px-2.5 py-1 bg-emerald-500/10 rounded-md text-[10px] tracking-wider border border-emerald-500/20">ONLINE</span>
            ) : (
              <span className="text-zinc-400 font-bold px-2.5 py-1 bg-zinc-800 rounded-md text-[10px] tracking-wider border border-zinc-700 animate-pulse">CHECKING</span>
            )}
          </div>
          
          {health && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-zinc-400 font-medium">Service</span>
              <span className="text-blue-400 font-mono text-[10px] bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{health.service}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
