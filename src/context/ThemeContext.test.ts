import { describe, expect, it } from 'vitest';
import { resolveThemePreference } from './ThemeContext';

describe('resolveThemePreference', () => {
  it('uses light for a first visit', () => {
    expect(resolveThemePreference(null)).toBe('light');
  });

  it('restores an explicit dark preference', () => {
    expect(resolveThemePreference('dark')).toBe('dark');
  });

  it('falls back safely for unsupported values', () => {
    expect(resolveThemePreference('system')).toBe('light');
  });
});
