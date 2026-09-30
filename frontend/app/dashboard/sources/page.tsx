"use client";
import { useEffect, useState } from "react";
import { getSources, createSource } from "@/lib/api";

export default function SourcesPage() {
  const [sources, setSources] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  
  const [name, setName] = useState("");
  const [type, setType] = useState("web");
  const [url, setUrl] = useState("");
  const [fields, setFields] = useState("");
  const [method, setMethod] = useState("standard_web");

  const loadSources = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      const data = await getSources(token);
      setSources(data);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (token) {
      const supported_fields = fields.split(",").map(s => s.trim()).filter(Boolean);
      await createSource(token, {
        name,
        type,
        url_or_api: url,
        supported_fields,
        extraction_method: method
      });
      setName(""); setUrl(""); setFields("");
      setIsCreating(false);
      loadSources();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8 border-b pb-4 dark:border-zinc-800">
        <h1 className="text-3xl font-bold">Source Registry</h1>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded font-medium hover:opacity-90 transition"
        >
          {isCreating ? "Cancel" : "Add Source"}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-6 rounded-xl mb-8 flex flex-col gap-4 max-w-2xl shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Register New Source</h2>
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Source Name (e.g. Example Jobs)" value={name} onChange={e=>setName(e.target.value)} required className="border p-2 rounded dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={type} onChange={e=>setType(e.target.value)} className="border p-2 rounded dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="web">Web</option>
              <option value="api">API</option>
              <option value="dataset">Public Dataset</option>
            </select>
            <input type="text" placeholder="URL or API Endpoint" value={url} onChange={e=>setUrl(e.target.value)} required className="border p-2 rounded dark:bg-zinc-800 col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <input type="text" placeholder="Supported Fields (comma separated, e.g. company, role)" value={fields} onChange={e=>setFields(e.target.value)} required className="border p-2 rounded dark:bg-zinc-800 col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={method} onChange={e=>setMethod(e.target.value)} className="border p-2 rounded dark:bg-zinc-800 col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="standard_web">Standard Web Scraper</option>
              <option value="rest_api">REST API</option>
              <option value="graphql">GraphQL</option>
            </select>
          </div>
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white p-2 rounded font-medium mt-2 transition">Save Source</button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sources.map(s => (
          <div key={s.id} className="bg-white dark:bg-zinc-900 border dark:border-zinc-800 p-6 rounded-xl shadow-sm hover:border-blue-500 transition">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {s.allowed && <span className="text-green-500 text-xl leading-none">✓</span>}
                {s.name}
              </h3>
              <span className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-400 uppercase tracking-wider font-semibold">{s.type}</span>
            </div>
            <p className="text-sm text-zinc-500 mb-4 truncate font-mono" title={s.url_or_api}>{s.url_or_api}</p>
            <div className="mb-4">
              <div className="text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Supported Fields</div>
              <div className="flex flex-wrap gap-2">
                {s.supported_fields.map((f: string, i: number) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded font-medium border border-blue-100 dark:border-blue-800">
                    {f}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-xs text-zinc-500 border-t dark:border-zinc-800 pt-3">
              Method: <span className="font-medium text-zinc-700 dark:text-zinc-300">{s.extraction_method}</span>
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <div className="col-span-full text-zinc-500 p-8 border border-dashed rounded-xl text-center">
            No sources registered. Add one to expand the AI's capabilities!
          </div>
        )}
      </div>
    </div>
  );
}
