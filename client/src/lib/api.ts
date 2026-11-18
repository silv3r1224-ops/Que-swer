const TOKEN_KEY = 'qs_access_token';

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* private mode */
    }
  } else {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }
}

export function restoreToken(): void {
  if (!accessToken) {
    try {
      accessToken = localStorage.getItem(TOKEN_KEY);
    } catch {
      accessToken = null;
    }
  }
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Refreshes the access token via the httpOnly refresh cookie (sent
 * automatically because the browser owns it). Returns true on success.
 */
async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; user?: unknown };
    setAccessToken(data.accessToken);
    if (data.user) {
      window.dispatchEvent(new CustomEvent('qs:user-updated', { detail: data.user }));
    }
    return true;
  } catch {
    return false;
  }
}

export function emitUnauthorized(): void {
  setAccessToken(null);
  window.dispatchEvent(new Event('qs:unauthorized'));
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Retry once after a successful token refresh (default true). */
  retryOnRefresh?: boolean;
}

export async function api<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  restoreToken();
  const { method = 'GET', body, headers = {}, retryOnRefresh = true } = options;

  const doFetch = async (): Promise<Response> => {
    const h: Record<string, string> = { ...headers };
    if (body !== undefined) h['Content-Type'] = 'application/json';
    if (accessToken) h.Authorization = `Bearer ${accessToken}`;
    return fetch(path, {
      method,
      headers: h,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let res = await doFetch();

  if (res.status === 401 && retryOnRefresh) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await doFetch();
    } else {
      emitUnauthorized();
    }
  }

  if (!res.ok) {
    const data = (await parseResponse(res)) as {
      error?: { code?: string; message?: string; details?: unknown };
    } | null;
    throw new ApiError(
      res.status,
      data?.error?.code ?? 'REQUEST',
      data?.error?.message ?? `Request failed (${res.status})`,
      data?.error?.details,
    );
  }

  return parseResponse(res) as Promise<T>;
}

export const apiGet = <T>(path: string, params?: Record<string, string | number | undefined>) => {
  const search = params
    ? new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : '';
  return api<T>(path + (search ? `?${search}` : ''));
};

export const apiPost = <T>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body });
export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'PATCH', body });
export const apiDelete = <T>(path: string) => api<T>(path, { method: 'DELETE' });
