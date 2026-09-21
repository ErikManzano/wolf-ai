import { Plus, Trash2 } from 'lucide-react';
import type { Athlete } from '../../models/training';
import type { AthleteLiftLog, PrLiftId } from '../../models/liftLogs';
import { epleyE1rm, formatKg, NRM_RANGE, nrmFromE1rm, PCT_1RM_RANGE, percentOfE1rm, roundKg } from './e1rm';
import { liftLabel } from './PrLiftCatalog';
import { formatPrDate, formatPrDateTime } from './prDate';
import { summarizeLift } from './prSummaries';

function PrChart({ logs, isEs }: { logs: AthleteLiftLog[]; isEs: boolean }) {
  const chronological = logs.slice().sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  if (chronological.length === 0) {
    return (
      <div className="wl-prs-chart wl-prs-chart--empty">
        <p>{isEs ? 'Registra un intento para ver la curva.' : 'Log a lift to see the curve.'}</p>
      </div>
    );
  }
  const values = chronological.map((log) => epleyE1rm(log.kg, log.reps));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(2, max - min);
  const w = 320;
  const h = 120;
  const padX = 12;
  const padY = 16;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const pts = values.map((v, i) => {
    const x = padX + (chronological.length === 1 ? innerW / 2 : (i / (chronological.length - 1)) * innerW);
    const y = padY + innerH - ((v - min) / span) * innerH;
    return `${x},${y}`;
  });
  const area = `${padX},${padY + innerH} ${pts.join(' ')} ${w - padX},${padY + innerH}`;
  return (
    <div className="wl-prs-chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={isEs ? 'Historial e1RM' : 'e1RM history'}>
        <polygon className="wl-prs-chart__area" points={area} />
        <polyline className="wl-prs-chart__line" points={pts.join(' ')} fill="none" />
        {values.map((v, i) => {
          const x = padX + (chronological.length === 1 ? innerW / 2 : (i / (chronological.length - 1)) * innerW);
          const y = padY + innerH - ((v - min) / span) * innerH;
          return <circle key={chronological[i]!.id} className="wl-prs-chart__dot" cx={x} cy={y} r="3.5" />;
        })}
      </svg>
    </div>
  );
}

export function WlPrLiftDetail({
  isEs,
  liftId,
  logs,
  oneRM,
  canLog,
  onAdd,
  onDelete,
}: {
  isEs: boolean;
  liftId: PrLiftId;
  logs: AthleteLiftLog[];
  oneRM?: Athlete['oneRM'];
  canLog: boolean;
  onAdd: () => void;
  onDelete: (logId: string) => void;
}) {
  const summary = summarizeLift(liftId, logs, oneRM);
  const e1 = summary.bestE1rm;
  const title = liftLabel(liftId, isEs);

  return (
    <div className="wl-prs-detail">
      <div className="wl-prs-detail__hero">
        <p className="wl-prs-detail__kicker">{isEs ? 'Mejor e1RM' : 'Best e1RM'}</p>
        <p className="wl-prs-detail__max">
          {e1 > 0 ? (
            <>
              {formatKg(e1)}
              <span>kg</span>
            </>
          ) : (
            '—'
          )}
        </p>
        <p className="wl-prs-detail__sub">{title}</p>
      </div>

      <PrChart logs={summary.logs} isEs={isEs} />

      <div className="wl-prs-stat-row">
        <div className="wl-prs-stat">
          <span>{isEs ? 'Inicio' : 'Start'}</span>
          <strong>{summary.firstLoggedAt ? `${formatKg(summary.firstE1rm)} kg` : '—'}</strong>
          <small>{formatPrDate(summary.firstLoggedAt, isEs)}</small>
        </div>
        <div className="wl-prs-stat">
          <span>{isEs ? 'Último' : 'Last'}</span>
          <strong>{summary.lastLog ? `${formatKg(summary.lastE1rm)} kg` : '—'}</strong>
          <small>
            {summary.lastLog
              ? `${roundKg(summary.lastLog.kg)} × ${summary.lastLog.reps}`
              : isEs
                ? 'Sin registro'
                : 'No log'}
          </small>
        </div>
        <div className="wl-prs-stat wl-prs-stat--best">
          <span>{isEs ? 'Mejor' : 'Best'}</span>
          <strong>{e1 > 0 ? `${formatKg(e1)} kg` : '—'}</strong>
          <small>
            {summary.bestLog
              ? `${roundKg(summary.bestLog.kg)} × ${summary.bestLog.reps}`
              : formatPrDate(summary.lastLoggedAt, isEs)}
          </small>
        </div>
      </div>

      {canLog ? (
        <button type="button" className="wl-prs-add-btn" onClick={onAdd}>
          <Plus size={18} aria-hidden />
          {isEs ? 'Registrar intento' : 'Log lift'}
        </button>
      ) : null}

      <section className="wl-prs-section">
        <h3>{isEs ? 'nRM estimado' : 'Estimated nRM'}</h3>
        <div className="wl-prs-table-grid">
          {NRM_RANGE.map((n) => (
            <div key={n} className="wl-prs-table-cell">
              <span>{n}RM</span>
              <strong>{e1 > 0 ? `${formatKg(nrmFromE1rm(e1, n))} kg` : '—'}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="wl-prs-section">
        <h3>{isEs ? '% del 1RM' : '% of 1RM'}</h3>
        <div className="wl-prs-table-grid">
          {PCT_1RM_RANGE.map((pct) => (
            <div key={pct} className="wl-prs-table-cell">
              <span>{pct}%</span>
              <strong>{e1 > 0 ? `${formatKg(percentOfE1rm(e1, pct))} kg` : '—'}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="wl-prs-section">
        <h3>{isEs ? 'Historial' : 'History'}</h3>
        {summary.logs.length === 0 ? (
          <p className="wl-prs-empty">{isEs ? 'Aún no hay registros en este levantamiento.' : 'No logs for this lift yet.'}</p>
        ) : (
          <ul className="wl-prs-history">
            {summary.logs.map((log) => {
              const est = epleyE1rm(log.kg, log.reps);
              return (
                <li key={log.id} className="wl-prs-history__row">
                  <div>
                    <strong>
                      {roundKg(log.kg)} kg × {log.reps}
                    </strong>
                    <span>
                      e1RM {formatKg(est)} kg · {formatPrDateTime(log.loggedAt, isEs)}
                    </span>
                    {log.notes ? <em>{log.notes}</em> : null}
                  </div>
                  {canLog ? (
                    <button
                      type="button"
                      className="wl-prs-history__del"
                      onClick={() => onDelete(log.id)}
                      aria-label={isEs ? 'Eliminar registro' : 'Delete log'}
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
