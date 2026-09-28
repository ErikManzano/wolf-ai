import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const MENU_MIN_WIDTH = 200;
const MENU_EST_HEIGHT = 280;
const VIEWPORT_PAD = 8;

export function ProgramsActionsMenuList({
  open,
  anchorRef,
  onClose,
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setCoords(null);
      return;
    }
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < MENU_EST_HEIGHT && rect.top > MENU_EST_HEIGHT;
    const top = openUp ? rect.top - VIEWPORT_PAD : rect.bottom + 6;
    const left = Math.min(
      Math.max(VIEWPORT_PAD, rect.right - MENU_MIN_WIDTH),
      window.innerWidth - MENU_MIN_WIDTH - VIEWPORT_PAD,
    );
    setCoords({ top, left, openUp });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener('mousedown', onPointer);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('mousedown', onPointer);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !coords) return null;

  return createPortal(
    <div
      ref={listRef}
      className="wl-programs-actions-menu__list wl-programs-actions-menu__list--portal"
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        minWidth: MENU_MIN_WIDTH,
        transform: coords.openUp ? 'translateY(-100%)' : undefined,
      }}
      role="menu"
    >
      {children}
    </div>,
    document.body,
  );
}
