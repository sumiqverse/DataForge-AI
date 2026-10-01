"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { analyzeRequirement, generateSchema, matchSources } from "@/lib/api";

export default function RequirementsPage() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const [schema, setSchema] = useState<any>(null);
  const [isGeneratingSchema, setIsGeneratingSchema] = useState(false);
  
  const [compatibleSources, setCompatibleSources] = useState<any[]>([]);
  const [isMatchingSources, setIsMatchingSources] = useState(false);
  const [matchError, setMatchError] = useState("");

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
    setSchema(null);
    setCompatibleSources([]);
    setMatchError("");

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

  const fetchCompatibleSources = async (schemaFields: any[]) => {
    setIsMatchingSources(true);
    setMatchError("");
    setCompatibleSources([]);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");
      const fieldNames = schemaFields.map((f: any) => f.name);
      const matched = await matchSources(token, fieldNames);
      setCompatibleSources(matched);
    } catch (err: any) {
      setMatchError(err.message || "Failed to load compatible sources");
    } finally {
      setIsMatchingSources(false);
    }
  };

  const handleGenerateSchema = async () => {
    if (!result) return;
    setIsGeneratingSchema(true);
    setError("");
    setCompatibleSources([]);
    setMatchError("");
    
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");
      const schemaData = await generateSchema(token, result);
      setSchema(schemaData);
      // Automatically fetch compatible sources using the generated schema fields
      await fetchCompatibleSources(schemaData.fields);
    } catch (err: any) {
      setError(err.message || "Failed to generate schema");
    } finally {
      setIsGeneratingSchema(false);
    }
  };

  const updateField = (index: number, key: string, value: any) => {
    const newSchema = { ...schema };
    newSchema.fields[index][key] = value;
    setSchema(newSchema);
  };
  
  const removeField = (index: number) => {
    const newSchema = { ...schema };
    newSchema.fields.splice(index, 1);
    setSchema(newSchema);
  };

  return (
    <div className="p-8 min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b pb-4 dark:border-zinc-800">
          <h1 className="text-3xl font-bold">Requirement Engine</h1>
          <button onClick={() => router.push("/dashboard")} className="text-sm bg-zinc-200 dark:bg-zinc-800 px-4 py-2 rounded font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition">
            Back to Dashboard
          </button>
        </div>

        <form onSubmit={handleAnalyze} className="mb-10 max-w-4xl">
          <label className="block text-sm font-medium mb-2">What data do you want to collect?</label>
          <textarea 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full p-4 border rounded-xl bg-transparent dark:border-zinc-800 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg mb-4"
            placeholder='e.g. "Find AI/ML internships in Delhi NCR with company, role, stipend, deadline and application URL."'
            disabled={isLoading || isGeneratingSchema}
          />
          <button 
            type="submit" 
            disabled={isLoading || isGeneratingSchema || !prompt.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition text-lg"
          >
            {isLoading ? "Analyzing..." : "Analyze Requirement"}
          </button>
        </form>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 max-w-4xl">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-8 items-stretch">
          {/* Phase 2 Result */}
          {result && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-8 shadow-sm w-full">
              <h2 className="text-2xl font-bold mb-6 pb-4 border-b dark:border-zinc-800">1. Analysis Result</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm text-zinc-500 uppercase tracking-wider mb-2 font-semibold">Detected Intent & Entity</h3>
                  <div className="bg-white dark:bg-black p-4 rounded-lg border dark:border-zinc-800 flex gap-4 items-center">
                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">Intent: {result.intent}</span>
                    <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">Entity: {result.entity}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm text-zinc-500 uppercase tracking-wider mb-2 font-semibold">Description</h3>
                  <p className="bg-white dark:bg-black p-4 rounded-lg border dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">{result.description}</p>
                </div>

                <div>
                  <h3 className="text-sm text-zinc-500 uppercase tracking-wider mb-2 font-semibold">Requested Fields</h3>
                  <div className="bg-white dark:bg-black p-4 rounded-lg border dark:border-zinc-800 flex flex-wrap gap-2">
                    {result.requested_fields && result.requested_fields.map((field: string, i: number) => (
                      <span key={i} className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded border dark:border-zinc-700 text-sm">
                        {field}
                      </span>
                    ))}
                    {(!result.requested_fields || result.requested_fields.length === 0) && (
                      <span className="text-zinc-500 italic text-sm">None specified</span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm text-zinc-500 uppercase tracking-wider mb-2 font-semibold">Filters & Constraints</h3>
                  <div className="bg-white dark:bg-black p-4 rounded-lg border dark:border-zinc-800 text-sm space-y-2">
                    {result.location && <div><span className="font-semibold">Location:</span> {result.location}</div>}
                    {result.filters && Object.keys(result.filters).length > 0 && (
                      <div>
                        <span className="font-semibold block mb-1">Filters:</span>
                        <ul className="list-disc pl-5">
                          {Object.entries(result.filters).map(([k, v]: [string, any]) => (
                            <li key={k}><span className="text-zinc-500">{k}:</span> {v}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.constraints && result.constraints.length > 0 && (
                      <div>
                        <span className="font-semibold block mb-1">Constraints:</span>
                        <ul className="list-disc pl-5">
                          {result.constraints.map((c: string, i: number) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!result.location && (!result.filters || Object.keys(result.filters).length === 0) && (!result.constraints || result.constraints.length === 0) && (
                      <span className="text-zinc-500 italic">None detected</span>
                    )}
                  </div>
                </div>

                {result.ambiguity_flags && result.ambiguity_flags.length > 0 && (
                  <div>
                    <h3 className="text-sm text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2 font-semibold">Ambiguities / Clarifications</h3>
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
              
              {!schema && (
                <div className="mt-8 pt-6 border-t dark:border-zinc-800 flex justify-end">
                   <button 
                    onClick={handleGenerateSchema}
                    disabled={isGeneratingSchema}
                    className="bg-black text-white dark:bg-white dark:text-black px-6 py-2 rounded font-medium hover:opacity-90 transition disabled:opacity-50"
                   >
                     {isGeneratingSchema ? "Generating Schema..." : "Generate Dataset Schema \u2192"}
                   </button>
                </div>
              )}
            </div>
          )}

          {/* Phase 3 Schema Generation */}
          {schema && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-8 shadow-sm w-full overflow-x-auto">
              <h2 className="text-2xl font-bold mb-6 pb-4 border-b dark:border-zinc-800">2. Dataset Schema</h2>
              <p className="text-sm text-zinc-500 mb-6">Review and edit the generated schema fields below before proceeding.</p>

              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b dark:border-zinc-800">
                    <th className="pb-3 pr-4 font-semibold">Name</th>
                    <th className="pb-3 pr-4 font-semibold">Type</th>
                    <th className="pb-3 pr-4 font-semibold">Required</th>
                    <th className="pb-3 pr-4 font-semibold">Description / Rules</th>
                    <th className="pb-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-zinc-800">
                  {schema.fields.map((field: any, i: number) => (
                    <tr key={i} className="hover:bg-black/5 dark:hover:bg-white/5 transition">
                      <td className="py-4 pr-4 align-top">
                        <input 
                          type="text" 
                          value={field.name} 
                          onChange={e => updateField(i, 'name', e.target.value)}
                          className="w-full bg-transparent border dark:border-zinc-700 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 font-mono text-xs"
                        />
                        <input 
                          type="text" 
                          value={field.display_name} 
                          onChange={e => updateField(i, 'display_name', e.target.value)}
                          className="w-full bg-transparent border dark:border-zinc-700 rounded px-2 py-1 mt-2 focus:ring-1 focus:ring-blue-500 text-xs text-zinc-500"
                          placeholder="Display Name"
                        />
                      </td>
                      <td className="py-4 pr-4 align-top">
                        <select 
                          value={field.type}
                          onChange={e => updateField(i, 'type', e.target.value)}
                          className="w-full bg-transparent border dark:border-zinc-700 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="text">Text</option>
                          <option value="number">Number</option>
                          <option value="currency">Currency</option>
                          <option value="date">Date</option>
                          <option value="url">URL</option>
                          <option value="boolean">Boolean</option>
                        </select>
                      </td>
                      <td className="py-4 pr-4 align-top text-center">
                        <input 
                          type="checkbox"
                          checked={field.required}
                          onChange={e => updateField(i, 'required', e.target.checked)}
                          className="w-4 h-4 mt-2 cursor-pointer"
                        />
                      </td>
                      <td className="py-4 pr-4 align-top">
                        <div className="space-y-2">
                          <textarea 
                            value={field.description}
                            onChange={e => updateField(i, 'description', e.target.value)}
                            className="w-full bg-transparent border dark:border-zinc-700 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 text-xs min-h-[40px]"
                            placeholder="Description"
                          />
                          <input 
                            type="text" 
                            value={field.normalization_rule || ""} 
                            onChange={e => updateField(i, 'normalization_rule', e.target.value)}
                            className="w-full bg-transparent border dark:border-zinc-700 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 text-xs text-blue-600 dark:text-blue-400"
                            placeholder="Normalization (optional)"
                          />
                          <input 
                            type="text" 
                            value={field.validation_rule || ""} 
                            onChange={e => updateField(i, 'validation_rule', e.target.value)}
                            className="w-full bg-transparent border dark:border-zinc-700 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 text-xs text-orange-600 dark:text-orange-400"
                            placeholder="Validation (optional)"
                          />
                        </div>
                      </td>
                      <td className="py-4 align-top text-right">
                        <button 
                          onClick={() => removeField(i)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 px-3 py-1 rounded text-xs transition font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {schema.fields.length === 0 && (
                <div className="text-center py-8 text-zinc-500 italic">No fields in schema.</div>
              )}
              
              <div className="mt-8 pt-6 border-t dark:border-zinc-800 flex justify-between items-center">
                <button 
                  onClick={() => fetchCompatibleSources(schema.fields)}
                  disabled={isMatchingSources || schema.fields.length === 0}
                  className="text-sm bg-zinc-200 dark:bg-zinc-800 px-4 py-2 rounded font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition disabled:opacity-50"
                >
                  {isMatchingSources ? "Matching..." : "↻ Re-match Sources"}
                </button>
              </div>
            </div>
          )}

          {/* Phase 4: Compatible Sources */}
          {schema && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-8 shadow-sm w-full">
              <h2 className="text-2xl font-bold mb-2 pb-4 border-b dark:border-zinc-800">3. Compatible Sources</h2>
              <p className="text-sm text-zinc-500 mb-6">Sources available from your Source Registry that match the generated schema fields.</p>

              {/* Loading state */}
              {isMatchingSources && (
                <div className="flex items-center gap-3 py-8 justify-center text-zinc-500">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-lg">Finding compatible sources...</span>
                </div>
              )}

              {/* Error state */}
              {matchError && !isMatchingSources && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                  <span className="font-semibold">Error:</span> {matchError}
                  <button 
                    onClick={() => fetchCompatibleSources(schema.fields)} 
                    className="ml-4 underline hover:no-underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty state */}
              {!isMatchingSources && !matchError && compatibleSources.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-zinc-500 text-lg mb-2">No compatible enabled sources found.</div>
                  <p className="text-sm text-zinc-400">Add or enable a source in <a href="/dashboard/sources" className="text-blue-500 underline hover:text-blue-600">Source Registry</a> that supports the requested fields.</p>
                </div>
              )}

              {/* Results */}
              {!isMatchingSources && !matchError && compatibleSources.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {compatibleSources.map((src: any) => (
                    <div key={src.id} className="bg-white dark:bg-black border dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:border-blue-500 transition">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          <span className="text-green-500 text-xl">✓</span>
                          {src.name}
                        </h3>
                        <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 uppercase tracking-wider font-semibold">{src.type}</span>
                      </div>
                      {src.base_url && (
                        <p className="text-xs text-zinc-500 font-mono mb-4 truncate" title={src.base_url}>{src.base_url}</p>
                      )}

                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">Matched Fields</h4>
                        <div className="flex flex-wrap gap-2">
                          {src.matched_fields.map((f: string, i: number) => (
                            <span key={i} className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2.5 py-1 rounded font-medium border border-green-200 dark:border-green-800">✓ {f}</span>
                          ))}
                        </div>
                      </div>

                      {src.missing_fields.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 mb-2">Missing Fields</h4>
                          <div className="flex flex-wrap gap-2">
                            {src.missing_fields.map((f: string, i: number) => (
                              <span key={i} className="text-xs bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 px-2.5 py-1 rounded font-medium border border-zinc-200 dark:border-zinc-700">{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
