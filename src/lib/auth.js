"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { apiUrl } from "@/lib/api";

const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  login: async () => false,
  signup: async () => false,
  loginWithGoogle: async () => false,
  updateProfile: async () => null,
  logout: async () => {},
  authFetch: async () => {},
});

const STORAGE_KEY = "wigally_user_session";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (isMounted) setUser(parsed);
        }

        const res = await fetch(apiUrl("/api/auth/me"));
        if (res.ok) {
          const remoteUser = await res.json();
          if (isMounted && remoteUser) {
            const finalUser = saved ? JSON.parse(saved) : remoteUser;
            setUser(finalUser);
            if (typeof window !== "undefined") {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(finalUser));
            }
          }
        }
      } catch (err) {
        console.warn("Auth initialization note:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const saveUserSession = useCallback((userData) => {
    setUser(userData);
    if (typeof window !== "undefined") {
      if (userData) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Login failed");
        return false;
      }

      const userData = await res.json();
      saveUserSession(userData);
      return true;
    } catch (err) {
      setError("Network or server error during login");
      return false;
    }
  }, [saveUserSession]);

  const signup = useCallback(async ({ email, full_name, role, password }) => {
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, full_name, role, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Signup failed");
        return false;
      }

      const userData = await res.json();
      saveUserSession(userData);
      return true;
    } catch (err) {
      setError("Network or server error during signup");
      return false;
    }
  }, [saveUserSession]);

  const loginWithGoogle = useCallback(async ({ email, full_name, role = "client", avatar_url = "" }) => {
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          full_name,
          role,
          avatar_url,
          auth_provider: "google",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Google authentication failed");
        return false;
      }

      const userData = await res.json();
      saveUserSession(userData);
      return userData;
    } catch (err) {
      setError("Network or server error during Google authentication");
      return false;
    }
  }, [saveUserSession]);

  const logout = useCallback(async () => {
    try {
      await fetch(apiUrl("/api/auth/logout"), { method: "POST" }).catch(() => {});
    } finally {
      saveUserSession(null);
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  }, [saveUserSession]);

  const updateProfile = useCallback(async ({ avatar_url, full_name }) => {
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url, full_name }),
      });
      if (res.ok) {
        const updated = await res.json();
        saveUserSession(updated);
        return updated;
      }
    } catch (e) {
      console.warn("Server profile update note:", e);
    }
    // Fallback: update in-memory and local session immediately
    const updated = {
      ...user,
      ...(avatar_url !== undefined && { avatar_url }),
      ...(full_name !== undefined && { full_name }),
    };
    saveUserSession(updated);
    return updated;
  }, [user, saveUserSession]);

  const authFetch = useCallback(async (url, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (user?.email) {
      headers.set("X-User-Email", user.email);
    }
    if (user?.role) {
      headers.set("X-User-Role", user.role);
    }
    return fetch(apiUrl(url), {
      ...options,
      headers,
    });
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        signup,
        loginWithGoogle,
        updateProfile,
        logout,
        authFetch,
        setUser: saveUserSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
