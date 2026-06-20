import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeneratedProgram } from '../models/training';

const HISTORY_MAX = 50;

function cloneProgram(program: GeneratedProgram): GeneratedProgram {
  return JSON.parse(JSON.stringify(program)) as GeneratedProgram;
}

export function useProgramHistory(program: GeneratedProgram | null) {
  const pastRef = useRef<GeneratedProgram[]>([]);
  const futureRef = useRef<GeneratedProgram[]>([]);
  const skipRecordRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const resetHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    syncFlags();
  }, [syncFlags]);

  useEffect(() => {
    if (!program) resetHistory();
  }, [program, resetHistory]);

  const recordSnapshot = useCallback(
    (current: GeneratedProgram) => {
      if (skipRecordRef.current) return;
      pastRef.current = [...pastRef.current.slice(-(HISTORY_MAX - 1)), cloneProgram(current)];
      futureRef.current = [];
      syncFlags();
    },
    [syncFlags],
  );

  const undo = useCallback((): GeneratedProgram | null => {
    const prev = pastRef.current.pop();
    if (!prev) {
      syncFlags();
      return null;
    }
    syncFlags();
    return prev;
  }, [syncFlags]);

  const redo = useCallback((): GeneratedProgram | null => {
    const next = futureRef.current.pop();
    if (!next) {
      syncFlags();
      return null;
    }
    syncFlags();
    return next;
  }, [syncFlags]);

  const pushRedoSnapshot = useCallback((current: GeneratedProgram) => {
    futureRef.current.push(cloneProgram(current));
    syncFlags();
  }, [syncFlags]);

  const pushUndoSnapshot = useCallback((current: GeneratedProgram) => {
    pastRef.current.push(cloneProgram(current));
    syncFlags();
  }, [syncFlags]);

  const runWithoutRecording = useCallback((fn: () => void) => {
    skipRecordRef.current = true;
    try {
      fn();
    } finally {
      skipRecordRef.current = false;
    }
  }, []);

  return {
    canUndo,
    canRedo,
    resetHistory,
    recordSnapshot,
    undo,
    redo,
    pushRedoSnapshot,
    pushUndoSnapshot,
    runWithoutRecording,
  };
}
