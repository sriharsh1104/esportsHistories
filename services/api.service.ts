/**
 * API Service - Centralized HTTP client for all API calls.
 * Handles auth token, timeout, error handling.
 */
import Constants from 'expo-constants';
import { getToken } from './common.service';

const API_BASE = Constants.expoConfig?.extra?.apiBaseUrl || 'http://localhost:3000/api';
const API_TIMEOUT = Constants.expoConfig?.extra?.apiTimeout || 30000;

export type RequestConfig = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: object | FormData;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const base = path.startsWith('http') ? path : `${API_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  if (!params || Object.keys(params).length === 0) return base;
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, String(v));
  });
  const qs = search.toString();
  return qs ? `${base}?${qs}` : base;
}

function getHeaders(
  body?: object | FormData,
  customHeaders?: Record<string, string>,
  skipAuth?: boolean
): HeadersInit {
  const headers: Record<string, string> = {
    ...customHeaders,
  };
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (!skipAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    if (e instanceof Error) {
      if (e.name === 'AbortError') throw new ApiError('Request timeout', 408);
    }
    throw e;
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    data = text as unknown as T;
  }
  return data;
}

export async function request<T>(
  path: string,
  config: RequestConfig = {}
): Promise<T> {
  const { method = 'GET', body, headers: customHeaders, params, skipAuth = false } = config;
  const url = buildUrl(path, params);

  const init: RequestInit = {
    method,
    headers: getHeaders(body, customHeaders as Record<string, string>, skipAuth),
  };

  if (body && method !== 'GET') {
    init.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const res = await fetchWithTimeout(url, init, API_TIMEOUT);

  if (!res.ok) {
    const errData = await parseResponse<{ message?: string }>(res);
    const msg = errData?.message || res.statusText || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, errData);
  }

  return parseResponse<T>(res);
}

export const api = {
  get: <T>(path: string, params?: RequestConfig['params']) =>
    request<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: object, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    request<T>(path, { ...config, method: 'POST', body }),

  put: <T>(path: string, body?: object, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    request<T>(path, { ...config, method: 'PUT', body }),

  patch: <T>(path: string, body?: object, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    request<T>(path, { ...config, method: 'PATCH', body }),

  delete: <T>(path: string, params?: RequestConfig['params']) =>
    request<T>(path, { method: 'DELETE', params }),
};

export function getApiBaseUrl(): string {
  return API_BASE;
}

export function getApiTimeout(): number {
  return API_TIMEOUT;
}
