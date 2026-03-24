import { createContext, useContext, useEffect, useState } from 'react';

import {
  DEFAULT_CONFIG,
  DEFAULT_THEME_LABELS,
  MAX_SELECTED_CARDS,
  STORAGE_KEYS,
  SUPPORTED_LANGUAGES
} from './constants';
import { useLocalStorageState } from '../hooks/useLocalStorageState';


const AppStateContext = createContext(null);


function cloneThemeLabels(themeLabels = DEFAULT_THEME_LABELS) {
  return {
    en: [...(themeLabels.en || DEFAULT_THEME_LABELS.en)],
    nl: [...(themeLabels.nl || DEFAULT_THEME_LABELS.nl)],
    ro: [...(themeLabels.ro || DEFAULT_THEME_LABELS.ro)]
  };
}


function normalizeThemeLabels(themeLabels) {
  const normalized = cloneThemeLabels(DEFAULT_THEME_LABELS);

  if (!themeLabels || typeof themeLabels !== 'object') {
    return normalized;
  }

  for (const language of SUPPORTED_LANGUAGES) {
    const rawLabels = Array.isArray(themeLabels[language]) ? themeLabels[language] : [];
    normalized[language] = DEFAULT_THEME_LABELS[language].map((fallback, index) => {
      const candidate = typeof rawLabels[index] === 'string' ? rawLabels[index].trim() : '';
      return candidate || fallback;
    });
  }

  return normalized;
}


function normalizeCardLabels(cardLabels) {
  const normalized = {};
  if (!cardLabels || typeof cardLabels !== 'object') {
    return normalized;
  }

  for (const [cardId, rawLabels] of Object.entries(cardLabels)) {
    if (!Array.isArray(rawLabels)) {
      continue;
    }

    const labels = [];
    const seen = new Set();
    for (const labelId of rawLabels) {
      const parsed = Number(labelId);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 6 || seen.has(parsed)) {
        continue;
      }
      seen.add(parsed);
      labels.push(parsed);
    }

    if (labels.length) {
      normalized[String(cardId)] = labels;
    }
  }

  return normalized;
}


function normalizeConfig(rawConfig) {
  if (!rawConfig || typeof rawConfig !== 'object') {
    return {
      ...DEFAULT_CONFIG,
      themeLabels: cloneThemeLabels(DEFAULT_THEME_LABELS),
      cardLabels: {}
    };
  }

  return {
    selectCardsBlocked: Boolean(rawConfig.selectCardsBlocked),
    themeLabels: normalizeThemeLabels(rawConfig.themeLabels),
    cardLabels: normalizeCardLabels(rawConfig.cardLabels)
  };
}


function normalizeLanguage(rawLanguage) {
  return SUPPORTED_LANGUAGES.includes(rawLanguage) ? rawLanguage : 'en';
}


function arrayMove(items, fromIndex, toIndex) {
  const clone = [...items];
  const [moved] = clone.splice(fromIndex, 1);
  clone.splice(toIndex, 0, moved);
  return clone;
}


export function AppStateProvider({ children }) {
  const [config, setConfig] = useLocalStorageState(STORAGE_KEYS.config, DEFAULT_CONFIG, normalizeConfig);
  const [language, setLanguage] = useLocalStorageState(STORAGE_KEYS.language, 'en', normalizeLanguage);
  const [guidanceDismissed, setGuidanceDismissed] = useLocalStorageState(STORAGE_KEYS.guidance, false, Boolean);
  const [selectedCards, setSelectedCards] = useState([]);
  const [sessionContext, setSessionContext] = useState({
    sessionTitle: '',
    facilitator: '',
    clientAlias: '',
    notes: ''
  });

  useEffect(() => {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      setLanguage('en');
    }
  }, [language, setLanguage]);

  function updateConfig(updater) {
    setConfig((current) => {
      const nextConfig = typeof updater === 'function' ? updater(current) : updater;
      return normalizeConfig(nextConfig);
    });
  }

  function setThemeLabels(themeLabels) {
    updateConfig((current) => ({
      ...current,
      themeLabels: normalizeThemeLabels(themeLabels)
    }));
  }

  function setCardLabels(cardLabels) {
    updateConfig((current) => ({
      ...current,
      cardLabels: normalizeCardLabels(cardLabels)
    }));
  }

  function setSelectCardsBlocked(isBlocked) {
    updateConfig((current) => ({
      ...current,
      selectCardsBlocked: Boolean(isBlocked)
    }));
  }

  function addSelectedCard(cardId, preferredIndex = selectedCards.length) {
    setSelectedCards((current) => {
      if (current.includes(cardId) || current.length >= MAX_SELECTED_CARDS) {
        return current;
      }
      const next = [...current];
      const insertionIndex = Math.max(0, Math.min(preferredIndex, next.length));
      next.splice(insertionIndex, 0, cardId);
      return next;
    });
    setGuidanceDismissed(true);
  }

  function removeSelectedCard(cardId) {
    setSelectedCards((current) => current.filter((value) => value !== cardId));
  }

  function reorderSelectedCards(fromIndex, toIndex) {
    setSelectedCards((current) => {
      if (
        fromIndex === toIndex
        || fromIndex < 0
        || toIndex < 0
        || fromIndex >= current.length
        || toIndex >= current.length
      ) {
        return current;
      }
      return arrayMove(current, fromIndex, toIndex);
    });
  }

  function clearSelection() {
    setSelectedCards([]);
    setSessionContext({
      sessionTitle: '',
      facilitator: '',
      clientAlias: '',
      notes: ''
    });
  }

  function updateSessionContext(patch) {
    setSessionContext((current) => ({
      ...current,
      ...patch
    }));
  }

  function getThemeLabels(currentLanguage = language) {
    return config.themeLabels[currentLanguage] || config.themeLabels.en;
  }

  function getCardLabelIds(cardId) {
    return config.cardLabels[String(cardId)] || [];
  }

  function getCardLabelNames(cardId, currentLanguage = language) {
    const labels = getThemeLabels(currentLanguage);
    return getCardLabelIds(cardId)
      .map((labelId) => labels[labelId - 1])
      .filter(Boolean);
  }

  function exportBundle() {
    return JSON.stringify(
      {
        theme_labels: config.themeLabels,
        card_labels: config.cardLabels
      },
      null,
      2
    );
  }

  function importBundle(bundleText) {
    try {
      const payload = JSON.parse(bundleText);
      if (!payload || typeof payload !== 'object') {
        return { ok: false, error: 'The imported file must contain a JSON object.' };
      }

      setConfig((current) => ({
        ...current,
        themeLabels: normalizeThemeLabels(payload.theme_labels),
        cardLabels: normalizeCardLabels(payload.card_labels)
      }));

      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'The imported file is not valid JSON.' };
    }
  }

  const value = {
    config,
    language,
    setLanguage,
    selectedCards,
    sessionContext,
    guidanceDismissed,
    setGuidanceDismissed,
    setThemeLabels,
    setCardLabels,
    setSelectCardsBlocked,
    addSelectedCard,
    removeSelectedCard,
    reorderSelectedCards,
    clearSelection,
    updateSessionContext,
    getThemeLabels,
    getCardLabelIds,
    getCardLabelNames,
    exportBundle,
    importBundle
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}


export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return context;
}

