import { describe, expect, it } from 'vitest';
import { getAvailableSessionLabels, getSessionLabelName } from '../sessionLabels';


const MOCK_CONFIG = {
  themeLabels: {
    en: ['Courage', 'Love', 'Fear', 'Joy', 'Grief', 'Hope'],
    nl: ['Moed', 'Liefde', 'Angst', 'Vreugde', 'Verdriet', 'Hoop'],
  },
  cardLabels: {
    '1': [1, 3],
    '2': [1],
    '3': [2, 3],
    '4': [3],
  },
};


describe('getAvailableSessionLabels', () => {
  it('returns labels that have at least one card assigned', () => {
    const labels = getAvailableSessionLabels(MOCK_CONFIG, 'en');
    const ids = labels.map((l) => l.id);
    expect(ids).toContain(1);
    expect(ids).toContain(2);
    expect(ids).toContain(3);
    expect(ids).not.toContain(4);
    expect(ids).not.toContain(5);
    expect(ids).not.toContain(6);
  });

  it('counts cards per label correctly', () => {
    const labels = getAvailableSessionLabels(MOCK_CONFIG, 'en');
    const label1 = labels.find((l) => l.id === 1);
    const label3 = labels.find((l) => l.id === 3);
    expect(label1.count).toBe(2); // cards 1, 2
    expect(label3.count).toBe(3); // cards 1, 3, 4
  });

  it('uses correct language for label names', () => {
    const nlLabels = getAvailableSessionLabels(MOCK_CONFIG, 'nl');
    const label1 = nlLabels.find((l) => l.id === 1);
    expect(label1.label).toBe('Moed');
  });

  it('returns empty array when no card labels configured', () => {
    const result = getAvailableSessionLabels({ themeLabels: { en: ['A', 'B', 'C', 'D', 'E', 'F'] }, cardLabels: {} }, 'en');
    expect(result).toEqual([]);
  });

  it('handles null/undefined config gracefully', () => {
    expect(getAvailableSessionLabels(null)).toEqual([]);
    expect(getAvailableSessionLabels(undefined)).toEqual([]);
  });

  it('ignores invalid label ids in card labels', () => {
    const config = {
      themeLabels: { en: ['A', 'B', 'C', 'D', 'E', 'F'] },
      cardLabels: { '1': [0, 7, 'abc', 1] },
    };
    const labels = getAvailableSessionLabels(config, 'en');
    expect(labels).toHaveLength(1);
    expect(labels[0].id).toBe(1);
  });
});


describe('getSessionLabelName', () => {
  it('returns label name for valid id', () => {
    expect(getSessionLabelName(MOCK_CONFIG, 1, 'en')).toBe('Courage');
    expect(getSessionLabelName(MOCK_CONFIG, 2, 'nl')).toBe('Liefde');
  });

  it('falls back to English when language missing', () => {
    expect(getSessionLabelName(MOCK_CONFIG, 1, 'ro')).toBe('Courage');
  });

  it('returns fallback string for out-of-range id', () => {
    expect(getSessionLabelName(MOCK_CONFIG, 10, 'en')).toBe('Label 10');
  });

  it('returns empty string for invalid id', () => {
    expect(getSessionLabelName(MOCK_CONFIG, 'abc', 'en')).toBe('');
  });

  it('handles null config gracefully', () => {
    expect(getSessionLabelName(null, 1, 'en')).toBe('Label 1');
  });
});
