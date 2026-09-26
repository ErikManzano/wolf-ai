import { ImageUp, Play, Video, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { FamilyAvatar } from './FamilyAvatar';
import {
  hasExerciseVideoEmbed,
  resolveExerciseMedia,
  resolveExercisePoster,
} from './exerciseMediaUtils';
import type { ExerciseFamilyId } from './types';

export type ExerciseMediaTab = 'image' | 'video';

export function ExerciseMedia({
  name,
  family,
  mediaUrl,
  isEs,
  priority = true,
  className,
  showTabs = false,
  allowImageUpload = false,
  editing = false,
  videoUrl,
  onVideoUrlChange,
}: {
  name: string;
  family: ExerciseFamilyId | null;
  mediaUrl?: string | null;
  isEs: boolean;
  priority?: boolean;
  className?: string;
  showTabs?: boolean;
  allowImageUpload?: boolean;
  editing?: boolean;
  videoUrl?: string;
  onVideoUrlChange?: (url: string) => void;
}) {
  const effectiveVideoUrl = videoUrl ?? mediaUrl ?? '';
  const poster = resolveExercisePoster(mediaUrl, family);
  const videoMedia = resolveExerciseMedia(effectiveVideoUrl, family);
  const hasVideo = hasExerciseVideoEmbed(effectiveVideoUrl);

  const [tab, setTab] = useState<ExerciseMediaTab>('image');
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);

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
  }, [poster.src, videoMedia.embedUrl, tab]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const imageAlt = isEs ? `Imagen de ${name}` : `Image of ${name}`;
  const imageTabLabel = isEs ? 'Imagen' : 'Image';
  const videoTabLabel = isEs ? 'Video' : 'Video';
  const uploadSoonLabel = isEs
    ? 'Pronto podrás subir una imagen propia del ejercicio'
    : 'Custom exercise image upload coming soon';
  const videoEmptyLabel = isEs
    ? 'Aún no hay video. Pega un enlace de YouTube o Vimeo.'
    : 'No video yet. Paste a YouTube or Vimeo link.';
  const videoUrlLabel = isEs ? 'URL del video' : 'Video URL';

  const renderImagePanel = () => (
    <>
      {failed ? (
        <span className="wl-exercise-media__fallback">
          <FamilyAvatar family={family} size={72} />
          <span>{name}</span>
        </span>
      ) : (
        <img
          className={`wl-exercise-media__img${loaded ? ' is-loaded' : ''}`}
          src={poster.src}
          srcSet={poster.srcSet}
          sizes="(max-width: 720px) 100vw, 720px"
          width={720}
          height={405}
          alt={imageAlt}
          decoding="async"
          fetchPriority={priority ? 'high' : 'low'}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={handleImgLoad}
          onError={handleImgError}
        />
      )}
      {!showTabs && hasVideo && !failed ? (
        <span className="wl-exercise-media__play" aria-hidden>
          <Play size={22} fill="currentColor" strokeWidth={0} />
        </span>
      ) : null}
    </>
  );

  const renderVideoPanel = () => {
    if (videoMedia.embedUrl) {
      return (
        <iframe
          className="wl-exercise-media__iframe"
          src={videoMedia.embedUrl.replace('autoplay=1', 'autoplay=0')}
          title={isEs ? `Video de ${name}` : `Video of ${name}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      );
    }

    return (
      <div className="wl-exercise-media__video-empty">
        <Video size={28} strokeWidth={1.75} aria-hidden />
        <p>{videoEmptyLabel}</p>
      </div>
    );
  };

  const activePanel = !showTabs || tab === 'image' ? 'image' : 'video';
  const frameStyle =
    activePanel === 'image' && !failed
      ? { backgroundImage: `url("${poster.lqip}")` }
      : undefined;

  return (
    <section
      className={`wl-exercise-media${showTabs ? ' wl-exercise-media--tabs' : ''}${className ? ` ${className}` : ''}`}
      aria-label={isEs ? 'Medios del ejercicio' : 'Exercise media'}
    >
      {showTabs ? (
        <div className="wl-exercise-media__tabs" role="tablist" aria-label={isEs ? 'Tipo de medio' : 'Media type'}>
          <button
            type="button"
            role="tab"
            id="wl-exercise-media-tab-image"
            aria-selected={tab === 'image'}
            aria-controls="wl-exercise-media-panel"
            className={`wl-exercise-media__tab${tab === 'image' ? ' is-active' : ''}`}
            onClick={() => setTab('image')}
          >
            <ImageUp size={15} strokeWidth={2.25} aria-hidden />
            {imageTabLabel}
          </button>
          <button
            type="button"
            role="tab"
            id="wl-exercise-media-tab-video"
            aria-selected={tab === 'video'}
            aria-controls="wl-exercise-media-panel"
            className={`wl-exercise-media__tab${tab === 'video' ? ' is-active' : ''}`}
            onClick={() => setTab('video')}
          >
            <Video size={15} strokeWidth={2.25} aria-hidden />
            {videoTabLabel}
          </button>
        </div>
      ) : null}

      <div
        id="wl-exercise-media-panel"
        role="tabpanel"
        aria-labelledby={tab === 'image' ? 'wl-exercise-media-tab-image' : 'wl-exercise-media-tab-video'}
        className={`wl-exercise-media__frame${activePanel === 'video' ? ' wl-exercise-media__frame--video' : ''}`}
        style={frameStyle}
      >
        {showTabs ? (
          activePanel === 'image' ? (
            <button
              type="button"
              className="wl-exercise-media__hit"
              onClick={() => setExpanded(true)}
              aria-label={isEs ? `Ampliar imagen de ${name}` : `Enlarge ${name} image`}
            >
              {renderImagePanel()}
            </button>
          ) : (
            renderVideoPanel()
          )
        ) : playing && videoMedia.embedUrl ? (
          <iframe
            className="wl-exercise-media__iframe"
            src={videoMedia.embedUrl}
            title={isEs ? `Video de ${name}` : `Video of ${name}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <button
            type="button"
            className="wl-exercise-media__hit"
            onClick={() => (hasVideo ? setPlaying(true) : setExpanded(true))}
            aria-label={
              hasVideo
                ? isEs
                  ? `Reproducir video de ${name}`
                  : `Play ${name} video`
                : isEs
                  ? `Ampliar imagen de ${name}`
                  : `Enlarge ${name} image`
            }
          >
            {renderImagePanel()}
          </button>
        )}
      </div>

      {allowImageUpload && (!showTabs || tab === 'image') ? (
        <div className="wl-exercise-media__upload-soon" aria-disabled="true">
          <ImageUp size={18} strokeWidth={2.25} aria-hidden />
          <span>{uploadSoonLabel}</span>
        </div>
      ) : null}

      {showTabs && tab === 'video' && editing && onVideoUrlChange ? (
        <label className="wl-exercise-media__url-field">
          <span>{videoUrlLabel}</span>
          <input
            type="url"
            inputMode="url"
            value={effectiveVideoUrl}
            onChange={(event) => onVideoUrlChange(event.target.value)}
            placeholder="https://youtube.com/…"
            autoComplete="off"
          />
        </label>
      ) : null}

      {expanded && activePanel === 'image' ? (
        <div
          className="wl-exercise-media__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={imageAlt}
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
          <img src={poster.src} srcSet={poster.srcSet} sizes="100vw" alt={imageAlt} decoding="async" />
        </div>
      ) : null}
    </section>
  );
}
