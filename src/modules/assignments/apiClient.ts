const STORAGE_API_TOKEN = 'wolf_api_token_v1';

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const injected = (window as Window & { __WOLF_API_URL__?: string }).__WOLF_API_URL__;
    if (typeof injected === 'string' && injected.trim()) {
      return injected.trim().replace(/\/+$/, '');
    }
  }
  return ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '');
}

export function isApiEnabled(): boolean {
  return Boolean(getApiBase());
}

export function readApiToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_API_TOKEN);
  } catch {
    return null;
  }
}

/** URL explícita del WebSocket (p. ej. wss://api.onrender.com/ws). Opcional si REST usa proxy relativo /api. */
function readWsOverride(): string {
  const fromEnv = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (typeof window !== 'undefined') {
    const injected = (window as Window & { __WOLF_WS_URL__?: string }).__WOLF_WS_URL__;
    if (typeof injected === 'string' && injected.trim()) {
      return injected.trim().replace(/\/+$/, '');
    }
  }
  return '';
}

export function websocketUrlFromApiBase(base: string): string | null {
  if (!base) return null;
  if (base.startsWith('https://')) return `wss://${base.slice('https://'.length)}/ws`;
  if (base.startsWith('http://')) return `ws://${base.slice('http://'.length)}/ws`;
  if (base.startsWith('/') && typeof window !== 'undefined') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const normalized = base.replace(/\/+$/, '');
    return `${proto}//${window.location.host}${normalized}/ws`;
  }
  return null;
}

/** URL del WebSocket para tiempo real (asignaciones, catálogo). */
export function getWebSocketUrl(): string | null {
  const override = readWsOverride();
  if (override) return override.endsWith('/ws') ? override : `${override}/ws`;
  return websocketUrlFromApiBase(getApiBase());
}

export async function assignmentApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = readApiToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${getApiBase()}${path}`, { ...init, headers });
}
