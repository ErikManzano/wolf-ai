import { describe, expect, it } from 'vitest';
import {
  isDirectImageUrl,
  optimizeRemoteImage,
  resolveExerciseMedia,
  youtubeIdFromUrl,
} from './exerciseMediaUtils';

describe('exercise media', () => {
  it('extracts YouTube ids from several URL shapes', () => {
    expect(youtubeIdFromUrl('https://www.youtube.com/watch?v=_yqwbwHoSDI')).toBe('_yqwbwHoSDI');
    expect(youtubeIdFromUrl('https://youtu.be/_yqwbwHoSDI')).toBe('_yqwbwHoSDI');
    expect(youtubeIdFromUrl('_yqwbwHoSDI')).toBe('_yqwbwHoSDI');
  });

  it('detects direct image urls', () => {
    expect(isDirectImageUrl('https://cdn.example.com/snatch.webp')).toBe(true);
    expect(isDirectImageUrl('https://youtube.com/watch?v=abc')).toBe(false);
  });

  it('keeps YouTube thumbs on their CDN and proxies other images', () => {
    const yt = 'https://i.ytimg.com/vi/abc/hqdefault.jpg';
    expect(optimizeRemoteImage(yt, 720)).toBe(yt);
    const proxied = optimizeRemoteImage('https://cdn.example.com/lift.png', 720);
    expect(proxied).toContain('wsrv.nl');
    expect(proxied).toContain('output=webp');
  });

  it('falls back to a family poster when there is no media url', () => {
    const media = resolveExerciseMedia(null, 'snatch');
    expect(media.kind).toBe('image');
    expect(media.srcSet.length).toBeGreaterThan(0);
  });
});
