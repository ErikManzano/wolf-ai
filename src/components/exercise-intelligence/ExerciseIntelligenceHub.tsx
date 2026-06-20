import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Command, Plus, RefreshCw } from 'lucide-react';
import { isSingleComposition } from '../../models/exercise';
import type { ExerciseDefinitionVersion, ExerciseLifecycleStatus, MergedDefinitionView } from '../../models/exercise';
import { useMobileTopBar } from '../../context/MobileTopBarContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import ExerciseComposerDrawer, { type ComposerDrawerMode } from '../exercise-composer/ExerciseComposerDrawer';
import SemanticExplorer from './SemanticExplorer';
import RegistryCardGrid from './RegistryCardGrid';
import DefinitionInspector from './DefinitionInspector';
import CoachContextPanel from './CoachContextPanel';
import TechnicalCollectionsView from './TechnicalCollectionsView';
import RelationshipStudio from './RelationshipStudio';
import TaxonomyAdminView from './TaxonomyAdminView';
import CommandPalette from './CommandPalette';
import { Button } from '../ui/button';
import './exercise-intelligence.css';

type HubMode = 'browse' | 'collections' | 'relationships' | 'admin';

const VARIATION_GROUP_CODES: Record<string, string[]> = {
  classic: ['classic'],
  power: ['power'],
  hang: ['hang', 'block', 'tall'],
  pulls: ['pull', 'high_pull'],
  positionals: ['muscle'],
  complexes: ['complex'],
};

interface ExerciseIntelligenceHubProps {
  language: 'ES' | 'EN';
}

const ExerciseIntelligenceHub: React.FC<ExerciseIntelligenceHubProps> = ({ language }) => {
  const isEs = language === 'ES';
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { pushAlert } = useWolfAlert();
  const {
    currentUser,
    exerciseTaxonomy,
    registryBrowse,
    refreshExerciseCatalog,
    exerciseRelationships,
    technicalCollections,
    createExerciseRelationship,
    deleteExerciseRelationship,
    upsertCoachOverride,
    fetchDefinitionDetail,
    publishExerciseDefinition,
  } = useWolfAssign();

  const [mode, setMode] = useState<HubMode>('browse');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [variationFilter, setVariationFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExerciseLifecycleStatus | 'all' | 'complex'>('all');
  const [selected, setSelected] = useState<MergedDefinitionView | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<ComposerDrawerMode>('create');
  const [forkParentId, setForkParentId] = useState<string | null>(null);
  const [relFrom, setRelFrom] = useState('clean');
  const [relTo, setRelTo] = useState('pull');
  const [relMean, setRelMean] = useState('1.1');
  const [versions, setVersions] = useState<ExerciseDefinitionVersion[]>([]);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('definitionId')) setMode('browse');
  }, []);

  const browse = useMemo(() => {
    const kind = statusFilter === 'complex' ? ('complex' as const) : ('all' as const);
    const status = statusFilter === 'complex' ? ('all' as const) : statusFilter;
    return registryBrowse({
      q: search,
      family: familyFilter as 'all',
      status,
      kind,
      includeDeprecated: false,
    });
  }, [registryBrowse, search, familyFilter, statusFilter]);

  const visibleDefinitions = useMemo(() => {
    if (!variationFilter) return browse.definitions;
    const codes =
      VARIATION_GROUP_CODES[
        Object.keys(VARIATION_GROUP_CODES).find((k) => VARIATION_GROUP_CODES[k]?.includes(variationFilter)) ?? ''
      ] ?? [variationFilter];
    return browse.definitions.filter((d) => {
      if (d.kind === 'complex') return codes.includes('complex');
      const comp = d.composition;
      if (!isSingleComposition(comp)) return false;
      return codes.includes(comp.variation);
    });
  }, [browse.definitions, variationFilter]);

  const selectDefinition = useCallback((d: MergedDefinitionView) => {
    setSelected(d);
    setRecentIds((prev) => [d.id, ...prev.filter((id) => id !== d.id)].slice(0, 12));
    const url = new URL(window.location.href);
    url.searchParams.set('definitionId', d.legacyExerciseId ?? d.id);
    window.history.replaceState({}, '', url.toString());
  }, []);

  useEffect(() => {
    if (selected && !visibleDefinitions.find((d) => d.id === selected.id)) {
      setSelected(visibleDefinitions[0] ?? null);
    }
  }, [visibleDefinitions, selected]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const defId = params.get('definitionId');
    if (!defId || browse.definitions.length === 0) return;
    const match =
      browse.definitions.find((d) => d.id === defId) ??
      browse.definitions.find((d) => d.legacyExerciseId === defId);
    if (match) setSelected(match);
  }, [browse.definitions]);

  useEffect(() => {
    if (!selected?.id) {
      setVersions([]);
      return;
    }
    void fetchDefinitionDetail(selected.id).then((detail) => {
      if (detail) setVersions(detail.versions);
    });
  }, [selected?.id, fetchDefinitionDetail]);

  const collectionTitlesForSelected = useMemo(() => {
    if (!selected) return [];
    const ids = new Set([selected.id, selected.legacyExerciseId].filter(Boolean));
    return technicalCollections
      .filter((c) => c.items.some((i) => ids.has(i.definitionId)))
      .map((c) => c.title);
  }, [selected, technicalCollections]);

  const openComposer = useCallback((m: ComposerDrawerMode, def?: MergedDefinitionView | null, parentId?: string) => {
    setComposerMode(m);
    setForkParentId(parentId ?? null);
    setSelected((prev) => def ?? prev);
    setComposerOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (mod && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openComposer('create');
      }
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('[data-ei-search]')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openComposer]);

  const handleAddRelationship = async () => {
    const mean = Number(relMean);
    const err = await createExerciseRelationship({
      fromRef: { type: 'family', code: relFrom },
      toRef: { type: 'family', code: relTo },
      relationshipType: 'percentage',
      ratioMin: mean * 0.95,
      ratioMax: mean * 1.05,
      ratioMean: mean,
      confidence: 0.6,
      methodology: 'custom',
      athleteLevel: null,
      notes: null,
    });
    if (err) pushAlert({ tone: 'error', message: err });
    else pushAlert({ tone: 'success', message: isEs ? 'Regla creada' : 'Rule created' });
  };

  const isSuperAdmin = currentUser?.role === 'super_admin';

  const hubModeTitle = useMemo(() => {
    switch (mode) {
      case 'collections':
        return isEs ? 'Colecciones' : 'Collections';
      case 'relationships':
        return isEs ? 'Relaciones' : 'Relationships';
      case 'admin':
        return isEs ? 'Taxonomía' : 'Taxonomy';
      default:
        return null;
    }
  }, [mode, isEs]);

  const mobileTopBar = useMemo(
    () =>
      isMobile && hubModeTitle
        ? {
            title: hubModeTitle,
            back: {
              label: isEs ? 'Volver a Ejercicios' : 'Back to Exercises',
              onBack: () => setMode('browse'),
            },
          }
        : null,
    [isMobile, hubModeTitle, isEs],
  );
  useMobileTopBar(mobileTopBar);

  const paletteActions = useMemo(
    () => [
      {
        id: 'new',
        label: isEs ? 'Componer movimiento' : 'Compose movement',
        hint: '⌘N',
        run: () => openComposer('create'),
      },
      {
        id: 'refresh',
        label: isEs ? 'Actualizar registro' : 'Refresh registry',
        run: () => void refreshExerciseCatalog(),
      },
      {
        id: 'collections',
        label: isEs ? 'Ir a colecciones' : 'Go to collections',
        run: () => setMode('collections'),
      },
      {
        id: 'relationships',
        label: isEs ? 'Estudio de relaciones' : 'Relationship studio',
        run: () => setMode('relationships'),
      },
    ],
    [isEs, openComposer, refreshExerciseCatalog],
  );

  return (
    <div className="wolf-ei wolf-ei--premium">
      <header className="wolf-ei__header wolf-ei__header--premium">
        <div>
          <p className="wolf-ei__eyebrow">Wolf AI · Exercise OS</p>
          <h1 className="wolf-ei__title">{isEs ? 'Ejercicios' : 'Exercises'}</h1>
          <p className="wolf-ei__subtitle">
            {isEs
              ? 'Composición semántica · registro vivo · knowledge graph de carga'
              : 'Semantic composition · live registry · load knowledge graph'}
          </p>
        </div>
        <div className="wolf-ei__header-actions">
          <button type="button" className="wolf-ei-btn-ghost wolf-ei-cmd-trigger" onClick={() => setCmdOpen(true)}>
            <Command size={16} />
            <span>{isEs ? 'Comandos' : 'Commands'}</span>
            <kbd className="wolf-ei-kbd">⌘K</kbd>
          </button>
          <Button type="button" size="sm" variant="default" className="wolf-ei-btn-compose" onClick={() => openComposer('create')}>
            <Plus size={16} /> {isEs ? 'Componer' : 'Compose'}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => void refreshExerciseCatalog()}>
            <RefreshCw size={16} />
          </Button>
        </div>
      </header>

      <nav className="wolf-ei__modes wolf-ei__modes--premium" aria-label={isEs ? 'Modos' : 'Modes'}>
        {(
          [
            ['browse', isEs ? 'Explorer' : 'Explorer'],
            ['collections', isEs ? 'Colecciones' : 'Collections'],
            ['relationships', isEs ? 'Relaciones' : 'Relationships'],
            ...(isSuperAdmin ? [['admin', isEs ? 'Taxonomía' : 'Taxonomy'] as const] : []),
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`wolf-ei__mode${mode === id ? ' active' : ''}`}
            onClick={() => setMode(id as HubMode)}
          >
            {label}
          </button>
        ))}
      </nav>

      {mode === 'browse' && (
        <div className="wolf-ei__layout wolf-ei__layout--premium">
          <SemanticExplorer
            tree={browse.tree}
            definitions={visibleDefinitions.map((d) => ({
              id: d.id,
              family: d.family ?? (isSingleComposition(d.composition) ? d.composition.family : undefined),
              variation: isSingleComposition(d.composition) ? d.composition.variation : undefined,
              kind: d.kind,
            }))}
            selectedFamily={familyFilter}
            variationFilter={variationFilter}
            recentIds={recentIds}
            isEs={isEs}
            onSelectFamily={setFamilyFilter}
            onSelectVariation={setVariationFilter}
            onSelectRecent={(id) => {
              const d = browse.definitions.find((x) => x.id === id);
              if (d) selectDefinition(d);
            }}
          />
          <RegistryCardGrid
            definitions={visibleDefinitions}
            selectedId={selected?.id ?? null}
            search={search}
            statusFilter={statusFilter}
            isEs={isEs}
            onSearch={setSearch}
            onStatusFilter={setStatusFilter}
            onSelect={selectDefinition}
            onEdit={(d) => openComposer('edit', d)}
            onFork={(d) => openComposer('fork', d, d.id)}
            onDuplicate={(d) => openComposer('create', d)}
            onComposeComplex={(d) => openComposer('edit', d)}
          />
          <div className="wolf-ei__detail-stack wolf-ei__layout-col wolf-ei__layout-col--detail">
            <DefinitionInspector
              def={selected}
              taxonomy={exerciseTaxonomy}
              relationships={exerciseRelationships}
              versions={versions}
              collectionTitles={collectionTitlesForSelected}
              isEs={isEs}
              canEditOfficial={isSuperAdmin}
              onEdit={() => selected && openComposer('edit', selected)}
              onFork={() => selected && openComposer('fork', selected, selected.id)}
              onDuplicate={() => selected && openComposer('create', selected)}
              onPublish={
                isSuperAdmin && selected
                  ? () => {
                      void publishExerciseDefinition(selected.id).then((err) => {
                        if (err) pushAlert({ tone: 'error', message: err });
                        else {
                          pushAlert({ tone: 'success', message: isEs ? 'Publicado' : 'Published' });
                          void refreshExerciseCatalog();
                        }
                      });
                    }
                  : undefined
              }
            />
            <div className="wolf-ei-pane wolf-ei-pane--coach">
              <div className="wolf-ei-pane__head">{isEs ? 'Coach override' : 'Coach override'}</div>
              <div className="wolf-ei-pane__body">
                <CoachContextPanel def={selected} isEs={isEs} onSaveOverride={upsertCoachOverride} />
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'collections' && (
        <TechnicalCollectionsView
          collections={technicalCollections}
          definitions={browse.definitions}
          isEs={isEs}
          onSelectDefinition={(id) => {
            const d = browse.definitions.find((x) => x.id === id);
            if (d) {
              selectDefinition(d);
              setMode('browse');
            }
          }}
        />
      )}

      {mode === 'relationships' && (
        <RelationshipStudio
          rules={exerciseRelationships}
          taxonomy={exerciseTaxonomy}
          isEs={isEs}
          relFrom={relFrom}
          relTo={relTo}
          relMean={relMean}
          onRelFrom={setRelFrom}
          onRelTo={setRelTo}
          onRelMean={setRelMean}
          onAdd={() => void handleAddRelationship()}
          onDelete={(id) => void deleteExerciseRelationship(id)}
        />
      )}

      {mode === 'admin' && isSuperAdmin && <TaxonomyAdminView taxonomy={exerciseTaxonomy} isEs={isEs} />}

      <CommandPalette
        open={cmdOpen}
        isEs={isEs}
        definitions={browse.definitions}
        actions={paletteActions}
        onClose={() => setCmdOpen(false)}
        onSelectDefinition={selectDefinition}
      />

      <ExerciseComposerDrawer
        open={composerOpen}
        language={language}
        mode={composerMode}
        initial={selected}
        forkParentId={forkParentId}
        onClose={() => setComposerOpen(false)}
        onSaved={() => void refreshExerciseCatalog()}
      />
    </div>
  );
};

export default ExerciseIntelligenceHub;
