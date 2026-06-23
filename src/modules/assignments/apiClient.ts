const STORAGE_API_TOKEN = 'wolf_api_token_v1';

function productionApiBaseFallback(): string {
  if (!import.meta.env.PROD || typeof window === 'undefined') return '';
  const host = window.location.hostname;
  if (host.includes('netlify.app') || host.includes('railway.app') || host.endsWith('.wolf-ai.app')) {
    return '/api';
  }
  return '';
}

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const injected = (window as Window & { __WOLF_API_URL__?: string }).__WOLF_API_URL__;
    if (typeof injected === 'string' && injected.trim()) {
      return injected.trim().replace(/\/+$/, '');
    }
  }
  const fromEnv = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  return productionApiBaseFallback();
}

export function isApiEnabled(): boolean {
  return Boolean(getApiBase());
}

/** En producción con API activa, no usar localStorage como fuente de verdad. */
export function preferLocalDataFallback(): boolean {
  return !isApiEnabled() || !import.meta.env.PROD;
}

export function readApiToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_API_TOKEN);
  } catch {
    return null;
  }
}

/** URL explícita del WebSocket (p. ej. wss://tu-api.up.railway.app/ws). Opcional si REST usa proxy relativo /api. */
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

const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const MAX_API_RETRIES = 3;

function retryDelayMs(attempt: number): number {
  return 500 * (attempt + 1);
}

export async function assignmentApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = readApiToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < MAX_API_RETRIES; attempt += 1) {
    const response = await fetch(`${getApiBase()}${path}`, { ...init, headers });
    lastResponse = response;
    if (!RETRYABLE_STATUSES.has(response.status) || attempt === MAX_API_RETRIES - 1) {
      return response;
    }
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, retryDelayMs(attempt));
    });
  }

  return lastResponse!;
}
