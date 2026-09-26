import type { ExerciseFamilyId } from './types';

const IMAGE_EXT = /\.(avif|webp|jpe?g|png|gif|bmp|svg)(\?|#|$)/i;

/** Posters por familia — Unsplash ya sirve WebP/AVIF con `auto=format`. */
export const FAMILY_POSTER: Record<ExerciseFamilyId, string> = {
  snatch: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
  clean: 'https://images.unsplash.com/photo-1541534741688-6078c64b591d',
  jerk: 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712',
  pull: 'https://images.unsplash.com/photo-1517964102549-0e3b2079f62b',
  squat: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48',
  press: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61',
  accessory: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b',
  core: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b',
};

export type ExerciseMediaKind = 'youtube' | 'vimeo' | 'image';

export interface ExerciseMediaResolved {
  kind: ExerciseMediaKind;
  videoId?: string;
  src: string;
  srcSet: string;
  lqip: string;
  embedUrl?: string;
}

export function youtubeIdFromUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1, 12) || null;
    if (url.hostname.includes('youtube.com')) {
      const fromQuery = url.searchParams.get('v');
      if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) return fromQuery;
      const shorts = url.pathname.match(/\/(?:embed|shorts)\/([\w-]{11})/);
      if (shorts) return shorts[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function vimeoIdFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (!url.hostname.includes('vimeo.com')) return null;
    const match = url.pathname.match(/\/(?:video\/)?(\d+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isDirectImageUrl(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  if (value.startsWith('data:image/') || value.startsWith('blob:')) return true;
  return IMAGE_EXT.test(value);
}

/** Redimensiona y convierte a WebP vía CDN. YouTube/data/blob no se proxifican. */
export function optimizeRemoteImage(url: string, width: number): string {
  const value = url.trim();
  if (!value || value.startsWith('data:') || value.startsWith('blob:')) return value;
  try {
    const parsed = new URL(value);
    if (parsed.hostname.includes('img.youtube.com') || parsed.hostname.includes('i.ytimg.com')) {
      return value;
    }
    if (parsed.hostname.includes('unsplash.com')) {
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('w', String(width));
      parsed.searchParams.set('q', '68');
      parsed.searchParams.set('fm', 'webp');
      return parsed.toString();
    }
  } catch {
    return value;
  }
  return `https://wsrv.nl/?url=${encodeURIComponent(value)}&w=${width}&q=68&output=webp&we&il`;
}

function srcSetFor(url: string): string {
  return [480, 720, 1080].map((width) => `${optimizeRemoteImage(url, width)} ${width}w`).join(', ');
}

export function resolveExerciseMedia(
  mediaUrl: string | null | undefined,
  family: ExerciseFamilyId | null,
): ExerciseMediaResolved {
  const raw = mediaUrl?.trim() ?? '';
  const yt = raw ? youtubeIdFromUrl(raw) : null;
  if (yt) {
    const hq = `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
    const mq = `https://i.ytimg.com/vi/${yt}/mqdefault.jpg`;
    return {
      kind: 'youtube',
      videoId: yt,
      src: hq,
      srcSet: `${mq} 320w, ${hq} 480w, https://i.ytimg.com/vi/${yt}/sddefault.jpg 640w`,
      lqip: `https://i.ytimg.com/vi/${yt}/default.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
    };
  }

  const vimeo = raw ? vimeoIdFromUrl(raw) : null;
  if (vimeo) {
    const poster = `https://vumbnail.com/${vimeo}.jpg`;
    return {
      kind: 'vimeo',
      videoId: vimeo,
      src: optimizeRemoteImage(poster, 720),
      srcSet: srcSetFor(poster),
      lqip: optimizeRemoteImage(poster, 24),
      embedUrl: `https://player.vimeo.com/video/${vimeo}?autoplay=1`,
    };
  }

  if (raw && (isDirectImageUrl(raw) || /^https?:\/\//i.test(raw))) {
    return {
      kind: 'image',
      src: optimizeRemoteImage(raw, 720),
      srcSet: srcSetFor(raw),
      lqip: optimizeRemoteImage(raw, 24),
    };
  }

  const fallback = FAMILY_POSTER[family ?? 'accessory'];
  return {
    kind: 'image',
    src: optimizeRemoteImage(fallback, 720),
    srcSet: srcSetFor(fallback),
    lqip: optimizeRemoteImage(fallback, 24),
  };
}

/** Poster para la pestaña Imagen (ignora URLs de video). */
export function resolveExercisePoster(
  mediaUrl: string | null | undefined,
  family: ExerciseFamilyId | null,
): ExerciseMediaResolved {
  const raw = mediaUrl?.trim() ?? '';
  if (raw && isDirectImageUrl(raw)) {
    return resolveExerciseMedia(raw, family);
  }
  return resolveExerciseMedia(null, family);
}

export function hasExerciseVideoEmbed(mediaUrl: string | null | undefined): boolean {
  const raw = mediaUrl?.trim() ?? '';
  if (!raw) return false;
  return Boolean(youtubeIdFromUrl(raw) || vimeoIdFromUrl(raw));
}
