import React, { useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { PlanChangeNotificationsList } from './PlanChangeNotificationsList';
import './notifications.css';

export type NotificationsBellVariant = 'mobile' | 'desktop';

export interface NotificationsBellProps {
  variant: NotificationsBellVariant;
  isEs: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export const NotificationsBell: React.FC<NotificationsBellProps> = ({
  variant,
  isEs,
  open,
  onOpenChange,
  className = '',
}) => {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const {
    planChangeNotifications,
    unreadPlanChangeCount,
    loadPlanChangeNotifications,
    markPlanChangeNotificationRead,
    markAllPlanChangeNotificationsRead,
    athleteUser,
    currentUser,
  } = useWolfAssign();

  const isAthlete = currentUser?.role === 'athlete' || Boolean(athleteUser);
  const notices = planChangeNotifications;

  useEffect(() => {
    if (!open || !isAthlete) return;
    void loadPlanChangeNotifications();
  }, [open, isAthlete, loadPlanChangeNotifications]);

  useEffect(() => {
    if (!open || variant !== 'desktop') return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, variant, onOpenChange]);

  const handleMarkRead = useCallback(
    (id: string) => {
      void markPlanChangeNotificationRead(id);
    },
    [markPlanChangeNotificationRead],
  );

  const handleMarkAllRead = useCallback(() => {
    void markAllPlanChangeNotificationsRead();
  }, [markAllPlanChangeNotificationsRead]);

  if (!isAthlete) return null;

  const title = isEs ? 'Notificaciones' : 'Notifications';
  const unreadLabel =
    unreadPlanChangeCount > 0
      ? isEs
        ? `${unreadPlanChangeCount} sin leer`
        : `${unreadPlanChangeCount} unread`
      : isEs
        ? 'Sin pendientes'
        : 'All caught up';

  return (
    <div
      ref={rootRef}
      className={`wolf-notifications-bell wolf-notifications-bell--${variant}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className={`wolf-notifications-bell__trigger${open ? ' is-open' : ''}`}
        aria-expanded={open}
        aria-haspopup={variant === 'desktop' ? 'dialog' : undefined}
        aria-label={title}
        onClick={() => onOpenChange(!open)}
      >
        <Bell size={variant === 'mobile' ? 22 : 20} strokeWidth={2} aria-hidden />
        {unreadPlanChangeCount > 0 ? (
          <span className="wolf-notifications-bell__badge" aria-hidden>
            {unreadPlanChangeCount > 9 ? '9+' : unreadPlanChangeCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open && variant === 'desktop' ? (
          <motion.div
            key="dropdown"
            className="wolf-notifications-panel wolf-notifications-panel--dropdown"
            role="dialog"
            aria-label={title}
            initial={reduceMotion ? false : { opacity: 0, y: -8, scale: 0.98 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
            }
          >
            <header className="wolf-notifications-panel__head">
              <div>
                <h2 className="wolf-notifications-panel__title">{title}</h2>
                <p className="wolf-notifications-panel__subtitle">{unreadLabel}</p>
              </div>
              <button
                type="button"
                className="wolf-notifications-panel__close"
                aria-label={isEs ? 'Cerrar' : 'Close'}
                onClick={() => onOpenChange(false)}
              >
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </header>
            <div className="wolf-notifications-panel__body">
              <PlanChangeNotificationsList
                notices={notices}
                isEs={isEs}
                compact
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open && variant === 'mobile' ? (
          <>
            <motion.button
              key="backdrop"
              type="button"
              className="wolf-notifications-backdrop"
              aria-label={isEs ? 'Cerrar notificaciones' : 'Close notifications'}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={reduceMotion ? undefined : { opacity: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => onOpenChange(false)}
            />
            <motion.section
              key="sheet"
              className="wolf-notifications-panel wolf-notifications-panel--mobile"
              role="dialog"
              aria-label={title}
              initial={reduceMotion ? false : { opacity: 0, x: '100%' }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: '100%' }}
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.32, ease: [0.22, 1, 0.36, 1] }
              }
            >
              <header className="wolf-notifications-panel__head wolf-notifications-panel__head--mobile">
                <button
                  type="button"
                  className="wolf-notifications-panel__back"
                  aria-label={isEs ? 'Cerrar' : 'Close'}
                  onClick={() => onOpenChange(false)}
                >
                  <X size={22} strokeWidth={2} aria-hidden />
                </button>
                <div className="wolf-notifications-panel__head-copy">
                  <h2 className="wolf-notifications-panel__title">{title}</h2>
                  <p className="wolf-notifications-panel__subtitle">{unreadLabel}</p>
                </div>
              </header>
              <div className="wolf-notifications-panel__body wolf-notifications-panel__body--mobile">
                <PlanChangeNotificationsList
                  notices={notices}
                  isEs={isEs}
                  onMarkRead={handleMarkRead}
                  onMarkAllRead={handleMarkAllRead}
                />
              </div>
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
