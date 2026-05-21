import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("lexai_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("lexai_token");
      localStorage.removeItem("lexai_user");
      window.location.href = "/auth/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  register: (data: { email: string; full_name: string; password: string }) =>
    api.post("/api/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/api/auth/login", data),
  me: () => api.get("/api/auth/me"),
};

// Contracts
export const contractsApi = {
  upload: (file: File, onProgress?: (p: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/api/contracts/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / (e.total || 1))),
    });
  },
  list: () => api.get("/api/contracts/"),
  get: (id: number) => api.get(`/api/contracts/${id}`),
  delete: (id: number) => api.delete(`/api/contracts/${id}`),
};

// Analysis
export const analysisApi = {
  summary: (id: number) => api.get(`/api/analysis/${id}/summary`),
  risk: (id: number) => api.get(`/api/analysis/${id}/risk`),
  clauses: (id: number) => api.get(`/api/analysis/${id}/clauses`),
};

// Chat
export const chatApi = {
  sendMessage: (data: { message: string; session_id?: number; contract_id?: number }) =>
    api.post("/api/chat/", data),
  getSessions: () => api.get("/api/chat/sessions"),
  getMessages: (sessionId: number) => api.get(`/api/chat/sessions/${sessionId}/messages`),
};

// Search
export const searchApi = {
  search: (data: { query: string; contract_ids?: number[]; contract_type?: string; top_k?: number }) =>
    api.post("/api/search/", data),
};

// Admin
export const adminApi = {
  stats: () => api.get("/api/admin/stats"),
  users: () => api.get("/api/admin/users"),
};
