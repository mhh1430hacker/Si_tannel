"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { UserData, getUserData, saveUserData, createUser, logoutUser, getPerformanceAnalytics } from "@/lib/user-store";
import { syncUserToSupabase, isSupabaseConfigured } from "@/lib/supabase-api";
import { getLeague } from "@/lib/league-system";
import { getCurrentUser, onAuthStateChange, signOut, AuthUser } from "@/lib/supabase-auth";
import { startAutoSync, syncToCloud as syncToNeon } from "@/lib/local-sync";

interface AuthContextValue {
  user: UserData | null;
  authUser: AuthUser | null;
  loading: boolean;
  login: (name: string, email: string) => void;
  loginWithAuth: (authUser: AuthUser) => void;
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  authUser: null,
  loading: true,
  login: () => {},
  loginWithAuth: () => {},
  logout: () => {},
  refresh: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

const AVATAR_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

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

function ensureLocalData(authUser: AuthUser): UserData {
  const existing = getUserData();
  if (existing) {
    if (existing.profile.id !== authUser.id) {
      existing.profile.id = authUser.id;
      existing.profile.email = authUser.email;
      if (authUser.name) existing.profile.name = authUser.name;
      saveUserData(existing);
    }
    return existing;
  }

  const data: UserData = {
    profile: {
      id: authUser.id,
      name: authUser.name || authUser.email.split("@")[0],
      email: authUser.email,
      created_at: new Date().toISOString(),
      avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    },
    sessions: [],
    achievements: [],
    flashcards: [],
    streak: { current: 0, longest: 0, last_study_date: "" },
    total_points: 0,
    study_minutes_today: 0,
    last_active: new Date().toISOString(),
  };
  saveUserData(data);
  return data;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const supabaseUser = await getCurrentUser();
      if (cancelled) return;

      if (supabaseUser) {
        setAuthUser(supabaseUser);
        const data = ensureLocalData(supabaseUser);
        setUser(data);
        syncToCloud(data);
      } else {
        const localData = getUserData();
        if (localData) setUser(localData);
      }
      setLoading(false);
    }

    init();

    const unsub = onAuthStateChange((au) => {
      if (cancelled) return;
      if (au) {
        setAuthUser(au);
        const data = ensureLocalData(au);
        setUser(data);
        syncToCloud(data);
      } else {
        setAuthUser(null);
      }
    });

    // Start local-first auto-sync to Neon Postgres
    const stopSync = startAutoSync();
    // Initial sync
    syncToNeon().catch(() => {});

    return () => {
      cancelled = true;
      if (unsub) unsub();
      stopSync();
    };
  }, []);

  const login = (name: string, email: string) => {
    const data = createUser(name, email);
    setUser(data);
    syncToCloud(data);
  };

  const loginWithAuth = (au: AuthUser) => {
    setAuthUser(au);
    const data = ensureLocalData(au);
    setUser(data);
    syncToCloud(data);
  };

  const logout = async () => {
    await signOut();
    logoutUser();
    setUser(null);
    setAuthUser(null);
  };

  const refresh = () => {
    const data = getUserData();
    setUser(data);
    if (data) syncToCloud(data);
  };

  return (
    <AuthContext.Provider value={{ user, authUser, loading, login, loginWithAuth, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}
