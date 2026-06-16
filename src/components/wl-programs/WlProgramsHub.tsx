import { Filter, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CoachProgramRow } from '../../models/coach-architecture';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { WlSearchField } from '../wl-shared/WlSearchField';
import { WlToolbarIconButton } from '../wl-shared/WlToolbarIconButton';
import { AppBreadcrumb } from '../wl-shared/AppBreadcrumb';
import '../wl-shared/app-breadcrumb.css';
import { ProgramActionsMenu } from './ProgramActionsMenu';
import { ProgramCard } from './ProgramCard';
import { ProgramMobileDetail } from './ProgramMobileDetail';
import { ProgramStatusBadge } from './ProgramStatusBadge';
import WlProgramAssignSheet from './WlProgramAssignSheet';
import { setProgramsMobileCreateVisible } from './programsMobileChrome';

export const WL_PROGRAMS_FOCUS_KEY = 'wolf_programs_focus_id';

interface WlProgramsHubProps {
  isEs: boolean;
}

type ProgramFilterId = 'all' | 'published' | 'draft' | 'without_athletes';

const WlProgramsHub: React.FC<WlProgramsHubProps> = ({ isEs }) => {
  const {
    coachPrograms,
    programsLoading,
    createCoachProgram,
    openProgramEditor,
    duplicateCoachProgram,
    deleteCoachProgram,
  } = useWolfAssign();

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ProgramFilterId>('all');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileDetailId, setMobileDetailId] = useState<string | null>(null);
  const [assignProgram, setAssignProgram] = useState<CoachProgramRow | null>(null);
  const [assignAthleteId, setAssignAthleteId] = useState<string | undefined>();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return coachPrograms.filter((p) => {
      if (q) {
        const matchesSearch =
          p.name.toLowerCase().includes(q) ||
          p.enrolledAthletes.some((e) => e.athleteName.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }
      if (filter === 'published') return p.status === 'published';
      if (filter === 'draft') return p.status === 'draft';
      if (filter === 'without_athletes') return p.enrolledAthletes.length === 0;
      return true;
    });
  }, [coachPrograms, search, filter]);

  const handleCreate = async () => {
    const name = window.prompt(isEs ? 'Nombre del programa:' : 'Program name:', isEs ? 'Nuevo mesociclo' : 'New mesocycle');
    if (!name?.trim()) return;
    const created = await createCoachProgram(name.trim());
    if (created) openProgramEditor(created.id);
  };

  const openAssign = (program: CoachProgramRow, athleteProfileId?: string) => {
    setAssignProgram(program);
    setAssignAthleteId(athleteProfileId);
  };

  const handleDelete = (programId: string) => {
    if (!window.confirm(isEs ? '¿Eliminar programa?' : 'Delete program?')) return;
    void deleteCoachProgram(programId);
  };

  const mobileDetailProgram = mobileDetailId
    ? filtered.find((program) => program.id === mobileDetailId) ?? null
    : null;

  useEffect(() => {
    if (!isMobile) {
      setProgramsMobileCreateVisible(false);
      return;
    }
    setProgramsMobileCreateVisible(!mobileDetailId);
    return () => setProgramsMobileCreateVisible(false);
  }, [isMobile, mobileDetailId]);

  const runProgramAction = (
    program: CoachProgramRow,
    action: 'edit' | 'assign' | 'duplicate' | 'delete',
  ) => {
    if (action === 'edit') {
      openProgramEditor(program.id);
      return;
    }
    if (action === 'assign') {
      openAssign(program);
      return;
    }
    if (action === 'duplicate') {
      void duplicateCoachProgram(program.id);
      return;
    }
    handleDelete(program.id);
  };

  if (isMobile && mobileDetailProgram) {
    return (
      <section className="wl-programs-hub wl-list-toolbar-scope">
        <AppBreadcrumb
          isEs={isEs}
          items={[
            { label: isEs ? 'Programas' : 'Programs', onClick: () => setMobileDetailId(null) },
            { label: mobileDetailProgram.name },
          ]}
        />
        <ProgramMobileDetail
          row={mobileDetailProgram}
          isEs={isEs}
          showBack={false}
          onBack={() => setMobileDetailId(null)}
          onEdit={() => runProgramAction(mobileDetailProgram, 'edit')}
          onAssign={() => runProgramAction(mobileDetailProgram, 'assign')}
          onDuplicate={() => runProgramAction(mobileDetailProgram, 'duplicate')}
          onDelete={() => runProgramAction(mobileDetailProgram, 'delete')}
        />
        {assignProgram ? (
          <WlProgramAssignSheet
            isEs={isEs}
            program={assignProgram}
            preselectedAthleteId={assignAthleteId}
            onClose={() => {
              setAssignProgram(null);
              setAssignAthleteId(undefined);
            }}
          />
        ) : null}
      </section>
    );
  }

  return (
    <div className="wl-programs-hub wl-list-toolbar-scope">
      <header className="wl-programs-head">
        <div className="wl-programs-head__text">
          <h1>{isEs ? 'Programas' : 'Programs'}</h1>
          <p>
            {isEs
              ? 'Gestiona mesociclos, asigna atletas y revisa adherencia en segundos.'
              : 'Manage mesocycles, assign athletes, and review adherence in seconds.'}
          </p>
        </div>
        <button type="button" className="btn-primary wl-programs-head__cta" onClick={() => void handleCreate()}>
          <Plus size={16} /> {isEs ? 'Nuevo programa' : 'New program'}
        </button>
      </header>

      <div className={`wl-list-toolbar${isMobile ? ' wl-list-toolbar--inline-mobile' : ''}`}>
        <div className="wl-list-toolbar__main">
          <WlSearchField
            value={search}
            onChange={setSearch}
            placeholder={isEs ? 'Buscar programa…' : 'Search program…'}
            ariaLabel={isEs ? 'Buscar programa' : 'Search program'}
          />
          {isMobile ? (
            <WlToolbarIconButton
              active={filter !== 'all' || mobileFiltersOpen}
              ariaLabel={isEs ? 'Filtros' : 'Filters'}
              ariaExpanded={mobileFiltersOpen}
              onClick={() => setMobileFiltersOpen((open) => !open)}
            >
              <Filter size={16} />
            </WlToolbarIconButton>
          ) : null}
        </div>
      </div>
      <div
        className={`wl-list-filter-chips${isMobile ? ' wl-list-filter-chips--collapsible' : ''}${
          isMobile && mobileFiltersOpen ? ' is-open' : ''
        }`}
      >
        <button
          type="button"
          className={`wl-list-filter-chip${filter === 'all' ? ' is-active' : ''}`}
          onClick={() => {
            setFilter('all');
            if (isMobile) setMobileFiltersOpen(false);
          }}
        >
          {isEs ? 'Todos' : 'All'}
        </button>
        <button
          type="button"
          className={`wl-list-filter-chip${filter === 'published' ? ' is-active' : ''}`}
          onClick={() => {
            setFilter('published');
            if (isMobile) setMobileFiltersOpen(false);
          }}
        >
          {isEs ? 'Publicados' : 'Published'}
        </button>
        <button
          type="button"
          className={`wl-list-filter-chip${filter === 'draft' ? ' is-active' : ''}`}
          onClick={() => {
            setFilter('draft');
            if (isMobile) setMobileFiltersOpen(false);
          }}
        >
          {isEs ? 'Borradores' : 'Drafts'}
        </button>
        <button
          type="button"
          className={`wl-list-filter-chip${filter === 'without_athletes' ? ' is-active' : ''}`}
          onClick={() => {
            setFilter('without_athletes');
            if (isMobile) setMobileFiltersOpen(false);
          }}
        >
          {isEs ? 'Sin atletas' : 'No athletes'}
        </button>
        {!isMobile ? (
          <button type="button" className="wl-list-filter-chips__reset" onClick={() => setFilter('all')}>
            <Filter size={14} />
            {isEs ? 'Filtros' : 'Filters'}
          </button>
        ) : null}
      </div>

      {programsLoading ? <p className="wl-programs-empty">{isEs ? 'Cargando programas…' : 'Loading programs…'}</p> : null}
      {!programsLoading && filtered.length === 0 ? (
        <p className="wl-programs-empty">
          {isEs ? 'Sin programas. Crea el primero.' : 'No programs yet. Create your first one.'}
        </p>
      ) : null}

      {!programsLoading && filtered.length > 0 && isMobile ? (
        <div className="wl-programs-mobile-list">
          {filtered.map((row) => (
            <ProgramCard
              key={row.id}
              row={row}
              isEs={isEs}
              onOpen={() => setMobileDetailId(row.id)}
              onEdit={() => runProgramAction(row, 'edit')}
              onAssign={() => runProgramAction(row, 'assign')}
              onDuplicate={() => runProgramAction(row, 'duplicate')}
              onDelete={() => runProgramAction(row, 'delete')}
            />
          ))}
        </div>
      ) : null}

      {!programsLoading && filtered.length > 0 && !isMobile ? (
        <div className="wl-programs-table-wrap">
          <table className="wl-programs-table">
            <thead>
              <tr>
                <th>{isEs ? 'Programa' : 'Program'}</th>
                <th className="wl-programs-col-status">{isEs ? 'Estado' : 'Status'}</th>
                <th>{isEs ? 'Atletas' : 'Athletes'}</th>
                <th>{isEs ? 'Adherencia' : 'Adherence'}</th>
                <th>{isEs ? 'Actualizado' : 'Updated'}</th>
                <th>{isEs ? 'Acciones' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                  </td>
                  <td className="wl-programs-col-status">
                    <ProgramStatusBadge status={row.status} isEs={isEs} />
                  </td>
                  <td>
                    {row.enrolledAthletes.length === 0 ? (
                      <span className="wl-programs-athletes-empty">{isEs ? 'Sin asignar' : 'Unassigned'}</span>
                    ) : (
                      <div className="wl-programs-athletes-cell">
                        <span className="wl-programs-athlete-avatar">
                          {row.enrolledAthletes[0].athleteName
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((v) => v[0]?.toUpperCase() ?? '')
                            .join('')}
                        </span>
                        <div>
                          <strong>{row.enrolledAthletes[0].athleteName}</strong>
                          <p>{isEs ? `${row.enrolledAthletes.length} atleta(s)` : `${row.enrolledAthletes.length} athlete(s)`}</p>
                        </div>
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="wl-programs-adherence-cell">
                      <span>{row.avgAdherencePct != null ? `${row.avgAdherencePct}%` : '—'}</span>
                      <div className="wl-programs-adherence-bar" aria-hidden>
                        <i style={{ width: `${row.avgAdherencePct ?? 0}%` }} />
                      </div>
                    </div>
                  </td>
                  <td>{new Date(row.updatedAt).toLocaleDateString(isEs ? 'es' : 'en')}</td>
                  <td>
                    <ProgramActionsMenu
                      isEs={isEs}
                      onEdit={() => runProgramAction(row, 'edit')}
                      onAssign={() => runProgramAction(row, 'assign')}
                      onDuplicate={() => runProgramAction(row, 'duplicate')}
                      onDelete={() => runProgramAction(row, 'delete')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {assignProgram ? (
        <WlProgramAssignSheet
          isEs={isEs}
          program={assignProgram}
          preselectedAthleteId={assignAthleteId}
          onClose={() => {
            setAssignProgram(null);
            setAssignAthleteId(undefined);
          }}
        />
      ) : null}
    </div>
  );
};

export default WlProgramsHub;
