import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGUAGES } from '../constants';
import { getSessionUiText } from '../sessionUiText';


describe('getSessionUiText', () => {
  it('returns English text by default', () => {
    const text = getSessionUiText();
    expect(text).toBeDefined();
    expect(text.common).toBeDefined();
    expect(text.select).toBeDefined();
    expect(text.overview).toBeDefined();
  });

  it('returns text for each supported language', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const text = getSessionUiText(lang);
      expect(text).toBeDefined();
      expect(text).toHaveProperty('common');
      expect(text).toHaveProperty('select');
      expect(text).toHaveProperty('overview');
    }
  });

  it('common section has required keys in all languages', () => {
    const requiredKeys = ['session', 'configuration', 'language', 'logout', 'selected'];
    for (const lang of SUPPORTED_LANGUAGES) {
      const text = getSessionUiText(lang);
      for (const key of requiredKeys) {
        expect(text.common[key]).toBeTruthy();
      }
    }
  });

  it('select section has required keys in all languages', () => {
    const requiredKeys = ['selectionTitle', 'availableCards', 'finalizeSelection', 'clearSelection'];
    for (const lang of SUPPORTED_LANGUAGES) {
      const text = getSessionUiText(lang);
      for (const key of requiredKeys) {
        expect(text.select[key]).toBeTruthy();
      }
    }
  });

  it('falls back to English for unsupported language', () => {
    const text = getSessionUiText('xx');
    const enText = getSessionUiText('en');
    expect(text).toEqual(enText);
  });
});
