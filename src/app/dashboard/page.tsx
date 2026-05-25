"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics, getSmartRecommendations } from "@/lib/user-store";
import { analyzeUserPatterns, getDailyMotivation } from "@/lib/ai-tutor";
import type { AiInsight } from "@/lib/ai-tutor";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950">
        <div className="animate-pulse text-indigo-300 text-lg">جارٍ التحميل...</div>
      </div>
    );
  }

  if (!user) return null;

  const analytics = getPerformanceAnalytics(user);
  const recommendations = getSmartRecommendations(user);
  const insights = analyzeUserPatterns(user);
  const motivation = getDailyMotivation(user);
  const unlockedAchievements = user.achievements.filter((a) => a.unlocked);

  return (
    <div className="p-4 md:p-8">
      <main className="max-w-5xl mx-auto space-y-6">
        {/* Daily Motivation */}
        <div className="bg-gradient-to-l from-indigo-600/20 to-purple-600/20 rounded-2xl p-5 border border-indigo-500/20">
          <p className="text-indigo-100 text-lg leading-relaxed">{motivation}</p>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="🎯" label="الدقة" value={`${analytics.overallAccuracy}٪`} color="indigo" />
          <StatCard icon="📝" label="الأسئلة" value={analytics.totalQuestions.toString()} color="purple" />
          <StatCard icon="🔥" label="السلسلة" value={`${user.streak.current} يوم`} color="orange" />
          <StatCard icon="🏆" label="النقاط" value={user.total_points.toString()} color="yellow" />
        </div>

        {/* Start Test Section */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">ابدأ اختبار</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((cat) => {
              const catAnalytics = analytics.categoryBreakdown.find((c) => c.category === cat);
              return (
                <button
                  key={cat}
                  onClick={() => router.push(`/test-lab?category=${encodeURIComponent(cat)}`)}
                  className="bg-gradient-to-l from-indigo-600/30 to-purple-600/30 hover:from-indigo-600/50 hover:to-purple-600/50 rounded-xl p-5 border border-indigo-500/20 text-right transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl group-hover:scale-110 transition-transform">
                      {cat.includes("كمي") ? "📐" : "📖"}
                    </span>
                    {catAnalytics && (
                      <span className="text-sm text-indigo-300">{catAnalytics.accuracy}٪ دقة</span>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-lg">{cat}</h3>
                  {catAnalytics && (
                    <p className="text-indigo-300 text-sm mt-1">{catAnalytics.questions} سؤال محلول</p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🤖</span>
              <h2 className="text-xl font-bold text-white">تحليل المساعد الذكي</h2>
            </div>
            <div className="space-y-3">
              {insights.slice(0, 4).map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
            <a href="/ai-chat" className="inline-block mt-4 text-purple-300 hover:text-purple-200 text-sm">
              تحدث مع المساعد الذكي للمزيد ←
            </a>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">💡</span>
              <h2 className="text-xl font-bold text-white">توصيات ذكية</h2>
            </div>
            <div className="space-y-2">
              {recommendations.map((rec, i) => (
                <div key={i} className="bg-white/5 rounded-lg p-3 text-indigo-200 text-sm border border-white/5">
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">الإنجازات</h2>
            <span className="text-indigo-300 text-sm">{unlockedAchievements.length}/{user.achievements.length}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {user.achievements.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl p-3 text-center border transition-all ${
                  a.unlocked
                    ? "bg-indigo-600/20 border-indigo-500/30"
                    : "bg-white/5 border-white/5 opacity-40"
                }`}
              >
                <span className="text-2xl block mb-1">{a.icon}</span>
                <p className="text-white text-xs font-bold">{a.title}</p>
                <p className="text-indigo-300 text-[10px] mt-0.5">{a.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sessions */}
        {user.sessions.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">آخر الجلسات</h2>
            <div className="space-y-2">
              {user.sessions.slice(-5).reverse().map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/5">
                  <div>
                    <span className="text-white text-sm font-medium">{s.category}</span>
                    <span className="text-indigo-300 text-xs mr-3">
                      {new Date(s.date).toLocaleDateString("ar-SA")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-200 text-sm">{s.correct_count}/{s.total_questions}</span>
                    <span className={`text-sm font-bold ${
                      (s.correct_count / s.total_questions) >= 0.7 ? "text-green-400" : "text-orange-400"
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
  };
  return (
    <div className={`bg-gradient-to-bl ${colorMap[color]} rounded-xl p-4 border`}>
      <span className="text-2xl">{icon}</span>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      <p className="text-indigo-300 text-xs">{label}</p>
    </div>
  );
}

function InsightCard({ insight }: { insight: AiInsight }) {
  const typeColors: Record<string, string> = {
    strength: "border-green-500/30 bg-green-600/10",
    weakness: "border-red-500/30 bg-red-600/10",
    tip: "border-blue-500/30 bg-blue-600/10",
    motivation: "border-purple-500/30 bg-purple-600/10",
    warning: "border-orange-500/30 bg-orange-600/10",
  };
  return (
    <div className={`rounded-lg p-4 border ${typeColors[insight.type]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{insight.icon}</span>
        <span className="text-white font-bold text-sm">{insight.title}</span>
      </div>
      <p className="text-indigo-200 text-sm pr-7">{insight.body}</p>
    </div>
  );
}
