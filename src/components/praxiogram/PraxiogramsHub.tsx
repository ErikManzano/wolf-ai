import { Filter } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import type { PraxiogramListItem } from '../../models/praxiogram';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useWolfAlert } from '../../context/WolfAlertContext';
import ConfirmationModal from '../ConfirmationModal';
import { WlListActionBar } from '../wl-shared/WlListActionBar';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import '../wl-shared/app-breadcrumb.css';
import '../wl-shared/wl-list-toolbar.css';
import '../wl-programs/wl-programs.css';
import './praxiograms-hub.css';
import { PraxiogramActionsMenu } from './PraxiogramActionsMenu';
import { PraxiogramCard } from './PraxiogramCard';
import PraxiogramCreateSheet from './PraxiogramCreateSheet';
import { PraxiogramStatusBadge } from './PraxiogramStatusBadge';
import { usePraxiogramRegistry } from './usePraxiogramRegistry';

interface PraxiogramsHubProps {
  isEs: boolean;
  onOpenEditor: (id: string) => void;
}

type PraxiogramFilterId = 'all' | 'published' | 'draft' | 'incomplete';

const FILTER_OPTIONS: { id: PraxiogramFilterId; labelEs: string; labelEn: string }[] = [
  { id: 'all', labelEs: 'Todos', labelEn: 'All' },
  { id: 'published', labelEs: 'Publicados', labelEn: 'Published' },
  { id: 'draft', labelEs: 'Borradores', labelEn: 'Drafts' },
  { id: 'incomplete', labelEs: 'Pendientes', labelEn: 'Incomplete' },
];

type ConfirmAction = 'delete' | 'duplicate';

function confirmCopy(
  row: PraxiogramListItem,
  action: ConfirmAction,
  isEs: boolean,
): { title: string; message: string; confirmLabel: string; danger: boolean } {
  if (action === 'delete') {
    return {
      title: isEs ? 'Eliminar praxiograma' : 'Delete praxiogram',
      message: isEs
        ? `¿Eliminar «${row.title}»? Esta acción no se puede deshacer.`
        : `Delete "${row.title}"? This cannot be undone.`,
      confirmLabel: isEs ? 'Eliminar' : 'Delete',
      danger: true,
    };
  }

  return {
    title: isEs ? 'Duplicar praxiograma' : 'Duplicate praxiogram',
    message: isEs
      ? `¿Duplicar «${row.title}»? Se creará una copia en borrador.`
      : `Duplicate "${row.title}"? A draft copy will be created.`,
    confirmLabel: isEs ? 'Duplicar' : 'Duplicate',
    danger: false,
  };
}

const PraxiogramsHub: React.FC<PraxiogramsHubProps> = ({ isEs, onOpenEditor }) => {
  const { items, create, remove, duplicate } = usePraxiogramRegistry();
  const { pushAlert } = useWolfAlert();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PraxiogramFilterId>('all');
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    row: PraxiogramListItem;
    action: ConfirmAction;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((row) => {
      if (q) {
        const matches =
          row.title.toLowerCase().includes(q) ||
          row.sportContext.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filter === 'published') return row.status === 'published';
      if (filter === 'draft') return row.status === 'draft';
      if (filter === 'incomplete') return row.pendingCount > 0;
      return true;
    });
  }, [items, search, filter]);

  const runAction = (row: PraxiogramListItem, action: 'edit' | 'duplicate' | 'delete') => {
    if (action === 'edit') {
      onOpenEditor(row.id);
      return;
    }
    setConfirmAction({ row, action });
  };

  const handleCreate = async (input: { title: string; sportContext: string }) => {
    const created = create(input);
    pushAlert({
      tone: 'success',
      title: isEs ? 'Praxiograma creado' : 'Praxiogram created',
      message: isEs ? `«${created.title}» listo para editar.` : `"${created.title}" is ready to edit.`,
    });
    onOpenEditor(created.id);
  };

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction || confirmBusy) return;
    const { row, action } = confirmAction;
    setConfirmAction(null);
    setConfirmBusy(true);
    try {
      if (action === 'delete') {
        const ok = remove(row.id);
        if (ok) {
          pushAlert({
            tone: 'success',
            title: isEs ? 'Praxiograma eliminado' : 'Praxiogram deleted',
            message: isEs ? `«${row.title}» se eliminó.` : `"${row.title}" was removed.`,
          });
        }
      } else {
        const copy = duplicate(row.id);
        if (copy) {
          pushAlert({
            tone: 'success',
            title: isEs ? 'Praxiograma duplicado' : 'Praxiogram duplicated',
            message: isEs ? `Copia creada: «${copy.title}».` : `Copy created: "${copy.title}".`,
          });
        }
      }
    } finally {
      setConfirmBusy(false);
    }
  }, [confirmAction, confirmBusy, duplicate, isEs, pushAlert, remove]);

  const openRow = (row: PraxiogramListItem) => {
    onOpenEditor(row.id);
  };

  const table = (
    <div className="wl-programs-table-wrap">
      <table className="wl-programs-table">
        <thead>
          <tr>
            <th>{isEs ? 'Praxiograma' : 'Praxiogram'}</th>
            <th className="wl-programs-col-status">{isEs ? 'Estado' : 'Status'}</th>
            <th>{isEs ? 'Situaciones' : 'Situations'}</th>
            <th>{isEs ? 'Completas' : 'Complete'}</th>
            <th>{isEs ? 'Actualizado' : 'Updated'}</th>
            <th className="wl-programs-col-actions">{isEs ? 'Acciones' : 'Actions'}</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => {
            const completionPct =
              row.situationCount > 0
                ? Math.round((row.completeCount / row.situationCount) * 100)
                : 0;
            return (
              <tr
                key={row.id}
                className="wl-programs-table-row"
                onClick={() => openRow(row)}
              >
                <td>
                  <strong className="wl-programs-table-row__name">{row.title}</strong>
                  <span className="prx-hub-table__context">{row.sportContext}</span>
                </td>
                <td className="wl-programs-col-status">
                  <PraxiogramStatusBadge status={row.status} isEs={isEs} />
                </td>
                <td>{row.situationCount}</td>
                <td>
                  <div className="wl-programs-adherence-cell">
                    <span>
                      {row.completeCount}/{row.situationCount} ({completionPct}%)
                    </span>
                    <div className="wl-programs-adherence-bar" aria-hidden>
                      <i style={{ width: `${completionPct}%` }} />
                    </div>
                  </div>
                </td>
                <td>{new Date(row.updatedAt).toLocaleDateString(isEs ? 'es' : 'en')}</td>
                <td
                  className="wl-programs-col-actions"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <PraxiogramActionsMenu
                    isEs={isEs}
                    onEdit={() => runAction(row, 'edit')}
                    onDuplicate={() => runAction(row, 'duplicate')}
                    onDelete={() => runAction(row, 'delete')}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const confirmCopyText = confirmAction ? confirmCopy(confirmAction.row, confirmAction.action, isEs) : null;

  return (
    <>
      <div className="wl-programs-hub prx-hub wl-list-toolbar-scope">
        <header className="wl-programs-head">
          <div className="wl-programs-head__text">
            <AppBreadcrumb isEs={isEs} items={[{ label: isEs ? 'Praxiogramas' : 'Praxiograms' }]} />
            <p className="wl-programs-head__desc">
              {isEs
                ? 'Registra situaciones motrices por deporte y edítalas en la matriz táctica.'
                : 'Register motor situations by sport and edit them in the tactical matrix.'}
            </p>
          </div>
        </header>

        <WlListActionBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder={isEs ? 'Buscar praxiograma…' : 'Search praxiogram…'}
          searchAriaLabel={isEs ? 'Buscar praxiograma' : 'Search praxiogram'}
          filterIcon={Filter}
          filterValue={filter}
          onFilterChange={(value) => setFilter(value as PraxiogramFilterId)}
          filterAriaLabel={isEs ? 'Filtrar praxiogramas' : 'Filter praxiograms'}
          filterOptions={FILTER_OPTIONS.map((option) => ({
            id: option.id,
            label: isEs ? option.labelEs : option.labelEn,
          }))}
          filterActive={filter !== 'all'}
          primaryLabel={isEs ? 'Nuevo praxiograma' : 'New praxiogram'}
          primaryAriaLabel={isEs ? 'Nuevo praxiograma' : 'New praxiogram'}
          onPrimaryClick={() => setShowCreateSheet(true)}
        />

        {filtered.length === 0 ? (
          <p className="wl-programs-empty">
            {isEs ? 'Sin praxiogramas. Crea el primero.' : 'No praxiograms yet. Create your first one.'}
          </p>
        ) : null}

        {filtered.length > 0 && isMobile ? (
          <div className="wl-programs-mobile-list">
            {filtered.map((row) => (
              <PraxiogramCard
                key={row.id}
                row={row}
                isEs={isEs}
                onOpen={() => openRow(row)}
                onEdit={() => runAction(row, 'edit')}
                onDuplicate={() => runAction(row, 'duplicate')}
                onDelete={() => runAction(row, 'delete')}
              />
            ))}
          </div>
        ) : null}

        {filtered.length > 0 && !isMobile ? table : null}

        {showCreateSheet ? (
          <PraxiogramCreateSheet
            isEs={isEs}
            onClose={() => setShowCreateSheet(false)}
            onCreate={handleCreate}
          />
        ) : null}
      </div>

      <ConfirmationModal
        open={confirmAction != null}
        title={confirmCopyText?.title ?? ''}
        message={confirmCopyText?.message ?? ''}
        confirmLabel={confirmCopyText?.confirmLabel ?? ''}
        cancelLabel={isEs ? 'Cancelar' : 'Cancel'}
        danger={confirmCopyText?.danger}
        onCancel={() => {
          if (!confirmBusy) setConfirmAction(null);
        }}
        onConfirm={() => void handleConfirmAction()}
      />
    </>
  );
};

export default PraxiogramsHub;
