import { Maximize2 } from 'lucide-react';

export function ProgramContextChartExpandButton({
  isEs,
  onClick,
  chartTitle,
}: {
  isEs: boolean;
  onClick: () => void;
  chartTitle: string;
}) {
  const label = isEs ? `Ampliar: ${chartTitle}` : `Expand: ${chartTitle}`;
  return (
    <button
      type="button"
      className="wl-program-context-chart-expand"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={label}
      title={isEs ? 'Ver a detalle' : 'View detail'}
    >
      <Maximize2 size={14} strokeWidth={2.25} aria-hidden />
      <span>{isEs ? 'Ampliar' : 'Expand'}</span>
    </button>
  );
}
