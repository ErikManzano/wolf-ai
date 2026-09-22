import { Play, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { FamilyAvatar } from './FamilyAvatar';
import { resolveExerciseMedia } from './exerciseMediaUtils';
import type { ExerciseFamilyId } from './types';

export function ExerciseMedia({
  name,
  family,
  mediaUrl,
  isEs,
  priority = true,
  className,
}: {
  name: string;
  family: ExerciseFamilyId | null;
  mediaUrl?: string | null;
  isEs: boolean;
  priority?: boolean;
  className?: string;
}) {
  const media = resolveExerciseMedia(mediaUrl, family);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const canPlay = Boolean(media.embedUrl);
  const alt = isEs ? `Imagen de ${name}` : `Image of ${name}`;

  const handleImgLoad = useCallback(() => setLoaded(true), []);
  const handleImgError = useCallback(() => {
    setFailed(true);
    setLoaded(true);
  }, []);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setPlaying(false);
    setExpanded(false);
  }, [media.src, media.embedUrl]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  return (
    <section
      className={`wl-exercise-media${className ? ` ${className}` : ''}`}
      aria-label={isEs ? 'Imagen del ejercicio' : 'Exercise image'}
    >
      <div
        className="wl-exercise-media__frame"
        style={{ backgroundImage: failed ? undefined : `url("${media.lqip}")` }}
      >
        {playing && media.embedUrl ? (
          <iframe
            className="wl-exercise-media__iframe"
            src={media.embedUrl}
            title={isEs ? `Video de ${name}` : `Video of ${name}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            className="wl-exercise-media__hit"
            onClick={() => (canPlay ? setPlaying(true) : setExpanded(true))}
            aria-label={
              canPlay
                ? isEs
                  ? `Reproducir video de ${name}`
                  : `Play ${name} video`
                : isEs
                  ? `Ampliar imagen de ${name}`
                  : `Enlarge ${name} image`
            }
          >
            {failed ? (
              <span className="wl-exercise-media__fallback">
                <FamilyAvatar family={family} size={72} />
                <span>{name}</span>
              </span>
            ) : (
              <img
                className={`wl-exercise-media__img${loaded ? ' is-loaded' : ''}`}
                src={media.src}
                srcSet={media.srcSet}
                sizes="(max-width: 720px) 100vw, 720px"
                width={720}
                height={405}
                alt={alt}
                decoding="async"
                fetchPriority={priority ? 'high' : 'low'}
                loading={priority ? 'eager' : 'lazy'}
                onLoad={handleImgLoad}
                onError={handleImgError}
              />
            )}
            {canPlay && !failed ? (
              <span className="wl-exercise-media__play" aria-hidden>
                <Play size={22} fill="currentColor" strokeWidth={0} />
              </span>
            ) : null}
          </button>
        )}
      </div>

      {expanded && !canPlay ? (
        <div
          className="wl-exercise-media__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            className="wl-exercise-media__close"
            aria-label={isEs ? 'Cerrar' : 'Close'}
            onClick={() => setExpanded(false)}
          >
            <X size={18} />
          </button>
          <img src={media.src} srcSet={media.srcSet} sizes="100vw" alt={alt} decoding="async" />
        </div>
      ) : null}
    </section>
  );
}
