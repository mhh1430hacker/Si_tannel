"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getLeague, getLeagueProgress, getNextLeague, LEAGUES } from "@/lib/league-system";
import { getPerformanceAnalytics } from "@/lib/user-store";
import { getLeaderboard, syncUserToSupabase, isSupabaseConfigured } from "@/lib/supabase-api";
import type { LeaderboardUser } from "@/lib/supabase-api";

interface DisplayEntry {
  rank: number;
  name: string;
  avatar: string;
  avatar_color: string;
  points: number;
  accuracy: number;
  league: string;
  isUser: boolean;
}

export default function LeaderboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [isRealData, setIsRealData] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [userRankInfo, setUserRankInfo] = useState<{ rank: number; total: number }>({ rank: 0, total: 0 });

  const loadLeaderboard = useCallback(async () => {
    if (!user) return;
    setLoadingData(true);

    const analytics = getPerformanceAnalytics(user);

    // Try to sync user and fetch real leaderboard
    if (isSupabaseConfigured()) {
      await syncUserToSupabase({
        id: user.profile.id,
        name: user.profile.name,
        email: user.profile.email,
        avatar_color: user.profile.avatar_color,
        total_points: user.total_points,
        total_questions: analytics.totalQuestions,
        total_correct: analytics.totalCorrect,
        accuracy: analytics.overallAccuracy,
        streak_current: user.streak.current,
        streak_longest: user.streak.longest,
        league: getLeague(user.total_points).id,
        onboarding_completed: user.onboarding?.completed,
        learning_style: user.onboarding?.learning_style,
        experience_level: user.onboarding?.experience_level,
        target_score: user.onboarding?.target_score,
      });

      const real = await getLeaderboard(50);
      if (real.length > 0) {
        const display: DisplayEntry[] = real.map((u) => ({
          rank: u.rank,
          name: u.name,
          avatar: u.name.charAt(0),
          avatar_color: u.avatar_color,
          points: u.total_points,
          accuracy: Math.round(u.accuracy),
          league: u.league,
          isUser: u.id === user.profile.id,
        }));

        // If user not in list, add them
        if (!display.some((e) => e.isUser)) {
          display.push({
            rank: display.length + 1,
            name: user.profile.name,
            avatar: user.profile.name.charAt(0),
            avatar_color: user.profile.avatar_color,
            points: user.total_points,
            accuracy: analytics.overallAccuracy,
            league: getLeague(user.total_points).id,
            isUser: true,
          });
        }

        const userEntry = display.find((e) => e.isUser);
        setUserRankInfo({ rank: userEntry?.rank || 0, total: display.length });
        setEntries(display);
        setIsRealData(true);
        setLoadingData(false);
        return;
      }
    }

    // Fallback: generate simulated leaderboard
    const simNames = ["محمد", "سارة", "عبدالله", "نورة", "فهد", "ريم", "خالد", "هدى", "أحمد", "لمياء"];
    const sim: DisplayEntry[] = simNames.map((name, i) => ({
      rank: i + 1,
      name,
      avatar: name.charAt(0),
      avatar_color: ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"][i % 5],
      points: Math.max(100, 3000 - i * 250 + Math.floor(Math.random() * 200)),
      accuracy: Math.floor(60 + Math.random() * 35),
      league: getLeague(3000 - i * 250).id,
      isUser: false,
    }));
    sim.push({
      rank: 0,
      name: user.profile.name,
      avatar: user.profile.name.charAt(0),
      avatar_color: user.profile.avatar_color,
      points: user.total_points,
      accuracy: analytics.overallAccuracy,
      league: getLeague(user.total_points).id,
      isUser: true,
    });
    sim.sort((a, b) => b.points - a.points);
    sim.forEach((e, i) => { e.rank = i + 1; });
    const userEntry = sim.find((e) => e.isUser);
    setUserRankInfo({ rank: userEntry?.rank || 0, total: sim.length });
    setEntries(sim);
    setIsRealData(false);
    setLoadingData(false);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) loadLeaderboard();
  }, [user, loadLeaderboard]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const currentLeague = getLeague(user.total_points);
  const nextLeague = getNextLeague(user.total_points);
  const leagueProgress = getLeagueProgress(user.total_points);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <a href="/dashboard" className="text-indigo-300 hover:text-white text-sm mb-6 inline-block">→ العودة</a>

        {/* Current League */}
        <div className={`rounded-3xl p-6 border-2 mb-6 bg-gradient-to-l ${currentLeague.gradient} shadow-xl ${currentLeague.glow}`} style={{ borderColor: currentLeague.color + "40" }}>
          <div className="text-center">
            <span className="text-6xl block mb-2">{currentLeague.icon}</span>
            <h1 className="text-3xl font-bold text-white">{currentLeague.nameAr}</h1>
            <p className="text-indigo-300 text-sm">{user.total_points} نقطة</p>
            {userRankInfo.rank > 0 && (
              <p className="text-yellow-400 text-xs mt-1">المركز #{userRankInfo.rank} من {userRankInfo.total} لاعب</p>
            )}
          </div>
          {nextLeague && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-indigo-300 mb-1">
                <span>{currentLeague.nameAr}</span>
                <span>{nextLeague.nameAr} ({nextLeague.minPoints} نقطة)</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3">
                <div className="h-3 rounded-full transition-all" style={{ width: `${leagueProgress}%`, backgroundColor: currentLeague.color }} />
              </div>
              <p className="text-indigo-400 text-xs text-center mt-1">
                {nextLeague.minPoints - user.total_points} نقطة للترقية
              </p>
            </div>
          )}
        </div>

        {/* All Leagues */}
        <div className="flex gap-2 justify-center mb-6">
          {LEAGUES.map((l) => (
            <div key={l.id} className={`text-center p-2 rounded-xl border transition-all ${l.id === currentLeague.id ? "bg-white/10 border-white/20 scale-110" : "bg-white/5 border-white/5 opacity-50"}`}>
              <span className="text-xl">{l.icon}</span>
              <p className="text-[9px] text-indigo-300">{l.nameAr}</p>
            </div>
          ))}
        </div>

        {/* Status badge */}
        <div className="flex justify-center mb-4">
          <span className={`text-xs px-3 py-1 rounded-full ${isRealData ? "bg-green-600/20 text-green-400 border border-green-500/30" : "bg-yellow-600/20 text-yellow-400 border border-yellow-500/30"}`}>
            {loadingData ? "⏳ جارٍ التحميل..." : isRealData ? "🌐 متصدرون حقيقيون" : "🤖 محاكاة"}
          </span>
        </div>

        {/* Leaderboard */}
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-white font-bold text-lg">🏅 لوحة المتصدرين</h2>
            <button onClick={loadLeaderboard} className="text-indigo-400 hover:text-white text-xs transition-colors">🔄 تحديث</button>
          </div>

          {/* Top 3 */}
          {entries.length >= 3 && (
            <div className="flex items-end justify-center gap-3 py-6 bg-white/5">
              {[1, 0, 2].map((orderIdx, i) => {
                const e = entries[orderIdx];
                if (!e) return null;
                const eLeague = getLeague(e.points);
                const topSizes = ["text-2xl", "text-3xl", "text-xl"];
                return (
                  <div key={e.rank} className={`text-center ${i === 1 ? "-mt-4" : ""}`}>
                    <span className={`${topSizes[i]} block mb-1`}>
                      {orderIdx === 0 ? "🥇" : orderIdx === 1 ? "🥈" : "🥉"}
                    </span>
                    <div
                      className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center text-xl font-bold text-white mb-1 border-2 ${e.isUser ? "border-indigo-400" : "border-white/20"}`}
                      style={{ backgroundColor: e.avatar_color }}
                    >
                      {e.avatar}
                    </div>
                    <p className={`text-xs font-bold ${e.isUser ? "text-indigo-300" : "text-white"}`}>
                      {e.name} {e.isUser && "⭐"}
                    </p>
                    <p className="text-yellow-400 text-xs">{e.points}</p>
                    <span className="text-[10px]">{eLeague.icon}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rest of leaderboard */}
          <div className="divide-y divide-white/5">
            {entries.slice(3).map((entry) => {
              const eLeague = getLeague(entry.points);
              return (
                <div key={entry.rank} className={`flex items-center gap-3 px-4 py-3 ${entry.isUser ? "bg-indigo-600/10" : ""}`}>
                  <span className="text-indigo-400 text-sm w-6 text-center font-bold">#{entry.rank}</span>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white ${entry.isUser ? "border border-indigo-400" : ""}`}
                    style={{ backgroundColor: entry.avatar_color }}
                  >
                    {entry.avatar}
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm font-bold ${entry.isUser ? "text-indigo-300" : "text-white"}`}>
                      {entry.name} {entry.isUser && "(أنت)"}
                    </span>
                    <span className="text-indigo-400 text-xs mr-2">{eLeague.icon} {eLeague.nameAr}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-white text-sm font-bold">{entry.points}</p>
                    <p className="text-indigo-400 text-xs">{entry.accuracy}٪</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
