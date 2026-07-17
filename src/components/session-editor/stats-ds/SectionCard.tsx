import React from 'react';

export interface SectionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  subtitle,
  children,
  className,
}) => (
  <section className={`wl-stats-section${className ? ` ${className}` : ''}`}>
    <header className="wl-stats-section__head">
      <h3 className="wl-stats-section__title">{title}</h3>
      {subtitle ? <p className="wl-stats-section__subtitle">{subtitle}</p> : null}
    </header>
    <div className="wl-stats-section__body">{children}</div>
  </section>
);
