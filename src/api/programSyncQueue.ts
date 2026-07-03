/**
 * Coalesces coach-program propagation to athlete assignments (Architecture B).
 * Multiple rapid template saves collapse into one fan-out per program.
 */

import type { GeneratedProgram } from '../models/training';
import type { ProgramEditContext } from '../models/notifications';

export type ProgramSyncPayload = {
  coachId: string;
  programId: string;
  program: GeneratedProgram;
  programName: string;
  editContext?: ProgramEditContext;
};

export type ProgramSyncFlushResult = {
  assignmentIds: string[];
};

export type ProgramSyncQueue = {
  enqueue: (payload: ProgramSyncPayload) => void;
  flush: (programId: string) => Promise<ProgramSyncFlushResult | null>;
  flushAll: () => Promise<void>;
};

const DEFAULT_COALESCE_MS = 2500;

export function createProgramSyncQueue(opts: {
  coalesceMs?: number;
  flush: (payload: ProgramSyncPayload) => Promise<ProgramSyncFlushResult>;
  onAfterFlush?: (payload: ProgramSyncPayload, result: ProgramSyncFlushResult) => void;
}): ProgramSyncQueue {
  const coalesceMs = opts.coalesceMs ?? DEFAULT_COALESCE_MS;
  const pending = new Map<string, ProgramSyncPayload>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const flushing = new Map<string, Promise<ProgramSyncFlushResult | null>>();

  const runFlush = async (programId: string): Promise<ProgramSyncFlushResult | null> => {
    const existing = flushing.get(programId);
    if (existing) return existing;

    const job = pending.get(programId);
    if (!job) return null;

    pending.delete(programId);
    const timer = timers.get(programId);
    if (timer) {
      clearTimeout(timer);
      timers.delete(programId);
    }

    const promise = opts
      .flush(job)
      .then((result) => {
        opts.onAfterFlush?.(job, result);
        return result;
      })
      .finally(() => {
        flushing.delete(programId);
      });
    flushing.set(programId, promise);
    return promise;
  };

  const schedule = (programId: string) => {
    const existing = timers.get(programId);
    if (existing) clearTimeout(existing);
    timers.set(
      programId,
      setTimeout(() => {
        timers.delete(programId);
        void runFlush(programId);
      }, coalesceMs),
    );
  };

  return {
    enqueue(payload: ProgramSyncPayload) {
      pending.set(payload.programId, payload);
      schedule(payload.programId);
    },

    flush(programId: string) {
      const timer = timers.get(programId);
      if (timer) {
        clearTimeout(timer);
        timers.delete(programId);
      }
      return runFlush(programId);
    },

    async flushAll() {
      const ids = [...new Set([...pending.keys(), ...flushing.keys()])];
      await Promise.all(ids.map((id) => runFlush(id)));
    },
  };
}
