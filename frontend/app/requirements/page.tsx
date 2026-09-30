"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { analyzeRequirement } from "@/lib/api";

export default function RequirementsPage() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");
      const data = await analyzeRequirement(token, prompt);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to analyze requirement");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b pb-4 dark:border-zinc-800">
          <h1 className="text-3xl font-bold">Requirement Engine</h1>
          <button onClick={() => router.push("/dashboard")} className="text-sm bg-zinc-200 dark:bg-zinc-800 px-4 py-2 rounded font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition">
            Back to Dashboard
          </button>
        </div>

        <form onSubmit={handleAnalyze} className="mb-10">
          <label className="block text-sm font-medium mb-2">What data do you want to collect?</label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-4 border rounded-xl bg-transparent dark:border-zinc-800 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg mb-4"
            placeholder='e.g. "Find AI/ML internships in Delhi NCR with company, role, stipend, deadline and application URL."'
            disabled={isLoading}
          />
          <button 
            type="submit" 
            disabled={isLoading || !prompt.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition text-lg"
          >
            {isLoading ? "Analyzing..." : "Analyze Requirement"}
          </button>
        </form>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-6 pb-4 border-b dark:border-zinc-800">Analysis Result</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm text-zinc-500 uppercase tracking-wider mb-2 font-semibold">1. Original Request</h3>
                <p className="text-lg bg-white dark:bg-black p-4 rounded-lg border dark:border-zinc-800 mb-6">{prompt}</p>

                <h3 className="text-sm text-zinc-500 uppercase tracking-wider mb-2 font-semibold">2. Detected Intent & Entity</h3>
                <div className="bg-white dark:bg-black p-4 rounded-lg border dark:border-zinc-800 mb-6 flex gap-4 items-center">
                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">Intent: {result.intent}</span>
                  <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">Entity: {result.entity}</span>
                </div>
                
                <h3 className="text-sm text-zinc-500 uppercase tracking-wider mb-2 font-semibold">3. Description</h3>
                <p className="bg-white dark:bg-black p-4 rounded-lg border dark:border-zinc-800 mb-6 text-zinc-700 dark:text-zinc-300">{result.description}</p>
              </div>

              <div>
                <h3 className="text-sm text-zinc-500 uppercase tracking-wider mb-2 font-semibold">4. Requested Fields</h3>
                <div className="bg-white dark:bg-black p-4 rounded-lg border dark:border-zinc-800 mb-6 flex flex-wrap gap-2">
                  {result.requested_fields && result.requested_fields.map((field: str, i: number) => (
                    <span key={i} className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded border dark:border-zinc-700 text-sm">
                      {field}
                    </span>
                  ))}
                  {(!result.requested_fields || result.requested_fields.length === 0) && (
                    <span className="text-zinc-500 italic text-sm">None specified</span>
                  )}
                </div>

                <h3 className="text-sm text-zinc-500 uppercase tracking-wider mb-2 font-semibold">5. Filters & Constraints</h3>
                <div className="bg-white dark:bg-black p-4 rounded-lg border dark:border-zinc-800 mb-6">
                  {result.location && <div className="mb-2"><span className="font-semibold text-sm">Location:</span> {result.location}</div>}
                  {result.filters && Object.keys(result.filters).length > 0 && (
                    <div className="mb-2">
                      <span className="font-semibold text-sm block mb-1">Filters:</span>
                      <ul className="list-disc pl-5 text-sm">
                        {Object.entries(result.filters).map(([k, v]: [string, any]) => (
                          <li key={k}><span className="text-zinc-500">{k}:</span> {v}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.constraints && result.constraints.length > 0 && (
                    <div>
                      <span className="font-semibold text-sm block mb-1">Constraints:</span>
                      <ul className="list-disc pl-5 text-sm">
                        {result.constraints.map((c: string, i: number) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!result.location && (!result.filters || Object.keys(result.filters).length === 0) && (!result.constraints || result.constraints.length === 0) && (
                    <span className="text-zinc-500 italic text-sm">None detected</span>
                  )}
                </div>

                {result.ambiguity_flags && result.ambiguity_flags.length > 0 && (
                  <div>
                    <h3 className="text-sm text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2 font-semibold">6. Ambiguities / Clarifications</h3>
                    <div className="bg-orange-50 dark:bg-orange-950/30 p-4 rounded-lg border border-orange-200 dark:border-orange-800 text-sm">
                      <ul className="list-disc pl-5 text-orange-800 dark:text-orange-200">
                        {result.ambiguity_flags.map((flag: string, i: number) => (
                          <li key={i}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t dark:border-zinc-800 flex justify-end">
               <button className="bg-black text-white dark:bg-white dark:text-black px-6 py-2 rounded font-medium hover:opacity-90 transition disabled:opacity-50" disabled>
                 Generate Workflow (Next Phase) &rarr;
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
