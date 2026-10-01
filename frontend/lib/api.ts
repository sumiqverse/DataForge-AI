const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  if (!res.ok) {
    throw new Error("Failed to fetch health status");
  }
  return res.json();
}

export async function generateSchema(token: string, requirement: any) {
  const res = await fetch(`${API_BASE}/api/schemas/generate`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(requirement),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to generate schema");
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
    body: formData.toString(),
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

export async function getWorkspaces(token: string) {
  const res = await fetch(`${API_BASE}/api/workspaces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch workspaces");
  return res.json();
}

export async function createWorkspace(token: string, name: string) {
  const res = await fetch(`${API_BASE}/api/workspaces`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create workspace");
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
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ project_id: projectId, prompt }),
  });
  if (!res.ok) throw new Error("Failed to parse requirement");
  return res.json();
}

export async function getSources(token: string) {
  const res = await fetch(`${API_BASE}/api/sources/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch sources");
  return res.json();
}

export async function createSource(token: string, data: any) {
  const res = await fetch(`${API_BASE}/api/sources/`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create source");
  return res.json();
}

export async function updateSource(token: string, id: number, data: any) {
  const res = await fetch(`${API_BASE}/api/sources/${id}`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update source");
  return res.json();
}

export async function deleteSource(token: string, id: number) {
  const res = await fetch(`${API_BASE}/api/sources/${id}`, {
    method: "DELETE",
    headers: { 
      Authorization: `Bearer ${token}` 
    },
  });
  if (!res.ok) throw new Error("Failed to delete source");
  return res.json();
}

export async function matchSources(token: string, fields: string[]) {
  const res = await fetch(`${API_BASE}/api/sources/match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error("Failed to match sources");
  return res.json();
}


export async function runWorkflow(token: string, projectId: number, requirement: any) {
  const res = await fetch(`${API_BASE}/api/workflow/${projectId}/run`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(requirement),
  });
  if (!res.ok) throw new Error("Failed to run workflow");
  return res.json();
}

export async function analyzeRequirement(token: string, prompt: string) {
  const res = await fetch(`${API_BASE}/api/requirements/analyze`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to analyze requirement");
  }
  return res.json();
}

export async function planWorkflow(token: string, payload: any) {
  const res = await fetch(`${API_BASE}/api/workflows/plan`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to generate workflow plan");
  }
  return res.json();
}
