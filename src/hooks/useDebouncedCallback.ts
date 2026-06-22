import { useCallback, useEffect, useMemo, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: never[]) => void>(fn: T, delayMs: number): T {
  const fnRef = useRef(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return useCallback((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fnRef.current(...args), delayMs);
  }, [delayMs]) as T;
}

export function useDebouncedCallbackWithControls<T extends (...args: never[]) => unknown>(
  fn: T,
  delayMs: number,
): { run: T; flush: () => void; cancel: () => void } {
  const fnRef = useRef(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingArgsRef = useRef<Parameters<T> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingArgsRef.current = null;
  }, []);

  const flush = useCallback(() => {
    const args = pendingArgsRef.current;
    if (!args) return;
    cancel();
    fnRef.current(...args);
  }, [cancel]);

  const run = useCallback(
    (...args: Parameters<T>) => {
      pendingArgsRef.current = args;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        pendingArgsRef.current = null;
        timerRef.current = null;
        fnRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  ) as T;

  useEffect(() => () => cancel(), [cancel]);

  return useMemo(() => ({ run, flush, cancel }), [run, flush, cancel]);
}
