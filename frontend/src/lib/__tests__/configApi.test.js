import { describe, expect, it } from 'vitest';
import { fromApiConfig, toApiConfig } from '../configApi';


describe('fromApiConfig', () => {
  it('converts snake_case API response to camelCase', () => {
    const result = fromApiConfig({
      select_cards_blocked: true,
      theme_labels: { en: ['A'], nl: ['B'], ro: ['C'] },
      card_labels: { '1': [1, 2] },
    });

    expect(result.selectCardsBlocked).toBe(true);
    expect(result.themeLabels.en).toEqual(['A']);
    expect(result.cardLabels['1']).toEqual([1, 2]);
  });

  it('handles null payload', () => {
    const result = fromApiConfig(null);
    expect(result.selectCardsBlocked).toBe(false);
    expect(result.themeLabels).toEqual({ en: [], nl: [], ro: [] });
    expect(result.cardLabels).toEqual({});
  });

  it('handles missing theme_labels', () => {
    const result = fromApiConfig({ select_cards_blocked: false });
    expect(result.themeLabels).toEqual({ en: [], nl: [], ro: [] });
  });

  it('handles non-array card_labels value', () => {
    const result = fromApiConfig({ card_labels: { '1': 'bad' } });
    expect(result.cardLabels['1']).toEqual([]);
  });
});


describe('toApiConfig', () => {
  it('converts camelCase to snake_case', () => {
    const result = toApiConfig({
      selectCardsBlocked: true,
      themeLabels: { en: ['X'], nl: ['Y'], ro: ['Z'] },
      cardLabels: { '5': [3] },
    });

    expect(result.select_cards_blocked).toBe(true);
    expect(result.theme_labels.en).toEqual(['X']);
    expect(result.card_labels['5']).toEqual([3]);
  });

  it('roundtrips through both conversions', () => {
    const original = {
      selectCardsBlocked: true,
      themeLabels: { en: ['A', 'B', 'C', 'D', 'E', 'F'], nl: ['G', 'H', 'I', 'J', 'K', 'L'], ro: [] },
      cardLabels: { '10': [1, 4] },
    };
    const roundtrip = fromApiConfig(toApiConfig(original));
    expect(roundtrip.selectCardsBlocked).toBe(original.selectCardsBlocked);
    expect(roundtrip.themeLabels.en).toEqual(original.themeLabels.en);
    expect(roundtrip.cardLabels).toEqual(original.cardLabels);
  });
});
