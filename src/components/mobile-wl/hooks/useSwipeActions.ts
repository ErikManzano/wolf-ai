import { useCallback, useRef, useState } from 'react';

const SWIPE_THRESHOLD = 56;
const ACTION_WIDTH = 120;

export function useSwipeActions(onDuplicate?: () => void, onRemove?: () => void) {
  const startX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0]?.clientX ?? 0;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dx = (e.touches[0]?.clientX ?? 0) - startX.current;
      if (dx < 0) {
        setOffset(Math.max(dx, -ACTION_WIDTH));
      } else if (revealed) {
        setOffset(Math.min(0, -ACTION_WIDTH + dx));
      }
    },
    [revealed],
  );

  const onTouchEnd = useCallback(() => {
    if (offset < -SWIPE_THRESHOLD) {
      setOffset(-ACTION_WIDTH);
      setRevealed(true);
    } else {
      setOffset(0);
      setRevealed(false);
    }
  }, [offset]);

  const reset = useCallback(() => {
    setOffset(0);
    setRevealed(false);
  }, []);

  const handleDuplicate = useCallback(() => {
    onDuplicate?.();
    reset();
  }, [onDuplicate, reset]);

  const handleRemove = useCallback(() => {
    onRemove?.();
    reset();
  }, [onRemove, reset]);

  return {
    offset,
    revealed,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    reset,
    handleDuplicate,
    handleRemove,
    actionWidth: ACTION_WIDTH,
  };
}
