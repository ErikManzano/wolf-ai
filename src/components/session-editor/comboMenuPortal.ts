import { useCallback, useEffect, useState, type RefObject } from 'react';

export interface ComboMenuRect {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  transform?: string;
}

export function measureComboMenuRect(
  anchor: HTMLElement | null,
  maxHeight = 220,
  gap = 4,
): ComboMenuRect | null {
  if (!anchor) return null;
  const rect = anchor.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const preferBelow = spaceBelow >= Math.min(maxHeight, 120) || spaceBelow >= spaceAbove;

  if (preferBelow) {
    return {
      top: rect.bottom + gap,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(maxHeight, Math.max(96, spaceBelow - 8)),
    };
  }

  return {
    top: rect.top - gap,
    left: rect.left,
    width: rect.width,
    maxHeight: Math.min(maxHeight, Math.max(96, spaceAbove - 8)),
    transform: 'translateY(-100%)',
  };
}

export function usePortaledComboMenu(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  rootRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
  onClose: () => void,
): ComboMenuRect | null {
  const [menuRect, setMenuRect] = useState<ComboMenuRect | null>(null);

  const updateRect = useCallback(() => {
    setMenuRect(measureComboMenuRect(anchorRef.current));
  }, [anchorRef]);

  useEffect(() => {
    if (!open) {
      setMenuRect(null);
      return;
    }
    updateRect();
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [open, updateRect, onClose, rootRef, menuRef]);

  return menuRect;
}
