"use client";
import { useEffect, useState } from "react";

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
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl max-w-md w-full shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">DataForge AI Status</h1>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-zinc-950 rounded border border-zinc-800">
            <span className="text-zinc-400">Backend API</span>
            {error ? (
              <span className="text-red-500 font-bold px-2 py-1 bg-red-500/10 rounded text-xs">OFFLINE</span>
            ) : health ? (
              <span className="text-green-500 font-bold px-2 py-1 bg-green-500/10 rounded text-xs">ONLINE</span>
            ) : (
              <span className="text-zinc-500 font-bold px-2 py-1 bg-zinc-800 rounded text-xs">CHECKING...</span>
            )}
          </div>
          
          {health && (
            <div className="flex justify-between items-center p-4 bg-zinc-950 rounded border border-zinc-800">
              <span className="text-zinc-400">Service</span>
              <span className="text-blue-400 font-mono text-sm">{health.service}</span>
            </div>
          )}
          
          {error && (
            <div className="text-red-400 text-xs text-center mt-4">
              Error connecting to backend: {error}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
