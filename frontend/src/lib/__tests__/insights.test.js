import { describe, expect, it } from 'vitest';
import { buildPdfPayload } from '../insights';


const MOCK_CATALOG = [
  { id: 1, title: 'Card 001', smallImage: '/s001.png', largeImage: '/l001.png' },
  { id: 2, title: 'Card 002', smallImage: '/s002.png', largeImage: '/l002.png' },
  { id: 3, title: 'Card 003', smallImage: '/s003.png', largeImage: '/l003.png' },
];

const MOCK_THEME_LABELS = {
  en: ['Courage', 'Love', 'Fear', 'Joy', 'Grief', 'Hope'],
  nl: ['Moed', 'Liefde', 'Angst', 'Vreugde', 'Verdriet', 'Hoop'],
  ro: ['Curaj', 'Dragoste', 'Frica', 'Bucurie', 'Doliu', 'Speranta'],
};


describe('buildPdfPayload', () => {
  it('builds a valid payload with selected cards', () => {
    const result = buildPdfPayload({
      selectedCards: [1, 2, null, null, null, null],
      cardCatalog: MOCK_CATALOG,
      cardLabels: { '1': [1, 3] },
      themeLabels: MOCK_THEME_LABELS,
      language: 'en',
      sessionContext: { sessionTitle: 'Test', facilitator: '', clientAlias: '', notes: '' },
      sessionKey: 'default',
    });

    expect(result.selected_cards).toHaveLength(2);
    expect(result.selected_cards[0].id).toBe(1);
    expect(result.selected_cards[0].title).toBe('Card 001');
    expect(result.selected_cards[0].labels).toEqual(['Courage', 'Fear']);
    expect(result.context.session_title).toBe('Test');
    expect(result.context.language).toBe('en');
    expect(result.graphs).toEqual([]);
  });

  it('filters out null card ids', () => {
    const result = buildPdfPayload({
      selectedCards: [null, 3, null, null, null, null],
      cardCatalog: MOCK_CATALOG,
      cardLabels: {},
      themeLabels: MOCK_THEME_LABELS,
      language: 'en',
      sessionContext: { sessionTitle: '', facilitator: '', clientAlias: '', notes: '' },
      sessionKey: 'default',
    });

    expect(result.selected_cards).toHaveLength(1);
    expect(result.selected_cards[0].id).toBe(3);
  });

  it('uses Dutch labels when language is nl', () => {
    const result = buildPdfPayload({
      selectedCards: [1],
      cardCatalog: MOCK_CATALOG,
      cardLabels: { '1': [2] },
      themeLabels: MOCK_THEME_LABELS,
      language: 'nl',
      sessionContext: { sessionTitle: '', facilitator: '', clientAlias: '', notes: '' },
      sessionKey: 'default',
    });

    expect(result.selected_cards[0].labels).toEqual(['Liefde']);
  });

  it('uses session key as fallback title', () => {
    const result = buildPdfPayload({
      selectedCards: [1],
      cardCatalog: MOCK_CATALOG,
      cardLabels: {},
      themeLabels: MOCK_THEME_LABELS,
      language: 'en',
      sessionContext: { sessionTitle: '', facilitator: '', clientAlias: '', notes: '' },
      sessionKey: 'session-abc123',
    });

    expect(result.context.session_title).toBe('Session session-abc123');
  });

  it('does not use session key as fallback for default key', () => {
    const result = buildPdfPayload({
      selectedCards: [1],
      cardCatalog: MOCK_CATALOG,
      cardLabels: {},
      themeLabels: MOCK_THEME_LABELS,
      language: 'en',
      sessionContext: { sessionTitle: '', facilitator: '', clientAlias: '', notes: '' },
      sessionKey: 'default',
    });

    expect(result.context.session_title).toBe('');
  });

  it('generates fallback title for missing catalog card', () => {
    const result = buildPdfPayload({
      selectedCards: [999],
      cardCatalog: MOCK_CATALOG,
      cardLabels: {},
      themeLabels: MOCK_THEME_LABELS,
      language: 'en',
      sessionContext: { sessionTitle: '', facilitator: '', clientAlias: '', notes: '' },
      sessionKey: 'default',
    });

    expect(result.selected_cards[0].title).toBe('Card 999');
  });

  it('passes notes and facilitator through', () => {
    const result = buildPdfPayload({
      selectedCards: [1],
      cardCatalog: MOCK_CATALOG,
      cardLabels: {},
      themeLabels: MOCK_THEME_LABELS,
      language: 'en',
      sessionContext: {
        sessionTitle: '',
        facilitator: 'Dr. Smith',
        clientAlias: 'Anon',
        notes: 'My reflections',
      },
      sessionKey: 'default',
    });

    expect(result.context.facilitator).toBe('Dr. Smith');
    expect(result.context.client_alias).toBe('Anon');
    expect(result.context.notes).toBe('My reflections');
  });
});
