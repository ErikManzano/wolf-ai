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

export function websocketUrlFromApiBase(base: string): string | null {
  if (!base) return null;
  if (base.startsWith('https://')) return `wss://${base.slice('https://'.length)}/ws`;
  if (base.startsWith('http://')) return `ws://${base.slice('http://'.length)}/ws`;
  return null;
}

export async function assignmentApiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = readApiToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(`${getApiBase()}${path}`, { ...init, headers });
}
