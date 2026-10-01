"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { planWorkflow } from "@/lib/api";

export default function WorkflowsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    const generatePlan = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          router.push("/login");
          return;
        }

        // Try to load context from localStorage that Requirement Engine saved
        const storedContext = localStorage.getItem("workflowContext");
        if (!storedContext) {
          setError("No requirement context found. Please start from the Requirement Engine.");
          setIsLoading(false);
          return;
        }

        const context = JSON.parse(storedContext);
        
        // Call the backend to generate the workflow plan
        const generatedPlan = await planWorkflow(token, {
          requirement_analysis: context.requirement_analysis,
          dataset_schema: context.dataset_schema,
          available_sources: context.available_sources
        });

        setPlan(generatedPlan);
      } catch (err: any) {
        setError(err.message || "Failed to generate workflow plan.");
      } finally {
        setIsLoading(false);
      }
    };

    generatePlan();
  }, [router]);

  return (
    <div className="p-8 min-h-screen bg-white dark:bg-black text-black dark:text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b pb-4 dark:border-zinc-800">
          <h1 className="text-3xl font-bold">Dynamic Workflow Planner</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push("/requirements")} 
              className="text-sm bg-zinc-200 dark:bg-zinc-800 px-4 py-2 rounded font-medium hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
            >
              Back to Requirements
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="text-xl text-zinc-500 animate-pulse">AI is planning workflow...</div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            <span className="font-semibold">Error:</span> {error}
          </div>
        ) : plan ? (
          <div className="bg-zinc-50 dark:bg-zinc-900 border dark:border-zinc-800 rounded-xl p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Workflow Plan: {plan.name}</h2>
            
            <div className="space-y-4">
              {plan.steps.map((step: any, index: number) => (
                <div key={index} className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mr-4 z-10 shrink-0">
                    {index + 1}
                  </div>
                  <div className="bg-white dark:bg-black p-4 rounded-xl border dark:border-zinc-800 flex-1 shadow-sm flex justify-between items-center relative">
                    {index < plan.steps.length - 1 && (
                      <div className="absolute left-[-1.25rem] top-10 w-0.5 h-12 bg-blue-200 dark:bg-blue-900 -z-10"></div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg uppercase tracking-wide text-blue-600 dark:text-blue-400">{step.type}</h3>
                      {step.source_id && (
                        <p className="text-sm text-zinc-500 mt-1">Source ID: {step.source_id}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition text-lg disabled:opacity-50"
                disabled
              >
                Execute Plan (Phase 6) &rarr;
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
