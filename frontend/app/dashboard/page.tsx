"use client";
import { useEffect, useState } from "react";
import { getProjects, createProject } from "@/lib/api";

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [newProjectName, setNewProjectName] = useState("");

  const loadProjects = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      const data = await getProjects(token);
      setProjects(data);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (token && newProjectName.trim()) {
      await createProject(token, newProjectName);
      setNewProjectName("");
      loadProjects();
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8 border-b pb-4 dark:border-zinc-800">
        <h1 className="text-3xl font-bold">Projects</h1>
      </div>
      
      <form onSubmit={handleCreate} className="mb-8 flex gap-4">
        <input 
          type="text" 
          value={newProjectName}
          onChange={e => setNewProjectName(e.target.value)}
          placeholder="New Project Name"
          className="border p-2 rounded dark:bg-zinc-800 flex-1 max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button type="submit" className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded font-medium hover:opacity-90 transition">
          Create Project
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(p => (
          <a key={p.id} href={`/dashboard/project/${p.id}`} className="block">
            <div className="p-6 border rounded-xl hover:shadow-lg transition cursor-pointer bg-white dark:bg-zinc-900 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500">
              <h2 className="text-xl font-semibold mb-2">{p.name}</h2>
              <p className="text-sm text-zinc-500">ID: {p.id}</p>
            </div>
          </a>
        ))}
        {projects.length === 0 && (
          <div className="col-span-full text-zinc-500 p-8 border border-dashed rounded-xl text-center">
            No projects found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
