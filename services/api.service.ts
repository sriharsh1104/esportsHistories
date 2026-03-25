/**
 * API Service - Centralized HTTP client for all API calls.
 * Handles auth token, timeout, error handling.
 */
import Constants from 'expo-constants';
import { API_ENDPOINTS } from '@/constants/api';
import { getToken } from './common.service';
import Toast from 'react-native-toast-message';

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
  /**
   * By default API responses with a `message` show a toast.
   * Set `toast: false` to suppress for a specific call.
   */
  toast?: false;
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

type StandardApiResponse<T = unknown> = {
  success?: boolean;
  status?: number;
  message?: string;
  data?: T;
};

function safeToast(type: 'success' | 'error' | 'info', message?: string) {
  const text = (message ?? '').trim();
  if (!text) return;
  Toast.show({ type, text1: text });
}

async function readResponseBody(res: Response): Promise<{ json: any; text: string }> {
  const text = await res.text();
  try {
    return { json: text ? JSON.parse(text) : {}, text };
  } catch {
    return { json: text, text };
  }
}

function unwrapStandardResponse<T>(json: any, statusCode: number, toastEnabled: boolean): T {
  if (json && typeof json === 'object' && 'success' in json) {
    const envelope = json as StandardApiResponse<T>;
    if (envelope.success) {
      if (toastEnabled) safeToast('success', envelope.message);
      return (envelope.data !== undefined ? envelope.data : (json as T)) as T;
    }
    const msg = envelope.message || 'API Error';
    if (toastEnabled) safeToast('error', msg);
    throw new ApiError(msg, statusCode, json);
  }
  // Many auth/write APIs return `{ message, token, user }` without a `success` flag — still show server text.
  if (
    toastEnabled &&
    json &&
    typeof json === 'object' &&
    typeof (json as { message?: unknown }).message === 'string' &&
    (json as { message: string }).message.trim()
  ) {
    safeToast('success', (json as { message: string }).message);
  }
  return json as T;
}

let isRefreshing = false;
let isHandlingAuthFailure = false;
let refreshSubscribers: Array<{
  onSuccess: (token: string) => void;
  onError: (error: ApiError) => void;
}> = [];
let authFailureHandler: (() => void) | null = null;
const TOKEN_EXPIRY_BUFFER_SECONDS = 45;

function decodeJwtExp(token?: string | null): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(token?: string | null, bufferSeconds = TOKEN_EXPIRY_BUFFER_SECONDS): boolean {
  const exp = decodeJwtExp(token);
  if (!exp) return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return exp - nowInSeconds <= bufferSeconds;
}

export function setAuthFailureHandler(handler: (() => void) | null) {
  authFailureHandler = handler;
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach(({ onSuccess }) => onSuccess(token));
  refreshSubscribers = [];
}

function onRefreshFailed(error: ApiError) {
  refreshSubscribers.forEach(({ onError }) => onError(error));
  refreshSubscribers = [];
}

function addRefreshSubscriber(
  onSuccess: (token: string) => void,
  onError: (error: ApiError) => void
) {
  refreshSubscribers.push({ onSuccess, onError });
}

function handleAuthFailure() {
  if (isHandlingAuthFailure) return;
  isHandlingAuthFailure = true;
  authFailureHandler?.();
}

type RefreshResponseData = {
  token?: string;
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
};

function extractRefreshedTokens(data: RefreshResponseData): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  const accessToken = data?.token ?? data?.accessToken ?? data?.access_token ?? null;
  const refreshToken = data?.refreshToken ?? data?.refresh_token ?? null;
  return {
    accessToken: accessToken ? String(accessToken) : null,
    refreshToken: refreshToken ? String(refreshToken) : null,
  };
}

async function refreshAccessTokenIfNeeded(force = false): Promise<string | null> {
  const { getToken } = await import('./common.service');
  const currentToken = getToken();

  if (!force && !isTokenExpiringSoon(currentToken)) {
    return currentToken;
  }

  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      addRefreshSubscriber(resolve, reject);
    });
  }

  isRefreshing = true;
  try {
    const { getRefreshToken, setToken, setRefreshToken, commonService } = await import('./common.service');
    const refreshToken = await getRefreshToken();

    if (!refreshToken) {
      throw new ApiError('No refresh token', 401);
    }

    const apiRes = await fetch(buildUrl(API_ENDPOINTS.AUTH.REFRESH_TOKEN), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken,
      }),
    });
    let responseData: any = {};
    try {
      responseData = await apiRes.json();
    } catch {
      responseData = {};
    }
    const { accessToken, refreshToken: rotatedRefreshToken } = extractRefreshedTokens(
      responseData?.data ?? responseData
    );

    if (!apiRes.ok || !accessToken) {
      throw new ApiError('Session expired', 401, responseData);
    }

    setToken(accessToken);
    await commonService.setItem('@esports_auth_token', accessToken);

    if (rotatedRefreshToken) {
      setRefreshToken(rotatedRefreshToken);
      await commonService.setItem('@esports_refresh_token', rotatedRefreshToken);
    }

    onTokenRefreshed(accessToken);
    return accessToken;
  } catch (e) {
    const authError = e instanceof ApiError ? e : new ApiError('Session expired', 401);
    onRefreshFailed(authError);
    const { logout } = await import('./auth.service');
    await logout();
    handleAuthFailure();
    throw authError;
  } finally {
    isRefreshing = false;
  }
}

export async function request<T>(
  path: string,
  config: RequestConfig = {}
): Promise<T> {
  const { method = 'GET', body, headers: customHeaders, params, skipAuth = false, toast } = config;
  const toastEnabled = toast !== false;
  const url = buildUrl(path, params);

  const init: RequestInit = {
    method,
    headers: getHeaders(body, customHeaders as Record<string, string>, skipAuth),
  };

  if (body && method !== 'GET') {
    init.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  try {
    if (
      !skipAuth &&
      path !== API_ENDPOINTS.AUTH.LOGIN &&
      path !== API_ENDPOINTS.AUTH.REFRESH_TOKEN
    ) {
      const refreshedToken = await refreshAccessTokenIfNeeded(false);
      if (refreshedToken) {
        init.headers = {
          ...(init.headers as Record<string, string>),
          Authorization: `Bearer ${refreshedToken}`,
        };
      }
    }

    const res = await fetchWithTimeout(url, init, API_TIMEOUT);

    if (
      res.status === 401 &&
      !skipAuth &&
      path !== API_ENDPOINTS.AUTH.REFRESH_TOKEN &&
      path !== API_ENDPOINTS.AUTH.LOGIN
    ) {
      const refreshedToken = await refreshAccessTokenIfNeeded(true);
      const retryInit = {
        ...init,
        headers: {
          ...(init.headers as Record<string, string>),
          Authorization: `Bearer ${refreshedToken}`,
        },
      };
      const retryRes = await fetchWithTimeout(url, retryInit, API_TIMEOUT);
      const { json: retryJson } = await readResponseBody(retryRes);
      if (!retryRes.ok) {
        if (retryRes.status === 401) {
          handleAuthFailure();
        }
        const retryMsg =
          (retryJson && typeof retryJson === 'object' && (retryJson as any).message) ||
          retryRes.statusText ||
          `Request failed (${retryRes.status})`;
        if (toastEnabled) safeToast('error', retryMsg);
        throw new ApiError(String(retryMsg), retryRes.status, retryJson);
      }
      return unwrapStandardResponse<T>(retryJson, retryRes.status, toastEnabled);
    }

    const { json } = await readResponseBody(res);

    if (!res.ok) {
      if (
        res.status === 401 &&
        !skipAuth &&
        path !== API_ENDPOINTS.AUTH.REFRESH_TOKEN &&
        path !== API_ENDPOINTS.AUTH.LOGIN
      ) {
        handleAuthFailure();
      }
      const msg =
        (json && typeof json === 'object' && (json as any).message) ||
        res.statusText ||
        `Request failed (${res.status})`;
      if (toastEnabled) safeToast('error', msg);
      throw new ApiError(String(msg), res.status, json);
    }

    return unwrapStandardResponse<T>(json, res.status, toastEnabled);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const msg = error instanceof Error ? error.message : 'Network error';
    if (toastEnabled) safeToast('error', msg);
    throw new ApiError(msg);
  }
}

export const api = {
  get: <T>(
    path: string,
    params?: RequestConfig['params'],
    extra?: Pick<RequestConfig, 'headers'>
  ) => request<T>(path, { method: 'GET', params, toast: false, ...extra }),

  post: <T>(path: string, body?: object, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    request<T>(path, { ...config, method: 'POST', body }),

  put: <T>(path: string, body?: object, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    request<T>(path, { ...config, method: 'PUT', body }),

  patch: <T>(path: string, body?: object, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    request<T>(path, { ...config, method: 'PATCH', body }),

  delete: <T>(path: string, config?: Omit<RequestConfig, 'method'>) =>
    request<T>(path, { method: 'DELETE', toast: false, ...config }),
};

export function getApiBaseUrl(): string {
  return API_BASE;
}

export function getApiTimeout(): number {
  return API_TIMEOUT;
}
