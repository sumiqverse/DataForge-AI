"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    getMe(token).then(setUser).catch(() => {
      localStorage.removeItem("token");
      router.push("/login");
    });
  }, [router]);

  if (!user) return <div className="p-8">Loading workspace...</div>;

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <div className="w-64 border-r bg-white dark:bg-zinc-900 dark:border-zinc-800 p-6 flex flex-col gap-6">
        <div className="font-bold text-lg">My Workspace</div>
        <div className="flex flex-col gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <a href="/dashboard" className="font-semibold text-blue-600 dark:text-blue-400">Projects</a>
          <a href="/dashboard/sources" className="hover:text-black dark:hover:text-white transition">Source Registry</a>
          <a href="#" className="hover:text-black dark:hover:text-white transition">Workflows</a>
          <a href="#" className="hover:text-black dark:hover:text-white transition">Datasets</a>
        </div>
        <div className="mt-auto pt-4 border-t dark:border-zinc-800 text-xs text-zinc-500">
          Logged in as: <br/><span className="truncate block font-medium mt-1">{user.email}</span>
          <button 
            onClick={() => { localStorage.removeItem("token"); router.push("/login"); }} 
            className="mt-3 text-red-500 hover:underline"
          >
            Logout
          </button>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
