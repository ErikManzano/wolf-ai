import React from 'react';
import { Check, Loader2, RotateCcw } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { SetVisualStatus } from '../../../utils/setCompletionStatus';

interface SetCheckButtonProps {
  status: SetVisualStatus;
  pressed: boolean;
  label: string;
  onClick: () => void;
  syncPending?: boolean;
  syncFailed?: boolean;
}

export const SetCheckButton: React.FC<SetCheckButtonProps> = ({
  status,
  pressed,
  label,
  onClick,
  syncPending = false,
  syncFailed = false,
}) => (
  <button
    type="button"
    aria-pressed={pressed}
    aria-busy={syncPending}
    aria-label={label}
    onClick={() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
      onClick();
    }}
    className={cn(
      'athlete-set-check shrink-0 flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px]',
      'rounded-full touch-manipulation transition-all duration-200 active:scale-95 relative',
      !pressed && status === 'pending' && 'border-2 border-zinc-600 bg-zinc-800/50 hover:border-zinc-400',
      !pressed &&
        status === 'partial' &&
        'border-2 border-orange-500 bg-orange-500/10 hover:bg-orange-500/20',
      pressed && status === 'complete' && 'border-2 border-emerald-500 bg-emerald-500 text-white',
      pressed && status === 'partial' && 'border-2 border-orange-500 bg-orange-500 text-white',
      syncFailed && 'ring-2 ring-amber-500/50',
    )}
  >
    {syncPending ? (
      <Loader2 size={18} className="animate-spin text-zinc-400" aria-hidden />
    ) : syncFailed ? (
      <RotateCcw size={16} className="text-amber-400" aria-hidden />
    ) : pressed ? (
      <Check size={20} strokeWidth={3} aria-hidden />
    ) : (
      <span
        className={cn(
          'w-3.5 h-3.5 rounded-full border-2',
          status === 'partial' ? 'border-orange-400' : 'border-zinc-500',
        )}
        aria-hidden
      />
    )}
  </button>
);
