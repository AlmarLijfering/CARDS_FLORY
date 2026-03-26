const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/$/, '');


function parseJsonResponse(response) {
  return response.json().catch(() => null);
}


function normalizeThemeLabels(rawThemeLabels) {
  return {
    en: Array.isArray(rawThemeLabels?.en) ? rawThemeLabels.en : [],
    nl: Array.isArray(rawThemeLabels?.nl) ? rawThemeLabels.nl : [],
    ro: Array.isArray(rawThemeLabels?.ro) ? rawThemeLabels.ro : []
  };
}


function normalizeCardLabels(rawCardLabels) {
  if (!rawCardLabels || typeof rawCardLabels !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawCardLabels).map(([cardId, labels]) => [cardId, Array.isArray(labels) ? labels : []])
  );
}


export function fromApiConfig(payload) {
  return {
    selectCardsBlocked: Boolean(payload?.select_cards_blocked),
    themeLabels: normalizeThemeLabels(payload?.theme_labels),
    cardLabels: normalizeCardLabels(payload?.card_labels)
  };
}


export function toApiConfig(config) {
  return {
    select_cards_blocked: Boolean(config.selectCardsBlocked),
    theme_labels: normalizeThemeLabels(config.themeLabels),
    card_labels: normalizeCardLabels(config.cardLabels)
  };
}


function buildAdminHeaders(token) {
  if (!token) {
    throw new Error('Login is required for this action.');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };
}


export async function getConfiguration() {
  const response = await fetch(`${API_URL}/api/config`);
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || 'Unable to load configuration.');
  }

  return fromApiConfig(payload);
}


export async function updateConfiguration(config, token) {
  const response = await fetch(`${API_URL}/api/config`, {
    method: 'PUT',
    headers: buildAdminHeaders(token),
    body: JSON.stringify(toApiConfig(config))
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || 'Unable to save configuration.');
  }

  return fromApiConfig(payload);
}
