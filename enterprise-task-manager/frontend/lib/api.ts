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

export type TokenPair = {
  access: string;
  refresh: string;
};

type RefreshResponse = {
  access: string;
  refresh?: string;
};

export function setTokens(tokens: TokenPair) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("accessToken", tokens.access);
  window.localStorage.setItem("refreshToken", tokens.refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("accessToken");
  window.localStorage.removeItem("refreshToken");
}

export function hasAccessToken() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.localStorage.getItem("accessToken"));
}

async function refreshAccessToken() {
  if (typeof window === "undefined") {
    return false;
  }

  const refreshToken = window.localStorage.getItem("refreshToken");
  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${API_BASE}/auth/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as RefreshResponse;
  setTokens({
    access: data.access,
    refresh: data.refresh ?? refreshToken,
  });
  return true;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  allowRetry = true,
) {
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
    if (response.status === 401 && allowRetry) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return request<T>(path, options, false);
      }

      clearTokens();
      return request<T>(path, options, false);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) {
        throw new Error(data.detail);
      }
    }

    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/token/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) {
        throw new Error(data.detail);
      }
    }

    const text = await response.text();
    throw new Error(text || `Login failed with status ${response.status}`);
  }

  const tokens = (await response.json()) as TokenPair;
  setTokens(tokens);
  return tokens;
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

export type ApiProject = {
  id: number;
  workspace: number;
  name: string;
  description: string;
  members: number[];
  team: number | null;
  team_name: string | null;
  created_at: string;
};

export async function fetchProject(projectId: number) {
  return request<ApiProject>(`/projects/${projectId}/`);
}
