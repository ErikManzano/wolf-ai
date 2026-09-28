import type { MetricDeltaTone } from '../statsComparison';

export type ContextComparisonRow = {
  label: string;
  current: string;
  prev: string;
  delta?: string;
  deltaTone?: MetricDeltaTone;
  deltaSymbol?: string;
};

function DeltaBadge({
  delta,
  tone,
  symbol,
}: {
  delta?: string;
  tone?: MetricDeltaTone;
  symbol?: string;
}) {
  if (!delta) {
    return <span className="wl-context-delta wl-context-delta--na">—</span>;
  }
  const t = tone ?? 'flat';
  const label = symbol ? `${symbol} ${delta}` : delta;
  return (
    <span className={`wl-context-delta wl-context-delta--${t}`} title={label}>
      {label}
    </span>
  );
}

export function ContextComparisonTable({
  rows,
  hasComparison,
  prevLabel,
  isEs,
}: {
  rows: ContextComparisonRow[];
  hasComparison: boolean;
  prevLabel: string;
  isEs: boolean;
}) {
  return (
    <table className="wl-program-context-table wl-program-context-table--compare">
      <thead>
        <tr>
          <th scope="col" />
          <th scope="col">{isEs ? 'Actual' : 'Current'}</th>
          {hasComparison ? <th scope="col">{prevLabel}</th> : null}
          {hasComparison ? <th scope="col">{isEs ? 'Δ vs prev.' : 'Δ vs prev.'}</th> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
            <tr key={row.label} className="wl-context-compare-row">
              <th scope="row" className="wl-context-compare-row__label">
                {row.label}
              </th>
              <td className="wl-context-compare-row__current">{row.current}</td>
              {hasComparison ? (
                <td className="wl-context-compare-row__prev">{row.prev}</td>
              ) : null}
              {hasComparison ? (
                <td className="wl-context-compare-row__delta">
                  <DeltaBadge
                    delta={row.delta}
                    tone={row.deltaTone}
                    symbol={row.deltaSymbol}
                  />
                </td>
              ) : null}
            </tr>
        ))}
      </tbody>
    </table>
  );
}
