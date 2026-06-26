import React from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import type { PlanChangeNotification } from '../../models/notifications';
import { formatPlanDayRef, formatRelativeNoticeDate } from './planChangeFormat';

export interface PlanChangeNotificationsListProps {
  notices: PlanChangeNotification[];
  isEs: boolean;
  compact?: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead?: () => void;
}

export const PlanChangeNotificationsList: React.FC<PlanChangeNotificationsListProps> = ({
  notices,
  isEs,
  compact = false,
  onMarkRead,
  onMarkAllRead,
}) => {
  const unreadCount = notices.filter((n) => !n.readAt).length;

  if (notices.length === 0) {
    return (
      <div className="wolf-notifications-empty">
        <Bell size={28} strokeWidth={1.75} aria-hidden />
        <p>{isEs ? 'Sin avisos del coach por ahora.' : 'No coach notices yet.'}</p>
      </div>
    );
  }

  return (
    <>
      {unreadCount > 1 && onMarkAllRead ? (
        <div className="wolf-notifications-list__toolbar">
          <button type="button" className="wolf-notifications-list__mark-all" onClick={onMarkAllRead}>
            <CheckCheck size={15} strokeWidth={2} aria-hidden />
            {isEs ? `Marcar ${unreadCount} como leídas` : `Mark ${unreadCount} as read`}
          </button>
        </div>
      ) : null}
      <ul className={`wolf-notifications-list${compact ? ' wolf-notifications-list--compact' : ''}`}>
        {notices.map((notice) => {
          const unread = !notice.readAt;
          const summary = (isEs ? notice.summaryEs : notice.summaryEn)?.filter(Boolean) ?? [];
          const dayRef = formatPlanDayRef(notice, isEs);
          const editCount = notice.editCount ?? 1;

          return (
            <li
              key={notice.id}
              className={`wolf-notification-item${unread ? ' is-unread' : ' is-read'}`}
            >
              <div className="wolf-notification-item__avatar" aria-hidden>
                {notice.coachName.trim().charAt(0).toUpperCase() || 'C'}
              </div>
              <div className="wolf-notification-item__body">
                <div className="wolf-notification-item__headline">
                  <p className="wolf-notification-item__program">{notice.programName}</p>
                  {editCount > 1 ? (
                    <span className="wolf-notification-item__batch">
                      {isEs ? `${editCount} guardados` : `${editCount} saves`}
                    </span>
                  ) : null}
                </div>
                <p className="wolf-notification-item__day">{dayRef}</p>
                {summary.length > 0 ? (
                  <ul className="wolf-notification-item__summary">
                    {summary.slice(0, 4).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                    {summary.length > 4 ? (
                      <li className="wolf-notification-item__summary-more">
                        {isEs
                          ? `+${summary.length - 4} cambio${summary.length - 4 === 1 ? '' : 's'} más`
                          : `+${summary.length - 4} more change${summary.length - 4 === 1 ? '' : 's'}`}
                      </li>
                    ) : null}
                  </ul>
                ) : (
                  <p className="wolf-notification-item__message">
                    {isEs ? notice.messageEs : notice.messageEn}
                  </p>
                )}
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
    </>
  );
};
