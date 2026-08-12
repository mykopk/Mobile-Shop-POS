"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { apiRequest } from "@/lib/apiClient";
import { AUTH } from "@/lib/constants";
import type { Role } from "@/lib/constants/users";

export type AuthUser = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  permissions: string[];
};

type AuthStatus = "loading" | "ready";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (username: string, pin: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
};

type AuthResponse = {
  user: AuthUser;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    apiRequest<AuthResponse>("/auth/me")
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        // not authenticated — AuthGuard redirects to /login
      })
      .finally(() => {
        if (!cancelled) setStatus("ready");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, pin: string) => {
    const data = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: { username, pin },
    });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {
      // session is cleared server-side regardless
    }
    setUser(null);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener(AUTH.unauthorizedEvent, onUnauthorized);
    return () => window.removeEventListener(AUTH.unauthorizedEvent, onUnauthorized);
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
