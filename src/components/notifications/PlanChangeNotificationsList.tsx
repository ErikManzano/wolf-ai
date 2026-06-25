import React from 'react';
import { Bell } from 'lucide-react';
import type { PlanChangeNotification } from '../../models/notifications';
import { formatRelativeNoticeDate } from './planChangeFormat';

export interface PlanChangeNotificationsListProps {
  notices: PlanChangeNotification[];
  isEs: boolean;
  compact?: boolean;
  onMarkRead: (id: string) => void;
}

export const PlanChangeNotificationsList: React.FC<PlanChangeNotificationsListProps> = ({
  notices,
  isEs,
  compact = false,
  onMarkRead,
}) => {
  if (notices.length === 0) {
    return (
      <div className="wolf-notifications-empty">
        <Bell size={28} strokeWidth={1.75} aria-hidden />
        <p>{isEs ? 'Sin avisos del coach por ahora.' : 'No coach notices yet.'}</p>
      </div>
    );
  }

  return (
    <ul className={`wolf-notifications-list${compact ? ' wolf-notifications-list--compact' : ''}`}>
      {notices.map((notice) => {
        const unread = !notice.readAt;
        return (
          <li
            key={notice.id}
            className={`wolf-notification-item${unread ? ' is-unread' : ' is-read'}`}
          >
            <div className="wolf-notification-item__avatar" aria-hidden>
              {notice.coachName.trim().charAt(0).toUpperCase() || 'C'}
            </div>
            <div className="wolf-notification-item__body">
              <p className="wolf-notification-item__message">
                {isEs ? notice.messageEs : notice.messageEn}
              </p>
              <div className="wolf-notification-item__meta">
                <span className="wolf-notification-item__coach">{notice.coachName}</span>
                <span className="wolf-notification-item__dot" aria-hidden>
                  ·
                </span>
                <time dateTime={notice.changedAt}>
                  {formatRelativeNoticeDate(notice.changedAt, isEs)}
                </time>
              </div>
              {unread ? (
                <button
                  type="button"
                  className="wolf-notification-item__action"
                  onClick={() => onMarkRead(notice.id)}
                >
                  {isEs ? 'Marcar leído' : 'Mark read'}
                </button>
              ) : null}
            </div>
            {unread ? <span className="wolf-notification-item__unread-dot" aria-hidden /> : null}
          </li>
        );
      })}
    </ul>
  );
};
