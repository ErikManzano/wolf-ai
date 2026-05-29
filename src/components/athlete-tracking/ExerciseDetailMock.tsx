import React from 'react';
import { Play, Video } from 'lucide-react';

interface ExerciseDetailMockProps {
  exerciseName: string;
  isComplex: boolean;
  isEs: boolean;
}

/** Mockup: video + nota del coach (contenido real vendrá del backend). */
export const ExerciseDetailMock: React.FC<ExerciseDetailMockProps> = ({ exerciseName, isComplex, isEs }) => {
  const coachNote = isEs
    ? isComplex
      ? `En ${exerciseName}, mantén la recepción estable antes del siguiente movimiento. El coach quiere fluidez entre segmentos sin pausa larga en el rack.`
      : `En ${exerciseName}, prioriza posición sobre velocidad. Barra cercana, full extension y recepción activa.`
    : isComplex
      ? `On ${exerciseName}, stay stable before the next movement. Coach wants smooth transitions between segments without a long rack pause.`
      : `On ${exerciseName}, position over speed. Stay close, full extension, active catch.`;

  return (
    <section
      className="mb-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden"
      aria-label={isEs ? 'Detalle del ejercicio' : 'Exercise detail'}
    >
      <button
        type="button"
        className="relative w-full aspect-video max-h-[140px] bg-zinc-950 flex items-center justify-center group touch-manipulation"
        aria-label={isEs ? 'Reproducir video demostrativo' : 'Play demo video'}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col items-center gap-2 text-zinc-500 group-active:scale-95 transition-transform">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-800/90 border border-zinc-700 text-orange-400">
            <Play size={22} fill="currentColor" className="ml-0.5" aria-hidden />
          </span>
          <span className="flex items-center gap-1 text-[0.65rem] font-medium uppercase tracking-wider">
            <Video size={12} aria-hidden />
            {isEs ? 'Video · Próximamente' : 'Video · Coming soon'}
          </span>
        </div>
      </button>

      <div className="px-3 py-2.5 border-t border-zinc-800/60">
        <p className="text-[0.62rem] uppercase tracking-wider text-orange-400/90 font-semibold mb-1">
          {isEs ? 'Nota del coach' : 'Coach note'}
        </p>
        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{coachNote}</p>
        <p className="text-[0.6rem] text-zinc-600 mt-1.5 italic">
          {isEs ? 'Vista previa — contenido editable por el coach.' : 'Preview — coach-editable content.'}
        </p>
      </div>
    </section>
  );
};
