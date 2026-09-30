"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getWorkspaces, createWorkspace, getMe } from "@/lib/api";

export default function Dashboard() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const router = useRouter();

  const loadData = async () => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const user = await getMe(token);
        setUserEmail(user.email);
        const data = await getWorkspaces(token);
        setWorkspaces(data);
      } catch (err) {
        localStorage.removeItem("token");
        router.push("/login");
      }
    } else {
      router.push("/login");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (token && newWorkspaceName.trim()) {
      try {
        await createWorkspace(token, newWorkspaceName);
        setNewWorkspaceName("");
        loadData();
      } catch (err) {
        alert("Failed to create workspace");
      }
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <div className="p-8 min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="flex justify-between items-center mb-8 border-b pb-4 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold">Your Workspaces</h1>
          <p className="text-zinc-500 text-sm mt-1">Logged in as {userEmail}</p>
        </div>
        <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-medium transition">
          Logout
        </button>
      </div>
      
      <form onSubmit={handleCreate} className="mb-8 flex gap-4">
        <input 
          type="text" 
          value={newWorkspaceName}
          onChange={e => setNewWorkspaceName(e.target.value)}
          placeholder="New Workspace Name"
          className="border p-2 rounded bg-transparent dark:border-zinc-800 flex-1 max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button type="submit" className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded font-medium hover:opacity-90 transition">
          Create Workspace
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map(w => (
          <div key={w.id} className="p-6 border rounded-xl hover:shadow-lg transition cursor-pointer bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-800 hover:border-blue-500 dark:hover:border-blue-500">
            <h2 className="text-xl font-semibold mb-2">{w.name}</h2>
            <p className="text-sm text-zinc-500 mb-4">ID: {w.id}</p>
            <button className="text-sm bg-blue-500 text-white px-3 py-1 rounded">Enter Workspace &rarr;</button>
          </div>
        ))}
        {workspaces.length === 0 && (
          <div className="col-span-full text-zinc-500 p-8 border border-dashed rounded-xl text-center">
            No workspaces found. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
}
