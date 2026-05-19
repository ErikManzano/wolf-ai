import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Athlete, Exercise, Session } from '../models/training';
import { addExerciseBlock, WL_SESSION_LIMITS } from '../services/sessionMutations';
import { ExerciseBlockCard } from './session-editor/ExerciseBlockCard';
import { SessionDayHero } from './session-editor/SessionDayHero';
import { SessionSheetOverview } from './session-editor/SessionSheetOverview';
import './session-editor/session-editor-polish.css';
import '../styles/interactive.css';

/** Segundo movimiento por defecto al activar complejo (p. ej. Clean → Jerk). */
const DEFAULT_COMPLEX_SECOND_ID = 'ex-022';
/** Movimiento extra al añadir segmento (p. ej. sentadilla). */
const DEFAULT_EXTRA_SEGMENT_ID = 'ex-028';

interface OlympicSessionEditorProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  onChange: (s: Session) => void;
  draftSavedAt?: string | null;
  syncPending?: boolean;
  dayLabel?: string;
  weekNumber?: number;
  dayNumber?: number;
}

const OlympicSessionEditor: React.FC<OlympicSessionEditorProps> = ({
  session,
  athlete,
  exercises,
  isEs,
  onChange,
  draftSavedAt = null,
  syncPending = false,
  dayLabel,
  weekNumber,
  dayNumber,
}) => {
  const blockRefs = useRef<Record<number, HTMLElement | null>>({});
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(
    () => new Set(session.exercises.map((_, i) => i)),
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const syncExpanded = () => {
      if (mq.matches) {
        setExpandedBlocks(new Set(session.exercises.length ? [0] : []));
      } else {
        setExpandedBlocks(new Set(session.exercises.map((_, i) => i)));
      }
    };
    syncExpanded();
    mq.addEventListener('change', syncExpanded);
    return () => mq.removeEventListener('change', syncExpanded);
  }, [session.exercises.length]);

  const toggleBlock = useCallback((bi: number) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(bi)) next.delete(bi);
      else next.add(bi);
      return next;
    });
  }, []);

  const scrollToBlock = useCallback((i: number) => {
    setExpandedBlocks((prev) => new Set([...prev, i]));
    requestAnimationFrame(() => {
      blockRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const apply = (fn: () => Session) => {
    onChange(fn());
  };

  return (
    <div className="wolf-session-editor">
      <header className="wolf-se-day-top">
        <SessionDayHero
          session={session}
          isEs={isEs}
          dayLabel={dayLabel}
          weekNumber={weekNumber}
          dayNumber={dayNumber}
          syncPending={syncPending}
          draftSavedAt={draftSavedAt}
        />
        {session.exercises.length > 0 ? (
          <SessionSheetOverview
            session={session}
            exercises={exercises}
            isEs={isEs}
            onSelectBlock={scrollToBlock}
          />
        ) : null}
      </header>

      <div className="wolf-se-blocks-area">
        <div className="wolf-se-toolbar">
          <p className="wolf-se-toolbar-hint">
            {isEs ? 'Edita series abajo o toca la hoja' : 'Edit sets below or tap the sheet'}
          </p>
          <button
            type="button"
            className="btn-primary wolf-se-session-add"
            disabled={session.exercises.length >= WL_SESSION_LIMITS.MAX_BLOCKS_PER_SESSION}
            onClick={() => apply(() => addExerciseBlock(session, exercises[0]?.id ?? 'ex-001', athlete, exercises))}
          >
            <Plus size={16} />
            <span className="wolf-se-session-add-text">{isEs ? 'Añadir ejercicio' : 'Add exercise'}</span>
          </button>
        </div>

        {session.exercises.map((block, bi) => (
          <ExerciseBlockCard
            key={`${block.exerciseId}-${bi}`}
            block={block}
            blockIndex={bi}
            session={session}
            athlete={athlete}
            exercises={exercises}
            isEs={isEs}
            expanded={expandedBlocks.has(bi)}
            totalBlocks={session.exercises.length}
            onToggle={() => toggleBlock(bi)}
            onApply={apply}
            blockRef={(el) => {
              blockRefs.current[bi] = el;
            }}
            defaultComplexSecondId={DEFAULT_COMPLEX_SECOND_ID}
            defaultExtraSegmentId={DEFAULT_EXTRA_SEGMENT_ID}
          />
        ))}
      </div>

      <button
        type="button"
        className="btn-secondary wolf-se-add-block"
        disabled={session.exercises.length >= WL_SESSION_LIMITS.MAX_BLOCKS_PER_SESSION}
        onClick={() =>
          apply(() => addExerciseBlock(session, exercises[0]?.id ?? 'ex-001', athlete, exercises))
        }
      >
        <Plus size={16} /> {isEs ? 'Añadir ejercicio (bloque)' : 'Add exercise block'}
      </button>
      {session.exercises.length >= WL_SESSION_LIMITS.MAX_BLOCKS_PER_SESSION && (
        <p className="wolf-se-kg-short" style={{ marginTop: '6px' }}>
          {isEs ? 'Límite de ejercicios por sesión alcanzado.' : 'Max exercise blocks per session reached.'}
        </p>
      )}

      <div className="wolf-se-summary wolf-se-summary--footer">
        <span>K {session.kValue.toFixed(1)}</span>
        <span>
          {isEs ? 'Tonelaje' : 'Load'} {session.load} kg
        </span>
        <span>
          {isEs ? 'Reps' : 'Reps'} {session.totalReps}
        </span>
        <span>%∅ {session.avgRelativeIntensity.toFixed(1)}</span>
        {(draftSavedAt || syncPending) && (
          <span className="wolf-se-summary-backup">
            {syncPending
              ? isEs
                ? 'Guardando…'
                : 'Saving…'
              : draftSavedAt
                ? `${isEs ? 'Copia' : 'Backup'} ${new Date(draftSavedAt).toLocaleTimeString(isEs ? 'es' : 'en', { hour: '2-digit', minute: '2-digit' })}`
                : ''}
          </span>
        )}
      </div>
    </div>
  );
};

export default OlympicSessionEditor;
