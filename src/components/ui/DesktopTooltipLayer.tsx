import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './desktop-tooltip.css';

interface TipState {
  text: string;
  top: number;
  left: number;
}

const SHOW_DELAY_MS = 320;
const DESKTOP_MQ = '(hover: hover) and (pointer: fine) and (min-width: 1025px)';

function isDesktopPointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches;
}

function getTooltipText(el: HTMLElement): string | null {
  const explicit = el.dataset.wlTooltip?.trim();
  if (explicit && explicit !== 'off') return explicit;

  if (el instanceof HTMLButtonElement) {
    const aria = el.getAttribute('aria-label')?.trim();
    if (aria) return aria;

    const title = el.getAttribute('title')?.trim();
    if (title) return title;

    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('svg, img, [aria-hidden="true"]').forEach((node) => node.remove());
    const text = clone.textContent?.replace(/\s+/g, ' ').trim();
    return text || null;
  }

  return null;
}

function isTooltipCandidate(el: HTMLElement): boolean {
  if (el.dataset.wlTooltip === 'off') return false;
  if (el.closest('[data-wl-tooltip-off]')) return false;
  if (!el.isConnected) return false;

  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;

  return Boolean(getTooltipText(el));
}

function positionForAnchor(el: HTMLElement): Pick<TipState, 'top' | 'left'> {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left + rect.width / 2,
  };
}

function resolveTooltipAnchorAt(x: number, y: number): HTMLElement | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (el instanceof HTMLElement && el.matches('[data-wl-tooltip-host]')) {
      const btn = el.querySelector('button');
      if (btn instanceof HTMLButtonElement) {
        const label = getTooltipText(btn) ?? getTooltipText(el);
        if (label) return el;
      }
      if (isTooltipCandidate(el)) return el;
    }

    if (el instanceof HTMLButtonElement && isTooltipCandidate(el)) {
      return el;
    }
  }
  return null;
}

/** Global desktop-only tooltips for all buttons (uses aria-label, title, or visible text). */
export function DesktopTooltipLayer() {
  const [tip, setTip] = useState<TipState | null>(null);
  const activeButtonRef = useRef<HTMLElement | null>(null);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

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
      activeButtonRef.current = null;
      setTip(null);
    };

    const showFor = (anchor: HTMLElement) => {
      const btn = anchor.matches('button')
        ? (anchor as HTMLButtonElement)
        : anchor.querySelector('button');

      if (btn instanceof HTMLButtonElement) {
        const nativeTitle = btn.getAttribute('title')?.trim();
        if (nativeTitle) {
          if (!btn.dataset.wlTooltip) btn.dataset.wlTooltip = nativeTitle;
          btn.removeAttribute('title');
        }
      }

      const text =
        getTooltipText(anchor) ??
        (btn instanceof HTMLButtonElement ? getTooltipText(btn) : null);
      if (!text) {
        hide();
        return;
      }

      activeButtonRef.current = anchor;
      const { top, left } = positionForAnchor(anchor);
      setTip({ text, top, left });
    };

    const scheduleShow = (anchor: HTMLElement) => {
      if (anchor === activeButtonRef.current) return;
      clearShowTimer();
      showTimerRef.current = setTimeout(() => showFor(anchor), SHOW_DELAY_MS);
    };

    const onMouseMove = (event: MouseEvent) => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const anchor = resolveTooltipAnchorAt(event.clientX, event.clientY);
        if (!anchor) {
          if (activeButtonRef.current) hide();
          return;
        }
        scheduleShow(anchor);
      });
    };

    const onScroll = () => {
      const anchor = activeButtonRef.current;
      if (!anchor) return;
      const btn = anchor.querySelector('button');
      const text =
        getTooltipText(anchor) ??
        (btn instanceof HTMLButtonElement ? getTooltipText(btn) : null);
      if (!text) {
        hide();
        return;
      }
      const { top, left } = positionForAnchor(anchor);
      setTip({ text, top, left });
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
      className="wl-desktop-tooltip"
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
