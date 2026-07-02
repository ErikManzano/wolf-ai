import React, { useCallback, useState } from 'react';
import { Play } from 'lucide-react';
import {
  EXERCISE_DEMO_PLACEHOLDER_YOUTUBE_ID,
  exerciseDemoEmbedUrl,
  exerciseDemoThumbnailUrl,
} from '../../config/exerciseDemoPlaceholder';
import './exercise-detail-mock.css';

interface ExerciseDetailMockProps {
  exerciseName: string;
  isComplex: boolean;
  isEs: boolean;
  /** YouTube video ID (not full URL). Falls back to demo placeholder. */
  youtubeVideoId?: string;
}

function WolfPlayMark() {
  return (
    <svg
      className="wa-exercise-media__wolf-mark"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 22C12 22 5 18 3 11C2 8 3 4 3 4L8 7L12 2L16 7L21 4C21 4 22 8 21 11C19 18 12 22 12 22Z" />
    </svg>
  );
}

/** Demo video + coach note (per-exercise media will come from catalog/backend). */
export const ExerciseDetailMock: React.FC<ExerciseDetailMockProps> = ({
  exerciseName,
  isComplex,
  isEs,
  youtubeVideoId,
}) => {
  const videoId = youtubeVideoId?.trim() || EXERCISE_DEMO_PLACEHOLDER_YOUTUBE_ID;
  const [playing, setPlaying] = useState(false);
  const embedUrl = exerciseDemoEmbedUrl(videoId, true);
  const thumbnailUrl = exerciseDemoThumbnailUrl(videoId);

  const coachNote = isEs
    ? isComplex
      ? `En ${exerciseName}, mantén la recepción estable antes del siguiente movimiento. El coach quiere fluidez entre segmentos sin pausa larga en el rack.`
      : `En ${exerciseName}, prioriza posición sobre velocidad. Barra cercana, full extension y recepción activa.`
    : isComplex
      ? `On ${exerciseName}, stay stable before the next movement. Coach wants smooth transitions between segments without a long rack pause.`
      : `On ${exerciseName}, position over speed. Stay close, full extension, active catch.`;

  const handlePlay = useCallback(() => setPlaying(true), []);

  return (
    <section className="wa-exercise-media" aria-label={isEs ? 'Detalle del ejercicio' : 'Exercise detail'}>
      <div className="wa-exercise-media__video">
        {playing ? (
          <iframe
            src={embedUrl}
            title={
              isEs
                ? `Video demostrativo de ${exerciseName}`
                : `Demo video for ${exerciseName}`
            }
            className="wa-exercise-media__iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            className="wa-exercise-media__poster"
            onClick={handlePlay}
            aria-label={isEs ? `Reproducir video de ${exerciseName}` : `Play ${exerciseName} video`}
          >
            <img
              className="wa-exercise-media__thumb"
              src={thumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
            />
            <span className="wa-exercise-media__shade" aria-hidden />
            <span className="wa-exercise-media__play-stack">
              <span className="wa-exercise-media__play-ring">
                <WolfPlayMark />
                <Play className="wa-exercise-media__play-icon" size={22} strokeWidth={2.25} fill="currentColor" aria-hidden />
              </span>
              <span className="wa-exercise-media__play-label">
                {isEs ? 'Reproducir video' : 'Play video'}
              </span>
            </span>
            <span className="wa-exercise-media__demo-badge">{isEs ? 'Demo' : 'Demo'}</span>
          </button>
        )}
      </div>

      <div className="wa-exercise-media__coach">
        <div className="wa-exercise-media__coach-head">
          <span className="wa-exercise-media__coach-kicker">{isEs ? 'Nota del coach' : 'Coach note'}</span>
        </div>
        <p className="wa-exercise-media__coach-text">{coachNote}</p>
      </div>
    </section>
  );
};
