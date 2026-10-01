"use client";
import { useEffect, useState } from "react";
import { getProject, parseRequirement, matchSources } from "@/lib/api";
import { useParams } from "next/navigation";
import DatasetExplorer from "@/components/DatasetExplorer";
import React from "react";

export default function ProjectDetails() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<any>(null);
  const [tasksHistory, setTasksHistory] = useState<any[]>([]);
  
  const [prompt, setPrompt] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [requirement, setRequirement] = useState<any>(null);
  const [compatibleSources, setCompatibleSources] = useState<any[]>([]);

  const loadHistory = async (token: string, projectId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/workflow/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setTasksHistory(await res.json());
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && id) {
      getProject(token, id).then(setProject).catch(console.error);
      loadHistory(token, id);
    }
  }, [id]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token || !prompt.trim()) return;
    
    setIsAnalyzing(true);
    setRequirement(null);
    setCompatibleSources([]);
    try {
      const parsed = await parseRequirement(token, parseInt(id), prompt);
      setRequirement(parsed);
      
      if (parsed.dataset_schema && parsed.dataset_schema.length > 0) {
        const fields = parsed.dataset_schema.map((f: any) => f.name);
        const matched = await matchSources(token, fields);
        setCompatibleSources(matched);
      }
    } catch (err) {
      alert("Failed to analyze requirement");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [activeTask, setActiveTask] = useState<any>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const fetchTaskStatus = async (taskId: number) => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(`http://localhost:8000/api/workflow/task/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setActiveTask(data);
        setResults(data.results);
        
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          clearInterval(intervalId);
          setIsRunning(false);
        }
      } catch (e) {
        console.error("Error fetching task", e);
        clearInterval(intervalId);
      }
    };
    
    if (activeTask && (activeTask.status === 'queued' || activeTask.status === 'RUNNING')) {
      intervalId = setInterval(() => fetchTaskStatus(activeTask.id), 2000);
    }
    
    return () => clearInterval(intervalId);
  }, [activeTask?.id, activeTask?.status]);

  const handleRun = async () => {
    const token = localStorage.getItem("token");
    if (!token || !requirement) return;
    setIsRunning(true);
    setResults(null);
    setActiveTask(null);
    try {
      const res = await fetch(`http://localhost:8000/api/workflow/${id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(requirement),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setActiveTask({ id: data.task_id, status: 'queued', steps: [] });
    } catch (err) {
      alert("Failed to start workflow task");
      setIsRunning(false);
    }
  };

  if (!project) return <div className="p-8">Loading project details...</div>;

  const stepIcons: Record<string, string> = {
    collect: "📥",
    normalize: "✨",
    validate: "✅",
    deduplicate: "🔍",
    generate_dataset: "📊"
  };
  const formatStepName = (type: string, source?: string) => {
    if (type === "collect") return `Data Collection (${source})`;
    if (type === "normalize") return "Normalization";
    if (type === "validate") return "Validation";
    if (type === "deduplicate") return "Deduplication";
    if (type === "generate_dataset") return "Dataset Generation";
    return type;
  };

  return (
    <div>
      <div className="mb-6">
        <a href="/dashboard" className="text-blue-500 hover:underline text-sm flex items-center gap-1">
          &larr; Back to Projects
        </a>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-8 rounded-xl shadow-sm mb-8">
        <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
        <p className="text-zinc-500 mb-8">Project ID: {project.id}</p>
        
        <div className="border-t dark:border-zinc-800 pt-8">
          <h2 className="text-xl font-semibold mb-4">Natural Language Requirement Engine 🧠</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Describe what you want to extract or search for. For example: "Find AI internships in Delhi NCR with company, role, stipend, deadline and application link."
          </p>
          
          <form onSubmit={handleAnalyze} className="flex flex-col gap-4">
            <textarea
              className="w-full border p-4 rounded-xl dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              placeholder="Enter your requirement in plain English..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              required
            />
            <button 
              type="submit" 
              disabled={isAnalyzing}
              className="bg-black text-white dark:bg-white dark:text-black font-medium py-3 px-6 rounded-xl self-start hover:opacity-90 transition disabled:opacity-50"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze Requirement"}
            </button>
          </form>
        </div>
      </div>

      {requirement && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-green-50 dark:bg-zinc-900/50 border border-green-200 dark:border-zinc-700 p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-bold mb-4 text-green-800 dark:text-green-400">Parsed Requirements</h2>
              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="p-3 bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-lg">
                  <div className="font-semibold text-zinc-500">Intent</div><div>{requirement.intent}</div>
                </div>
                <div className="p-3 bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-lg">
                  <div className="font-semibold text-zinc-500">Entity</div><div>{requirement.entity}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-lg">
                  <div className="font-semibold text-zinc-500">Location</div><div>{requirement.location || "N/A"}</div>
                </div>
                <div className="p-3 bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-lg">
                  <div className="font-semibold text-zinc-500">Domain</div><div>{requirement.domain || "N/A"}</div>
                </div>
              </div>
            </div>
            
          </div>

          <div className="bg-blue-50 dark:bg-zinc-900/50 border border-blue-200 dark:border-zinc-700 p-8 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4 text-blue-800 dark:text-blue-400">Dataset Schema</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-100 dark:bg-zinc-800/50 text-blue-900 dark:text-blue-200">
                    <th className="p-3 border-b border-blue-200 dark:border-zinc-700 font-semibold rounded-tl-lg">Field</th>
                    <th className="p-3 border-b border-blue-200 dark:border-zinc-700 font-semibold">Type</th>
                    <th className="p-3 border-b border-blue-200 dark:border-zinc-700 font-semibold">Required</th>
                    <th className="p-3 border-b border-blue-200 dark:border-zinc-700 font-semibold">Validation</th>
                    <th className="p-3 border-b border-blue-200 dark:border-zinc-700 font-semibold rounded-tr-lg">Normalization</th>
                  </tr>
                </thead>
                <tbody>
                  {requirement.dataset_schema?.map((field: any, idx: number) => (
                    <tr key={idx} className="border-b border-blue-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                      <td className="p-3 font-medium">{field.name}</td>
                      <td className="p-3">
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">{field.type}</span>
                      </td>
                      <td className="p-3">
                        {field.required ? <span className="text-red-600 dark:text-red-400 font-medium text-xs">Yes</span> : <span className="text-zinc-400 text-xs">No</span>}
                      </td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400 text-xs">{field.validation || "-"}</td>
                      <td className="p-3 text-zinc-600 dark:text-zinc-400 text-xs">{field.normalization || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {compatibleSources && compatibleSources.length > 0 ? (
            <div className="bg-amber-50 dark:bg-zinc-900/50 border border-amber-200 dark:border-zinc-700 p-8 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-amber-800 dark:text-amber-400">Compatible Sources</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {compatibleSources.map((src: any, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-zinc-950 p-6 rounded-lg border dark:border-zinc-800 shadow-sm flex flex-col gap-4">
                    <div className="font-semibold text-lg border-b pb-2 dark:border-zinc-800">{src.name}</div>
                    
                    <div>
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">Matched Fields:</div>
                      {src.matched_fields.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {src.matched_fields.map((f: string, i: number) => (
                            <span key={i} className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded border border-green-200 dark:border-green-800">✓ {f}</span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500">None</div>
                      )}
                    </div>
                    
                    <div>
                      <div className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Missing Fields:</div>
                      {src.missing_fields.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {src.missing_fields.map((f: string, i: number) => (
                            <span key={i} className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-2 py-1 rounded border border-red-200 dark:border-red-800">✗ {f}</span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-zinc-500">None</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-zinc-900/50 border border-amber-200 dark:border-zinc-700 p-8 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold mb-4 text-amber-800 dark:text-amber-400">Compatible Sources</h2>
              <div className="text-zinc-500 text-sm">No compatible enabled sources found for this requirement.</div>
            </div>
          )}
          
          {/* AI GENERATED WORKFLOW SECTION */}
          {requirement.workflow && requirement.workflow.steps && (
            <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900 p-8 rounded-xl shadow-sm text-center">
              <h2 className="text-2xl font-bold mb-8 text-violet-900 dark:text-violet-300">AI GENERATED WORKFLOW 🤖</h2>
              
              <div className="flex flex-col items-center justify-center max-w-lg mx-auto mb-10">
                <div className="w-full bg-white dark:bg-zinc-900 p-4 rounded-xl border border-violet-100 dark:border-violet-900/50 shadow-sm flex items-center justify-center gap-3">
                  <span className="text-green-500 font-bold text-xl">✓</span>
                  <span className="font-semibold text-lg">Requirement Analysis</span>
                </div>
                <div className="text-violet-400 my-2">↓</div>
                <div className="w-full bg-white dark:bg-zinc-900 p-4 rounded-xl border border-violet-100 dark:border-violet-900/50 shadow-sm flex items-center justify-center gap-3">
                  <span className="text-green-500 font-bold text-xl">✓</span>
                  <span className="font-semibold text-lg">Source Discovery</span>
                </div>

                {requirement.workflow.steps.map((step: any, idx: number) => (
                  <div key={idx} className="w-full flex flex-col items-center">
                    <div className="text-violet-400 my-2">↓</div>
                    <div className="w-full bg-white dark:bg-zinc-900 p-4 rounded-xl border border-violet-100 dark:border-violet-900/50 shadow-sm flex items-center justify-center gap-3">
                      <span className="text-green-500 font-bold text-xl">✓</span>
                      <span className="font-semibold text-lg">
                        {stepIcons[step.type] || "🔹"} {formatStepName(step.type, step.source)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleRun}
                disabled={isRunning}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 px-12 rounded-full text-xl shadow-lg transition transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                {isRunning ? "[ RUNNING... ]" : "[ RUN PIPELINE ]"}
              </button>
              
              {activeTask && (
                <div className="mt-8 bg-zinc-950 p-6 rounded-xl border border-zinc-800">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold font-mono">Task #{activeTask.id?.toString().padStart(3, '0')}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-400 uppercase tracking-wider font-bold">Status:</span>
                      <span className={`px-3 py-1 rounded text-sm font-bold ${
                        activeTask.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                        activeTask.status === 'FAILED' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400 animate-pulse'
                      }`}>
                        {activeTask.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {activeTask.steps?.map((step: any, idx: number) => {

                      const isDone = step.status === 'completed';
                      const isRunning = step.status === 'running';
                      
                      return (
                        <div key={idx} className="flex items-center gap-3 text-sm font-mono">
                          <span className="w-6 text-center">
                            {isDone ? <span className="text-green-500">✓</span> : 
                             isRunning ? <span className="text-blue-400 animate-spin inline-block">⟳</span> : 
                             <span className="text-zinc-600">○</span>}
                          </span>
                          <span className={isDone ? 'text-zinc-300' : isRunning ? 'text-blue-400' : 'text-zinc-600'}>
                            {step.step.replace(/^\d+_/, '')}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {results && Object.keys(results).length > 0 && (
                <div className="mt-12 text-left bg-zinc-950 p-6 rounded-xl border border-zinc-800 shadow-inner overflow-hidden">
                  <h3 className="text-xl font-bold mb-4 text-green-400">Pipeline Execution Logs</h3>
                  {Object.keys(results).map((stepKey) => {
                    const isFinal = stepKey.includes("deduplicate") || stepKey.includes("generate");
                    if (isFinal && activeTask?.status === "COMPLETED") return null;
                    
                    return (
                      <div key={stepKey} className={`mb-6 last:mb-0 bg-zinc-900 rounded-lg border border-zinc-800`}>
                        <div className={`p-3 font-mono text-sm font-bold uppercase border-b bg-zinc-800 text-zinc-300 border-zinc-700`}>
                          Step: {stepKey}
                        </div>
                        <div className="p-4">
                          <pre className="text-xs text-zinc-400 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(results[stepKey]?.slice(0, 5), null, 2)}
                            {results[stepKey]?.length > 5 && `\n\n... and ${results[stepKey].length - 5} more records`}
                          </pre>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTask?.status === "COMPLETED" && results && (
                <DatasetExplorer 
                  datasetName={requirement?.entity || "Extracted Data"} 
                  records={results[Object.keys(results).sort().reverse()[0]] || []} 
                  taskId={activeTask.id}
                  onEnrichStart={async () => {
                    const token = localStorage.getItem("token");
                    try {
                      await fetch(`http://localhost:8000/api/workflow/task/${activeTask.id}/enrich`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      setActiveTask(prev => ({ ...prev, status: "RUNNING" }));
                    } catch (e) { console.error(e); }
                  }}
                />
              )}
            </div>
          )}

        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl sticky top-8">
            <h2 className="text-xl font-bold mb-4 uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">Workflow History</h2>
            
            {tasksHistory.length === 0 ? (
              <div className="text-zinc-600 text-sm py-4">No previous workflows found.</div>
            ) : (
              <div className="space-y-4">
                {tasksHistory.map(th => {
                  const date = new Date(th.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                  
                  return (
                    <div 
                      key={th.id}
                      onClick={() => {

                        const token = localStorage.getItem("token");
                        fetch(`http://localhost:8000/api/workflow/task/${th.id}`, { headers: { Authorization: `Bearer ${token}` } })
                          .then(r => r.json())
                          .then(data => {
                            setActiveTask(data);
                            setResults(data.results);
                          });
                      }}
                      className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors group"
                    >
                      <div className="text-sm font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">Task #{th.id}</div>
                      <div className="text-xs text-zinc-500 font-mono mb-2">{date}</div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          th.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>{th.status}</span>
                        <span className="text-xs text-zinc-400">View &rarr;</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
