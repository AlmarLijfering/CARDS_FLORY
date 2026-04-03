import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  DEFAULT_THEME_LABELS,
  LANGUAGE_LABELS,
  MAX_SELECTED_CARDS,
  STORAGE_KEYS,
  SUPPORTED_LANGUAGES,
  TOTAL_CARD_COUNT,
} from '../constants';


describe('constants', () => {
  it('has 112 total cards', () => {
    expect(TOTAL_CARD_COUNT).toBe(112);
  });

  it('allows up to 6 selected cards', () => {
    expect(MAX_SELECTED_CARDS).toBe(6);
  });

  it('supports three languages', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'nl', 'ro']);
  });

  it('has default theme labels for each language with 6 entries', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(DEFAULT_THEME_LABELS[lang]).toHaveLength(6);
    }
  });

  it('has language display labels for each supported language', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(LANGUAGE_LABELS[lang]).toBeTruthy();
    }
  });

  it('has all required storage keys', () => {
    expect(STORAGE_KEYS.auth).toBeTruthy();
    expect(STORAGE_KEYS.language).toBeTruthy();
    expect(STORAGE_KEYS.guidance).toBeTruthy();
    expect(STORAGE_KEYS.sessions).toBeTruthy();
  });

  it('default config has correct shape', () => {
    expect(DEFAULT_CONFIG.selectCardsBlocked).toBe(false);
    expect(DEFAULT_CONFIG.themeLabels).toEqual(DEFAULT_THEME_LABELS);
    expect(DEFAULT_CONFIG.cardLabels).toEqual({});
  });
});
