const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) {
    throw new Error("Failed to fetch health status");
  }
  return res.json();
}

export async function login(username: string, password: string) {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);
  
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json();
}

export async function register(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Register failed");
  return res.json();
}

export async function getMe(token: string) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to get user");
  return res.json();
}

export async function getProjects(token: string) {
  const res = await fetch(`${API_BASE}/api/projects/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function createProject(token: string, name: string, description?: string) {
  const res = await fetch(`${API_BASE}/api/projects/`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function getProject(token: string, id: string) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

export async function parseRequirement(token: string, projectId: number, prompt: string) {
  const res = await fetch(`${API_BASE}/api/ai/parse-requirement`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: "Bearer " 
    },
    body: JSON.stringify({ project_id: projectId, prompt }),
  });
  if (!res.ok) throw new Error("Failed to parse requirement");
  return res.json();
}

export async function getSources(token: string) {
  const res = await fetch(`${API_BASE}/api/sources/`, {
    headers: { Authorization: "Bearer " },
  });
  if (!res.ok) throw new Error("Failed to fetch sources");
  return res.json();
}

export async function createSource(token: string, data: any) {
  const res = await fetch(`${API_BASE}/api/sources/`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: "Bearer " 
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create source");
  return res.json();
}

export async function runWorkflow(token: string, projectId: number, requirement: any) {
  const res = await fetch(`${API_BASE}/api/workflow/${projectId}/run`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: "Bearer " 
    },
    body: JSON.stringify(requirement),
  });
  if (!res.ok) throw new Error("Failed to run workflow");
  return res.json();
}
