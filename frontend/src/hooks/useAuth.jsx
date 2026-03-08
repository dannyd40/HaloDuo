import { createContext, useContext, useState, useEffect } from 'react';
import { api, setTokens, clearTokens, getAccessToken } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (getAccessToken()) {
      api('/auth/me').then(setUser).catch(() => clearTokens()).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Handle Google OAuth callback
    const params = new URLSearchParams(window.location.search);
    const at = params.get('access_token');
    const rt = params.get('refresh_token');
    if (at && rt) {
      setTokens(at, rt);
      window.history.replaceState({}, '', window.location.pathname);
      api('/auth/me').then(setUser).finally(() => setLoading(false));
    }
  }, []);

  const login = async (email, password) => {
    const { accessToken, refreshToken } = await api('/auth/login', {
      method: 'POST', body: { email, password }
    });
    setTokens(accessToken, refreshToken);
    const me = await api('/auth/me');
    setUser(me);
    return me;
  };

  const register = async (email, password, nom) => {
    const { accessToken, refreshToken } = await api('/auth/register', {
      method: 'POST', body: { email, password, nom }
    });
    setTokens(accessToken, refreshToken);
    const me = await api('/auth/me');
    setUser(me);
    return me;
  };

  const logout = () => { clearTokens(); setUser(null); };

  const refreshUser = async () => {
    const me = await api('/auth/me');
    setUser(me);
    return me;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
