import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const STORAGE_KEY = 'wolf_sidebar_width_v1';

export const SIDEBAR_COMPACT_WIDTH = 84;
export const SIDEBAR_WIDTH_MIN = 200;
export const SIDEBAR_WIDTH_MAX = 400;
export const SIDEBAR_WIDTH_DEFAULT = 250;
/** Por debajo de este ancho al soltar, el sidebar pasa a modo iconos. */
export const SIDEBAR_COLLAPSE_THRESHOLD = 128;

type UseSidebarResizeOptions = {
  enabled: boolean;
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
};

function readStoredWidth(): number {
  const stored = localStorage.getItem(STORAGE_KEY);
  const parsed = stored ? Number.parseInt(stored, 10) : SIDEBAR_WIDTH_DEFAULT;
  if (!Number.isFinite(parsed)) return SIDEBAR_WIDTH_DEFAULT;
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, parsed));
}

function clampExpandedWidth(width: number): number {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, width));
}

function clampDragWidth(width: number): number {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_COMPACT_WIDTH, width));
}

function finalizeWidth(width: number, onCollapse: () => void): number {
  if (width <= SIDEBAR_COLLAPSE_THRESHOLD) {
    onCollapse();
    return readStoredWidth();
  }
  const clamped = clampExpandedWidth(width);
  localStorage.setItem(STORAGE_KEY, String(clamped));
  return clamped;
}

export function useSidebarResize({
  enabled,
  collapsed,
  onCollapse,
  onExpand,
}: UseSidebarResizeOptions) {
  const [width, setWidth] = useState(readStoredWidth);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const dragMovedRef = useRef(false);
  const onCollapseRef = useRef(onCollapse);
  const onExpandRef = useRef(onExpand);

  useEffect(() => {
    onCollapseRef.current = onCollapse;
    onExpandRef.current = onExpand;
  }, [onCollapse, onExpand]);

  const persistWidth = useCallback((next: number) => {
    const clamped = clampExpandedWidth(next);
    setWidth(clamped);
    localStorage.setItem(STORAGE_KEY, String(clamped));
    return clamped;
  }, []);

  const endResize = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsResizing(false);
    setWidth((current) => finalizeWidth(current, () => onCollapseRef.current()));
  }, []);

  const consumeToggleClick = useCallback(() => {
    if (!dragMovedRef.current) return false;
    dragMovedRef.current = false;
    return true;
  }, []);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) return;
      event.preventDefault();
      dragMovedRef.current = false;
      if (collapsed) {
        onExpandRef.current();
        dragRef.current = { startX: event.clientX, startWidth: SIDEBAR_COMPACT_WIDTH };
        setWidth(SIDEBAR_COMPACT_WIDTH);
      } else {
        dragRef.current = { startX: event.clientX, startWidth: width };
      }
      setIsResizing(true);
    },
    [collapsed, enabled, width],
  );

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (event: PointerEvent) => {
      if (!dragRef.current) return;
      const delta = event.clientX - dragRef.current.startX;
      if (Math.abs(delta) > 4) dragMovedRef.current = true;
      setWidth(clampDragWidth(dragRef.current.startWidth + delta));
    };

    const onUp = () => {
      endResize();
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    };
  }, [endResize, isResizing]);

  const onDoubleClick = useCallback(() => {
    if (!enabled) return;
    if (collapsed) onExpandRef.current();
    persistWidth(SIDEBAR_WIDTH_DEFAULT);
  }, [collapsed, enabled, persistWidth]);

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

  const nearCollapse = isResizing && width <= SIDEBAR_COLLAPSE_THRESHOLD;

  return {
    width,
    isResizing,
    nearCollapse,
    onPointerDown,
    onDoubleClick,
    consumeToggleClick,
  };
}
