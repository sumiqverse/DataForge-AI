"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDatasets } from "@/lib/api";

export default function DatasetsPage() {
  const router = useRouter();
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }
        const data = await getDatasets(token);
        setDatasets(data);
      } catch (err: any) {
        setError(err.message || "Failed to load datasets");
      } finally {
        setLoading(false);
      }
    };
    fetchDatasets();
  }, [router]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8 border-b pb-4 dark:border-zinc-800">
        <h1 className="text-3xl font-bold">Datasets</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>
      ) : datasets.length === 0 ? (
        <div className="text-center p-12 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border dark:border-zinc-800">
          <h3 className="text-xl font-medium text-zinc-600 dark:text-zinc-400">No datasets found</h3>
          <p className="mt-2 text-sm text-zinc-500">Datasets will appear here once workflows complete execution.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {datasets.map((ds) => (
            <div 
              key={ds.id} 
              onClick={() => router.push(`/datasets/${ds.id}`)}
              className="bg-white dark:bg-zinc-950 border dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:shadow-md cursor-pointer transition hover:border-indigo-500"
            >
              <h3 className="text-xl font-semibold mb-2">{ds.name}</h3>
              <p className="text-sm text-zinc-500 mb-4">
                Created: {new Date(ds.created_at).toLocaleDateString()}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(ds.schema_definition || {}).map((col) => (
                  <span key={col} className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-300">
                    {col}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
