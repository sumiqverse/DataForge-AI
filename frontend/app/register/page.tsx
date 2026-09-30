"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password);
      router.push("/login");
    } catch (err) {
      alert("Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleRegister} className="p-8 border rounded shadow-md w-96 flex flex-col gap-4 bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <h2 className="text-2xl font-bold mb-4">Register</h2>
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
        <button type="submit" className="bg-green-600 hover:bg-green-700 text-white p-2 rounded transition">Register</button>
        <a href="/login" className="text-blue-500 text-sm mt-2 text-center">Already have an account? Login</a>
      </form>
    </div>
  );
}
