"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTasks } from "@/lib/api";

export default function HistoryPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const data = await getTasks(token);
        setTasks(data);
      } catch (err: any) {
        setError(err.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [router]);

  return (
    <div className="p-8 max-w-[1400px] mx-auto min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="flex justify-between items-center mb-8 border-b pb-4 dark:border-zinc-800">
        <h1 className="text-3xl font-bold">Workflows</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="text-center p-12 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800">
          <h3 className="text-xl font-medium text-zinc-600 dark:text-zinc-400">No history found</h3>
          <p className="mt-2 text-sm text-zinc-500">Execute a workflow to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tasks.map((task) => {
            const plan = task.metadata_snapshot?.plan || {};
            const context = task.metadata_snapshot?.context || {};
            const recordsGenerated = task.results?.collected_records?.length || 0;
            
            return (
              <div 
                key={task.id} 
                onClick={() => setSelectedTask(task)}
                className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:shadow-md cursor-pointer transition hover:border-indigo-500 flex justify-between items-center"
              >
                <div>
                  <h3 className="text-xl font-semibold mb-1">{plan.name || `Workflow Task #${task.id}`}</h3>
                  <p className="text-sm text-zinc-500 truncate max-w-xl">
                    Request: {context.requirement_analysis?.original_prompt || "N/A"}
                  </p>
                  <p className="text-xs text-zinc-400 mt-2">
                    {new Date(task.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold inline-block mb-2 ${
                    task.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    task.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    task.status === 'RUNNING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {task.status}
                  </div>
                  <div className="text-sm font-medium">
                    {recordsGenerated} Records
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="sticky top-0 bg-zinc-50 dark:bg-zinc-900 p-4 border-b dark:border-zinc-800 flex justify-between items-center z-10">
              <h3 className="font-bold text-xl">Execution Snapshot: {selectedTask.metadata_snapshot?.plan?.name || `#${selectedTask.id}`}</h3>
              <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded">Close</button>
            </div>
            
            <div className="p-6 space-y-8">
              {/* Header Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Status</div>
                  <div className="font-bold">{selectedTask.status}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Date</div>
                  <div className="font-bold text-sm">{new Date(selectedTask.created_at).toLocaleString()}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Records Generated</div>
                  <div className="font-bold">{selectedTask.results?.collected_records?.length || 0}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Duration</div>
                  <div className="font-bold text-sm">
                    {selectedTask.updated_at ? `${((new Date(selectedTask.updated_at).getTime() - new Date(selectedTask.created_at).getTime()) / 1000).toFixed(1)}s` : '-'}
                  </div>
                </div>
                
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Valid Records</div>
                  <div className="font-bold text-green-600 dark:text-green-400">
                    {selectedTask.results?.validation_stats?.valid || 0} ({(selectedTask.results?.validation_stats?.valid_percentage || 0).toFixed(1)}%)
                  </div>
                </div>
                
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Duplicates Merged</div>
                  <div className="font-bold text-orange-600 dark:text-orange-400">
                    {selectedTask.results?.duplicate_stats?.merged || 0}
                  </div>
                </div>
              </div>

              {/* Requirement & Prompt */}
              <div>
                <h4 className="text-lg font-bold border-b dark:border-zinc-800 pb-2 mb-4">Original Request</h4>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl font-mono text-sm">
                  {selectedTask.metadata_snapshot?.context?.requirement_analysis?.original_prompt || "N/A"}
                </div>
              </div>

              {/* Requirement Analysis */}
              <div>
                <h4 className="text-lg font-bold border-b dark:border-zinc-800 pb-2 mb-4">Requirement Analysis</h4>
                <pre className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl text-xs overflow-x-auto border dark:border-zinc-800">
                  {JSON.stringify(selectedTask.metadata_snapshot?.context?.requirement_analysis, null, 2)}
                </pre>
              </div>

              {/* Dataset Schema */}
              <div>
                <h4 className="text-lg font-bold border-b dark:border-zinc-800 pb-2 mb-4">Generated Schema</h4>
                <pre className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl text-xs overflow-x-auto border dark:border-zinc-800 text-green-600 dark:text-green-400">
                  {JSON.stringify(selectedTask.metadata_snapshot?.context?.dataset_schema, null, 2)}
                </pre>
              </div>

              {/* Selected Sources */}
              <div>
                <h4 className="text-lg font-bold border-b dark:border-zinc-800 pb-2 mb-4">Selected Sources</h4>
                <pre className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl text-xs overflow-x-auto border dark:border-zinc-800 text-blue-600 dark:text-blue-400">
                  {JSON.stringify(selectedTask.metadata_snapshot?.context?.available_sources, null, 2)}
                </pre>
              </div>
              
              {/* Workflow Plan */}
              <div>
                <h4 className="text-lg font-bold border-b dark:border-zinc-800 pb-2 mb-4">Workflow Execution Plan</h4>
                <pre className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl text-xs overflow-x-auto border dark:border-zinc-800 text-orange-600 dark:text-orange-400">
                  {JSON.stringify(selectedTask.metadata_snapshot?.plan, null, 2)}
                </pre>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
