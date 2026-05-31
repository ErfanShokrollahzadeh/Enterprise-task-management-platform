const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api";

function getAuthHeaders() {
  if (typeof window === "undefined") {
    return {};
  }

  const accessToken = window.localStorage.getItem("accessToken");
  if (!accessToken) {
    return {};
  }

  return { Authorization: `Bearer ${accessToken}` };
}

async function request<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const authHeaders = getAuthHeaders();
  if (authHeaders.Authorization) {
    headers.set("Authorization", authHeaders.Authorization);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export type ApiBoard = {
  id: number;
  project: number;
  name: string;
  order: number;
  created_at: string;
};

export type ApiTask = {
  id: number;
  project: number;
  board: number;
  title: string;
  description: string;
  assigned_to: number | null;
  priority: "low" | "medium" | "high" | "urgent";
  deadline: string | null;
  created_at: string;
  updated_at: string;
};

export async function fetchBoards() {
  return request<ApiBoard[]>("/boards/");
}

export async function fetchTasks() {
  return request<ApiTask[]>("/tasks/");
}

export async function updateTaskBoard(taskId: number, boardId: number) {
  return request<ApiTask>(`/tasks/${taskId}/`, {
    method: "PATCH",
    body: JSON.stringify({ board: boardId }),
  });
}
