"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/lib/api";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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

  const navLink = (href: string, label: string) => {
    // Exact match for dashboard, prefix match for others to keep them highlighted on sub-pages
    const isActive = href === "/dashboard" 
      ? pathname === href 
      : pathname === href || pathname.startsWith(href + "/");
    return (
      <Link 
        href={href} 
        className={`transition ${isActive ? 'font-semibold text-blue-600 dark:text-blue-400' : 'hover:text-black dark:hover:text-white'}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950">
      {/* Sidebar */}
      <div className="w-64 border-r bg-white dark:bg-zinc-900 dark:border-zinc-800 p-6 flex flex-col gap-6">
        <div className="font-bold text-lg">My Workspace</div>
        <div className="flex flex-col gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          {navLink("/dashboard", "Projects")}
          {navLink("/dashboard/sources", "Source Registry")}
          {navLink("/history", "Workflows")}
          {navLink("/datasets", "Datasets")}
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
