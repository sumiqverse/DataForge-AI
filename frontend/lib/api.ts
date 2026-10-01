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

export async function executeWorkflowPlan(token: string, plan: any) {
  const res = await fetch(`${API_BASE}/api/workflows/execute`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(plan),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to execute workflow");
  }
  return res.json();
}

export async function createTask(token: string, payload: any) {
  const res = await fetch(`${API_BASE}/api/tasks/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to create task");
  }
  return res.json();
}

export async function getTask(token: string, taskId: number) {
  const res = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to get task");
  return res.json();
}

export async function cancelTask(token: string, taskId: number) {
  const res = await fetch(`${API_BASE}/api/tasks/${taskId}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to cancel task");
  return res.json();
}

export async function getRecordProvenance(token: string, recordId: string) {
  const res = await fetch(`${API_BASE}/api/dataset-records/${recordId}/provenance`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to fetch provenance");
  return res.json();
}

export async function getDatasets(token: string) {
  const res = await fetch(`${API_BASE}/api/datasets/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to get datasets");
  return res.json();
}

export async function getDataset(token: string, datasetId: string) {
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to get dataset");
  return res.json();
}

export async function getDatasetRecords(
  token: string, 
  datasetId: string, 
  page: number = 1, 
  search: string = "",
  sortBy: string = "",
  sortOrder: string = "asc",
  statusFilter: string = ""
) {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: "10",
  });
  if (search) params.append("search", search);
  if (sortBy) params.append("sort_by", sortBy);
  if (sortOrder) params.append("sort_order", sortOrder);
  if (statusFilter) params.append("status_filter", statusFilter);
  
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}/records?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to get dataset records");
  return res.json();
}

export async function getTasks(token: string) {
  const res = await fetch(`${API_BASE}/api/tasks/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("Failed to get tasks");
  return res.json();
}

export async function createEnrichmentPlan(token: string, datasetId: string, prompt: string) {
  const res = await fetch(`${API_BASE}/api/ai/enrichment-plan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ dataset_id: parseInt(datasetId), prompt })
  });
  if (!res.ok) throw new Error("Failed to generate enrichment plan");
  return res.json();
}

export async function askDatasetIntelligence(token: string, datasetId: string, prompt: string) {
  const res = await fetch(`${API_BASE}/api/datasets/${datasetId}/intelligence/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error("Failed to process intelligence query");
  return res.json();
}
