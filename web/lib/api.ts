import type { AuthResponse, Task, TaskStatus, User } from './types';

// 通过 Next.js rewrite /api/backend/* → 后端，避免浏览器端跨域与混合内容限制。
// Next.js 服务端会在构建时把 /api/backend/* 代理到 NEXT_PUBLIC_API_URL 指向的后端。
const BASE = '/api/backend';

const ACCESS_KEY = 'stb_access';
const REFRESH_KEY = 'stb_refresh';

export const tokenStore = {
  get access() {
    return typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

class ApiError extends Error {
  status: number;
  messages: string[];
  constructor(status: number, messages: string[]) {
    super(messages.join('; '));
    this.status = status;
    this.messages = messages;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  withAuth = false,
  _retry = false,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (withAuth) {
    const token = tokenStore.access;
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(`${BASE}${path}`, { ...options, headers });

  // 访问令牌过期 → 用刷新令牌换新的再重试一次
  if (res.status === 401 && withAuth && !_retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options, withAuth, true);
    }
  }

  if (!res.ok) {
    let messages = ['请求失败'];
    try {
      const body = await res.json();
      messages = Array.isArray(body.message) ? body.message : [String(body.message ?? res.statusText)];
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, messages);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  try {
    const data = await request<AuthResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: refresh }),
    });
    tokenStore.set(data.accessToken, data.refreshToken);
    return true;
  } catch {
    tokenStore.clear();
    return false;
  }
}

export const authApi = {
  async register(input: { username: string; password: string; name?: string }) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  async login(input: { username: string; password: string }) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  async me() {
    return request<User>('/users/me', {}, true);
  },
};

export const tasksApi = {
  list() {
    return request<Task[]>('/tasks', {}, true);
  },
  create(input: { title: string; description?: string; status?: TaskStatus; dueDate?: string }) {
    return request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(input),
    }, true);
  },
  update(id: string, input: Partial<{ title: string; description?: string | null; status?: TaskStatus; dueDate?: string | null }>) {
    return request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }, true);
  },
  remove(id: string) {
    return request<void>(`/tasks/${id}`, { method: 'DELETE' }, true);
  },
};

export { ApiError };
