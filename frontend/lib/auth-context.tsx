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
};

type AuthStatus = "loading" | "ready";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  login: (username: string, pin: string) => Promise<AuthUser>;
  logout: () => void;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    try {
      const rawUser = localStorage.getItem(AUTH.storageKey);
      const rawToken = localStorage.getItem(AUTH.tokenKey);
      if (rawUser && rawToken) {
        setUser(JSON.parse(rawUser) as AuthUser);
        setToken(rawToken);
      }
    } catch {
      localStorage.removeItem(AUTH.storageKey);
      localStorage.removeItem(AUTH.tokenKey);
    }
    setStatus("ready");
  }, []);

  const login = useCallback(async (username: string, pin: string) => {
    const data = await apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: { username, pin },
    });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem(AUTH.storageKey, JSON.stringify(data.user));
    localStorage.setItem(AUTH.tokenKey, data.token);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(AUTH.storageKey);
    localStorage.removeItem(AUTH.tokenKey);
  }, []);

  const value = useMemo(
    () => ({ user, token, status, login, logout }),
    [user, token, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
