"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics } from "@/lib/user-store";

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950">
        <div className="animate-pulse text-indigo-300">جارٍ التحميل...</div>
      </div>
    );
  }

  const a = getPerformanceAnalytics(user);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950">
      <header className="bg-black/20 backdrop-blur border-b border-white/10 px-4 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-indigo-300 hover:text-white transition-colors">→</a>
        <h1 className="text-xl font-bold text-white">📊 تحليل الأداء</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {a.totalSessions === 0 ? (
          <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
            <span className="text-5xl block mb-4">📊</span>
            <h2 className="text-xl font-bold text-white mb-2">لا توجد بيانات بعد</h2>
            <p className="text-indigo-300 mb-6">أكمل بعض الاختبارات لتظهر التحليلات هنا</p>
            <a href="/dashboard" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors">
              العودة للوحة التحكم
            </a>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <OverviewCard label="إجمالي الأسئلة" value={a.totalQuestions} color="indigo" />
              <OverviewCard label="الإجابات الصحيحة" value={a.totalCorrect} color="green" />
              <OverviewCard label="الدقة الإجمالية" value={`${a.overallAccuracy}٪`} color="purple" />
              <OverviewCard label="متوسط الوقت" value={`${a.avgTimePerQuestion} ث`} color="teal" />
            </div>

            {/* Category Performance */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-4">أداء كل قسم</h2>
              <div className="space-y-4">
                {a.categoryBreakdown.map((cat, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.category.includes("كمي") ? "📐" : "📖"}</span>
                        <span className="text-white font-bold">{cat.category}</span>
                      </div>
                      <span className={`text-lg font-bold ${
                        cat.accuracy >= 70 ? "text-green-400" : cat.accuracy >= 50 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {cat.accuracy}٪
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-white/10 rounded-full h-3 mb-2">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          cat.accuracy >= 70 ? "bg-green-500" : cat.accuracy >= 50 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${cat.accuracy}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-indigo-300">
                      <span>{cat.correct}/{cat.questions} صحيحة</span>
                      <span>متوسط {cat.avgTime} ثانية</span>
                      <span>{cat.sessions} جلسة</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-bold text-green-400 mb-3">💪 نقاط القوة</h2>
                {a.strongAreas.length > 0 ? (
                  <div className="space-y-2">
                    {a.strongAreas.map((s, i) => (
                      <div key={i} className="bg-green-600/10 border border-green-500/20 rounded-lg p-3">
                        <span className="text-white text-sm font-medium">{s.category}</span>
                        <span className="text-green-400 text-sm mr-2">{s.accuracy}٪</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-indigo-300 text-sm">حل المزيد من الأسئلة لتظهر نقاط القوة</p>
                )}
              </div>
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-bold text-red-400 mb-3">🎯 نقاط الضعف</h2>
                {a.weakAreas.length > 0 ? (
                  <div className="space-y-2">
                    {a.weakAreas.map((w, i) => (
                      <div key={i} className="bg-red-600/10 border border-red-500/20 rounded-lg p-3">
                        <span className="text-white text-sm font-medium">{w.category}</span>
                        <span className="text-red-400 text-sm mr-2">{w.accuracy}٪</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-indigo-300 text-sm">لا توجد نقاط ضعف واضحة — استمر!</p>
                )}
              </div>
            </div>

            {/* Recent Trend */}
            {a.recentTrend.length > 0 && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h2 className="text-lg font-bold text-white mb-4">📈 تطور الأداء</h2>
                <div className="flex items-end gap-2 h-32">
                  {a.recentTrend.map((t, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-indigo-300 mb-1">{t.accuracy}٪</span>
                      <div
                        className={`w-full rounded-t-lg transition-all ${
                          t.accuracy >= 70 ? "bg-green-500/60" : t.accuracy >= 50 ? "bg-yellow-500/60" : "bg-red-500/60"
                        }`}
                        style={{ height: `${Math.max(8, t.accuracy)}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Study Time */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h2 className="text-lg font-bold text-white mb-2">⏱️ وقت الدراسة</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-teal-400">{Math.floor(a.studyTimeTotal / 60)}</p>
                  <p className="text-xs text-indigo-300">دقيقة إجمالاً</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">{a.totalSessions}</p>
                  <p className="text-xs text-indigo-300">جلسة دراسية</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-400">{a.avgTimePerQuestion}</p>
                  <p className="text-xs text-indigo-300">ثانية/سؤال</p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function OverviewCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    indigo: "from-indigo-600/20 border-indigo-500/20",
    green: "from-green-600/20 border-green-500/20",
    purple: "from-purple-600/20 border-purple-500/20",
    teal: "from-teal-600/20 border-teal-500/20",
  };
  return (
    <div className={`bg-gradient-to-bl ${colors[color]} to-transparent rounded-xl p-4 border`}>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-indigo-300 text-xs mt-1">{label}</p>
    </div>
  );
}
