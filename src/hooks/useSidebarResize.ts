import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

const STORAGE_KEY = 'wolf_sidebar_width_v1';
export const SIDEBAR_WIDTH_MIN = 200;
export const SIDEBAR_WIDTH_MAX = 400;
export const SIDEBAR_WIDTH_DEFAULT = 250;

function readStoredWidth(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  const parsed = stored ? Number.parseInt(stored, 10) : SIDEBAR_WIDTH_DEFAULT;
  if (!Number.isFinite(parsed)) return SIDEBAR_WIDTH_DEFAULT;
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, parsed));
}

function clampWidth(width: number): number {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, width));
}

export function useSidebarResize(enabled: boolean) {
  const [width, setWidth] = useState(readStoredWidth);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const persistWidth = useCallback((next: number) => {
    const clamped = clampWidth(next);
    setWidth(clamped);
    localStorage.setItem(STORAGE_KEY, String(clamped));
    return clamped;
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = { startX: event.clientX, startWidth: width };
      setIsResizing(true);
    },
    [enabled, width],
  );

  const onPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = event.clientX - dragRef.current.startX;
    setWidth(clampWidth(dragRef.current.startWidth + delta));
  }, []);

  const endResize = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsResizing(false);
    setWidth((current) => {
      const clamped = clampWidth(current);
      localStorage.setItem(STORAGE_KEY, String(clamped));
      return clamped;
    });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onDoubleClick = useCallback(() => {
    if (!enabled) return;
    persistWidth(SIDEBAR_WIDTH_DEFAULT);
  }, [enabled, persistWidth]);

  useEffect(() => {
    if (!isResizing) return;
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [isResizing]);

  return {
    width,
    isResizing,
    onPointerDown,
    onPointerMove,
    onPointerUp: endResize,
    onPointerCancel: endResize,
    onDoubleClick,
  };
}
