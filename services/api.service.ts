/**
 * API Service - Centralized HTTP client for all API calls.
 * Handles auth token, timeout, error handling.
 */
import Constants from 'expo-constants';
import { getToken } from './common.service';

const API_BASE = Constants.expoConfig?.extra?.apiBaseUrl;
const API_TIMEOUT = Constants.expoConfig?.extra?.apiTimeout;

if (!API_BASE) {
  console.error('[API Service] CRITICAL ERROR: API_BASE_URL is not defined in environment variables!');
}

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
  const base = path.startsWith('http') ? path : `${(API_BASE || '').replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  if (!API_BASE) {
     console.warn('[API Service] WARNING: API_BASE is undefined. URL might be incorrect:', base);
  }
  
  if (!params || Object.keys(params).length === 0) {
    console.log(`[API Request] URL: ${base}`);
    return base;
  }
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.append(k, String(v));
  });
  const qs = search.toString();
  const finalUrl = qs ? `${base}?${qs}` : base;
  console.log(`[API Request] URL: ${finalUrl}`);
  return finalUrl;
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
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    return text as unknown as T;
  }

  // Handle standard response format: { success, status, message, data }
  if (json && typeof json === 'object' && 'success' in json) {
    if (json.success) {
      // If it's a success response, return the data part
      return (json.data !== undefined ? json.data : json) as T;
    } else {
      // If it's an error response, throw an ApiError with the message
      throw new ApiError(json.message || 'API Error', res.status, json);
    }
  }

  return json as T;
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
