import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RepOutcome, SetCompletionLog } from '../../models/training';
import type { FlatSetRow } from '../../utils/athleteSetLogs';
import { useWolfAlert } from '../../context/WolfAlertContext';
import { useWlAssignments } from '../../modules/assignments';
import {
  completedCountFromOutcomes,
  cycleRepOutcome,
  deriveRepOutcomes,
  deriveSegmentRepOutcomes,
  deriveSetCardTone,
  ensureSegmentOutcomes,
  flattenSegmentOutcomes,
  segmentRepsFromOutcomes,
} from '../../utils/setCompletionStatus';
import { formatSetCompactLabel, formatSegmentCompactLabel } from '../../utils/athleteLoadLabels';
import type { SetPurpose } from '../session-editor/spreadsheetPurposeUtils';
import { cn } from '../../lib/utils';
import { RepOutcomeRow } from './RepOutcomeRow';

export interface DetailSetUpdatePayload {
  actualKg: number;
  actualReps: number;
  actualSegmentReps?: number[];
  actualRepOutcomes?: RepOutcome[];
  actualSegmentRepOutcomes?: RepOutcome[][];
}

export interface DetailSetCardProps {
  row: FlatSetRow;
  log?: SetCompletionLog;
  addressed: boolean;
  fullyComplete: boolean;
  active: boolean;
  isEs: boolean;
  purpose?: SetPurpose;
  trackingKey?: string;
  onSaveSet: (payload: DetailSetUpdatePayload) => void;
  onClearSet: () => void;
}

export const DetailSetCard: React.FC<DetailSetCardProps> = ({
  row,
  log,
  addressed,
  fullyComplete,
  active,
  isEs,
  purpose,
  trackingKey,
  onSaveSet,
  onClearSet,
}) => {
  const { pushAlert } = useWolfAlert();
  const { isTrackingPending, isTrackingFailed } = useWlAssignments();
  const pendingRepRef = useRef<{ repIndex: number; outcome: RepOutcome } | null>(null);
  const wasPendingRef = useRef(false);
  const [repNotifyTick, setRepNotifyTick] = useState(0);
  const prescribedSegments = row.prescribedSegmentReps ?? [];
  const isComplex = row.isComplex && prescribedSegments.length > 0;

  const initialSimple = useMemo(
    () => deriveRepOutcomes(row.prescribedReps, log?.actualRepOutcomes, log, fullyComplete),
    [row.prescribedReps, log, fullyComplete],
  );

  const initialComplex = useMemo(
    () =>
      deriveSegmentRepOutcomes(
        prescribedSegments,
        log?.actualSegmentRepOutcomes,
        log?.actualSegmentReps,
        false,
      ),
    [prescribedSegments, log],
  );

  const [simpleOutcomes, setSimpleOutcomes] = useState<RepOutcome[]>(initialSimple);
  const [complexOutcomes, setComplexOutcomes] = useState<RepOutcome[][]>(initialComplex);

  useEffect(() => {
    setSimpleOutcomes(initialSimple);
  }, [initialSimple]);

  useEffect(() => {
    setComplexOutcomes(initialComplex);
  }, [initialComplex]);

  const normalizedComplexOutcomes = useMemo(
    () => ensureSegmentOutcomes(prescribedSegments, complexOutcomes),
    [prescribedSegments, complexOutcomes],
  );

  const flatOutcomes = isComplex
    ? flattenSegmentOutcomes(normalizedComplexOutcomes)
    : simpleOutcomes;
  const tone = deriveSetCardTone(flatOutcomes, active, fullyComplete);
  const trackingPending = trackingKey ? isTrackingPending(trackingKey) : false;
  const trackingFailed = trackingKey ? isTrackingFailed(trackingKey) : false;

  const notifyRep = (repIndex: number, outcome: RepOutcome) => {
    const repNum = repIndex + 1;
    if (outcome === 'completed') {
      pushAlert({
        tone: 'success',
        title: isEs ? `Rep ${repNum}` : `Rep ${repNum}`,
        message: isEs ? 'Registrada correctamente' : 'Logged successfully',
        durationMs: 2400,
      });
      return;
    }
    if (outcome === 'failed') {
      pushAlert({
        tone: 'warning',
        title: isEs ? `Rep ${repNum}` : `Rep ${repNum}`,
        message: isEs ? 'Marcada como fallo' : 'Marked as missed',
        durationMs: 2400,
      });
      return;
    }
    pushAlert({
      tone: 'info',
      title: isEs ? `Rep ${repNum}` : `Rep ${repNum}`,
      message: isEs ? 'Rep pendiente' : 'Rep pending',
      durationMs: 2000,
    });
  };

  useEffect(() => {
    if (!trackingKey || !pendingRepRef.current) return;
    const pending = trackingPending;
    const notify = pendingRepRef.current;

    if (pending) {
      wasPendingRef.current = true;
      return;
    }

    if (wasPendingRef.current) {
      if (!trackingFailed) {
        notifyRep(notify.repIndex, notify.outcome);
      }
    } else {
      notifyRep(notify.repIndex, notify.outcome);
    }

    pendingRepRef.current = null;
    wasPendingRef.current = false;
  }, [trackingKey, repNotifyTick, trackingPending, trackingFailed]);

  const queueRepNotify = (repIndex: number, outcome: RepOutcome) => {
    pendingRepRef.current = { repIndex, outcome };
    setRepNotifyTick((tick) => tick + 1);
  };

  const persistSimple = (next: RepOutcome[]) => {
    setSimpleOutcomes(next);
    if (next.every((outcome) => outcome === 'pending')) {
      if (addressed || log) onClearSet();
      return;
    }
    onSaveSet({
      actualKg: log?.actualKg ?? row.prescribedKg,
      actualReps: completedCountFromOutcomes(next),
      actualRepOutcomes: next,
    });
  };

  const persistComplex = (next: RepOutcome[][]) => {
    const aligned = ensureSegmentOutcomes(prescribedSegments, next);
    setComplexOutcomes(aligned);
    const flat = flattenSegmentOutcomes(aligned);
    if (flat.every((outcome) => outcome === 'pending')) {
      if (addressed || log) onClearSet();
      return;
    }
    const segmentReps = segmentRepsFromOutcomes(aligned);
    onSaveSet({
      actualKg: log?.actualKg ?? row.prescribedKg,
      actualReps: segmentReps.reduce((sum, reps) => sum + reps, 0),
      actualSegmentReps: segmentReps,
      actualSegmentRepOutcomes: aligned,
    });
  };

  return (
    <div
      className={cn(
        'wa-detail-set-card',
        isComplex && 'wa-detail-set-card--complex',
        tone === 'complete' && 'wa-detail-set-card--complete',
        tone === 'partial' && 'wa-detail-set-card--partial',
        tone === 'pending' && 'wa-detail-set-card--pending',
        active && 'wa-detail-set-card--active',
        purpose && `wa-detail-set-card--purpose-${purpose}`,
      )}
    >
      <div className="wa-detail-set-card__head">
        <span className="wa-detail-set-card__num">{row.setInstance}</span>
        {!isComplex ? (
          <span className="wa-detail-set-card__rx">{formatSetCompactLabel(row, isEs)}</span>
        ) : null}
      </div>

      <span className="wa-detail-set-card__accent" aria-hidden />

      <div className="wa-detail-set-card__body">
        {isComplex ? (
          prescribedSegments.map((segmentReps, segIndex) => {
            const segmentKg = row.prescribedSegmentKg?.[segIndex] ?? row.prescribedKg;
            const segmentName = row.segmentLabels?.[segIndex];
            const repToken = row.prescribedSegmentRepLabels?.[segIndex];
            const outcomes =
              normalizedComplexOutcomes[segIndex] ??
              deriveRepOutcomes(segmentReps, undefined, undefined, false);

            return (
              <div
                key={`${row.schemeIndex}-${row.setInstance}-${segIndex}`}
                className="wa-detail-set-card__segment"
              >
                {segmentName ? (
                  <span className="wa-detail-set-card__segment-name">{segmentName}</span>
                ) : null}
                <span className="wa-detail-set-card__rx wa-detail-set-card__rx--segment">
                  {formatSegmentCompactLabel(
                    segmentKg,
                    segmentReps,
                    isEs,
                    row.percentage,
                    repToken,
                  )}
                </span>
                <RepOutcomeRow
                  outcomes={outcomes}
                  isEs={isEs}
                  onToggle={(repIndex) => {
                    const aligned = ensureSegmentOutcomes(prescribedSegments, normalizedComplexOutcomes);
                    const next = aligned.map((segment, index) =>
                      index === segIndex
                        ? segment.map((outcome, i) =>
                            i === repIndex ? cycleRepOutcome(outcome) : outcome,
                          )
                        : segment,
                    );
                    const nextOutcome = next[segIndex]?.[repIndex];
                    if (nextOutcome) queueRepNotify(repIndex, nextOutcome);
                    persistComplex(next);
                  }}
                />
              </div>
            );
          })
        ) : (
          <RepOutcomeRow
            outcomes={simpleOutcomes}
            isEs={isEs}
            onToggle={(repIndex) => {
              const next = simpleOutcomes.map((outcome, index) =>
                index === repIndex ? cycleRepOutcome(outcome) : outcome,
              );
              const nextOutcome = next[repIndex];
              if (nextOutcome) queueRepNotify(repIndex, nextOutcome);
              persistSimple(next);
            }}
          />
        )}
      </div>
    </div>
  );
};
