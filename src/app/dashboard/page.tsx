"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics, getSmartRecommendations } from "@/lib/user-store";
import { analyzeUserPatterns, getDailyMotivation } from "@/lib/ai-tutor";
import type { AiInsight } from "@/lib/ai-tutor";
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950">
        <div className="animate-pulse text-indigo-300 text-lg">جارٍ التحميل...</div>
      </div>
    );
  }

  const analytics = getPerformanceAnalytics(user);
  const recommendations = getSmartRecommendations(user);
  const insights = analyzeUserPatterns(user);
  const motivation = getDailyMotivation(user);
  const unlockedAchievements = user.achievements.filter((a) => a.unlocked);
  const league = getLeague(user.total_points);
  const nextLeague = getNextLeague(user.total_points);
  const leagueProgress = getLeagueProgress(user.total_points);

  const onboardingDone = user.onboarding?.completed;
  const todayStudy = user.study_minutes_today || 0;
  const dailyGoal = user.onboarding?.daily_goal || 20;
  const sessionsToday = user.sessions.filter((s) => {
    const d = new Date(s.date);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="p-4 md:p-6">
      <main className="max-w-6xl mx-auto space-y-5">

        {/* Onboarding reminder */}
        {!onboardingDone && (
          <a href="/onboarding" className="block bg-gradient-to-l from-yellow-600/20 to-orange-600/20 rounded-2xl p-5 border border-yellow-500/30 hover:border-yellow-500/50 transition-all group">
            <div className="flex items-center gap-4">
              <span className="text-4xl group-hover:scale-110 transition-transform">📋</span>
              <div>
                <h2 className="text-white font-bold text-lg">أكمل الاستبيان الشخصي</h2>
                <p className="text-yellow-200/70 text-sm">حتى نُخصّص تجربتك ونفهم أسلوبك في التعلم</p>
              </div>
              <span className="text-yellow-400 mr-auto text-xl">←</span>
            </div>
          </a>
        )}

        {/* Hero — Welcome + League + Streak */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Welcome */}
          <div className="md:col-span-2 bg-gradient-to-l from-indigo-600/20 to-purple-600/20 rounded-2xl p-6 border border-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="relative">
              <p className="text-indigo-300 text-sm mb-1">مرحباً، {user.profile.name} 👋</p>
              <p className="text-white text-lg leading-relaxed mb-3">{motivation}</p>
              <div className="flex flex-wrap gap-2">
                <a href="/exam" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all">📝 اختبار محاكي</a>
                <a href="/practice" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-indigo-200 rounded-xl text-sm font-bold transition-all">🎯 تدريب</a>
                <a href="/challenge" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-indigo-200 rounded-xl text-sm font-bold transition-all">⚔️ تحدي</a>
              </div>
            </div>
          </div>

          {/* League card */}
          <div className={`rounded-2xl p-5 border-2 bg-gradient-to-bl ${league.gradient} ${league.glow}`} style={{ borderColor: league.color + "40" }}>
            <div className="text-center">
              <span className="text-5xl block mb-1">{league.icon}</span>
              <h3 className="text-white font-bold text-lg">{league.nameAr}</h3>
              <p className="text-indigo-300 text-xs">{user.total_points} نقطة</p>
            </div>
            {nextLeague && (
              <div className="mt-3">
                <div className="w-full bg-white/10 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full transition-all" style={{ width: `${leagueProgress}%`, backgroundColor: league.color }} />
                </div>
                <p className="text-indigo-400 text-xs text-center mt-1">{nextLeague.minPoints - user.total_points} نقطة لـ{nextLeague.nameAr}</p>
              </div>
            )}
            <a href="/leaderboard" className="block text-center mt-3 text-xs text-indigo-400 hover:text-white transition-colors">🏅 المتصدرين ←</a>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon="🎯" label="الدقة الكلية" value={`${analytics.overallAccuracy}٪`} color="indigo" />
          <StatCard icon="📝" label="إجمالي الأسئلة" value={analytics.totalQuestions.toString()} color="purple" />
          <StatCard icon="🔥" label="سلسلة الأيام" value={`${user.streak.current}`} color="orange" />
          <StatCard icon="⏱" label="جلسات اليوم" value={sessionsToday.toString()} color="cyan" />
          <StatCard icon="⭐" label="الإنجازات" value={`${unlockedAchievements.length}/${user.achievements.length}`} color="yellow" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/challenge/real", icon: "🎮", label: "تحدي أقران حقيقي", desc: "نافس لاعبين حقيقيين", color: "from-red-600/20 to-orange-600/20 border-red-500/20" },
            { href: "/brain-map", icon: "🧠", label: "الخريطة الدماغية", desc: "اكتشف نقاط قوتك", color: "from-cyan-600/20 to-blue-600/20 border-cyan-500/20" },
            { href: "/skill-tree", icon: "🌳", label: "شجرة المهارات", desc: "طوّر مهاراتك", color: "from-green-600/20 to-emerald-600/20 border-green-500/20" },
            { href: "/rewards", icon: "🎁", label: "الجوائز", desc: "اكسب مكافآت", color: "from-yellow-600/20 to-amber-600/20 border-yellow-500/20" },
          ].map((action) => (
            <a key={action.href} href={action.href} className={`bg-gradient-to-bl ${action.color} rounded-2xl p-4 border hover:scale-[1.02] transition-all group`}>
              <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">{action.icon}</span>
              <h3 className="text-white font-bold text-sm">{action.label}</h3>
              <p className="text-indigo-300 text-xs">{action.desc}</p>
            </a>
          ))}
        </div>

        {/* Two columns: Test sections + AI insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Test */}
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <h2 className="text-lg font-bold text-white mb-3">📚 ابدأ اختبار</h2>
            <div className="space-y-3">
              {categories.length > 0 ? categories.map((cat) => {
                const catAnalytics = analytics.categoryBreakdown.find((c) => c.category === cat);
                return (
                  <button
                    key={cat}
                    onClick={() => router.push(`/test-lab?category=${encodeURIComponent(cat)}`)}
                    className="w-full bg-gradient-to-l from-indigo-600/20 to-purple-600/20 hover:from-indigo-600/40 hover:to-purple-600/40 rounded-xl p-4 border border-indigo-500/15 text-right transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.includes("كمي") ? "📐" : "📖"}</span>
                      <div className="flex-1">
                        <h3 className="text-white font-bold">{cat}</h3>
                        {catAnalytics && (
                          <p className="text-indigo-300 text-xs">{catAnalytics.accuracy}٪ دقة • {catAnalytics.questions} سؤال</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              }) : (
                <div className="space-y-3">
                  <a href="/exam" className="block bg-gradient-to-l from-indigo-600/20 to-purple-600/20 hover:from-indigo-600/40 rounded-xl p-4 border border-indigo-500/15 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📐</span>
                      <div><h3 className="text-white font-bold">كمي — الرياضيات</h3><p className="text-indigo-300 text-xs">جبر، هندسة، إحصاء، أنماط</p></div>
                    </div>
                  </a>
                  <a href="/exam" className="block bg-gradient-to-l from-purple-600/20 to-pink-600/20 hover:from-purple-600/40 rounded-xl p-4 border border-purple-500/15 transition-all">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📖</span>
                      <div><h3 className="text-white font-bold">لفظي — اللغة العربية</h3><p className="text-indigo-300 text-xs">تناظر، إكمال، استيعاب، خطأ سياقي</p></div>
                    </div>
                  </a>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-3">
              <a href="/review" className="flex-1 text-center py-2 bg-white/5 hover:bg-white/10 text-indigo-300 rounded-xl text-xs transition-all">🔄 مراجعة أخطاء</a>
              <a href="/flashcards" className="flex-1 text-center py-2 bg-white/5 hover:bg-white/10 text-indigo-300 rounded-xl text-xs transition-all">📇 بطاقات</a>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white">🤖 تحليل ذكي</h2>
              <a href="/ai-chat" className="text-purple-400 hover:text-purple-300 text-xs transition-colors">محادثة ←</a>
            </div>
            {insights.length > 0 ? (
              <div className="space-y-2">
                {insights.slice(0, 4).map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <span className="text-4xl block mb-2">🤖</span>
                <p className="text-indigo-300 text-sm">ابدأ بحل بعض الأسئلة وسأحلل أداءك!</p>
                <a href="/ai-chat" className="inline-block mt-3 px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 rounded-xl text-sm transition-all">تحدث معي ←</a>
              </div>
            )}
            {recommendations.length > 0 && (
              <div className="mt-3 space-y-1">
                {recommendations.slice(0, 2).map((rec, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-2.5 text-indigo-200 text-xs border border-white/5">💡 {rec}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick links row */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { href: "/analytics", icon: "📊", label: "تحليلات" },
            { href: "/report", icon: "📋", label: "تقرير" },
            { href: "/study-plan", icon: "📅", label: "خطة دراسية" },
            { href: "/profile", icon: "👤", label: "ملفي" },
            { href: "/settings", icon: "⚙️", label: "إعدادات" },
            { href: "/import", icon: "📥", label: "استيراد" },
          ].map((link) => (
            <a key={link.href} href={link.href} className="bg-white/5 hover:bg-white/10 rounded-xl py-3 text-center border border-white/5 hover:border-white/15 transition-all">
              <span className="text-xl block">{link.icon}</span>
              <span className="text-indigo-300 text-xs">{link.label}</span>
            </a>
          ))}
        </div>

        {/* Achievements */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">🏆 الإنجازات</h2>
            <span className="text-indigo-300 text-sm">{unlockedAchievements.length}/{user.achievements.length}</span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {user.achievements.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl p-3 text-center border transition-all ${
                  a.unlocked
                    ? "bg-indigo-600/20 border-indigo-500/30 hover:bg-indigo-600/30"
                    : "bg-white/5 border-white/5 opacity-30"
                }`}
              >
                <span className="text-2xl block mb-1">{a.icon}</span>
                <p className="text-white text-xs font-bold">{a.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        {user.sessions.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <h2 className="text-lg font-bold text-white mb-3">📜 آخر الجلسات</h2>
            <div className="space-y-2">
              {user.sessions.slice(-5).reverse().map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center gap-2">
                    <span>{s.category.includes("كمي") ? "📐" : "📖"}</span>
                    <div>
                      <span className="text-white text-sm font-medium">{s.category}</span>
                      <span className="text-indigo-300 text-xs mr-2">{new Date(s.date).toLocaleDateString("ar-SA")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-200 text-sm">{s.correct_count}/{s.total_questions}</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${
                      (s.correct_count / s.total_questions) >= 0.7 ? "text-green-400 bg-green-600/10" : "text-orange-400 bg-orange-600/10"
                    }`}>
                      {s.total_questions > 0 ? Math.round((s.correct_count / s.total_questions) * 100) : 0}٪
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: "from-indigo-600/20 to-indigo-700/10 border-indigo-500/20",
    purple: "from-purple-600/20 to-purple-700/10 border-purple-500/20",
    orange: "from-orange-600/20 to-orange-700/10 border-orange-500/20",
    yellow: "from-yellow-600/20 to-yellow-700/10 border-yellow-500/20",
    cyan: "from-cyan-600/20 to-cyan-700/10 border-cyan-500/20",
  };
  return (
    <div className={`bg-gradient-to-bl ${colorMap[color] || colorMap.indigo} rounded-xl p-3 border`}>
      <span className="text-xl">{icon}</span>
      <p className="text-xl font-bold text-white mt-1">{value}</p>
      <p className="text-indigo-300 text-[10px]">{label}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: AiInsight }) {
  const typeColors: Record<string, string> = {
    strength: "border-green-500/20 bg-green-600/10",
    weakness: "border-red-500/20 bg-red-600/10",
    tip: "border-blue-500/20 bg-blue-600/10",
    motivation: "border-purple-500/20 bg-purple-600/10",
    warning: "border-orange-500/20 bg-orange-600/10",
  };
  return (
    <div className={`rounded-lg p-3 border ${typeColors[insight.type]}`}>
      <div className="flex items-center gap-2">
        <span>{insight.icon}</span>
        <span className="text-white font-bold text-xs">{insight.title}</span>
      </div>
      <p className="text-indigo-200 text-xs pr-6 mt-0.5">{insight.body}</p>
    </div>
  );
}
