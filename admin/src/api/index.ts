const BASE = "/api/admin";

export class ApiError extends Error {
  code: number;
  constructor(message: string, code = -1) {
    super(message);
    this.code = code;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("admin_token");
  const res = await fetch(`${BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const json = await res.json().catch(() => ({ code: -1, message: "网络异常" }));
  if (json.code === 401) {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    if (!location.pathname.endsWith("/login")) {
      location.href = "/login";
    }
    throw new ApiError(json.message || "未登录", 401);
  }
  if (json.code !== 0) {
    throw new ApiError(json.message || "请求失败", json.code);
  }
  return json.data as T;
}

function qs(params: Record<string, any> = {}) {
  const clean: Record<string, any> = {};
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") clean[k] = v;
  });
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : "";
}

export interface Paged<T> {
  list: T[];
  pagination: { page: number; size: number; total: number; totalPages: number };
}

export const http = {
  get: <T>(url: string, params?: Record<string, any>) => request<T>(`${url}${qs(params)}`),
  post: <T>(url: string, body?: any) => request<T>(url, { method: "POST", body: JSON.stringify(body || {}) }),
  put: <T>(url: string, body?: any) => request<T>(url, { method: "PUT", body: JSON.stringify(body || {}) }),
  del: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  upload: (file: File, type: "image" | "file" = "image", onProgress?: (percent: number) => void) => {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem("admin_token");
      const fd = new FormData();
      fd.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/upload?type=${type}`);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 413) {
          reject(new ApiError("文件过大，请压缩后重试（最大 200MB），如已配置 Nginx 请确保 client_max_body_size 足够大", 413));
          return;
        }
        try {
          const json = JSON.parse(xhr.responseText);
          if (json.code !== 0) reject(new ApiError(json.message || "上传失败", json.code));
          else resolve(json.data as { url: string; name: string; size: number; type: string });
        } catch {
          reject(new ApiError(xhr.status >= 500 ? "服务器内部错误" : "上传失败，请检查网络", xhr.status));
        }
      };
      xhr.onerror = () => reject(new ApiError("网络异常，请检查连接"));
      xhr.send(fd);
    });
  },
};

// 通用 CRUD API 工厂
export function crudApi(path: string) {
  return {
    list: (params?: Record<string, any>) => http.get<Paged<any>>(path, params),
    all: () => http.get<any[]>(`${path}/all`),
    get: (id: number) => http.get<any>(`${path}/${id}`),
    create: (data: any) => http.post(path, data),
    update: (id: number, data: any) => http.put(`${path}/${id}`, data),
    remove: (id: number) => http.del(`${path}/${id}`),
    status: (id: number, status: number) => http.put(`${path}/${id}/status`, { status }),
    sort: (id: number, sort: number) => http.put(`${path}/${id}/sort`, { sort }),
  };
}

export const api = {
  auth: {
    login: (data: { username: string; password: string }) => http.post<{ token: string; user: any }>("/auth/login", data),
    profile: () => http.get<any>("/auth/profile"),
    password: (data: { old_password: string; new_password: string }) => http.put("/auth/password", data),
  },
  dashboard: {
    stats: () => http.get<any>("/dashboard/stats"),
    trends: () => http.get<any>("/dashboard/trends"),
    topDownloads: () => http.get<any[]>("/dashboard/top-downloads"),
    latestMessages: () => http.get<any[]>("/dashboard/latest-messages"),
  },
  banners: crudApi("/banners"),
  productCategories: crudApi("/product-categories"),
  products: crudApi("/products"),
  solutions: crudApi("/solutions"),
  caseCategories: crudApi("/case-categories"),
  cases: crudApi("/cases"),
  downloadCategories: crudApi("/download-categories"),
  downloads: {
    ...crudApi("/downloads"),
    resetCount: (id: number) => http.put(`/downloads/${id}/reset-count`),
  },
  articles: crudApi("/articles"),
  messages: {
    list: (params?: Record<string, any>) => http.get<Paged<any>>("/messages", params),
    get: (id: number) => http.get<any>(`/messages/${id}`),
    status: (id: number, status: string) => http.put(`/messages/${id}/status`, { status }),
    reply: (id: number, reply: string) => http.put(`/messages/${id}/reply`, { reply }),
    remove: (id: number) => http.del(`/messages/${id}`),
  },
  users: {
    list: () => http.get<any[]>("/users"),
    create: (data: any) => http.post("/users", data),
    update: (id: number, data: any) => http.put(`/users/${id}`, data),
    remove: (id: number) => http.del(`/users/${id}`),
  },
  roles: {
    list: () => http.get<any[]>("/roles"),
    create: (data: any) => http.post("/roles", data),
    update: (id: number, data: any) => http.put(`/roles/${id}`, data),
    remove: (id: number) => http.del(`/roles/${id}`),
  },
  settings: {
    get: () => http.get<Record<string, string>>("/settings"),
    save: (data: Record<string, string>) => http.put("/settings", data),
  },
  about: {
    get: () => http.get<any>("/about"),
    save: (data: any) => http.put("/about", data),
  },
  homepage: {
    get: () => http.get<any>("/homepage"),
    save: (data: any) => http.put("/homepage", data),
  },
  logs: {
    list: (params?: Record<string, any>) => http.get<Paged<any>>("/logs", params),
  },
  
 visits: {
    stats: (params?: Record<string, any>) => http.get<any>("/visits/stats", params),
    trends: (params?: Record<string, any>) => http.get<any>("/visits/trends", params),
    pages: (params?: Record<string, any>) => http.get<any[]>("/visits/pages", params),
    regions: (params?: Record<string, any>) => http.get<any[]>("/visits/regions", params),
    logs: (params?: Record<string, any>) => http.get<Paged<any>>("/visits/logs", params),
    clear: () => http.del("/visits/clear"),
    clearByDate: (data: { start_date: string; end_date: string }) => http.del("/visits/clear-by-date", data),
    refreshRegions: (data?: { start_date?: string; end_date?: string }) => http.put<any>("/visits/refresh-regions", data || {}),
    exportExcelUrl: (params?: Record<string, any>) => {
      const qs = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
        });
      }
      return `/api/admin/visits/export-excel?${qs.toString()}`;
    },
  },
  watchdog: {
    hosts: (params?: Record<string, any>) => http.get<Paged<any>>("/watchdog/hosts", params),
    hostConfig: (hostId: string) => http.get<any[]>(`/watchdog/hosts/${hostId}/config`),
    events: (params?: Record<string, any>) => http.get<Paged<any>>("/watchdog/events", params),
    updateConfig: (hostId: string, processName: string, data: any) =>
      http.put(`/watchdog/hosts/${hostId}/config/${processName}`, data),
    sysinfo: (hostId: string) => http.get<{ latest: any; history: any[] }>(`/watchdog/hosts/${hostId}/sysinfo`),
    processList: (hostId: string) => http.get<{ list: any[]; total_count: number; target_count: number; created_at: string }>(`/watchdog/hosts/${hostId}/process-list`),
  },
};

export interface TableQuery {
  page: number;
  size: number;
  total: number;
  keyword?: string;
  status?: number | "";
  category?: number | "";
}