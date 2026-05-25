"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { UserData, getUserData, createUser, logoutUser, saveUserData } from "@/lib/user-store";

interface AuthContextValue {
  user: UserData | null;
  loading: boolean;
  login: (name: string, email: string) => void;
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refresh: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = getUserData();
    setUser(data);
    setLoading(false);
  }, []);

  const login = (name: string, email: string) => {
    const data = createUser(name, email);
    setUser(data);
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  const refresh = () => {
    const data = getUserData();
    setUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
