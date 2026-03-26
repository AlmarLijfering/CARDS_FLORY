const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/$/, '');


async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
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


export async function createSessionLink(token) {
  const response = await fetch(`${API_URL}/api/session-links`, {
    method: 'POST',
    headers: buildAdminHeaders(token)
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || 'Unable to create a session link.');
  }

  return payload;
}


export async function resolveSessionInvite(token) {
  const response = await fetch(`${API_URL}/api/session-links/${encodeURIComponent(token)}`);
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || 'Unable to open this session link.');
  }

  return payload;
}


export async function getActiveSessionStatus(sessionKey) {
  const response = await fetch(`${API_URL}/api/sessions/${encodeURIComponent(sessionKey)}`);
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || 'This session is not active.');
  }

  return payload;
}


export async function getActiveSessions(token) {
  const response = await fetch(`${API_URL}/api/sessions`, {
    headers: buildAdminHeaders(token)
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || 'Unable to load active sessions.');
  }

  return Array.isArray(payload) ? payload : [];
}


export async function clearAllActiveSessions(token) {
  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'DELETE',
    headers: buildAdminHeaders(token)
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || 'Unable to clear active sessions.');
  }

  return payload;
}
