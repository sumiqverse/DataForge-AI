"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { access_token } = await login(email, password);
      localStorage.setItem("token", access_token);
      router.push("/dashboard");
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleLogin} className="p-8 border rounded shadow-md w-96 flex flex-col gap-4 bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
          className="border p-2 rounded dark:bg-zinc-800" 
          required 
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
          className="border p-2 rounded dark:bg-zinc-800" 
          required 
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition">Login</button>
        <a href="/register" className="text-blue-500 text-sm mt-2 text-center">Don't have an account? Register</a>
      </form>
    </div>
  );
}
