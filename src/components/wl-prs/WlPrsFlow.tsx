import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Athlete } from '../../models/training';
import type { AthleteLiftLog, PrLiftId } from '../../models/liftLogs';
import { useMobileTopBar } from '../../context/MobileTopBarContext';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  createAthleteLiftLog,
  deleteAthleteLiftLog,
  listAthleteLiftLogs,
} from '../../modules/wl-prs/liftLogsClient';
import ConfirmationModal from '../ConfirmationModal';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import { liftLabel } from './PrLiftCatalog';
import { WlPrLiftDetail } from './WlPrLiftDetail';
import { WlPrLogSheet } from './WlPrLogSheet';
import { WlPrsHub } from './WlPrsHub';
import './wl-prs.css';

export function WlPrsFlow({
  athleteId,
  athleteName,
  isEs,
  canLog,
  oneRM,
  createdByUserId,
  initialLiftId = null,
  onClose,
  onLogsChanged,
}: {
  athleteId: string;
  athleteName?: string;
  isEs: boolean;
  canLog: boolean;
  oneRM?: Athlete['oneRM'];
  createdByUserId?: string;
  initialLiftId?: PrLiftId | null;
  onClose: () => void;
  onLogsChanged?: () => void;
}) {
  const { pushAlert } = useWolfAlert();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [liftId, setLiftId] = useState<PrLiftId | null>(initialLiftId);
  const [logs, setLogs] = useState<AthleteLiftLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logOpen, setLogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setLogs(await listAthleteLiftLogs(athleteId));
    } catch {
      pushAlert({
        tone: 'warning',
        title: isEs ? 'No se pudieron cargar los PRs' : 'Could not load PRs',
        message: isEs ? 'Revisa la conexión e inténtalo de nuevo.' : 'Check your connection and try again.',
      });
    } finally {
      setLoading(false);
    }
  }, [athleteId, isEs, pushAlert]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const title = liftId ? liftLabel(liftId, isEs) : isEs ? 'Mis PRs' : 'My PRs';

  const goBack = useCallback(() => {
    if (liftId) {
      setLiftId(null);
      return;
    }
    onClose();
  }, [liftId, onClose]);

  const mobileTopBar = useMemo(
    () =>
      isMobile
        ? {
            title,
            back: {
              label: liftId
                ? isEs
                  ? 'Volver a PRs'
                  : 'Back to PRs'
                : isEs
                  ? 'Volver'
                  : 'Back',
              onBack: goBack,
            },
            lockEdgeSwipe: true,
          }
        : null,
    [goBack, isEs, isMobile, liftId, title],
  );
  useMobileTopBar(mobileTopBar);

  const breadcrumbItems = [
    { label: athleteName || (isEs ? 'PRs' : 'PRs'), onClick: onClose },
    { label: isEs ? 'PRs' : 'PRs', onClick: liftId ? () => setLiftId(null) : undefined },
    ...(liftId ? [{ label: liftLabel(liftId, isEs) }] : []),
  ];

  const handleSave = async (input: { kg: number; reps: number; notes?: string }) => {
    if (!liftId) return;
    const created = await createAthleteLiftLog(athleteId, { liftId, ...input }, createdByUserId);
    if (!created) {
      pushAlert({
        tone: 'error',
        title: isEs ? 'No se pudo guardar' : 'Could not save',
        message: isEs ? 'El registro no se guardó.' : 'The log was not saved.',
      });
      return;
    }
    await reload();
    onLogsChanged?.();
    pushAlert({
      tone: 'success',
      title: isEs ? 'Registro guardado' : 'Lift logged',
      message: `${input.kg} kg × ${input.reps}`,
    });
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    setDeleting(true);
    const ok = await deleteAthleteLiftLog(athleteId, pendingDeleteId);
    setDeleting(false);
    setPendingDeleteId(null);
    if (!ok) {
      pushAlert({
        tone: 'error',
        title: isEs ? 'No se pudo eliminar' : 'Could not delete',
        message: isEs ? 'El registro sigue en el historial.' : 'The log is still in history.',
      });
      return;
    }
    await reload();
    onLogsChanged?.();
  };

  return (
    <div className="wl-prs-flow">
      {!isMobile ? (
        <AppBreadcrumb
          isEs={isEs}
          className="app-breadcrumb--icon-back"
          onBack={goBack}
          backLabel={liftId ? (isEs ? 'PRs' : 'PRs') : athleteName ? athleteName : isEs ? 'Volver' : 'Back'}
          items={breadcrumbItems}
        />
      ) : null}

      <header className="wl-prs-flow__head">
        <div>
          <p className="wl-prs-flow__eyebrow">{isEs ? 'Seguimiento de marcas' : 'PR tracker'}</p>
          <h1 className="wl-prs-flow__title">{title}</h1>
          {athleteName && liftId ? <p className="wl-prs-flow__meta">{athleteName}</p> : null}
        </div>
      </header>

      {loading ? <p className="wl-prs-empty">{isEs ? 'Cargando…' : 'Loading…'}</p> : null}

      {!loading && !liftId ? <WlPrsHub isEs={isEs} logs={logs} oneRM={oneRM} onOpenLift={setLiftId} /> : null}

      {!loading && liftId ? (
        <WlPrLiftDetail
          isEs={isEs}
          liftId={liftId}
          logs={logs}
          oneRM={oneRM}
          canLog={canLog}
          onAdd={() => setLogOpen(true)}
          onDelete={setPendingDeleteId}
        />
      ) : null}

      {liftId && canLog ? (
        <WlPrLogSheet
          isEs={isEs}
          liftId={liftId}
          open={logOpen}
          onClose={() => setLogOpen(false)}
          onSave={handleSave}
        />
      ) : null}

      <ConfirmationModal
        open={pendingDeleteId != null}
        title={isEs ? 'Eliminar registro' : 'Delete log'}
        message={isEs ? '¿Quitar este intento del historial?' : 'Remove this attempt from history?'}
        confirmLabel={isEs ? 'Eliminar' : 'Delete'}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger
        onCancel={() => {
          if (!deleting) setPendingDeleteId(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
