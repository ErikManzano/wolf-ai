import { SectionCard, type SectionCardProps } from '../stats-ds';

/** Analytics-style section card for the program editor context panel (380px). */
export function ProgramContextSection({
  className,
  ...props
}: SectionCardProps) {
  return (
    <SectionCard
      {...props}
      className={`wl-stats-section--context${className ? ` ${className}` : ''}`}
    />
  );
}
