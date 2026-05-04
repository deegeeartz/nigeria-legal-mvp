"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";

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

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/auth/me"), {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ refresh_token: "" }), // Backend reads cookie
      });

      if (!res.ok) {
        setUser(null);
        return false;
      }
      return true;
    } catch (err) {
      console.error(err);
      setUser(null);
      return false;
    }
  }, []);

  const hydrateSession = useCallback(async () => {
    // Attempt to fetch profile assuming cookies are present
    let profile = await fetchProfile();

    if (!profile) {
      // If unauthorized, maybe access token expired but refresh token is valid
      const refreshed = await refreshSession();
      if (refreshed) {
        profile = await fetchProfile();
      }
    }

    if (profile) {
      setUser(profile);
    } else {
      setUser(null);
    }
    setLoading(false);
  }, [fetchProfile, refreshSession]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void hydrateSession();
  }, [hydrateSession]);

  const login = async (email, password) => {
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      
      const profile = await fetchProfile();
      if (profile) {
        setUser(profile);
      } else {
        setUser({
          user_id: data.user_id,
          email: data.email,
          full_name: data.full_name,
          role: data.role,
          lawyer_id: data.lawyer_id || null,
        });
      }
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ refresh_token: "" }), // Backend clears cookies
      });
    } catch (err) {
      console.error(err);
    }
    setUser(null);
  };

  const authFetch = useCallback(
    async (path, options = {}) => {
      const makeRequest = () => {
        return fetch(apiUrl(path), { 
            ...options, 
            credentials: "include" 
        });
      };

      let response = await makeRequest();
      if (response.status !== 401) {
        return response;
      }

      // If 401, try to refresh token
      const refreshed = await refreshSession();
      if (!refreshed) {
        return response; // Still 401
      }

      const profile = await fetchProfile();
      if (profile) {
        setUser(profile);
      }

      // Retry original request
      response = await makeRequest();
      return response;
    },
    [fetchProfile, refreshSession],
  );

  return (
    <AuthContext.Provider value={{ user, login, logout, authFetch, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
