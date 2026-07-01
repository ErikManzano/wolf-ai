import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from 'react';

export type ComboMenuLayout = 'anchored' | 'sheet';

export interface ComboMenuRect {
  layout: ComboMenuLayout;
  top?: number;
  left: number;
  width: number;
  maxHeight: number;
  height?: number;
  transform?: string;
  overflowY: 'visible' | 'auto';
  columns: 1 | 2;
}

export interface MeasureComboMenuOptions {
  maxHeight?: number;
  gap?: number;
  minWidth?: number;
  optionCount?: number;
}

const MOBILE_BREAKPOINT = 899;
const MOBILE_OPTION_HEIGHT = 48;
const SHEET_PADDING = 20;

function responsiveMinWidth(): number {
  if (typeof window === 'undefined') return 120;
  return Math.min(280, window.innerWidth * 0.92);
}

export function isMobileComboViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= MOBILE_BREAKPOINT;
}

function sheetColumns(optionCount: number): 1 | 2 {
  return optionCount > 6 ? 2 : 1;
}

function measureMobileSheetRect(optionCount: number): ComboMenuRect {
  const columns = sheetColumns(optionCount);
  const optionRows = Math.max(1, Math.ceil(optionCount / columns));
  const contentHeight = optionRows * MOBILE_OPTION_HEIGHT + SHEET_PADDING + 24;
  const maxSheet = Math.floor(window.innerHeight * 0.88);
  const needsScroll = contentHeight > maxSheet;

  return {
    layout: 'sheet',
    left: 0,
    width: window.innerWidth,
    maxHeight: needsScroll ? maxSheet : contentHeight,
    height: needsScroll ? maxSheet : contentHeight,
    overflowY: 'auto',
    columns,
  };
}

function resolveAnchoredMaxHeight(optionCount: number | undefined, maxHeightCap: number): number {
  const viewportCap = window.innerHeight * 0.4;
  const capped = Math.min(maxHeightCap, viewportCap);
  if (!optionCount || optionCount <= 0) return capped;
  const fullListHeight = optionCount * 34 + 12;
  return Math.min(Math.max(capped, fullListHeight), window.innerHeight * 0.5);
}

export function measureComboMenuRect(
  anchor: HTMLElement | null,
  options: MeasureComboMenuOptions = {},
): ComboMenuRect | null {
  if (typeof window === 'undefined') return null;

  const optionCount = options.optionCount ?? 0;
  if (isMobileComboViewport() && optionCount > 0) {
    return measureMobileSheetRect(optionCount);
  }

  if (!anchor) return null;

  const maxHeightCap = options.maxHeight ?? 220;
  const gap = options.gap ?? 4;
  const minWidth = options.minWidth ?? responsiveMinWidth();
  const viewportMaxHeight = resolveAnchoredMaxHeight(optionCount, maxHeightCap);
  const rect = anchor.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const preferBelow = spaceBelow >= Math.min(viewportMaxHeight, 120) || spaceBelow >= spaceAbove;
  const menuWidth = Math.max(rect.width, minWidth);

  let left = rect.left;
  if (left + menuWidth > window.innerWidth - 8) {
    left = Math.max(8, window.innerWidth - menuWidth - 8);
  }

  if (preferBelow) {
    return {
      layout: 'anchored',
      top: rect.bottom + gap,
      left,
      width: menuWidth,
      maxHeight: Math.min(viewportMaxHeight, Math.max(96, spaceBelow - 8)),
      overflowY: 'auto',
      columns: 1,
    };
  }

  return {
    layout: 'anchored',
    top: rect.top - gap,
    left,
    width: menuWidth,
    maxHeight: Math.min(viewportMaxHeight, Math.max(96, spaceAbove - 8)),
    transform: 'translateY(-100%)',
    overflowY: 'auto',
    columns: 1,
  };
}

export function wrapOptionIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function usePortaledComboMenu(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  rootRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  measureOptions?: MeasureComboMenuOptions,
): ComboMenuRect | null {
  const [menuRect, setMenuRect] = useState<ComboMenuRect | null>(null);

  const updateRect = useCallback(() => {
    setMenuRect(measureComboMenuRect(anchorRef.current, measureOptions));
  }, [anchorRef, measureOptions]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null);
      return;
    }
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      const tag = active.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        active.blur();
      }
    }
    updateRect();
  }, [open, updateRect]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    window.visualViewport?.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
      window.visualViewport?.removeEventListener('resize', updateRect);
    };
  }, [open, updateRect]);

  useEffect(() => {
    if (!open || menuRect?.layout !== 'sheet') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, menuRect?.layout]);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      if (!open) return;
      window.requestAnimationFrame(() => onClose());
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, [open, onClose, rootRef, menuRef]);

  return open ? menuRect : null;
}
