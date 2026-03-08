const BASE = import.meta.env.VITE_API_URL || '/api';

let _accessToken = localStorage.getItem('hd_access') || null;
let _refreshToken = localStorage.getItem('hd_refresh') || null;

export const setTokens = (access, refresh) => {
  _accessToken = access;
  _refreshToken = refresh;
  localStorage.setItem('hd_access', access);
  if (refresh) localStorage.setItem('hd_refresh', refresh);
};

export const clearTokens = () => {
  _accessToken = null;
  _refreshToken = null;
  localStorage.removeItem('hd_access');
  localStorage.removeItem('hd_refresh');
};

export const getAccessToken = () => _accessToken;

async function refreshAccessToken() {
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: _refreshToken }),
  });
  if (!res.ok) { clearTokens(); throw new Error('Session expirée'); }
  const { accessToken } = await res.json();
  _accessToken = accessToken;
  localStorage.setItem('hd_access', accessToken);
  return accessToken;
}

export async function api(path, options = {}) {
  const doRequest = async (token) => {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
    });
    return res;
  };

  let res = await doRequest(_accessToken);

  if (res.status === 401 && _refreshToken) {
    const newToken = await refreshAccessToken();
    res = await doRequest(newToken);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}
