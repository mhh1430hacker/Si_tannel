"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics } from "@/lib/user-store";
import { loadAIState, getAIAnalysis, STATE_LABELS } from "@/lib/ai/engine";

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [aiData, setAiData] = useState<ReturnType<typeof getAIAnalysis> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      const aiState = loadAIState();
      const analytics = getPerformanceAnalytics(user);
      const sessions = analytics.categoryBreakdown.map((c) => ({
        category: c.category,
        total_questions: c.questions,
        correct_count: c.correct,
        total_time_seconds: c.avgTime * c.questions,
        date: new Date().toISOString(),
      }));
      const analysis = getAIAnalysis(aiState, sessions, user.streak?.current || 0);
      setAiData(analysis);
    }
  }, [user, loading]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const a = getPerformanceAnalytics(user);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <main className="max-w-4xl mx-auto space-y-5">
        <h1 className="text-xl font-bold text-white">تحليل الأداء</h1>

        {a.totalSessions === 0 && !aiData?.irtAbility ? (
          <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
            <h2 className="text-xl font-bold text-white mb-2">لا توجد بيانات بعد</h2>
            <p className="text-indigo-300 mb-6">أكمل بعض الأسئلة من التدريب لتظهر التحليلات</p>
            <a href="/practice" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors">
              ابدأ التدريب
            </a>
          </div>
        ) : (
          <>
            {/* AI Score Predictions — 3 models compared */}
            {aiData && (
              <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold text-white mb-4">الدرجة المتوقعة — 3 نماذج ذكاء اصطناعي</h2>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <ScoreCard
                    label="IRT"
                    sublabel="نظرية الاستجابة"
                    score={aiData.predictedScore}
                    confidence={aiData.irtAbility.reliability}
                  />
                  <ScoreCard
                    label="Elo"
                    sublabel="تصنيف ديناميكي"
                    score={aiData.eloQudratScore}
                    confidence={Math.min(0.99, aiData.eloRating > 1000 ? 0.7 : 0.4)}
                  />
                  <ScoreCard
                    label="NN"
                    sublabel="شبكة عصبية"
                    score={aiData.neuralPrediction.predictedScore}
                    confidence={aiData.neuralPrediction.confidence}
                  />
                </div>
                {/* Score distribution */}
                <div>
                  <p className="text-indigo-300/50 text-[10px] mb-2">توزيع احتمالات الدرجة</p>
                  <div className="flex items-end gap-px h-12">
                    {aiData.scoreDistribution.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-indigo-500/60 rounded-t"
                          style={{ height: `${Math.max(2, d.probability * 200)}px` }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[8px] text-indigo-400/40 mt-1">
                    <span>40</span>
                    <span>70</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            )}

            {/* Learning State (HMM) */}
            {aiData && (
              <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold text-white mb-3">حالة التعلم — نموذج ماركوف المخفي</h2>
                <div className="flex items-center gap-4 mb-4">
                  {(["novice", "developing", "proficient", "expert"] as const).map((state) => {
                    const prob = aiData.learningState.stateProbabilities[state];
                    const isCurrent = aiData.learningState.currentState === state;
                    return (
                      <div key={state} className={`flex-1 text-center p-3 rounded-xl transition-all ${isCurrent ? "bg-indigo-600/20 border border-indigo-500/30" : "bg-white/[0.03]"}`}>
                        <p className={`text-xs font-bold ${isCurrent ? "text-indigo-300" : "text-indigo-400/50"}`}>
                          {STATE_LABELS[state]}
                        </p>
                        <p className={`text-lg font-bold ${isCurrent ? "text-white" : "text-indigo-300/30"}`}>
                          {Math.round(prob * 100)}%
                        </p>
                      </div>
                    );
                  })}
                </div>
                {aiData.learningState.transitionLikely && (
                  <p className="text-indigo-300/50 text-xs text-center">
                    الانتقال المتوقع: {STATE_LABELS[aiData.learningState.transitionLikely.from]} → {STATE_LABELS[aiData.learningState.transitionLikely.to]}
                    {" "}(~{aiData.learningState.daysToNextLevel} يوم)
                  </p>
                )}
              </div>
            )}

            {/* BKT Skill Mastery */}
            {aiData && aiData.bktSkills.length > 0 && (
              <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold text-white mb-3">إتقان المهارات — تتبع بايزي</h2>
                <div className="space-y-2">
                  {aiData.bktSkills
                    .sort((a, b) => b.pMastery - a.pMastery)
                    .map((skill) => (
                      <div key={skill.skillId} className="flex items-center gap-3">
                        <span className="text-indigo-200 text-xs w-28 text-right truncate">{skill.skillName}</span>
                        <div className="flex-1 bg-white/5 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              skill.pMastery >= 0.95 ? "bg-green-500" :
                              skill.pMastery >= 0.7 ? "bg-indigo-500" :
                              skill.pMastery >= 0.4 ? "bg-yellow-500" :
                              "bg-red-500"
                            }`}
                            style={{ width: `${Math.round(skill.pMastery * 100)}%` }}
                          />
                        </div>
                        <span className="text-indigo-300/60 text-[10px] w-10 text-left">
                          {Math.round(skill.pMastery * 100)}%
                        </span>
                        {skill.pMastery >= 0.95 && <span className="text-green-400 text-[10px]">متقن</span>}
                      </div>
                    ))}
                </div>
                {aiData.weakestSkill && (
                  <p className="text-amber-300/60 text-xs mt-3">
                    ركّز على: {aiData.weakestSkill.skillName} — الأكثر حاجة للتدريب
                  </p>
                )}
              </div>
            )}

            {/* Student Cluster */}
            {aiData && (
              <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold text-white mb-3">نوع المتعلم — تصنيف K-Means</h2>
                <div className="bg-indigo-600/10 rounded-xl p-4 border border-indigo-500/10 mb-3">
                  <p className="text-indigo-200 font-bold text-sm">{aiData.studentCluster.clusterLabel}</p>
                  <p className="text-indigo-300/60 text-xs mt-1">{aiData.studentCluster.recommendations[0]}</p>
                </div>
                <div className="space-y-1">
                  {aiData.studentCluster.recommendations.slice(1).map((rec, i) => (
                    <p key={i} className="text-indigo-300/50 text-xs">• {rec}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Neural Network Factor Importance */}
            {aiData && aiData.neuralPrediction.topFactors.length > 0 && (
              <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold text-white mb-3">العوامل المؤثرة — تحليل الشبكة العصبية</h2>
                <div className="space-y-2">
                  {aiData.neuralPrediction.topFactors.map((f, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`text-[10px] ${f.direction === "positive" ? "text-green-400" : "text-red-400"}`}>
                        {f.direction === "positive" ? "▲" : "▼"}
                      </span>
                      <span className="text-indigo-200 text-xs flex-1">{f.factor}</span>
                      <div className="w-20 bg-white/5 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${f.direction === "positive" ? "bg-green-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(100, f.impact * 20)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FSRS Review Stats */}
            {aiData && (aiData.fsrsStats.mature > 0 || aiData.fsrsStats.learning > 0) && (
              <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold text-white mb-3">المراجعة المتباعدة — FSRS</h2>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-400">{aiData.fsrsStats.mature}</p>
                    <p className="text-indigo-300/50 text-[10px]">أسئلة مستقرة</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-yellow-400">{aiData.fsrsStats.learning}</p>
                    <p className="text-indigo-300/50 text-[10px]">قيد التعلم</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-indigo-400">{Math.round(aiData.fsrsStats.avgRetention * 100)}%</p>
                    <p className="text-indigo-300/50 text-[10px]">معدل التذكّر</p>
                  </div>
                </div>
                {aiData.workloadForecast.some((w) => w > 0) && (
                  <div>
                    <p className="text-indigo-300/40 text-[10px] mb-1">المراجعة المتوقعة (7 أيام)</p>
                    <div className="flex items-end gap-1 h-8">
                      {aiData.workloadForecast.map((w, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div className="w-full bg-indigo-500/40 rounded-t" style={{ height: `${Math.max(2, (w / Math.max(1, ...aiData.workloadForecast)) * 28)}px` }} />
                          <span className="text-[7px] text-indigo-400/30 mt-0.5">{["اليوم", "غداً", "2", "3", "4", "5", "6"][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard label="إجمالي الأسئلة" value={a.totalQuestions} />
              <StatCard label="الإجابات الصحيحة" value={a.totalCorrect} />
              <StatCard label="الدقة" value={`${a.overallAccuracy}٪`} />
              <StatCard label="متوسط الوقت" value={`${a.avgTimePerQuestion} ث`} />
            </div>

            {/* Category Performance */}
            {a.categoryBreakdown.length > 0 && (
              <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold text-white mb-3">أداء كل قسم</h2>
                <div className="space-y-3">
                  {a.categoryBreakdown.map((cat, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-indigo-200 text-xs">{cat.category}</span>
                        <span className={`text-xs font-bold ${cat.accuracy >= 70 ? "text-green-400" : cat.accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}>{cat.accuracy}٪</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${cat.accuracy >= 70 ? "bg-green-500" : cat.accuracy >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${cat.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trend */}
            {a.recentTrend.length > 0 && (
              <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/10">
                <h2 className="text-sm font-bold text-white mb-3">تطور الأداء</h2>
                <div className="flex items-end gap-1 h-20">
                  {a.recentTrend.map((t, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <span className="text-[8px] text-indigo-300/40 mb-1">{t.accuracy}٪</span>
                      <div
                        className={`w-full rounded-t transition-all ${t.accuracy >= 70 ? "bg-green-500/50" : t.accuracy >= 50 ? "bg-yellow-500/50" : "bg-red-500/50"}`}
                        style={{ height: `${Math.max(4, t.accuracy * 0.6)}px` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Algorithm Legend */}
            <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
              <p className="text-indigo-300/30 text-[10px] text-center mb-2">الخوارزميات المستخدمة</p>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[9px] text-indigo-400/30">
                <span>IRT 3PL</span>
                <span>Bayesian KT</span>
                <span>Elo Rating</span>
                <span>FSRS v4</span>
                <span>K-Means++</span>
                <span>Neural Net</span>
                <span>HMM Baum-Welch</span>
                <span>Collaborative Filter</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ScoreCard({ label, sublabel, score, confidence }: { label: string; sublabel: string; score: number; confidence: number }) {
  return (
    <div className="bg-white/[0.04] rounded-xl p-3 text-center border border-white/5">
      <p className="text-indigo-400/50 text-[10px]">{label}</p>
      <p className="text-2xl font-bold text-white">{score}</p>
      <p className="text-indigo-400/30 text-[8px]">{sublabel}</p>
      <div className="w-full bg-white/5 rounded-full h-0.5 mt-2">
        <div className="bg-indigo-500/50 h-0.5 rounded-full" style={{ width: `${confidence * 100}%` }} />
      </div>
      <p className="text-indigo-400/25 text-[7px] mt-0.5">ثقة: {Math.round(confidence * 100)}%</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white/[0.04] rounded-xl p-3 border border-white/5">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-indigo-300/50 text-[10px]">{label}</p>
    </div>
  );
}
