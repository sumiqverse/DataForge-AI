"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTask, cancelTask } from "@/lib/api";

export default function TaskProgressPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [task, setTask] = useState<any>(null);
  const [error, setError] = useState("");
  const taskId = parseInt(params.id, 10);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const fetchTask = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const data = await getTask(token, taskId);
        setTask(data);
        
        if (["COMPLETED", "FAILED", "CANCELLED"].includes(data.status)) {
          clearInterval(interval);
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch task");
        clearInterval(interval);
      }
    };
    
    fetchTask();
    interval = setInterval(fetchTask, 2000);
    return () => clearInterval(interval);
  }, [taskId, router]);

  const handleCancel = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      await cancelTask(token, taskId);
    } catch (err: any) {
      alert("Failed to cancel: " + err.message);
    }
  };

  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!task) return <div className="p-8">Loading task {taskId}...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
            Task Execution
          </h1>
          <p className="text-zinc-500">Live monitoring for Task #{task.id}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`px-4 py-1.5 rounded-full font-bold text-sm ${
            task.status === "RUNNING" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse" :
            task.status === "COMPLETED" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
            task.status === "FAILED" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
            task.status === "CANCELLED" ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" :
            "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          }`}>
            {task.status}
          </div>
          
          {["QUEUED", "RUNNING"].includes(task.status) && (
            <button 
              onClick={handleCancel}
              className="px-4 py-1.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
            >
              Cancel Task
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Steps Progress */}
          <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 border-b dark:border-zinc-800 pb-2">Execution Steps</h3>
            {task.steps?.length === 0 ? (
              <p className="text-zinc-500 text-sm">Waiting to start...</p>
            ) : (
              <ul className="space-y-4">
                {task.steps.map((step: any, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {step.status === "completed" ? (
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      ) : step.status === "running" ? (
                        <div className="w-5 h-5 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin"></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">
                        {step.type}
                      </p>
                      <p className="text-xs text-zinc-500">{step.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Live Terminal Logs */}
          <div className="bg-zinc-950 border dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col h-[400px]">
            <h3 className="text-lg font-semibold mb-4 border-b border-zinc-800 pb-2 text-zinc-100 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
              Execution Logs
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs text-zinc-300 pr-2 custom-scrollbar flex flex-col-reverse">
              {/* Flex col reverse trick to keep scrolled to bottom if we map backwards */}
              <div className="space-y-1 flex flex-col pb-2">
                {task.logs?.map((log: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-zinc-500 flex-shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={
                      log.level === "error" ? "text-red-400 font-bold" :
                      log.level === "warn" ? "text-orange-400" :
                      "text-zinc-300"
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Results Summary if Completed */}
          {task.status === "COMPLETED" && task.results?.data && (
            <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 border-b dark:border-zinc-800 pb-2 text-green-600">Execution Results</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                Successfully processed {task.results.data.length} records.
              </p>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {task.results.data.map((doc: any, i: number) => (
                  <div key={i} className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border dark:border-zinc-800 text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-xs text-indigo-600">Source: {doc.source_id}</span>
                      <a href={doc.url} target="_blank" className="text-blue-500 hover:underline truncate max-w-[200px] text-xs" title={doc.url}>
                        {doc.url}
                      </a>
                    </div>
                    <p className="text-xs text-zinc-500 truncate">{doc.content_preview}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
