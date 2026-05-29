import React, { useCallback, useRef, useState } from 'react';
import { Eye, Pencil } from 'lucide-react';
import type { WlAssignmentStatus } from '../../../utils/dashboardStats';
import '../mobile-wl.css';

const ACTION_WIDTH = 144;
const SWIPE_THRESHOLD = 56;

interface MobileAssignmentCardProps {
  programName: string;
  athleteName: string;
  status: WlAssignmentStatus;
  statusLabel: string;
  version: number;
  assignedAt: string;
  completionPct: number;
  sessionsDone: number;
  sessionSlots: number;
  isEs: boolean;
  onView: () => void;
  onEdit?: () => void;
}

export const MobileAssignmentCard: React.FC<MobileAssignmentCardProps> = ({
  programName,
  athleteName,
  status,
  statusLabel,
  version,
  assignedAt,
  completionPct,
  sessionsDone,
  sessionSlots,
  isEs,
  onView,
  onEdit,
}) => {
  const startX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0]?.clientX ?? 0;
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dx = (e.touches[0]?.clientX ?? 0) - startX.current;
      if (dx < 0) setOffset(Math.max(dx, -ACTION_WIDTH));
      else if (revealed) setOffset(Math.min(0, -ACTION_WIDTH + dx));
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

  const reset = () => {
    setOffset(0);
    setRevealed(false);
  };

  return (
    <div className="mwl-assignment-card-wrap">
      <div className="mwl-assignment-swipe-actions">
        <button
          type="button"
          className="mwl-assignment-swipe-btn mwl-assignment-swipe-btn--view"
          onClick={() => {
            reset();
            onView();
          }}
        >
          <Eye size={18} />
          {isEs ? 'Ver' : 'View'}
        </button>
        {onEdit && (
          <button
            type="button"
            className="mwl-assignment-swipe-btn mwl-assignment-swipe-btn--edit"
            onClick={() => {
              reset();
              onEdit();
            }}
          >
            <Pencil size={18} />
            {isEs ? 'Editar' : 'Edit'}
          </button>
        )}
      </div>
      <button
        type="button"
        className="wl-mgmt-assignment-card"
        style={{ transform: `translateX(${offset}px)`, width: '100%' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => {
          if (revealed) {
            reset();
            return;
          }
          onView();
        }}
      >
        <div className="wl-mgmt-assignment-card-top">
          <strong>{programName}</strong>
          <span className={`wl-mgmt-status-badge wl-mgmt-status-badge--${status}`}>{statusLabel}</span>
        </div>
        <span className="wl-mgmt-assignment-card-athlete">{athleteName}</span>
        <span className="wl-mgmt-assignment-card-meta">
          v{version} · {assignedAt}
        </span>
        <div className="wl-mgmt-card-progress">
          <div className="wl-mgmt-progress-bar">
            <div className="wl-mgmt-progress-fill" style={{ width: `${completionPct}%` }} />
          </div>
          <span>
            {completionPct}% · {sessionsDone}/{sessionSlots}
          </span>
        </div>
      </button>
    </div>
  );
};
