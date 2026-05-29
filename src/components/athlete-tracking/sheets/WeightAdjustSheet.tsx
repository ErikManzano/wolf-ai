import React, { useEffect, useState } from 'react';
import { BottomSheet } from '../../mobile-wl/sheets/BottomSheet';
import { cn } from '../../../lib/utils';

const PLATE_DELTAS = [-10, -5, -2.5, -1, -0.5, 0.5, 1, 2.5, 5, 10] as const;

interface WeightAdjustSheetProps {
  open: boolean;
  onClose: () => void;
  value: number;
  prescribedKg: number;
  isEs: boolean;
  onCommit: (kg: number) => void;
}

export const WeightAdjustSheet: React.FC<WeightAdjustSheetProps> = ({
  open,
  onClose,
  value,
  prescribedKg,
  isEs,
  onCommit,
}) => {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const bump = (delta: number) => {
    setDraft((v) => Math.max(0, Math.round((v + delta) * 2) / 2));
  };

  const apply = () => {
    onCommit(draft);
    onClose();
  };

  const resetRx = () => setDraft(prescribedKg);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEs ? 'Ajustar carga' : 'Adjust load'}
      snap={0.52}
      footer={
        <button
          type="button"
          className="w-full min-h-[48px] rounded-xl bg-orange-500 text-white font-semibold touch-manipulation active:scale-[0.98] transition-transform"
          onClick={apply}
        >
          {isEs ? 'Aplicar' : 'Apply'} · {draft} kg
        </button>
      }
    >
      <div className="flex flex-col gap-4 px-1 pb-2">
        <div className="text-center">
          <p className="text-4xl font-bold tabular-nums text-white">{draft} kg</p>
          {Math.abs(draft - prescribedKg) > 0.05 ? (
            <p className="text-sm text-zinc-500 mt-1">
              Rx {prescribedKg} kg
              <button
                type="button"
                className="ml-2 text-orange-400 font-medium touch-manipulation"
                onClick={resetRx}
              >
                {isEs ? 'Restaurar Rx' : 'Reset Rx'}
              </button>
            </p>
          ) : (
            <p className="text-sm text-zinc-500 mt-1">{isEs ? 'Carga prescrita' : 'Prescribed load'}</p>
          )}
        </div>

        <div className="grid grid-cols-5 gap-2">
          {PLATE_DELTAS.map((d) => (
            <button
              key={d}
              type="button"
              className={cn(
                'min-h-[44px] rounded-lg text-sm font-bold tabular-nums touch-manipulation active:scale-95 transition-transform',
                d < 0
                  ? 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-zinc-800 border border-orange-500/30 text-orange-300 hover:bg-orange-500/10',
              )}
              onClick={() => bump(d)}
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-[0.65rem] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
            {isEs ? 'Valor exacto' : 'Exact value'}
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            className="w-full px-3 py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-lg font-bold tabular-nums outline-none focus:ring-2 focus:ring-orange-500/40"
            value={draft}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n) && n >= 0) setDraft(n);
            }}
          />
        </div>
      </div>
    </BottomSheet>
  );
};
