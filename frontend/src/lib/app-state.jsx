import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

import {
  DEFAULT_CONFIG,
  DEFAULT_THEME_LABELS,
  MAX_SELECTED_CARDS,
  STORAGE_KEYS,
  SUPPORTED_LANGUAGES,
  TOTAL_CARD_COUNT
} from './constants';
import { getAdminSessionStatus, logoutFromBackend } from './authApi';
import { getConfiguration, updateConfiguration } from './configApi';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { useSessionStorageState } from '../hooks/useSessionStorageState';


const AppStateContext = createContext(null);


function createDefaultSessionState() {
  return {
    selectedCards: [],
    sessionContext: {
      sessionTitle: '',
      facilitator: '',
      clientAlias: '',
      notes: ''
    }
  };
}


function sanitizeSessionKey(rawValue) {
  const normalized = String(rawValue || 'default')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'default';
}


function sessionKeyFromPath(pathname) {
  if (pathname === '/session' || pathname === '/session/' || pathname === '/session/finalize' || pathname === '/session/finalize/') {
    return 'default';
  }

  const match = pathname.match(/^\/session\/([^/]+?)(?:\/finalize)?\/?$/);
  if (!match) {
    return 'default';
  }

  return sanitizeSessionKey(match[1]);
}


function buildSessionPath(sessionKey) {
  return sessionKey === 'default' ? '/session' : `/session/${encodeURIComponent(sessionKey)}`;
}


function buildFinalizePath(sessionKey) {
  return `${buildSessionPath(sessionKey)}/finalize`;
}


function normalizeSessionContext(rawContext) {
  const defaults = createDefaultSessionState().sessionContext;
  if (!rawContext || typeof rawContext !== 'object') {
    return defaults;
  }

  return {
    sessionTitle: typeof rawContext.sessionTitle === 'string' ? rawContext.sessionTitle : defaults.sessionTitle,
    facilitator: typeof rawContext.facilitator === 'string' ? rawContext.facilitator : defaults.facilitator,
    clientAlias: typeof rawContext.clientAlias === 'string' ? rawContext.clientAlias : defaults.clientAlias,
    notes: typeof rawContext.notes === 'string' ? rawContext.notes : defaults.notes
  };
}


function normalizeSessionState(rawSession) {
  const defaults = createDefaultSessionState();
  if (!rawSession || typeof rawSession !== 'object') {
    return defaults;
  }

  const selectedCards = Array.isArray(rawSession.selectedCards) ? rawSession.selectedCards : [];
  const normalizedCards = [];
  const seen = new Set();
  for (const rawCardId of selectedCards) {
    const parsed = Number(rawCardId);
    if (
      !Number.isInteger(parsed)
      || parsed < 1
      || parsed > TOTAL_CARD_COUNT
      || seen.has(parsed)
      || normalizedCards.length >= MAX_SELECTED_CARDS
    ) {
      continue;
    }
    seen.add(parsed);
    normalizedCards.push(parsed);
  }

  return {
    selectedCards: normalizedCards,
    sessionContext: normalizeSessionContext(rawSession.sessionContext)
  };
}


function normalizeSessions(rawSessions) {
  const normalized = {};
  if (!rawSessions || typeof rawSessions !== 'object') {
    return normalized;
  }

  for (const [sessionKey, sessionState] of Object.entries(rawSessions)) {
    normalized[sanitizeSessionKey(sessionKey)] = normalizeSessionState(sessionState);
  }

  return normalized;
}


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
  const location = useLocation();
  const activeSessionKey = sessionKeyFromPath(location.pathname);
  const [language, setLanguage] = useLocalStorageState(STORAGE_KEYS.language, 'en', normalizeLanguage);
  const [guidanceDismissed, setGuidanceDismissed] = useLocalStorageState(STORAGE_KEYS.guidance, false, Boolean);
  const [sessions, setSessions] = useSessionStorageState(STORAGE_KEYS.sessions, {}, normalizeSessions);
  const [config, setConfig] = useState(() => normalizeConfig(DEFAULT_CONFIG));
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const activeSession = sessions[activeSessionKey] || createDefaultSessionState();

  const selectedCards = activeSession.selectedCards;
  const sessionContext = activeSession.sessionContext;

  useEffect(() => {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      setLanguage('en');
    }
  }, [language, setLanguage]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAuthSession() {
      setIsAuthLoading(true);

      try {
        const session = await getAdminSessionStatus();
        if (!isCancelled) {
          setIsAuthenticated(Boolean(session.authenticated));
        }
      } catch (error) {
        if (!isCancelled) {
          setIsAuthenticated(false);
        }
      } finally {
        if (!isCancelled) {
          setIsAuthLoading(false);
        }
      }
    }

    loadAuthSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadConfiguration() {
      setIsConfigLoading(true);
      setConfigError('');

      try {
        const nextConfig = await getConfiguration();
        if (!isCancelled) {
          setConfig(normalizeConfig(nextConfig));
        }
      } catch (error) {
        if (!isCancelled) {
          setConfigError(error instanceof Error ? error.message : 'Unable to load configuration.');
        }
      } finally {
        if (!isCancelled) {
          setIsConfigLoading(false);
        }
      }
    }

    loadConfiguration();

    return () => {
      isCancelled = true;
    };
  }, []);

  function updateActiveSession(updater) {
    setSessions((current) => {
      const normalizedSessions = normalizeSessions(current);
      const currentSession = normalizedSessions[activeSessionKey] || createDefaultSessionState();
      const nextSession = typeof updater === 'function' ? updater(currentSession) : updater;

      return {
        ...normalizedSessions,
        [activeSessionKey]: normalizeSessionState(nextSession)
      };
    });
  }

  async function refreshConfig() {
    setIsConfigLoading(true);
    setConfigError('');

    try {
      const nextConfig = await getConfiguration();
      const normalized = normalizeConfig(nextConfig);
      setConfig(normalized);
      return normalized;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load configuration.';
      setConfigError(message);
      throw error instanceof Error ? error : new Error(message);
    } finally {
      setIsConfigLoading(false);
    }
  }

  async function persistConfig(nextConfig) {
    const normalized = normalizeConfig(nextConfig);
    const saved = await updateConfiguration(normalized);
    const finalConfig = normalizeConfig(saved);
    setConfig(finalConfig);
    setConfigError('');
    return finalConfig;
  }

  async function setThemeLabels(themeLabels) {
    return persistConfig({
      ...config,
      themeLabels: normalizeThemeLabels(themeLabels)
    });
  }

  async function setCardLabels(cardLabels) {
    return persistConfig({
      ...config,
      cardLabels: normalizeCardLabels(cardLabels)
    });
  }

  async function setSelectCardsBlocked(isBlocked) {
    return persistConfig({
      ...config,
      selectCardsBlocked: Boolean(isBlocked)
    });
  }

  function login() {
    setIsAuthenticated(true);
  }

  async function logout() {
    try {
      await logoutFromBackend();
    } catch (error) {
      // Even if logout fails remotely, clear the local admin state.
    } finally {
      setIsAuthenticated(false);
    }
  }

  function addSelectedCard(cardId, preferredIndex = selectedCards.length) {
    updateActiveSession((current) => {
      if (current.selectedCards.includes(cardId) || current.selectedCards.length >= MAX_SELECTED_CARDS) {
        return current;
      }
      const nextCards = [...current.selectedCards];
      const insertionIndex = Math.max(0, Math.min(preferredIndex, nextCards.length));
      nextCards.splice(insertionIndex, 0, cardId);
      return {
        ...current,
        selectedCards: nextCards
      };
    });
    setGuidanceDismissed(true);
  }

  function removeSelectedCard(cardId) {
    updateActiveSession((current) => ({
      ...current,
      selectedCards: current.selectedCards.filter((value) => value !== cardId)
    }));
  }

  function reorderSelectedCards(fromIndex, toIndex) {
    updateActiveSession((current) => {
      if (
        fromIndex === toIndex
        || fromIndex < 0
        || toIndex < 0
        || fromIndex >= current.selectedCards.length
        || toIndex >= current.selectedCards.length
      ) {
        return current;
      }
      return {
        ...current,
        selectedCards: arrayMove(current.selectedCards, fromIndex, toIndex)
      };
    });
  }

  function clearSelection() {
    updateActiveSession(createDefaultSessionState());
  }

  function clearAllSessions() {
    setSessions({});
  }

  function updateSessionContext(patch) {
    updateActiveSession((current) => ({
      ...current,
      sessionContext: {
        ...current.sessionContext,
        ...patch
      }
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

  async function importBundle(bundleText) {
    try {
      const payload = JSON.parse(bundleText);
      if (!payload || typeof payload !== 'object') {
        return { ok: false, error: 'The imported file must contain a JSON object.' };
      }

      await persistConfig({
        ...config,
        themeLabels: normalizeThemeLabels(payload.theme_labels),
        cardLabels: normalizeCardLabels(payload.card_labels)
      });

      return { ok: true };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { ok: false, error: 'The imported file is not valid JSON.' };
      }
      return { ok: false, error: error instanceof Error ? error.message : 'Unable to import configuration.' };
    }
  }

  const value = {
    activeSessionKey,
    sessionPath: buildSessionPath(activeSessionKey),
    finalizePath: buildFinalizePath(activeSessionKey),
    isAuthenticated,
    isAuthLoading,
    config,
    isConfigLoading,
    configError,
    language,
    setLanguage,
    selectedCards,
    sessionContext,
    guidanceDismissed,
    setGuidanceDismissed,
    setThemeLabels,
    setCardLabels,
    setSelectCardsBlocked,
    refreshConfig,
    login,
    logout,
    addSelectedCard,
    removeSelectedCard,
    reorderSelectedCards,
    clearSelection,
    clearAllSessions,
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
