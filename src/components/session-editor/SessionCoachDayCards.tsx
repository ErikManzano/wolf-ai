import React, { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Dumbbell, GitMerge, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';
import type { Athlete, Exercise, Session, SessionExerciseBlock } from '../../models/training';
import { normalizeBlockType } from '../../services/trainingEngine';
import { blockTonnage } from './blockMetrics';
import { formatBlockPrescriptionCoachMobile } from './schemeFormat';
import { blockDisplayName } from './sessionSheetUtils';
import './session-coach-day-cards.css';

export interface SessionCoachDayCardsProps {
  session: Session;
  athlete: Athlete;
  exercises: Exercise[];
  isEs: boolean;
  dayNumber?: number;
  dayLabel?: string;
  sortable?: boolean;
  onSelectBlock?: (index: number) => void;
  onReorderBlocks?: (blocks: SessionExerciseBlock[]) => void;
}

type SortableRow = { id: string; block: SessionExerciseBlock };

let nextRowId = 0;

function makeRowId(): string {
  nextRowId += 1;
  return `coach-day-card-${nextRowId}`;
}

function rowsFromBlocks(blocks: SessionExerciseBlock[], prev?: SortableRow[]): SortableRow[] {
  return blocks.map((block, i) => ({
    id: prev?.[i]?.id ?? makeRowId(),
    block,
  }));
}

const ACCENT_KEYS = ['orange', 'blue', 'amber', 'violet'] as const;

function dayTitle(dayLabel: string | undefined, dayNumber: number | undefined, isEs: boolean): string {
  const trimmed = dayLabel?.trim();
  if (trimmed && !/^D[ií]a\s+\d+$/i.test(trimmed) && !/^Day\s+\d+$/i.test(trimmed)) {
    return trimmed;
  }
  if (dayNumber != null) return isEs ? `Día ${dayNumber}` : `Day ${dayNumber}`;
  return isEs ? 'Sesión del día' : 'Day session';
}

interface CoachDayCardProps {
  block: SessionExerciseBlock;
  index: number;
  exercises: Exercise[];
  athlete: Athlete;
  isEs: boolean;
  onSelect?: () => void;
  sortable?: boolean;
  onDragStart?: (event: React.PointerEvent<HTMLDivElement>) => void;
}

function CoachDayCard({
  block,
  index,
  exercises,
  athlete,
  isEs,
  onSelect,
  sortable,
  onDragStart,
}: CoachDayCardProps) {
  const isComplex = normalizeBlockType(block) === 'complex' && Boolean(block.segments?.length);
  const name = blockDisplayName(block, exercises);
  const prescription = formatBlockPrescriptionCoachMobile(block);
  const tonnage = blockTonnage(block, athlete, exercises);
  const accent = ACCENT_KEYS[index % ACCENT_KEYS.length]!;
  const volumeLabel = tonnage > 0 ? `${tonnage.toLocaleString()} kg` : '—';

  return (
    <article
      className={`wolf-se-coach-day-card wolf-se-coach-day-card--${accent}`}
      data-accent={accent}
    >
      {sortable && onDragStart ? (
        <div
          role="button"
          tabIndex={0}
          className="wolf-se-coach-day-card__drag"
          aria-label={isEs ? 'Arrastrar para reordenar' : 'Drag to reorder'}
          onPointerDown={onDragStart}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={16} aria-hidden />
        </div>
      ) : null}
      <button type="button" className="wolf-se-coach-day-card__tap" onClick={onSelect}>
        <span
          className={`wolf-se-coach-day-card__icon${isComplex ? ' wolf-se-coach-day-card__icon--complex' : ''}`}
          aria-hidden
        >
          {isComplex ? <GitMerge size={20} strokeWidth={2} /> : <Dumbbell size={20} strokeWidth={2} />}
        </span>
        <span className="wolf-se-coach-day-card__content">
          <span className="wolf-se-coach-day-card__top">
            <span className="wolf-se-coach-day-card__name">{name}</span>
            <ChevronRight className="wolf-se-coach-day-card__chev" size={18} strokeWidth={2} aria-hidden />
          </span>
          <span className="wolf-se-coach-day-card__bottom">
            <code className="wolf-se-coach-day-card__rx" title={prescription}>
              {prescription}
            </code>
            <span
              className={`wolf-se-coach-day-card__vol${tonnage > 0 ? ' wolf-se-coach-day-card__vol--on' : ''}`}
            >
              {volumeLabel}
            </span>
          </span>
        </span>
      </button>
    </article>
  );
}

interface SortableCoachDayCardProps extends CoachDayCardProps {
  row: SortableRow;
}

function SortableCoachDayCard({ row, index, ...rest }: SortableCoachDayCardProps) {
  const dragControls = useDragControls();
  const startDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragControls.start(event);
    },
    [dragControls],
  );

  return (
    <Reorder.Item
      as="li"
      value={row}
      dragListener={false}
      dragControls={dragControls}
      className="wolf-se-coach-day-card-item"
      style={{ touchAction: 'manipulation' }}
      layout="position"
      transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.82 }}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.28)',
        zIndex: 30,
      }}
    >
      <CoachDayCard
        {...rest}
        block={row.block}
        index={index}
        sortable
        onDragStart={startDrag}
        onSelect={() => rest.onSelect?.()}
      />
    </Reorder.Item>
  );
}

export const SessionCoachDayCards: React.FC<SessionCoachDayCardsProps> = ({
  session,
  athlete,
  exercises,
  isEs,
  dayNumber,
  dayLabel,
  sortable = false,
  onSelectBlock,
  onReorderBlocks,
}) => {
  const canSort = sortable && Boolean(onReorderBlocks) && session.exercises.length > 1;
  const [rows, setRows] = useState<SortableRow[]>(() => rowsFromBlocks(session.exercises));

  useEffect(() => {
    setRows((prev) => {
      if (session.exercises.length !== prev.length) {
        return rowsFromBlocks(session.exercises, prev);
      }
      return prev.map((row, i) => ({
        id: row.id,
        block: session.exercises[i]!,
      }));
    });
  }, [session.exercises]);

  const handleReorder = useCallback(
    (nextRows: SortableRow[]) => {
      setRows(nextRows);
      onReorderBlocks?.(nextRows.map((row) => row.block));
    },
    [onReorderBlocks],
  );

  const dayEyebrow =
    dayNumber != null
      ? isEs
        ? `DÍA ${dayNumber}`
        : `DAY ${dayNumber}`
      : isEs
        ? 'DÍA'
        : 'DAY';

  return (
    <section className="wolf-se-coach-day" aria-label={isEs ? 'Ejercicios del día' : 'Day exercises'}>
      <header className="wolf-se-coach-day__head">
        <span className="wolf-se-coach-day__eyebrow">{dayEyebrow}</span>
        <h2 className="wolf-se-coach-day__title">{dayTitle(dayLabel, dayNumber, isEs)}</h2>
      </header>

      {session.exercises.length > 0 ? (
        canSort ? (
          <Reorder.Group
            as="ul"
            axis="y"
            values={rows}
            onReorder={handleReorder}
            className="wolf-se-coach-day__list wolf-se-coach-day__list--sortable"
          >
            {rows.map((row, i) => (
              <SortableCoachDayCard
                key={row.id}
                row={row}
                block={row.block}
                index={i}
                exercises={exercises}
                athlete={athlete}
                isEs={isEs}
                onSelect={() => onSelectBlock?.(i)}
              />
            ))}
          </Reorder.Group>
        ) : (
          <ul className="wolf-se-coach-day__list">
            {session.exercises.map((block, i) => (
              <li key={`coach-day-${block.exerciseId}-${i}`}>
                <CoachDayCard
                  block={block}
                  index={i}
                  exercises={exercises}
                  athlete={athlete}
                  isEs={isEs}
                  onSelect={() => onSelectBlock?.(i)}
                />
              </li>
            ))}
          </ul>
        )
      ) : (
        <div className="wolf-se-coach-day__empty">
          <span className="wolf-se-coach-day__empty-icon" aria-hidden>
            <Dumbbell size={32} strokeWidth={1.75} />
          </span>
          <p>{isEs ? 'Aún no hay ejercicios en este día' : 'No exercises in this day yet'}</p>
        </div>
      )}
    </section>
  );
};
