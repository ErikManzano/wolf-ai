import { Clock, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface ExerciseChipItem {
  id: string;
  label: string;
  count?: number;
  icon?: 'star' | 'clock';
  swatchColor?: string;
  variant?: 'folder';
}

export function WlExerciseChipBar({
  ariaLabel,
  items,
  activeId,
  moreLabel,
  onChange,
}: {
  ariaLabel: string;
  items: ExerciseChipItem[];
  activeId: string;
  moreLabel: string;
  onChange: (id: string) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setOverflow(el.scrollWidth > el.clientWidth + 8);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items]);

  useEffect(() => {
    if (!moreOpen) return;
    const onAway = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('mousedown', onAway);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onAway);
      window.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  const renderChip = (item: ExerciseChipItem) => {
    const active = item.id === activeId;
    return (
      <button
        key={item.id}
        type="button"
        role="tab"
        aria-selected={active}
        className={`wl-exercises-chip${active ? ' is-active' : ''}${item.icon ? ' wl-exercises-chip--quick' : ''}${item.variant === 'folder' ? ' wl-exercises-chip--folder' : ''}`}
        onClick={() => {
          onChange(item.id);
          setMoreOpen(false);
        }}
      >
        {item.icon === 'star' ? <Star size={13} strokeWidth={2.25} aria-hidden /> : null}
        {item.icon === 'clock' ? <Clock size={13} strokeWidth={2.25} aria-hidden /> : null}
        {item.swatchColor ? (
          <span className="wl-exercises-chip__swatch" style={{ background: item.swatchColor }} aria-hidden />
        ) : null}
        {item.label}
        {item.count != null ? <span className="wl-exercises-chip__count">{item.count}</span> : null}
      </button>
    );
  };

  return (
    <div className="wl-exercises-chips-row">
      <div
        ref={scrollerRef}
        className={`wl-exercises-chips${overflow ? ' is-overflowing' : ''}`}
        role="tablist"
        aria-label={ariaLabel}
      >
        {items.map(renderChip)}
      </div>
      {overflow ? (
        <div className="wl-exercises-chips-more" ref={moreRef}>
          <button
            type="button"
            className="wl-exercises-chip wl-exercises-chip--more"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((open) => !open)}
          >
            {moreLabel}
          </button>
          {moreOpen ? (
            <div className="wl-exercises-chips-more__menu" role="listbox" aria-label={moreLabel}>
              {items.map((item) => (
                <button
                  key={`more-${item.id}`}
                  type="button"
                  role="option"
                  aria-selected={item.id === activeId}
                  className={item.id === activeId ? 'is-active' : undefined}
                  onClick={() => {
                    onChange(item.id);
                    setMoreOpen(false);
                  }}
                >
                  {item.label}
                  {item.count != null ? <span>{item.count}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
