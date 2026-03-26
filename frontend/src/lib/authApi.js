const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001').replace(/\/$/, '');


async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}


export async function loginWithBackend(username, password) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || 'Unable to log in.');
  }

  return {
    ok: Boolean(payload?.ok)
  };
}


export async function getAdminSessionStatus() {
  const response = await fetch(`${API_URL}/api/auth/session`, {
    credentials: 'include'
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || 'Unable to check the admin session.');
  }

  return {
    authenticated: Boolean(payload?.authenticated)
  };
}


export async function logoutFromBackend() {
  const response = await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  const payload = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload?.detail || 'Unable to log out.');
  }

  return {
    ok: Boolean(payload?.ok)
  };
}
