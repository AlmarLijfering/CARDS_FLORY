const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/$/, '');


async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}


export async function createSessionLink() {
  const response = await fetch(`${API_URL}/api/session-links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
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
