const ADMIN_SESSION_TOKEN_KEY = 'therapy_admin_access_token';


function canUseSessionStorage() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}


export function getAdminAccessToken() {
  if (!canUseSessionStorage()) {
    return '';
  }

  return window.sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY) || '';
}


export function setAdminAccessToken(token) {
  if (!canUseSessionStorage()) {
    return;
  }

  if (typeof token === 'string' && token.trim()) {
    window.sessionStorage.setItem(ADMIN_SESSION_TOKEN_KEY, token.trim());
    return;
  }

  window.sessionStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
}


export function clearAdminAccessToken() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
}


export function buildAdminAuthHeaders(headers = {}) {
  const token = getAdminAccessToken();
  if (!token) {
    return { ...headers };
  }

  return {
    ...headers,
    Authorization: `Bearer ${token}`
  };
}
