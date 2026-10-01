"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { planWorkflow, executeWorkflowPlan, getRecordProvenance, createTask } from "@/lib/api";

export default function WorkflowsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<any>(null);

  const [isExecuting, setIsExecuting] = useState(false);
  const [execError, setExecError] = useState("");
  const [executionResult, setExecutionResult] = useState<any>(null);
  
  const [provenanceData, setProvenanceData] = useState<any>(null);
  const [isProvenanceLoading, setIsProvenanceLoading] = useState(false);
  const [provenanceError, setProvenanceError] = useState("");
  const [showProvenanceModal, setShowProvenanceModal] = useState(false);

  const loadProvenance = async (recordId: string) => {
    setShowProvenanceModal(true);
    setIsProvenanceLoading(true);
    setProvenanceError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const data = await getRecordProvenance(token, recordId);
      setProvenanceData(data);
    } catch (err: any) {
      setProvenanceError(err.message || "Failed to load provenance");
    } finally {
      setIsProvenanceLoading(false);
    }
  };

  useEffect(() => {
    const generatePlan = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        // Try to load context from localStorage that Requirement Engine saved
        const storedContext = localStorage.getItem("workflowContext");
        if (!storedContext) {
          setError("No requirement context found. Please start from the Requirement Engine.");
          setIsLoading(false);
          return;
        }

        const context = JSON.parse(storedContext);
        
        // Call the backend to generate the workflow plan
        const generatedPlan = await planWorkflow(token, {
          requirement_analysis: context.requirement_analysis,
          dataset_schema: context.dataset_schema,
          available_sources: context.available_sources
        });

        setPlan(generatedPlan);
      } catch (err: any) {
        setError(err.message || "Failed to generate workflow plan.");
      } finally {
        setIsLoading(false);
      }
    };

    generatePlan();
  }, [router]);

  const handleExecute = async () => {
    if (!plan) return;
    setIsExecuting(true);
    setExecError("");
    setExecutionResult(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication required");
      
      const storedContext = localStorage.getItem("workflowContext");
      const context = storedContext ? JSON.parse(storedContext) : {};
      
      const task = await createTask(token, { plan, context });
      router.push(`/tasks/${task.id}`);
    } catch (err: any) {
      setExecError(err.message || "Failed to execute workflow");
      setIsExecuting(false);
    }
  };

  return (
    <div className="p-8 min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b pb-4 dark:border-zinc-800">
          <h1 className="text-3xl font-bold">Dynamic Workflow Planner</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push("/requirements")} 
              className="text-sm bg-zinc-200 dark:bg-zinc-800 px-4 py-2 rounded font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
            >
              Back to Requirements
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-xl text-zinc-500 animate-pulse">AI is planning workflow...</div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            <span className="font-semibold">Error:</span> {error}
          </div>
        ) : plan ? (
          <div className="bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Workflow Plan: {plan.name}</h2>
            
            <div className="space-y-4">
              {plan.steps.map((step: any, index: number) => (
                <div key={index} className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mr-4 z-10 shrink-0">
                    {index + 1}
                  </div>
                  <div className="bg-white dark:bg-black p-4 rounded-xl border dark:border-zinc-800 flex-1 shadow-sm flex justify-between items-center relative">
                    {index < plan.steps.length - 1 && (
                      <div className="absolute left-[-1.25rem] top-10 w-0.5 h-12 bg-blue-200 dark:bg-blue-900 -z-10"></div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg uppercase tracking-wide text-blue-600 dark:text-blue-400">{step.type}</h3>
                      {step.source_id && (
                        <p className="text-sm text-zinc-500 mt-1">Source ID: {step.source_id}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {execError && (
              <div className="mt-8 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <span className="font-semibold">Execution Error:</span> {execError}
              </div>
            )}

            {!executionResult && (
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition text-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isExecuting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Executing Engine...
                    </>
                  ) : (
                    "Execute Plan (Phase 7) \u2192"
                  )}
                </button>
              </div>
            )}

            {executionResult && (
              <div className="mt-12 border-t dark:border-zinc-800 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                  <h2 className="text-2xl font-bold text-green-600 dark:text-green-400">Execution Successful</h2>
                </div>
                
                <div className="bg-white dark:bg-black border dark:border-zinc-800 rounded-xl p-6 shadow-sm mb-6">
                  <h3 className="text-lg font-semibold mb-4 border-b dark:border-zinc-800 pb-2">Steps Executed</h3>
                  <div className="flex flex-wrap gap-2">
                    {executionResult.steps_executed?.map((stepType: string, i: number) => (
                      <span key={i} className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-md text-sm font-medium">
                        {stepType}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-black border dark:border-zinc-800 rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-4 border-b dark:border-zinc-800 pb-2">Raw Collected Data</h3>
                  {executionResult.data_collected?.length > 0 ? (
                    <div className="space-y-4">
                      {executionResult.data_collected.map((doc: any, i: number) => (
                        <div key={i} className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border dark:border-zinc-800">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-mono bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded">
                              Source ID: {doc.source_id}
                            </span>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => loadProvenance("rec_123")} 
                                className="text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 px-3 py-1 rounded transition"
                              >
                                View Evidence
                              </button>
                              <span className="text-xs text-zinc-500 font-mono truncate max-w-[200px]" title={doc.url}>
                                {doc.url}
                              </span>
                            </div>
                          </div>
                          <pre className="text-sm font-mono whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 mt-3 p-3 bg-white dark:bg-black border dark:border-zinc-800 rounded">
                            {doc.content_preview}
                          </pre>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500">No data collected.</p>
                  )}
                </div>
              </div>
            )}
            
            {showProvenanceModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                  <div className="sticky top-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur border-b dark:border-zinc-800 p-6 flex justify-between items-center z-10">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      </span>
                      Data Provenance & Traceability
                    </h2>
                    <button 
                      onClick={() => setShowProvenanceModal(false)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                  
                  <div className="p-6">
                    {isProvenanceLoading ? (
                      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                        <p>Tracing cryptographic provenance...</p>
                      </div>
                    ) : provenanceError ? (
                      <div className="bg-red-100 text-red-700 p-4 rounded-lg">{provenanceError}</div>
                    ) : provenanceData ? (
                      <div className="space-y-8 animate-in fade-in duration-300">
                        
                        {/* Summary Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Source ID</div>
                            <div className="font-mono text-sm">{provenanceData.source_id}</div>
                          </div>
                          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Validation</div>
                            <div className="font-bold text-green-600">{provenanceData.validation_status}</div>
                          </div>
                          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800 col-span-2">
                            <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Source URL</div>
                            <div className="text-sm truncate text-blue-600" title={provenanceData.source_url}>{provenanceData.source_url}</div>
                          </div>
                        </div>

                        {/* Timestamps */}
                        <div>
                          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Timeline</h3>
                          <div className="flex items-center gap-4 text-sm bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                              <span className="text-zinc-500">Retrieved:</span>
                              <span className="font-mono">{new Date(provenanceData.retrieved_at).toLocaleString()}</span>
                            </div>
                            <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700"></div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                              <span className="text-zinc-500">Extracted:</span>
                              <span className="font-mono">{new Date(provenanceData.extraction_timestamp).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Transformations */}
                        <div>
                          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Transformation History</h3>
                          <ul className="space-y-2 font-mono text-sm">
                            {provenanceData.transformation_history?.map((t: string, i: number) => (
                              <li key={i} className="bg-zinc-100 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg flex items-center gap-3">
                                <span className="text-zinc-400">&gt;</span> {t}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Field Level Provenance */}
                        <div>
                          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-3">Field-Level Traceability</h3>
                          <div className="border dark:border-zinc-800 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b dark:border-zinc-800">
                                <tr>
                                  <th className="px-4 py-3 font-semibold">Field</th>
                                  <th className="px-4 py-3 font-semibold">Value</th>
                                  <th className="px-4 py-3 font-semibold text-right">Confidence</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y dark:divide-zinc-800">
                                {Object.entries(provenanceData.field_provenance || {}).map(([field, prov]: [string, any], i) => (
                                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition">
                                    <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400">{field}</td>
                                    <td className="px-4 py-3 font-semibold">{prov.value}</td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded font-mono text-xs">
                                        {(prov.confidence * 100).toFixed(0)}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
