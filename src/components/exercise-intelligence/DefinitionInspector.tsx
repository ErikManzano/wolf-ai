import React from 'react';
import { Copy, Pencil, GitFork, Upload } from 'lucide-react';
import type { ExerciseDefinitionVersion, ExerciseRelationshipRule, MergedDefinitionView } from '../../models/exercise';
import { isSingleComposition } from '../../models/exercise';
import { mockAthletes } from '../../data/loadMockData';
import { toLegacyExercise } from '../../services/exercise';
import { kgForExercise } from '../session-editor/blockMetrics';
import LifecycleBadge from './LifecycleBadge';
import EiTag from './EiTag';
import EiEmptyState from './EiEmptyState';
import DefinitionVersionTimeline from './DefinitionVersionTimeline';
import LoadRelationshipMiniGraph from './LoadRelationshipMiniGraph';
import { FAMILY_TOKEN } from './familyTokens';
import { Button } from '../ui/button';

interface DefinitionInspectorProps {
  def: MergedDefinitionView | null;
  taxonomy: import('../../models/exercise').ExerciseTaxonomyBundle;
  relationships: ExerciseRelationshipRule[];
  versions: ExerciseDefinitionVersion[];
  collectionTitles: string[];
  isEs: boolean;
  canEditOfficial: boolean;
  onEdit: () => void;
  onFork: () => void;
  onDuplicate: () => void;
  onPublish?: () => void;
}

const DEMO = mockAthletes[0]!;

const DefinitionInspector: React.FC<DefinitionInspectorProps> = ({
  def,
  taxonomy,
  relationships,
  versions,
  collectionTitles,
  isEs,
  canEditOfficial,
  onEdit,
  onFork,
  onDuplicate,
  onPublish,
}) => {
  if (!def) {
    return (
      <aside className="wolf-ei-pane wolf-ei-inspector wolf-ei-inspector--premium">
        <div className="wolf-ei-pane__head">{isEs ? 'Movement Intel' : 'Movement Intel'}</div>
        <div className="wolf-ei-pane__body">
          <EiEmptyState>
            {isEs ? 'Selecciona un ejercicio del registro para ver detalle, relaciones y versiones.' : 'Select an exercise from the registry to view detail, relationships, and versions.'}
          </EiEmptyState>
        </div>
      </aside>
    );
  }

  const legacy = toLegacyExercise(def, taxonomy);
  const demoKg = kgForExercise(DEMO, legacy, 80);
  const comp = def.composition;

  const fam = def.family ?? (isSingleComposition(comp) ? comp.family : null);
  const famTok = fam ? FAMILY_TOKEN[fam] : null;

  return (
    <aside className="wolf-ei-pane wolf-ei-inspector wolf-ei-inspector--premium">
      <div className="wolf-ei-pane__head">{isEs ? 'Movement Intel' : 'Movement Intel'}</div>
      <div className="wolf-ei-pane__body">
        <header className="wolf-ei-inspector__hero-row">
          {famTok ? (
            <EiTag tone="category" size="md" accent={famTok.hue}>
              {famTok.abbr}
            </EiTag>
          ) : null}
          <div className="wolf-ei-inspector__hero-text">
            <div className="wolf-ei-inspector__badge-row">
              <LifecycleBadge status={def.lifecycleStatus} kind={def.kind === 'complex' ? 'complex' : undefined} isEs={isEs} />
              <EiTag tone="version">v{def.version}</EiTag>
            </div>
            <h2 className="wolf-ei-inspector__title">{def.effectiveDisplayName}</h2>
            <p className="wolf-ei-inspector__sig">
              {def.signature.slice(0, 20)}… · {def.loadAnchor}
            </p>
          </div>
        </header>

        <div className="wolf-ei-inspector__chip-row">
          {isSingleComposition(comp) && (
            <>
              <EiTag tone="meta">{comp.family}</EiTag>
              <EiTag tone="meta">{comp.variation}</EiTag>
              <EiTag tone="meta">{comp.startPosition}</EiTag>
              {comp.modifiers.map((m) => (
                <EiTag key={m} tone="meta">
                  {m}
                </EiTag>
              ))}
            </>
          )}
          <EiTag tone="objective">{def.objective}</EiTag>
        </div>

        <p className="wolf-ei-inspector__demo-load">
          <strong>{demoKg} kg</strong>{' '}
          <span className="muted">@ 80% {isEs ? 'demo' : 'demo'}</span>
        </p>

        <div className="wolf-ei-inspector__actions">
          {(def.coachId || canEditOfficial) && (
            <Button type="button" size="sm" variant="default" onClick={onEdit}>
              <Pencil size={14} /> {isEs ? 'Editar' : 'Edit'}
            </Button>
          )}
          {!def.coachId && (
            <Button type="button" size="sm" variant="secondary" onClick={onFork}>
              <GitFork size={14} /> {isEs ? 'Fork coach' : 'Coach fork'}
            </Button>
          )}
          <Button type="button" size="sm" variant="secondary" onClick={onDuplicate}>
            <Copy size={14} /> {isEs ? 'Duplicar' : 'Duplicate'}
          </Button>
          {canEditOfficial && onPublish ? (
            <Button type="button" size="sm" variant="secondary" onClick={onPublish}>
              <Upload size={14} /> {isEs ? 'Publicar' : 'Publish'}
            </Button>
          ) : null}
        </div>

        {def.coachOverride?.override.notes && (
          <section className="wolf-ei-inspector__section">
            <h3 className="wolf-ei-inspector__section-head">{isEs ? 'Notas coach' : 'Coach notes'}</h3>
            <p style={{ fontSize: '0.85rem', margin: 0, color: 'var(--ei-text-secondary)' }}>
              {def.coachOverride.override.notes}
            </p>
          </section>
        )}

        <section className="wolf-ei-inspector__section">
          <h3 className="wolf-ei-inspector__section-head">
            {isEs ? 'Relaciones de carga' : 'Load relationships'}
          </h3>
          <LoadRelationshipMiniGraph family={fam} relationships={relationships} isEs={isEs} />
        </section>

        {collectionTitles.length > 0 && (
          <section className="wolf-ei-inspector__section">
            <h3 className="wolf-ei-inspector__section-head">{isEs ? 'Colecciones' : 'Collections'}</h3>
            <div className="wolf-ei-inspector__chip-row">
              {collectionTitles.map((t) => (
                <EiTag key={t} tone="meta">
                  {t}
                </EiTag>
              ))}
            </div>
          </section>
        )}

        <section className="wolf-ei-inspector__section">
          <h3 className="wolf-ei-inspector__section-head">{isEs ? 'Versiones' : 'Versions'}</h3>
          <DefinitionVersionTimeline versions={versions} isEs={isEs} />
        </section>

        <section className="wolf-ei-inspector__section">
          <h3 className="wolf-ei-inspector__section-head">{isEs ? 'Tags' : 'Tags'}</h3>
          {def.tags.length > 0 ? (
            <div className="wolf-ei-inspector__chip-row">
              {def.tags.map((t) => (
                <EiTag key={t} tone="meta">
                  {t}
                </EiTag>
              ))}
            </div>
          ) : (
            <EiEmptyState compact>
              {isEs ? 'Sin tags en esta definición.' : 'No tags on this definition.'}
            </EiEmptyState>
          )}
        </section>
      </div>
    </aside>
  );
};

export default DefinitionInspector;
