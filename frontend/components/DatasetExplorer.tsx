"use client";
import { useState, useMemo } from "react";

export default function DatasetExplorer({ 
  datasetName, 
  records, 
  taskId, 
  onEnrichStart 
}: { 
  datasetName: string, 
  records: any[], 
  taskId?: number, 
  onEnrichStart?: () => void 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  

  const allColumns = useMemo(() => {
    if (!records || records.length === 0) return [];
    const keys = new Set<string>();
    records.forEach(r => {
      Object.keys(r).forEach(k => {
        if (!k.startsWith("_")) keys.add(k);
      });
    });
    return Array.from(keys);
  }, [records]);

  const [visibleCols, setVisibleCols] = useState<string[]>(allColumns.slice(0, 5));
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const stats = useMemo(() => {
    let valid = 0;
    let review = 0;
    let duplicates = 0;
    
    records.forEach(r => {
      if (r._status?.includes("VALID")) valid++;
      if (r._status?.includes("REVIEW")) review++;
      if (r._sources && r._sources.length > 1) duplicates += (r._sources.length - 1);
    });
    return { valid, review, duplicates, total: records.length };
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!searchTerm) return records;
    const lower = searchTerm.toLowerCase();
    return records.filter(r => {
      return Object.entries(r).some(([k, v]: [string, any]) => {
        if (k.startsWith("_")) return false;
        const valStr = typeof v === 'object' && v?.value ? String(v.value) : String(v);
        return valStr.toLowerCase().includes(lower);
      });
    });
  }, [records, searchTerm]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage]);

  const toggleColumn = (col: string) => {
    if (visibleCols.includes(col)) {
      setVisibleCols(visibleCols.filter(c => c !== col));
    } else {
      setVisibleCols([...visibleCols, col]);
    }
  };

  const extractValue = (v: any) => {
    if (!v) return "-";
    if (typeof v === 'object' && 'value' in v) return String(v.value);
    return String(v);
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement("a");
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
  };

  const generateCleanRecords = () => {
    return filteredRecords.map(r => {
      const out: any = {};
      allColumns.forEach(k => {
        out[k] = extractValue(r[k]) === "-" ? "" : extractValue(r[k]);
      });
      out.Status = r._status || "";
      return out;
    });
  };

  const exportJSON = () => {
    const clean = generateCleanRecords();
    const filename = `${datasetName.toLowerCase().replace(/ /g, '-')}.json`;
    downloadFile(JSON.stringify(clean, null, 2), filename, "application/json");
  };

  const exportCSV = () => {
    const clean = generateCleanRecords();
    if (clean.length === 0) return;
    const headers = Object.keys(clean[0]);
    const csvRows = [headers.join(",")];
    
    for (const row of clean) {
      const values = headers.map(h => `"${('' + row[h]).replace(/"/g, '""')}"`);
      csvRows.push(values.join(","));
    }
    const filename = `${datasetName.toLowerCase().replace(/ /g, '-')}.csv`;
    downloadFile(csvRows.join("\n"), filename, "text/csv");
  };

  const exportExcel = () => {

    const clean = generateCleanRecords();
    if (clean.length === 0) return;
    const headers = Object.keys(clean[0]);
    const rows = [headers.join("\t")];
    
    for (const row of clean) {
      const values = headers.map(h => ('' + row[h]).replace(/\t/g, ' '));
      rows.push(values.join("\t"));
    }
    const filename = `${datasetName.toLowerCase().replace(/ /g, '-')}.xls`;
    downloadFile(rows.join("\n"), filename, "application/vnd.ms-excel");
  };

  if (!records || records.length === 0) return <div>No data available.</div>;

  return (
    <div className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-xl overflow-hidden shadow-2xl mt-12">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 p-6">
        <h2 className="text-2xl font-bold text-white mb-6 uppercase tracking-wide">{datasetName} Dataset</h2>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 border-l-4 border-l-green-500">
            <div className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-1">Valid Records</div>
            <div className="text-3xl font-bold text-white">{stats.valid}</div>
          </div>
          <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 border-l-4 border-l-amber-500">
            <div className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-1">Needs Review</div>
            <div className="text-3xl font-bold text-white">{stats.review}</div>
          </div>
          <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 border-l-4 border-l-blue-500">
            <div className="text-zinc-400 text-sm font-bold uppercase tracking-wider mb-1">Duplicates Merged</div>
            <div className="text-3xl font-bold text-white">{stats.duplicates}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 border-b border-zinc-800 flex flex-col md:flex-row justify-between gap-4 items-center bg-zinc-900/50">
        <input 
          type="text"
          placeholder="Search records..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          className="w-full md:w-96 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white outline-none focus:border-blue-500 transition-colors"
        />
        
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2">
            <div className="text-sm text-zinc-400 flex items-center mr-2">Columns:</div>
            {allColumns.map(col => (
              <button
                key={col}
                onClick={() => toggleColumn(col)}
                className={`px-2 py-1 text-xs font-bold rounded capitalize transition-colors ${
                  visibleCols.includes(col) ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {col}
              </button>
            ))}
          </div>
          
          <div className="h-6 w-px bg-zinc-700 hidden md:block"></div>
          
          <div className="flex gap-2">
            {taskId && onEnrichStart && (
              <button 
                onClick={onEnrichStart} 
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold uppercase rounded border border-purple-500/50 transition-all shadow-[0_0_10px_rgba(168,85,247,0.3)] flex items-center gap-2 mr-2"
              >
                <span>✨ AI Enrich</span>
              </button>
            )}
            <button onClick={exportCSV} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase rounded border border-zinc-700 transition-colors">
              CSV
            </button>
            <button onClick={exportJSON} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase rounded border border-zinc-700 transition-colors">
              JSON
            </button>
            <button onClick={exportExcel} className="px-3 py-1.5 bg-green-900/50 hover:bg-green-800/80 text-green-400 text-xs font-bold uppercase rounded border border-green-800/50 transition-colors">
              Excel
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-900/80 border-b border-zinc-800">
              <th className="px-6 py-4 text-xs uppercase tracking-wider text-zinc-500 font-bold w-12">St</th>
              {visibleCols.map(col => (
                <th key={col} className="px-6 py-4 text-xs uppercase tracking-wider text-zinc-500 font-bold">{col}</th>
              ))}
              <th className="px-6 py-4 text-xs uppercase tracking-wider text-zinc-500 font-bold text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {paginatedRecords.map((r, idx) => (
              <React.Fragment key={idx}>
                <tr className="hover:bg-zinc-900/50 transition-colors group cursor-pointer" onClick={() => setExpandedRow(expandedRow === idx ? null : idx)}>
                  <td className="px-6 py-4">
                    <span className={`inline-block w-3 h-3 rounded-full ${r._status?.includes('VALID') ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} title={r._status} />
                  </td>
                  {visibleCols.map(col => (
                    <td key={col} className="px-6 py-4 text-sm text-zinc-300 truncate max-w-[200px]">
                      {extractValue(r[col])}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-500 hover:text-blue-400 text-sm font-bold">
                      {expandedRow === idx ? 'Close' : 'View'}
                    </button>
                  </td>
                </tr>
                {expandedRow === idx && (
                  <tr className="bg-black border-l-4 border-l-blue-500 shadow-inner">
                    <td colSpan={visibleCols.length + 2} className="px-8 py-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allColumns.map(col => {
                          const field = r[col];
                          const val = typeof field === 'object' && field?.value ? field.value : field;
                          const source = typeof field === 'object' && field?.source ? field.source : null;
                          const conf = typeof field === 'object' && field?.confidence ? field.confidence : null;
                          
                          return (
                            <div key={col} className="bg-zinc-900 p-4 rounded border border-zinc-800">
                              <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">{col}</div>
                              <div className="text-white font-medium text-lg mb-2">{val || "-"}</div>
                              {source && (
                                <div className="text-xs font-mono text-zinc-400 flex items-start gap-2 bg-zinc-950 p-2 rounded">
                                  <span className="text-zinc-600 mt-0.5">↳</span>
                                  <span className="break-all text-blue-400/80">{source}</span>
                                </div>
                              )}
                              {conf && (
                                <div className="mt-2 text-xs font-bold text-amber-500 border border-amber-900/50 inline-block px-1.5 py-0.5 rounded bg-amber-950/20">
                                  {Math.round(conf * 100)}% Confidence
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      
                      <div className="mt-6 flex gap-4">
                        {r._validation_errors && r._validation_errors.length > 0 && (
                          <div className="flex-1 bg-red-950/20 border border-red-900/50 p-4 rounded">
                            <div className="text-xs text-red-500 font-bold uppercase mb-2">Validation Errors</div>
                            <ul className="list-disc list-inside text-sm text-red-400">
                              {r._validation_errors.map((err: string, i: number) => <li key={i}>{err}</li>)}
                            </ul>
                          </div>
                        )}
                        {r._sources && r._sources.length > 0 && (
                          <div className="flex-1 bg-zinc-900 border border-zinc-800 p-4 rounded">
                            <div className="text-xs text-zinc-500 font-bold uppercase mb-2">Canonical Merge Evidence (Sources)</div>
                            <div className="flex flex-wrap gap-2">
                              {r._sources.map((src: string, i: number) => (
                                <span key={i} className="bg-zinc-800 text-zinc-300 px-2 py-1 text-xs font-mono rounded">{src}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {paginatedRecords.length === 0 && (
              <tr>
                <td colSpan={visibleCols.length + 2} className="px-6 py-12 text-center text-zinc-500">
                  No records found matching "{searchTerm}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-4 flex justify-between items-center">
        <div className="text-sm text-zinc-400">
          Showing {Math.min((currentPage - 1) * pageSize + 1, filteredRecords.length)} to {Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
        </div>
        <div className="flex gap-2">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="px-4 py-2 bg-zinc-800 disabled:opacity-50 text-white rounded font-bold hover:bg-zinc-700 transition-colors"
          >
            Prev
          </button>
          <button 
            disabled={currentPage * pageSize >= filteredRecords.length}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="px-4 py-2 bg-zinc-800 disabled:opacity-50 text-white rounded font-bold hover:bg-zinc-700 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
