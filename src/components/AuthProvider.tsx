"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { UserData, getUserData, createUser, logoutUser, getPerformanceAnalytics } from "@/lib/user-store";
import { syncUserToSupabase, isSupabaseConfigured } from "@/lib/supabase-api";
import { getLeague } from "@/lib/league-system";

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

function syncToCloud(data: UserData) {
  if (!isSupabaseConfigured()) return;
  const analytics = getPerformanceAnalytics(data);
  syncUserToSupabase({
    id: data.profile.id,
    name: data.profile.name,
    email: data.profile.email,
    avatar_color: data.profile.avatar_color,
    total_points: data.total_points,
    total_questions: analytics.totalQuestions,
    total_correct: analytics.totalCorrect,
    accuracy: analytics.overallAccuracy,
    streak_current: data.streak.current,
    streak_longest: data.streak.longest,
    league: getLeague(data.total_points).id,
    onboarding_completed: data.onboarding?.completed,
    learning_style: data.onboarding?.learning_style,
    experience_level: data.onboarding?.experience_level,
    target_score: data.onboarding?.target_score,
  }).catch(() => {});
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const data = getUserData();
    setUser(data);
    setLoading(false);
    if (data) syncToCloud(data);
  }, []);

  const login = (name: string, email: string) => {
    const data = createUser(name, email);
    setUser(data);
    syncToCloud(data);
  };

  const logout = () => {
    logoutUser();
    setUser(null);
  };

  const refresh = () => {
    const data = getUserData();
    setUser(data);
    if (data) syncToCloud(data);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
