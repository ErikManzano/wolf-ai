import { getWebSocketUrl } from './apiClient';

export type RealtimeMessage = {
  event: string;
  payload?: unknown;
  ts?: number;
};

const ASSIGNMENTS_EVENT = 'assignments:changed';

export function isAssignmentsChangedEvent(msg: RealtimeMessage): boolean {
  return msg.event === ASSIGNMENTS_EVENT;
}

/** WebSocket con reconexión exponencial para un evento concreto. */
export function subscribeRealtimeEvent(
  eventName: string,
  onEvent: (payload: unknown) => void,
  options?: { enabled?: boolean },
): () => void {
  if (typeof window === 'undefined') return () => {};
  if (options?.enabled === false) return () => {};

  const wsUrl = getWebSocketUrl();
  if (!wsUrl) return () => {};

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let attempt = 0;

  const connect = () => {
    if (disposed) return;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        attempt = 0;
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as RealtimeMessage;
          if (msg.event === eventName) onEvent(msg.payload);
        } catch {
          /* ignore malformed messages */
        }
      };
      ws.onclose = () => {
        ws = null;
        if (disposed) return;
        const delay = Math.min(30_000, 1000 * 2 ** attempt);
        attempt += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => {
        ws?.close();
      };
    } catch {
      /* websocket unavailable */
    }
  };

  connect();

  return () => {
    disposed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws && ws.readyState < 2) ws.close();
  };
}

/** WebSocket con reconexión exponencial para eventos de asignaciones WL. */
export function subscribeAssignmentsRealtime(
  onAssignmentsChanged: (payload: unknown) => void,
  options?: { enabled?: boolean },
): () => void {
  return subscribeRealtimeEvent(ASSIGNMENTS_EVENT, onAssignmentsChanged, options);
}
