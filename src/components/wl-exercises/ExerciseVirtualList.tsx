import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ExerciseListDensity, ExerciseListNode } from './types';
import { findNodeOffset, listNodeHeight, listNodesTotalHeight } from './exerciseListUtils';

const OVERSCAN = 8;

/** Lista virtual con alturas variables (filas + cabeceras de grupo). */
export function ExerciseVirtualList({
  nodes,
  density,
  renderNode,
  empty,
}: {
  nodes: ExerciseListNode[];
  density: ExerciseListDensity;
  renderNode: (node: ExerciseListNode, index: number) => ReactNode;
  empty?: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [range, setRange] = useState({ start: 0, end: Math.min(nodes.length, 40) });

  const virtualize = nodes.length > 100;
  const totalHeight = useMemo(() => listNodesTotalHeight(nodes, density), [nodes, density]);

  const offsets = useMemo(() => {
    const list: number[] = [];
    let acc = 0;
    for (const node of nodes) {
      list.push(acc);
      acc += listNodeHeight(node, density);
    }
    return list;
  }, [nodes, density]);

  useEffect(() => {
    if (!virtualize) {
      setRange({ start: 0, end: nodes.length });
      return;
    }
    const el = scrollerRef.current;
    if (!el) return;

    const update = () => {
      const scrollTop = el.scrollTop;
      const viewHeight = el.clientHeight;
      let start = 0;
      while (start < nodes.length && offsets[start]! + listNodeHeight(nodes[start]!, density) <= scrollTop) {
        start += 1;
      }
      start = Math.max(0, start - OVERSCAN);

      let end = start;
      const bottom = scrollTop + viewHeight;
      while (end < nodes.length && offsets[end]! < bottom) {
        end += 1;
      }
      end = Math.min(nodes.length, end + OVERSCAN);
      setRange({ start, end });
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [nodes, density, offsets, virtualize]);

  if (nodes.length === 0) return <>{empty}</>;

  if (!virtualize) {
    return (
      <div className="wl-exercises-list wl-exercises-list--table">
        {nodes.map((node, index) => (
          <div key={node.id}>{renderNode(node, index)}</div>
        ))}
      </div>
    );
  }

  const visible = nodes.slice(range.start, range.end);

  return (
    <div ref={scrollerRef} className="wl-exercises-list wl-exercises-list--table wl-exercises-list--virtual">
      <div className="wl-exercises-list__spacer" style={{ height: totalHeight }}>
        {visible.map((node, index) => {
          const absoluteIndex = range.start + index;
          const top = findNodeOffset(nodes, absoluteIndex, density);
          const height = listNodeHeight(node, density);
          return (
            <div
              key={node.id}
              className="wl-exercises-list__slot"
              style={{ top, height }}
            >
              {renderNode(node, absoluteIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
