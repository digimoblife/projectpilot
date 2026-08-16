"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiClient } from "@/lib/api-client";

const TOKEN_STORAGE_KEY = "projecthub_access_token";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

interface LoginResult {
  success: boolean;
  error?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (typeof window === "undefined") {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);

      if (!storedToken) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      const response = await apiClient<AuthUser>("/auth/me", {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      if (cancelled) {
        return;
      }

      if (response.data) {
        setToken(storedToken);
        setUser(response.data);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      }

      setIsLoading(false);
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const response = await apiClient<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.data) {
        return {
          success: false,
          error: response.error || "Login gagal.",
        };
      }

      if (!response.data.access_token || !response.data.user) {
        return {
          success: false,
          error: "Respons login dari server tidak lengkap.",
        };
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          TOKEN_STORAGE_KEY,
          response.data.access_token,
        );
      }

      setToken(response.data.access_token);
      setUser(response.data.user);

      return {
        success: true,
      };
    },
    [],
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
    }),
    [user, token, isLoading, login, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
