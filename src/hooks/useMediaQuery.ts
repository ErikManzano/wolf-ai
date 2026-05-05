import { useEffect, useState } from 'react';

/** Hook ligero para adaptar UI al ancho (p. ej. panel chat colapsable solo en desktop). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    mq.addEventListener('change', handler);
    queueMicrotask(() => setMatches(mq.matches));
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
