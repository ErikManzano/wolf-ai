import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { buildWlAthleteRosterRows } from '../../utils/wlAthleteRoster';

interface WlAthletesSectionProps {
  isEs: boolean;
}

/**
 * Roster WL en la sección Atletas — solo lectura para coach y super admin.
 * Altas de cuenta + contraseña: panel maestro (super_admin). PRs editables ahí también.
 */
const WlAthletesSection: React.FC<WlAthletesSectionProps> = ({ isEs }) => {
  const {
    currentUser,
    users,
    rosterForCoach,
    assignments,
    completions,
    athletesLoading,
  } = useWolfAssign();

  const roster = useMemo(() => rosterForCoach(currentUser), [rosterForCoach, currentUser]);
  const rows = useMemo(
    () => buildWlAthleteRosterRows(roster, users, assignments, completions, currentUser?.id),
    [roster, users, assignments, completions, currentUser?.id],
  );

  const isSuperAdmin = currentUser?.role === 'super_admin';

  return (
    <div className="athletes-view wl-athletes-section">
      <header className="panel-header">
        <div className="header-left">
          <h1 className="view-title">
            <Users size={22} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} aria-hidden />
            {isEs ? 'Atletas' : 'Athletes'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '8px', maxWidth: '640px', lineHeight: 1.5 }}>
            {isEs
              ? isSuperAdmin
                ? 'Vista del roster WL en base de datos. Las altas con usuario y contraseña se gestionan en Panel maestro.'
                : 'Atletas registrados en tu roster. Solo lectura: cuenta, rutina activa y adherencia. Los altas las gestiona el administrador.'
              : isSuperAdmin
                ? 'WL roster from the database. Account creation and passwords are managed in the Master panel.'
                : 'Athletes on your roster. Read-only: account, active program, and adherence. New accounts are created by the administrator.'}
          </p>
        </div>
      </header>

      <div className="athletes-kpis">
        <div className="athletes-kpi-card">
          <span>{isEs ? 'En roster' : 'On roster'}</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="athletes-kpi-card">
          <span>{isEs ? 'Con rutina WL' : 'With WL program'}</span>
          <strong>{rows.filter((r) => r.assignmentStatus === 'active').length}</strong>
        </div>
        <div className="athletes-kpi-card">
          <span>{isEs ? 'Con cuenta app' : 'With app account'}</span>
          <strong>{rows.filter((r) => r.hasPlatformAccount).length}</strong>
        </div>
      </div>

      <div className="wl-mgmt-table-wrap" style={{ marginTop: '16px' }}>
        {athletesLoading ? (
          <p className="wl-mgmt-empty">{isEs ? 'Cargando atletas…' : 'Loading athletes…'}</p>
        ) : (
          <table className="wl-mgmt-crud-table">
            <thead>
              <tr>
                <th>{isEs ? 'Atleta' : 'Athlete'}</th>
                <th>PRs</th>
                <th>{isEs ? 'Cuenta' : 'Account'}</th>
                <th>{isEs ? 'Rutina' : 'Program'}</th>
                <th>{isEs ? 'Adherencia' : 'Adherence'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.profileId}>
                  <td>
                    <strong>{row.name}</strong>
                    <span className="wl-mgmt-row-sub">{row.level}</span>
                  </td>
                  <td>
                    SN {row.snatch} · CJ {row.cleanJerk} · SQ {row.backSquat}
                  </td>
                  <td>
                    {row.hasPlatformAccount ? (
                      <span className="wl-mgmt-status-badge wl-mgmt-status-badge--active">{row.loginLabel}</span>
                    ) : (
                      <span className="wl-mgmt-status-badge wl-mgmt-status-badge--idle">
                        {isEs ? 'Sin acceso' : 'No account'}
                      </span>
                    )}
                  </td>
                  <td>
                    {row.assignmentStatus === 'active' ? (
                      <>
                        <span className="wl-mgmt-table-plan">{row.programName}</span>
                        {row.assignedAt ? (
                          <span className="wl-mgmt-row-sub">
                            {isEs ? 'Desde' : 'Since'} {row.assignedAt}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="wl-mgmt-status-badge wl-mgmt-status-badge--idle">
                        {isEs ? 'Sin asignar' : 'Unassigned'}
                      </span>
                    )}
                  </td>
                  <td>
                    {row.completionPct != null ? (
                      <div className="wl-mgmt-table-progress">
                        <div className="wl-mgmt-progress-bar" aria-hidden>
                          <div className="wl-mgmt-progress-fill" style={{ width: `${row.completionPct}%` }} />
                        </div>
                        <span>{row.completionPct}%</span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="wl-mgmt-empty">
                    {isEs ? 'Sin atletas en tu roster.' : 'No athletes in your roster.'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default WlAthletesSection;
