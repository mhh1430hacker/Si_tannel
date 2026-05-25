"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics } from "@/lib/user-store";
import { analyzeUserPatterns } from "@/lib/ai-tutor";

export default function ReportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const a = getPerformanceAnalytics(user);
  const insights = analyzeUserPatterns(user);

  // Score prediction
  const predictedScore = a.totalQuestions > 0 ? Math.round(40 + (a.overallAccuracy / 100) * 60) : 0;
  // Speed rating
  const speedRating = a.avgTimePerQuestion <= 30 ? "ممتاز" : a.avgTimePerQuestion <= 60 ? "جيد" : a.avgTimePerQuestion <= 90 ? "متوسط" : "بطيء";
  // Consistency
  const consistencyScore = a.recentTrend.length >= 3 ? (() => {
    const accuracies = a.recentTrend.map((t) => t.accuracy);
    const avg = accuracies.reduce((s, v) => s + v, 0) / accuracies.length;
    const variance = accuracies.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / accuracies.length;
    return Math.max(0, Math.round(100 - Math.sqrt(variance)));
  })() : 0;

  // Error pattern analysis
  const errorPatterns: { type: string; icon: string; description: string; percentage: number }[] = [];
  if (a.totalQuestions > 0) {
    const fastWrong = user.sessions.filter((s) => s.total_time_seconds / s.total_questions < 15 && (s.correct_count / s.total_questions) < 0.5).length;
    const slowWrong = user.sessions.filter((s) => s.total_time_seconds / s.total_questions > 90 && (s.correct_count / s.total_questions) < 0.5).length;
    const totalSessions = user.sessions.length || 1;
    if (fastWrong > 0) {
      errorPatterns.push({ type: "سرعة", icon: "⚡", description: "أخطاء بسبب السرعة — تجيب بسرعة ولكن بدون دقة", percentage: Math.round((fastWrong / totalSessions) * 100) });
    }
    if (slowWrong > 0) {
      errorPatterns.push({ type: "فهم", icon: "🤔", description: "أخطاء بسبب عدم الفهم — تأخذ وقتاً ولكن لا تصل للإجابة الصحيحة", percentage: Math.round((slowWrong / totalSessions) * 100) });
    }
    const careless = user.sessions.filter((s) => {
      const acc = s.correct_count / s.total_questions;
      return acc >= 0.4 && acc < 0.7 && s.total_time_seconds / s.total_questions >= 15 && s.total_time_seconds / s.total_questions <= 60;
    }).length;
    if (careless > 0) {
      errorPatterns.push({ type: "إهمال", icon: "😴", description: "أخطاء بسبب عدم التركيز — الإجابات قريبة من الصحة ولكنها ليست دقيقة", percentage: Math.round((careless / totalSessions) * 100) });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4" id="report-content">
      <div className="max-w-3xl mx-auto pt-8">
        <div className="flex items-center justify-between mb-6">
          <a href="/dashboard" className="text-indigo-300 hover:text-white text-sm">→ العودة</a>
          <h1 className="text-xl font-bold text-white">📋 تقرير الأداء الشامل</h1>
          <span className="text-indigo-400 text-xs">{new Date().toLocaleDateString("ar-SA")}</span>
        </div>

        {a.totalSessions === 0 ? (
          <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
            <span className="text-5xl block mb-4">📋</span>
            <h2 className="text-xl font-bold text-white mb-2">لا توجد بيانات كافية</h2>
            <p className="text-indigo-300 mb-6">أكمل بعض الاختبارات لإنشاء تقرير شامل</p>
            <a href="/exam" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">ابدأ اختبار</a>
          </div>
        ) : (
          <>
            {/* Header card */}
            <div className="bg-gradient-to-l from-indigo-600/30 to-purple-600/30 rounded-2xl p-6 border border-indigo-500/20 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{user.profile.name}</h2>
                  <p className="text-indigo-300 text-sm">تقرير شامل — {a.totalSessions} جلسة • {a.totalQuestions} سؤال</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-white">{predictedScore}</p>
                  <p className="text-xs text-indigo-300">درجة متوقعة / ١٠٠</p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <MetricCard label="الدقة" value={`${a.overallAccuracy}٪`} sub={`${a.totalCorrect}/${a.totalQuestions}`} />
              <MetricCard label="السرعة" value={`${a.avgTimePerQuestion} ث`} sub={speedRating} />
              <MetricCard label="الثبات" value={`${consistencyScore}٪`} sub="ثبات الأداء" />
              <MetricCard label="النقاط" value={user.total_points.toString()} sub={`سلسلة ${user.streak.current} يوم`} />
            </div>

            {/* Category performance */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">أداء كل قسم</h3>
              {a.categoryBreakdown.map((cat, i) => (
                <div key={i} className="mb-4 last:mb-0">
                  <div className="flex justify-between mb-1">
                    <span className="text-white text-sm">{cat.category}</span>
                    <span className={`text-sm font-bold ${cat.accuracy >= 70 ? "text-green-400" : cat.accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}>{cat.accuracy}٪</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3">
                    <div className={`h-3 rounded-full ${cat.accuracy >= 70 ? "bg-green-500" : cat.accuracy >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${cat.accuracy}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-indigo-400 mt-1">
                    <span>{cat.correct}/{cat.questions} صحيحة</span>
                    <span>{cat.avgTime} ث/سؤال</span>
                    <span>{cat.sessions} جلسة</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Error Patterns */}
            {errorPatterns.length > 0 && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
                <h3 className="text-lg font-bold text-white mb-4">🔍 تحليل أنماط الأخطاء</h3>
                <div className="space-y-3">
                  {errorPatterns.map((ep, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-bold text-sm">{ep.icon} أخطاء {ep.type}</span>
                        <span className="text-orange-400 text-sm">{ep.percentage}٪ من الجلسات</span>
                      </div>
                      <p className="text-indigo-300 text-xs">{ep.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Insights */}
            {insights.length > 0 && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
                <h3 className="text-lg font-bold text-white mb-4">🤖 تحليل المساعد الذكي</h3>
                <div className="space-y-2">
                  {insights.slice(0, 5).map((ins, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/5">
                      <span className="text-white text-sm">{ins.icon} <span className="font-bold">{ins.title}</span></span>
                      <p className="text-indigo-300 text-xs mt-1">{ins.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-green-600/10 rounded-2xl p-5 border border-green-500/20">
                <h3 className="text-green-400 font-bold mb-3">💪 نقاط القوة</h3>
                {a.strongAreas.length > 0 ? a.strongAreas.map((s, i) => (
                  <p key={i} className="text-white text-sm mb-1">{s.category}: {s.accuracy}٪</p>
                )) : <p className="text-indigo-300 text-sm">حل المزيد لتظهر</p>}
              </div>
              <div className="bg-red-600/10 rounded-2xl p-5 border border-red-500/20">
                <h3 className="text-red-400 font-bold mb-3">🎯 نقاط الضعف</h3>
                {a.weakAreas.length > 0 ? a.weakAreas.map((w, i) => (
                  <p key={i} className="text-white text-sm mb-1">{w.category}: {w.accuracy}٪</p>
                )) : <p className="text-indigo-300 text-sm">لا توجد نقاط ضعف</p>}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-gradient-to-l from-purple-600/20 to-indigo-600/20 rounded-2xl p-6 border border-purple-500/20 mb-6">
              <h3 className="text-lg font-bold text-white mb-4">📋 التوصيات</h3>
              <div className="space-y-2 text-sm text-indigo-200">
                {a.weakAreas.length > 0 && <p>1. ركّز على: {a.weakAreas.map((w) => w.category).join("، ")}</p>}
                {a.avgTimePerQuestion > 60 && <p>{a.weakAreas.length > 0 ? "2" : "1"}. تدرّب على السرعة — هدفك ٦٠ ثانية/سؤال</p>}
                <p>{(a.weakAreas.length > 0 ? 2 : 1) + (a.avgTimePerQuestion > 60 ? 1 : 0)}. حل ١٠ أسئلة يومياً على الأقل</p>
                <p>{(a.weakAreas.length > 0 ? 3 : 2) + (a.avgTimePerQuestion > 60 ? 1 : 0)}. راجع الأخطاء بانتظام من صفحة المراجعة</p>
              </div>
            </div>

            {/* Trend */}
            {a.recentTrend.length > 1 && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
                <h3 className="text-lg font-bold text-white mb-4">📈 تطور الأداء</h3>
                <div className="flex items-end gap-2 h-24">
                  {a.recentTrend.map((t, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] text-indigo-300 mb-1">{t.accuracy}٪</span>
                      <div
                        className={`w-full rounded-t-lg ${t.accuracy >= 70 ? "bg-green-500/60" : t.accuracy >= 50 ? "bg-yellow-500/60" : "bg-red-500/60"}`}
                        style={{ height: `${Math.max(8, t.accuracy)}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
              <h3 className="text-lg font-bold text-white mb-3">🏆 الإنجازات ({user.achievements.filter((x) => x.unlocked).length}/{user.achievements.length})</h3>
              <div className="grid grid-cols-5 gap-2">
                {user.achievements.map((ach) => (
                  <div key={ach.id} className={`text-center p-2 rounded-lg ${ach.unlocked ? "bg-indigo-600/20" : "bg-white/5 opacity-30"}`}>
                    <span className="text-xl">{ach.icon}</span>
                    <p className="text-[9px] text-indigo-300 mt-0.5">{ach.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-indigo-300 text-xs">{label}</p>
      <p className="text-indigo-400 text-[10px]">{sub}</p>
    </div>
  );
}
