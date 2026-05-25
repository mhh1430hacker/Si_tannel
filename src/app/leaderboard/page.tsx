"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { generateLeaderboard, getLeague, getLeagueProgress, getNextLeague, LEAGUES } from "@/lib/league-system";
import { getPerformanceAnalytics } from "@/lib/user-store";

export default function LeaderboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const a = getPerformanceAnalytics(user);
  const currentLeague = getLeague(user.total_points);
  const nextLeague = getNextLeague(user.total_points);
  const leagueProgress = getLeagueProgress(user.total_points);
  const leaderboard = generateLeaderboard(user.profile.name, user.total_points, a.overallAccuracy);

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

        {/* Leaderboard */}
        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-white font-bold text-lg">🏅 لوحة المتصدرين</h2>
          </div>

          {/* Top 3 */}
          <div className="flex items-end justify-center gap-3 py-6 bg-white/5">
            {leaderboard.slice(0, 3).map((entry, i) => {
              const topColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
              const topSizes = ["text-3xl", "text-2xl", "text-xl"];
              const order = [1, 0, 2]; // center=1st, left=2nd, right=3rd
              const e = leaderboard[order[i]];
              if (!e) return null;
              const eLeague = getLeague(e.points);
              return (
                <div key={e.rank} className={`text-center ${i === 1 ? "-mt-4" : ""}`}>
                  <span className={`${topSizes[order[i]]} block mb-1`}>
                    {order[i] === 0 ? "🥇" : order[i] === 1 ? "🥈" : "🥉"}
                  </span>
                  <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center text-xl mb-1 border-2 ${e.isUser ? "bg-indigo-600/40 border-indigo-400" : "bg-white/10 border-white/20"}`}>
                    {e.avatar}
                  </div>
                  <p className={`text-xs font-bold ${e.isUser ? "text-indigo-300" : "text-white"}`}>{e.name}</p>
                  <p className={`text-xs ${topColors[order[i]]}`}>{e.points}</p>
                  <span className="text-[10px]">{eLeague.icon}</span>
                </div>
              );
            })}
          </div>

          {/* Rest of leaderboard */}
          <div className="divide-y divide-white/5">
            {leaderboard.slice(3).map((entry) => {
              const eLeague = getLeague(entry.points);
              return (
                <div key={entry.rank} className={`flex items-center gap-3 px-4 py-3 ${entry.isUser ? "bg-indigo-600/10" : ""}`}>
                  <span className="text-indigo-400 text-sm w-6 text-center font-bold">#{entry.rank}</span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${entry.isUser ? "bg-indigo-600/40 border border-indigo-400" : "bg-white/10"}`}>
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
