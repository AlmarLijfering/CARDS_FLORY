export const TOTAL_CARD_COUNT = 112;
export const MAX_SELECTED_CARDS = 6;
export const SUPPORTED_LANGUAGES = ['en', 'nl', 'ro'];

export const DEFAULT_THEME_LABELS = {
  en: Array.from({ length: 6 }, (_, index) => `Label ${index + 1}`),
  nl: Array.from({ length: 6 }, (_, index) => `Label ${index + 1}`),
  ro: Array.from({ length: 6 }, (_, index) => `Label ${index + 1}`)
};

export const DEFAULT_CONFIG = {
  selectCardsBlocked: false,
  themeLabels: DEFAULT_THEME_LABELS,
  cardLabels: {}
};

export const LANGUAGE_LABELS = {
  en: 'English',
  nl: 'Dutch',
  ro: 'Romanian'
};

export const STORAGE_KEYS = {
  config: 'therapy-cards-config-v1',
  language: 'therapy-cards-language-v1',
  guidance: 'therapy-cards-guidance-v1',
  sessions: 'therapy-cards-session-state-v1'
};
