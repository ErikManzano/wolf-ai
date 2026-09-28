export interface ChartTooltipRow {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'flat';
}

export function ChartTooltip({
  title,
  rows,
  footer,
}: {
  title: string;
  rows: ChartTooltipRow[];
  footer?: string;
}) {
  return (
    <div className="wl-stats-chart-tooltip" role="status">
      <div className="wl-stats-chart-tooltip__title">{title}</div>
      <dl className="wl-stats-chart-tooltip__rows">
        {rows.map((row) => (
          <div key={row.label} className="wl-stats-chart-tooltip__row">
            <dt>{row.label}</dt>
            <dd>
              {row.value}
              {row.delta ? (
                <span
                  className={`wl-stats-chart-tooltip__delta wl-stats-chart-tooltip__delta--${row.deltaTone ?? 'flat'}`}
                >
                  {' '}
                  {row.delta}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      {footer ? <p className="wl-stats-chart-tooltip__footer">{footer}</p> : null}
    </div>
  );
}
