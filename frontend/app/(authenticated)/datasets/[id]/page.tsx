"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDataset, getDatasetRecords, getRecordProvenance, createEnrichmentPlan, createTask, askDatasetIntelligence } from "@/lib/api";

export default function DatasetExplorerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const datasetId = params.id;
  
  const [dataset, setDataset] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Table state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Provenance state
  const [showProvModal, setShowProvModal] = useState(false);
  const [provData, setProvData] = useState<any>(null);
  const [provLoading, setProvLoading] = useState(false);

  // Enrichment state
  const [showEnrichModal, setShowEnrichModal] = useState(false);
  const [enrichPrompt, setEnrichPrompt] = useState("");
  const [enrichPlan, setEnrichPlan] = useState<any>(null);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [enrichError, setEnrichError] = useState("");

  // Intelligence Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: string, content: string, filtersApplied?: any[]}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [datasetId, page, sortBy, sortOrder, statusFilter]);
  
  // Separate effect for search debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setPage(1); // reset to page 1 on search
      fetchData();
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");
      
      setLoading(true);
      if (!dataset) {
        const ds = await getDataset(token, datasetId);
        setDataset(ds);
      }
      
      const recordsData = await getDatasetRecords(
        token, datasetId, page, search, sortBy, sortOrder, statusFilter
      );
      
      setRecords(recordsData.data);
      setTotal(recordsData.total);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadProvenance = async (recordId: string) => {
    setShowProvModal(true);
    setProvLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const data = await getRecordProvenance(token, recordId);
        setProvData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProvLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleExport = (format: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    const params = new URLSearchParams({ format });
    if (search) params.append("search", search);
    if (sortBy) params.append("sort_by", sortBy);
    if (sortOrder) params.append("sort_order", sortOrder);
    if (statusFilter) params.append("status_filter", statusFilter);
    
    // Trigger download
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/api/datasets/${datasetId}/export?${params.toString()}`;
  };

  const handleGenerateEnrichmentPlan = async () => {
    if (!enrichPrompt) return;
    setEnrichLoading(true);
    setEnrichError("");
    try {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");
      const plan = await createEnrichmentPlan(token, datasetId, enrichPrompt);
      setEnrichPlan(plan);
    } catch (err: any) {
      setEnrichError(err.message || "Failed to generate plan");
    } finally {
      setEnrichLoading(false);
    }
  };

  const handleExecuteEnrichment = async () => {
    if (!enrichPlan) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");
      const context = {
        requirement_analysis: { original_prompt: enrichPrompt },
        dataset_schema: enrichPlan.dataset_schema,
        available_sources: enrichPlan.recommended_sources
      };
      
      const payload = {
        plan: enrichPlan.workflow,
        context,
        is_enrichment: true,
        dataset_id: parseInt(datasetId)
      };
      
      const task = await createTask(token, payload);
      router.push(`/tasks/${task.id}`);
    } catch (err: any) {
      setEnrichError(err.message || "Failed to execute enrichment task");
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) return router.push("/login");
      
      const res = await askDatasetIntelligence(token, datasetId, userMsg);
      
      if (res.type === "FILTER_RESULTS") {
        setChatMessages(prev => [...prev, { 
          role: "ai", 
          content: `I applied the filter. Found ${res.count} records matching your criteria.`, 
          filtersApplied: res.filters_applied 
        }]);
        setRecords(res.data);
        setTotal(res.count);
      } else {
        setChatMessages(prev => [...prev, { role: "ai", content: res.response }]);
      }
      
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: "error", content: "Failed to process query: " + err.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!dataset) return <div className="p-8 flex justify-center"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

  const columns = Object.keys(dataset.schema_definition || {});

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
            {dataset.name}
          </h1>
          <p className="text-zinc-500 mt-1">
            Total Records: {total} | Dynamic Schema Columns: {columns.length}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setChatOpen(!chatOpen)} 
            className="px-4 py-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-sm font-bold transition shadow-sm border border-indigo-200 dark:border-indigo-800"
          >
            ✨ AI Assistant
          </button>
          <button 
            onClick={() => { setShowEnrichModal(true); setEnrichPlan(null); setEnrichPrompt(""); setEnrichError(""); }} 
            className="px-4 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded hover:opacity-90 text-sm font-medium transition shadow-sm"
          >
            ✧ Enrich Missing Data
          </button>
          <button onClick={() => handleExport("csv")} className="px-3 py-1.5 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-medium transition">
            Export CSV
          </button>
          <button onClick={() => handleExport("json")} className="px-3 py-1.5 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-medium transition">
            Export JSON
          </button>
          <button onClick={() => handleExport("xlsx")} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800 text-sm font-medium transition">
            Export XLSX
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border dark:border-zinc-800">
        <input 
          type="text" 
          placeholder="Search records..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-black border dark:border-zinc-800 rounded-lg flex-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        
        <select 
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2 bg-white dark:bg-black border dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="VALID">Valid</option>
          <option value="NEEDS_REVIEW">Needs Review</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-black border dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4 font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                {columns.map(col => (
                  <th 
                    key={col} 
                    className="px-6 py-4 font-semibold text-zinc-500 uppercase tracking-wider cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                    onClick={() => handleSort(col)}
                  >
                    <div className="flex items-center gap-2">
                      {col}
                      {sortBy === col && (
                        <span className="text-indigo-500">
                          {sortOrder === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-zinc-800">
              {loading && records.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="text-center py-12">
                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : records.map((r, i) => (
                <tr key={r.id || i} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold inline-block w-max ${
                        r.status === 'VALID' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      }`}>
                        {r.status}
                      </span>
                      {r.duplicate_status !== 'UNIQUE' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 inline-block w-max uppercase tracking-wider">
                          {r.duplicate_status}
                        </span>
                      )}
                    </div>
                  </td>
                  
                  {columns.map(col => (
                    <td key={col} className="px-6 py-4">
                      {r.values?.[col] !== undefined && r.values?.[col] !== null 
                        ? String(r.values[col]) 
                        : <span className="text-zinc-400 italic">null</span>}
                    </td>
                  ))}
                  
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => loadProvenance(r.id)}
                      className="text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      View Provenance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="bg-zinc-50 dark:bg-zinc-900/50 px-6 py-4 border-t dark:border-zinc-800 flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            Showing page {page} ({(page - 1) * 10 + 1} - {Math.min(page * 10, total)} of {total})
          </span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-md border dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={page * 10 >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-md border dark:border-zinc-700 bg-white dark:bg-zinc-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Provenance Modal (reused from workflow page logic roughly) */}
      {showProvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 border-b dark:border-zinc-800 flex justify-between">
              <h3 className="font-bold">Record Provenance</h3>
              <button onClick={() => setShowProvModal(false)}>Close</button>
            </div>
            <div className="p-6">
              {provLoading ? (
                <div>Loading trace...</div>
              ) : provData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded border dark:border-zinc-800">
                      <div className="text-xs text-zinc-500">Source ID</div>
                      <div>{provData.source_id}</div>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded border dark:border-zinc-800">
                      <div className="text-xs text-zinc-500">URL</div>
                      <div className="truncate text-blue-500"><a href={provData.source_url} target="_blank">{provData.source_url}</a></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold mb-2">Transformations</h4>
                    <ul className="text-xs font-mono space-y-1">
                      {provData.transformation_history?.map((t: string, i: number) => <li key={i}>&gt; {t}</li>)}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="text-red-500">Provenance data not found or not stored for this record.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enrichment Modal */}
      {showEnrichModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 border-b dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">✧ AI Dataset Enrichment</h3>
              <button onClick={() => setShowEnrichModal(false)} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">Close</button>
            </div>
            
            <div className="p-6">
              {!enrichPlan ? (
                <>
                  <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                    Instruct the AI to find missing information for records in this dataset. It will automatically deduce which fields are missing and launch a collection workflow to fill them.
                  </p>
                  <textarea 
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 rounded-lg p-4 mb-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[120px]"
                    placeholder="e.g., Find missing stipend information for these internship records..."
                    value={enrichPrompt}
                    onChange={(e) => setEnrichPrompt(e.target.value)}
                  />
                  {enrichError && <div className="text-red-500 text-sm mb-4">{enrichError}</div>}
                  <div className="flex justify-end">
                    <button 
                      onClick={handleGenerateEnrichmentPlan}
                      disabled={enrichLoading || !enrichPrompt.trim()}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                      {enrichLoading ? "Analyzing..." : "Generate Enrichment Plan"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6 space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-xl border border-green-200 dark:border-green-900/50">
                      <h4 className="font-bold mb-1">Enrichment Plan Ready</h4>
                      <p className="text-sm">The AI has analyzed your request and prepared the following workflow.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
                        <h4 className="text-xs font-bold uppercase text-zinc-500 mb-2">Fields Targeted</h4>
                        <div className="flex flex-wrap gap-2">
                          {enrichPlan.dataset_schema.map((f: any) => (
                            <span key={f.name} className="px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 text-xs rounded font-medium">
                              {f.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border dark:border-zinc-800">
                        <h4 className="text-xs font-bold uppercase text-zinc-500 mb-2">Sources Used</h4>
                        <div className="flex flex-wrap gap-2">
                          {enrichPlan.recommended_sources.map((s: string) => (
                            <span key={s} className="px-2 py-1 bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-xs rounded font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {enrichError && <div className="text-red-500 text-sm mb-4">{enrichError}</div>}
                  
                  <div className="flex justify-between items-center mt-8">
                    <button onClick={() => setEnrichPlan(null)} className="text-zinc-500 hover:text-zinc-800 dark:hover:text-white px-4 py-2">
                      Back
                    </button>
                    <button 
                      onClick={handleExecuteEnrichment}
                      className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition font-bold"
                    >
                      Execute Enrichment Workflow
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Widget */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl shadow-2xl flex flex-col z-40 overflow-hidden">
          <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
            <div>
              <h3 className="font-bold text-sm">DataForge Intelligence</h3>
              <p className="text-xs opacity-80">Filter, analyze, and chat with your dataset</p>
            </div>
            <button onClick={() => setChatOpen(false)} className="opacity-80 hover:opacity-100 p-2">✕</button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-900/50">
            {chatMessages.length === 0 ? (
              <div className="text-center text-zinc-500 text-sm mt-8">
                Ask a question like:
                <br />
                <span className="italic mt-2 block opacity-70">"Show internships paying more than 25000"</span>
                <span className="italic block opacity-70">"How many are remote?"</span>
                <span className="italic block opacity-70">"Are there any anomalies here?"</span>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-sm' 
                      : msg.role === 'error'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 rounded-bl-sm'
                      : 'bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-bl-sm shadow-sm'
                  }`}>
                    {msg.content}
                    {msg.filtersApplied && (
                      <div className="mt-2 text-xs bg-zinc-100 dark:bg-zinc-900 p-2 rounded text-zinc-500 font-mono">
                        Applied AST:<br/>
                        {JSON.stringify(msg.filtersApplied, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex items-start">
                <div className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 p-3 rounded-2xl rounded-bl-sm shadow-sm flex gap-1">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: "150ms"}}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: "300ms"}}></div>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-white dark:bg-zinc-950 border-t dark:border-zinc-800">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask your dataset..."
                className="flex-1 bg-zinc-100 dark:bg-zinc-900 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 border dark:border-zinc-800"
              />
              <button 
                onClick={handleSendChat}
                disabled={!chatInput.trim() || chatLoading}
                className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 transition"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
