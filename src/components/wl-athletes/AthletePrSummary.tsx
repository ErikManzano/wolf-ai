type PrProps = {
  snatch: number;
  cleanJerk: number;
  backSquat: number;
  layout?: 'inline' | 'stack' | 'grid';
};

export function AthletePrSummary({ snatch, cleanJerk, backSquat, layout = 'inline' }: PrProps) {
  return (
    <div className={`wl-athletes-pr-summary wl-athletes-pr-summary--${layout}`}>
      <span className="wl-athletes-pr-item">
        <span className="wl-athletes-pr-label">SN</span>
        <span className="wl-athletes-pr-value">{snatch}</span>
      </span>
      <span className="wl-athletes-pr-item">
        <span className="wl-athletes-pr-label">CJ</span>
        <span className="wl-athletes-pr-value">{cleanJerk}</span>
      </span>
      <span className="wl-athletes-pr-item">
        <span className="wl-athletes-pr-label">SQ</span>
        <span className="wl-athletes-pr-value">{backSquat}</span>
      </span>
    </div>
  );
}
