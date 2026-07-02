/** Default demo until exercises store per-movement video URLs. Override via VITE_EXERCISE_DEMO_YOUTUBE_ID. */
export const EXERCISE_DEMO_PLACEHOLDER_YOUTUBE_ID =
  import.meta.env.VITE_EXERCISE_DEMO_YOUTUBE_ID ?? '_yqwbwHoSDI';

export function exerciseDemoThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function exerciseDemoEmbedUrl(videoId: string, autoplay = false): string {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    origin: typeof window !== 'undefined' ? window.location.origin : '',
  });
  if (autoplay) {
    params.set('autoplay', '1');
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
