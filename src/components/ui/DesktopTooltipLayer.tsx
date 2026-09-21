import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './desktop-tooltip.css';

type TipPlacement = 'top' | 'bottom' | 'right';

interface TipState {
  text: string;
  top: number;
  left: number;
  placement: TipPlacement;
}

const SHOW_DELAY_MS = 280;
const MAX_TIP_LEN = 48;
const VIEWPORT_PAD = 10;
const DESKTOP_MQ = '(hover: hover) and (pointer: fine) and (min-width: 1025px)';

function isDesktopPointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches;
}

function normalizeTooltipText(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= MAX_TIP_LEN) return clean;
  return `${clean.slice(0, MAX_TIP_LEN - 1).trim()}…`;
}

function hasVisibleLabel(el: HTMLButtonElement): boolean {
  for (const node of el.childNodes) {
    if (node instanceof HTMLElement) {
      if (node.matches('svg, img') || node.getAttribute('aria-hidden') === 'true') continue;
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
      const rect = node.getBoundingClientRect();
      const text = node.textContent?.replace(/\s+/g, ' ').trim();
      if (text && rect.width >= 4 && rect.height >= 4) return true;
      continue;
    }
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true;
  }
  return false;
}

function getTooltipText(el: HTMLElement): string | null {
  const explicit = el.dataset.wlTooltip?.trim();
  if (explicit === 'off') return null;
  if (explicit) return normalizeTooltipText(explicit);

  if (!(el instanceof HTMLButtonElement)) return null;
  if (hasVisibleLabel(el)) return null;

  const aria = el.getAttribute('aria-label')?.trim();
  if (aria) return normalizeTooltipText(aria);

  return null;
}

function isTooltipCandidate(el: HTMLElement): boolean {
  if (el.dataset.wlTooltip === 'off') return false;
  if (el.closest('[data-wl-tooltip-off]')) return false;
  if (!el.isConnected) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  if (el instanceof HTMLButtonElement && hasVisibleLabel(el)) return false;

  return Boolean(getTooltipText(el));
}

function resolvePlacement(anchor: HTMLElement): TipPlacement {
  if (anchor.closest('.sidebar.compact')) return 'right';
  const rect = anchor.getBoundingClientRect();
  if (rect.top < 56) return 'bottom';
  return 'top';
}

function positionForAnchor(anchor: HTMLElement, placement: TipPlacement): Pick<TipState, 'top' | 'left'> {
  const rect = anchor.getBoundingClientRect();
  if (placement === 'right') {
    return {
      top: rect.top + rect.height / 2,
      left: rect.right,
    };
  }
  if (placement === 'bottom') {
    return {
      top: rect.bottom,
      left: rect.left + rect.width / 2,
    };
  }
  return {
    top: rect.top,
    left: rect.left + rect.width / 2,
  };
}

function clampTipPosition(
  tipEl: HTMLElement,
  draft: TipState,
): Pick<TipState, 'top' | 'left'> {
  const rect = tipEl.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (draft.placement === 'right') {
    let top = draft.top;
    const half = rect.height / 2;
    top = Math.max(VIEWPORT_PAD + half, Math.min(vh - VIEWPORT_PAD - half, top));
    return { top, left: draft.left };
  }

  let left = draft.left;
  const half = rect.width / 2;
  left = Math.max(VIEWPORT_PAD + half, Math.min(vw - VIEWPORT_PAD - half, left));
  return { top: draft.top, left };
}

function resolveTooltipAnchorAt(x: number, y: number): HTMLElement | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (!(el instanceof HTMLElement)) continue;

    if (el.matches('[data-wl-tooltip-host]')) {
      if (isTooltipCandidate(el)) return el;
      const btn = el.querySelector('button');
      if (btn instanceof HTMLButtonElement && isTooltipCandidate(btn)) return btn;
      continue;
    }

    if (el instanceof HTMLButtonElement && isTooltipCandidate(el)) {
      return el;
    }
  }
  return null;
}

/** Tooltips de escritorio: solo iconos sin etiqueta visible o `data-wl-tooltip` explícito. */
export function DesktopTooltipLayer() {
  const [tip, setTip] = useState<TipState | null>(null);
  const activeAnchorRef = useRef<HTMLElement | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!tip || !tipRef.current) return;
    const clamped = clampTipPosition(tipRef.current, tip);
    if (Math.abs(clamped.left - tip.left) > 0.5 || Math.abs(clamped.top - tip.top) > 0.5) {
      setTip((current) => (current ? { ...current, ...clamped } : null));
    }
  }, [tip?.text, tip?.placement, tip?.top, tip?.left]);

  useEffect(() => {
    if (!isDesktopPointer()) return undefined;

    const clearShowTimer = () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    };

    const hide = () => {
      clearShowTimer();
      activeAnchorRef.current = null;
      setTip(null);
    };

    const showFor = (anchor: HTMLElement) => {
      const text = getTooltipText(anchor);
      if (!text) {
        hide();
        return;
      }

      activeAnchorRef.current = anchor;
      const placement = resolvePlacement(anchor);
      const { top, left } = positionForAnchor(anchor, placement);
      setTip({ text, top, left, placement });
    };

    const scheduleShow = (anchor: HTMLElement) => {
      if (anchor === activeAnchorRef.current) return;
      clearShowTimer();
      showTimerRef.current = setTimeout(() => showFor(anchor), SHOW_DELAY_MS);
    };

    const onMouseMove = (event: MouseEvent) => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const anchor = resolveTooltipAnchorAt(event.clientX, event.clientY);
        if (!anchor) {
          if (activeAnchorRef.current) hide();
          return;
        }
        scheduleShow(anchor);
      });
    };

    const onScroll = () => {
      const anchor = activeAnchorRef.current;
      if (!anchor) return;
      const text = getTooltipText(anchor);
      if (!text) {
        hide();
        return;
      }
      const placement = resolvePlacement(anchor);
      const { top, left } = positionForAnchor(anchor, placement);
      setTip({ text, top, left, placement });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    };

    const onMqChange = () => {
      if (!isDesktopPointer()) hide();
    };

    const mq = window.matchMedia(DESKTOP_MQ);
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    document.addEventListener('keydown', onKeyDown);
    mq.addEventListener('change', onMqChange);

    return () => {
      hide();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      document.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      document.removeEventListener('keydown', onKeyDown);
      mq.removeEventListener('change', onMqChange);
    };
  }, []);

  if (!tip) return null;

  return createPortal(
    <div
      ref={tipRef}
      className={`wl-desktop-tooltip wl-desktop-tooltip--${tip.placement}`}
      role="tooltip"
      style={{
        top: `${tip.top}px`,
        left: `${tip.left}px`,
      }}
    >
      {tip.text}
    </div>,
    document.body,
  );
}
