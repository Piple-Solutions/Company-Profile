// API client. Same-origin `/api` (Vite proxy in dev). Admin mutations carry
// the session CSRF token; cookies (HttpOnly session) ride automatically.
export interface ApiError {
  error: { code: string; message_id: string; fields?: Record<string, string> };
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(code: string, status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export function isApiRequestError(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError;
}

export function isSessionExpired(err: unknown): boolean {
  return isApiRequestError(err) && err.status === 401;
}

export function isNotFound(err: unknown): boolean {
  return isApiRequestError(err) && (err.status === 404 || err.code === 'NOT_FOUND');
}

export async function api<T>(path: string, init?: RequestInit, csrf?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Token'] = csrf;
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiRequestError('NETWORK_ERROR', 0, 'Tidak dapat menghubungi server.');
  }

  let body: unknown = null;
  try { body = await res.json(); } catch { /* non-JSON gateway/proxy response */ }
  const error = (body as Partial<ApiError> | null)?.error;
  if (!res.ok) {
    throw new ApiRequestError(
      typeof error?.code === 'string' ? error.code : 'UNKNOWN_ERROR',
      res.status,
      typeof error?.message_id === 'string' ? error.message_id : `Kesalahan ${res.status}`,
      error?.fields,
    );
  }
  return body as T;
}

/** User-facing Indonesian message that preserves the API's stable code/status
 *  semantics. Callers may provide a context-specific fallback. */
export function messageForApiError(err: unknown, fallback = 'Terjadi kesalahan. Silakan coba lagi.'): string {
  if (!isApiRequestError(err)) return err instanceof Error ? err.message : fallback;
  if (err.code === 'NETWORK_ERROR') {
    return 'Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.';
  }
  if (err.status === 413) return 'Data yang dikirim terlalu besar.';
  if (err.status === 429 || err.code === 'RATE_LIMITED') {
    return 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.';
  }
  if (err.status === 401 || err.code === 'UNAUTHENTICATED') {
    return 'Sesi berakhir. Muat ulang halaman lalu masuk kembali.';
  }
  if (err.status === 403 || err.code === 'FORBIDDEN') {
    return 'Permintaan ditolak. Muat ulang halaman lalu coba lagi.';
  }
  if (err.status === 404 || err.code === 'NOT_FOUND') return 'Data tidak ditemukan.';
  if (err.code === 'CONFLICT') return 'Data bertentangan dengan data yang sudah ada.';
  if (err.status >= 500) return 'Server sedang bermasalah. Coba lagi beberapa saat lagi.';
  if (err.code === 'VALIDATION_ERROR' && err.message) return err.message;
  return err.message || fallback;
}

export function loginErrorMessage(err: unknown): string {
  if (isApiRequestError(err)) {
    if (err.status === 401 || err.code === 'UNAUTHENTICATED') return 'Email atau kata sandi salah.';
    if (err.status === 429 || err.code === 'RATE_LIMITED') {
      return 'Terlalu banyak percobaan masuk. Tunggu sebentar lalu coba lagi.';
    }
    if (err.status === 403 || err.code === 'FORBIDDEN') {
      return 'Masuk ditolak oleh server. Muat ulang halaman lalu coba lagi.';
    }
  }
  return messageForApiError(err, 'Masuk gagal. Silakan coba lagi.');
}

export interface Paged<T> {
  data: T[];
  meta: { total: number; page?: number };
}
export interface Single<T> {
  data: T;
}

export type ContentRow = Record<string, string | number | null>;

export const pub = {
  list: <T = ContentRow>(resource: string): Promise<T[]> =>
    api<{ data: T[] }>(`/api/v1/${resource}`).then((r) => r.data),
  detail: <T = ContentRow>(resource: string, slug: string): Promise<T> =>
    api<Single<T>>(`/api/v1/${resource}/${encodeURIComponent(slug)}`).then((r) => r.data),
  settingsPublic: (): Promise<Record<string, unknown>> =>
    api<{ data: Record<string, unknown> }>('/api/v1/settings/public').then((r) => r.data),
  inquiry: (payload: Record<string, unknown>): Promise<{ id: string; state: string }> =>
    api<{ data: { id: string; state: string } }>('/api/v1/inquiries', { method: 'POST', body: JSON.stringify(payload) }).then((r) => r.data),
};

export const admin = {
  me: (): Promise<{ email: string; role: string; csrf_token: string }> =>
    api<{ data: { email: string; role: string; csrf_token: string } }>('/api/v1/admin/auth/me').then((r) => r.data),
  login: (email: string, password: string) =>
    api<Single<{ email: string; role: string; csrf_token: string }>>('/api/v1/admin/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }).then((r) => r.data),
  logout: (csrf: string) =>
    api<Single<{ logged_out: boolean }>>('/api/v1/admin/auth/logout', { method: 'POST', body: '{}' }, csrf).then((r) => r.data),
  list: (module: string, params = ''): Promise<Paged<ContentRow>> =>
    api<Paged<ContentRow>>(`/api/v1/admin/${module}${params}`),
  get: (module: string, id: string): Promise<ContentRow> =>
    api<Single<ContentRow>>(`/api/v1/admin/${module}/${encodeURIComponent(id)}`).then((r) => r.data),
  create: (module: string, csrf: string, body: Record<string, unknown>): Promise<ContentRow> =>
    api<Single<ContentRow>>(`/api/v1/admin/${module}`, { method: 'POST', body: JSON.stringify(body) }, csrf).then((r) => r.data),
  update: (module: string, csrf: string, id: string, body: Record<string, unknown>): Promise<ContentRow> =>
    api<Single<ContentRow>>(`/api/v1/admin/${module}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }, csrf).then((r) => r.data),
  remove: (module: string, csrf: string, id: string): Promise<void> =>
    api(`/api/v1/admin/${module}/${encodeURIComponent(id)}`, { method: 'DELETE' }, csrf).then(() => undefined),
  settings: (): Promise<ContentRow[]> =>
    api<{ data: ContentRow[] }>('/api/v1/admin/settings').then((r) => r.data),
  saveSetting: (csrf: string, key: string, value_json: string, is_public: boolean) =>
    api<Single<{ key: string }>>('/api/v1/admin/settings', {
      method: 'PUT', body: JSON.stringify({ key, value_json, is_public }),
    }, csrf).then((r) => r.data),
};
