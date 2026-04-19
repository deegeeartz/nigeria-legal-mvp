"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const LEGACY_TOKEN_KEY = "token";

const AuthContext = createContext({
  user: null,
  login: async () => {},
  logout: () => {},
  authFetch: async () => new Response(null, { status: 401 }),
  loading: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setUser(null);
  }, []);

  const getStoredAccessToken = useCallback(() => {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  }, []);

  const persistTokens = useCallback((accessToken, refreshToken) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(LEGACY_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }, []);

  const fetchProfile = useCallback(async (accessToken) => {
    try {
      const res = await fetch(apiUrl("/api/auth/me"), {
        headers: { "X-Auth-Token": accessToken },
      });
      if (res.ok) {
        const data = await res.json();
        return { ...data, token: accessToken };
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return null;
    }

    try {
      const res = await fetch(apiUrl("/api/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        clearSession();
        return null;
      }

      const data = await res.json();
      persistTokens(data.access_token, data.refresh_token);
      return data.access_token;
    } catch (err) {
      console.error(err);
      clearSession();
      return null;
    }
  }, [clearSession, persistTokens]);

  const hydrateSession = useCallback(async () => {
    const accessToken = getStoredAccessToken();
    if (!accessToken) {
      setLoading(false);
      return;
    }

    let resolvedToken = accessToken;
    let profile = await fetchProfile(resolvedToken);

    if (!profile) {
      const refreshedToken = await refreshAccessToken();
      if (!refreshedToken) {
        setLoading(false);
        return;
      }
      resolvedToken = refreshedToken;
      profile = await fetchProfile(resolvedToken);
    }

    if (profile) {
      setUser(profile);
    } else {
      clearSession();
    }

    setLoading(false);
  }, [clearSession, fetchProfile, getStoredAccessToken, refreshAccessToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void hydrateSession();
  }, [hydrateSession]);

  const login = async (email, password) => {
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      persistTokens(data.access_token, data.refresh_token);

      const profile = await fetchProfile(data.access_token);
      if (profile) {
        setUser(profile);
      } else {
        setUser({
          user_id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          lawyer_id: data.lawyer_id || null,
          token: data.access_token,
        });
      }
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const logout = async () => {
    const accessToken = user?.token || getStoredAccessToken();
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (accessToken || refreshToken) {
      try {
        await fetch(apiUrl("/api/auth/logout"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { "X-Auth-Token": accessToken } : {}),
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch (err) {
        console.error(err);
      }
    }
    clearSession();
  };

  const authFetch = useCallback(
    async (path, options = {}) => {
      const makeRequest = (token) => {
        const nextHeaders = {
          ...(options.headers || {}),
          ...(token ? { "X-Auth-Token": token } : {}),
        };
        return fetch(apiUrl(path), { ...options, headers: nextHeaders });
      };

      let accessToken = getStoredAccessToken();
      let response = await makeRequest(accessToken);
      if (response.status !== 401) {
        return response;
      }

      const refreshedToken = await refreshAccessToken();
      if (!refreshedToken) {
        return response;
      }

      accessToken = refreshedToken;
      const profile = await fetchProfile(accessToken);
      if (profile) {
        setUser(profile);
      }

      response = await makeRequest(accessToken);
      return response;
    },
    [fetchProfile, getStoredAccessToken, refreshAccessToken],
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, authFetch, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
