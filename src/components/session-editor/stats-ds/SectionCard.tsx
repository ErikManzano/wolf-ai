import React from 'react';

export interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  /** Header action (e.g. link button) */
  action?: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  children,
  className,
  action,
}) => (
  <section className={`wl-stats-section${className ? ` ${className}` : ''}`}>
    <header className="wl-stats-section__head">
      <div className="wl-stats-section__head-row">
        <div className="wl-stats-section__head-copy">
          <h3 className="wl-stats-section__title">{title}</h3>
          {subtitle ? <p className="wl-stats-section__subtitle">{subtitle}</p> : null}
        </div>
        {action ? <div className="wl-stats-section__action">{action}</div> : null}
      </div>
    </header>
    <div className="wl-stats-section__body">{children}</div>
  </section>
);
