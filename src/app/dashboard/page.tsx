"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics } from "@/lib/user-store";
import { getDailyMotivation } from "@/lib/ai-tutor";
import { getLeague, getLeagueProgress, getNextLeague } from "@/lib/league-system";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-indigo-300 text-lg">جارٍ التحميل...</div>
      </div>
    );
  }

  const analytics = getPerformanceAnalytics(user);
  const motivation = getDailyMotivation(user);
  const league = getLeague(user.total_points);
  const nextLeague = getNextLeague(user.total_points);
  const leagueProgress = getLeagueProgress(user.total_points);
  const onboardingDone = user.onboarding?.completed;
  const sessionsToday = user.sessions.filter((s) => {
    const d = new Date(s.date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <main className="max-w-3xl mx-auto space-y-6">

        {/* Onboarding reminder */}
        {!onboardingDone && (
          <a href="/onboarding" className="block bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20 hover:border-amber-500/40 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-lg shrink-0">📋</div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">أكمل الاستبيان الشخصي</p>
                <p className="text-amber-200/60 text-xs">حتى نُخصّص تجربتك</p>
              </div>
              <span className="text-amber-400 text-sm">←</span>
            </div>
          </a>
        )}

        {/* Welcome — clean and focused */}
        <div>
          <p className="text-indigo-300 text-sm mb-1">مرحباً {user.profile.name}</p>
          <p className="text-white text-xl font-bold leading-relaxed">{motivation}</p>
        </div>

        {/* Primary CTA — Start Studying */}
        <div className="space-y-3">
          <button
            onClick={() => router.push("/practice")}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl p-5 text-center transition-all active:scale-[0.98]"
          >
            <span className="text-lg font-bold block">ابدأ التدريب</span>
            <span className="text-indigo-200 text-sm">تدريب حر على أسئلة القدرات</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/exam")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl p-4 text-center transition-all active:scale-[0.98]"
            >
              <span className="font-bold block text-sm">اختبار محاكي</span>
              <span className="text-indigo-300 text-xs">اختبار بوقت محدد</span>
            </button>
            <button
              onClick={() => router.push("/challenge")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl p-4 text-center transition-all active:scale-[0.98]"
            >
              <span className="font-bold block text-sm">تحدي</span>
              <span className="text-indigo-300 text-xs">نافس وتعلّم</span>
            </button>
          </div>
        </div>

        {/* Stats — only the important ones */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
            <p className="text-2xl font-bold text-white">{analytics.overallAccuracy}٪</p>
            <p className="text-indigo-300 text-xs mt-1">الدقة</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
            <p className="text-2xl font-bold text-white">{analytics.totalQuestions}</p>
            <p className="text-indigo-300 text-xs mt-1">سؤال محلول</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
            <p className="text-2xl font-bold text-white">{user.streak.current}</p>
            <p className="text-indigo-300 text-xs mt-1">أيام متتالية</p>
          </div>
        </div>

        {/* League progress — compact */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">{league.icon}</span>
              <span className="text-white font-bold text-sm">{league.nameAr}</span>
            </div>
            {nextLeague && (
              <span className="text-indigo-400 text-xs">{nextLeague.minPoints - user.total_points} نقطة لـ{nextLeague.nameAr}</span>
            )}
          </div>
          {nextLeague && (
            <div className="w-full bg-white/10 rounded-full h-2">
              <div className="h-2 rounded-full transition-all" style={{ width: `${leagueProgress}%`, backgroundColor: league.color }} />
            </div>
          )}
        </div>

        {/* Section performance — if has data */}
        {analytics.totalSessions > 0 && (
          <div className="space-y-2">
            <h2 className="text-white font-bold text-sm">أداؤك في الأقسام</h2>
            {analytics.categoryBreakdown.map((cat) => (
              <div key={cat.category} className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white text-sm font-medium">{cat.category}</span>
                  <span className={`text-sm font-bold ${cat.accuracy >= 70 ? "text-green-400" : cat.accuracy >= 50 ? "text-amber-400" : "text-red-400"}`}>{cat.accuracy}٪</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all ${cat.accuracy >= 70 ? "bg-green-500" : cat.accuracy >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${cat.accuracy}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent sessions — compact */}
        {user.sessions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-sm">آخر الجلسات</h2>
              <a href="/analytics" className="text-indigo-400 text-xs hover:text-white transition-colors">عرض الكل ←</a>
            </div>
            {user.sessions.slice(-3).reverse().map((s, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                <div>
                  <span className="text-white text-sm">{s.category}</span>
                  <span className="text-indigo-400 text-xs mr-2">{new Date(s.date).toLocaleDateString("ar-SA")}</span>
                </div>
                <span className={`text-sm font-bold ${
                  (s.correct_count / s.total_questions) >= 0.7 ? "text-green-400" : "text-amber-400"
                }`}>
                  {s.correct_count}/{s.total_questions}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Quick links — minimal */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {[
            { href: "/analytics", label: "تحليلات" },
            { href: "/review", label: "مراجعة" },
            { href: "/flashcards", label: "بطاقات" },
            { href: "/study-plan", label: "خطة" },
          ].map((link) => (
            <a key={link.href} href={link.href} className="bg-white/5 hover:bg-white/10 rounded-xl py-3 text-center border border-white/5 transition-all text-indigo-200 text-xs">
              {link.label}
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
