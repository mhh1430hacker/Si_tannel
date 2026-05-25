"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics } from "@/lib/user-store";
import { getLeague, getLeagueProgress, getNextLeague } from "@/lib/league-system";
import DonationCTA from "@/components/DonationCTA";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const a = getPerformanceAnalytics(user);
  const league = getLeague(user.total_points);
  const nextLeague = getNextLeague(user.total_points);
  const progress = getLeagueProgress(user.total_points);
  const memberSince = new Date(user.profile.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const predictedScore = a.totalQuestions > 0 ? Math.round(40 + (a.overallAccuracy / 100) * 60) : 0;
  const level = a.totalQuestions >= 200 ? "خبير" : a.totalQuestions >= 100 ? "متقدم" : a.totalQuestions >= 50 ? "متوسط" : a.totalQuestions >= 10 ? "مبتدئ" : "جديد";
  const unlockedCount = user.achievements.filter((x) => x.unlocked).length;
  const ob = user.onboarding;

  const styleMap: Record<string, string> = { visual: "بصري", auditory: "سمعي", reading: "قرائي", kinesthetic: "عملي" };
  const expMap: Record<string, string> = { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" };
  const timeMap: Record<string, string> = { morning: "صباحاً", afternoon: "ظهراً", evening: "مساءً", night: "ليلاً" };

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Hero */}
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-48 h-48 rounded-full -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: league.color + "15" }} />
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-4xl"
                style={{ backgroundColor: user.profile.avatar_color, boxShadow: `0 0 0 4px ${league.color}40` }}
              >
                {user.profile.name.charAt(0)}
              </div>
              <span className="absolute -bottom-1 -left-1 text-2xl">{league.icon}</span>
            </div>
            <div className="text-center md:text-right flex-1">
              <h1 className="text-2xl font-bold text-white">{user.profile.name}</h1>
              <p className="text-indigo-300 text-sm">{user.profile.email}</p>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold border" style={{ backgroundColor: league.color + "15", borderColor: league.color + "30", color: league.color }}>
                  {league.icon} {league.nameAr}
                </span>
                <span className="px-3 py-1 bg-indigo-600/20 rounded-full text-indigo-200 text-xs border border-indigo-500/20">
                  {level}
                </span>
                <span className="px-3 py-1 bg-white/5 rounded-full text-indigo-300 text-xs border border-white/10">
                  منذ {memberSince}
                </span>
              </div>
              {nextLeague && (
                <div className="mt-3 max-w-xs">
                  <div className="flex justify-between text-[10px] text-indigo-400 mb-0.5">
                    <span>{user.total_points} نقطة</span>
                    <span>{nextLeague.icon} {nextLeague.nameAr}: {nextLeague.minPoints}</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: league.color }} />
                  </div>
                </div>
              )}
            </div>
            <a href="/settings" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-indigo-300 rounded-xl text-xs transition-all border border-white/10">
              ⚙️ إعدادات
            </a>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ProfileStat icon="🏆" label="النقاط" value={user.total_points.toString()} color="yellow" />
          <ProfileStat icon="🎯" label="الدقة" value={`${a.overallAccuracy}٪`} color="green" />
          <ProfileStat icon="📝" label="الأسئلة" value={a.totalQuestions.toString()} color="indigo" />
          <ProfileStat icon="🔥" label="أطول سلسلة" value={`${user.streak.longest} يوم`} color="orange" />
          <ProfileStat icon="⏱️" label="وقت الدراسة" value={`${Math.floor(a.studyTimeTotal / 60)} دقيقة`} color="cyan" />
          <ProfileStat icon="📊" label="الدرجة المتوقعة" value={`${predictedScore}/100`} color="purple" />
          <ProfileStat icon="📚" label="الجلسات" value={user.sessions.length.toString()} color="pink" />
          <ProfileStat icon="⭐" label="الإنجازات" value={`${unlockedCount}/${user.achievements.length}`} color="amber" />
        </div>

        {/* Onboarding preferences */}
        {ob?.completed && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">📋 تفضيلاتي</h3>
              <a href="/onboarding" className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors">تعديل ←</a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ob.learning_style && (
                <PrefCard label="أسلوب التعلم" value={styleMap[ob.learning_style] || ob.learning_style} />
              )}
              {ob.experience_level && (
                <PrefCard label="المستوى" value={expMap[ob.experience_level] || ob.experience_level} />
              )}
              {ob.target_score > 0 && (
                <PrefCard label="الهدف" value={`${ob.target_score}/100`} />
              )}
              {ob.study_time && (
                <PrefCard label="وقت الدراسة" value={timeMap[ob.study_time] || ob.study_time} />
              )}
              {ob.session_duration > 0 && (
                <PrefCard label="مدة الجلسة" value={`${ob.session_duration} دقيقة`} />
              )}
              {ob.daily_goal > 0 && (
                <PrefCard label="الهدف اليومي" value={`${ob.daily_goal} سؤال`} />
              )}
            </div>
            {ob.weak_areas && ob.weak_areas.length > 0 && (
              <div className="mt-3">
                <p className="text-indigo-400 text-xs mb-2">نقاط الضعف:</p>
                <div className="flex flex-wrap gap-1.5">
                  {ob.weak_areas.map((area) => (
                    <span key={area} className="px-2 py-1 bg-red-600/15 text-red-300 rounded-lg text-xs border border-red-500/20">{area}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!ob?.completed && (
          <a href="/onboarding" className="block bg-gradient-to-l from-yellow-600/20 to-orange-600/20 rounded-2xl p-5 border border-yellow-500/30 hover:border-yellow-500/50 transition-all">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📋</span>
              <div>
                <h3 className="text-white font-bold">أكمل استبيان التعريف</h3>
                <p className="text-yellow-200/70 text-xs">لتخصيص تجربتك بشكل أفضل</p>
              </div>
            </div>
          </a>
        )}

        {/* Category breakdown */}
        {a.categoryBreakdown.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4">📊 أداء كل قسم</h3>
            <div className="space-y-3">
              {a.categoryBreakdown.map((cat) => (
                <div key={cat.category} className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-bold">{cat.category}</span>
                    <span className={`text-sm font-bold ${cat.accuracy >= 70 ? "text-green-400" : cat.accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}>{cat.accuracy}٪</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all ${cat.accuracy >= 70 ? "bg-green-500" : cat.accuracy >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${cat.accuracy}%` }} />
                  </div>
                  <p className="text-indigo-400 text-xs mt-1">{cat.questions} سؤال • {cat.correct} صحيح</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-white">🏆 الإنجازات</h3>
            <span className="text-indigo-300 text-sm">{unlockedCount}/{user.achievements.length}</span>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {user.achievements.map((ach) => (
              <div key={ach.id} className={`rounded-xl p-3 text-center transition-all ${ach.unlocked ? "bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30" : "bg-white/5 border border-white/5 opacity-30"}`}>
                <span className="text-2xl block">{ach.icon}</span>
                <p className="text-[10px] text-indigo-300 mt-0.5">{ach.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Session history */}
        {user.sessions.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-3">📜 سجل الجلسات ({user.sessions.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...user.sessions].reverse().map((s, i) => {
                const acc = s.total_questions > 0 ? Math.round((s.correct_count / s.total_questions) * 100) : 0;
                return (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span>{s.category.includes("كمي") ? "📐" : s.category.includes("تحدي") ? "⚔️" : "📖"}</span>
                      <div>
                        <span className="text-white text-sm">{s.category}</span>
                        <span className="text-indigo-400 text-xs mr-2">{new Date(s.date).toLocaleDateString("ar-SA")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-300 text-xs">{s.correct_count}/{s.total_questions}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${acc >= 70 ? "text-green-400 bg-green-600/10" : acc >= 50 ? "text-yellow-400 bg-yellow-600/10" : "text-red-400 bg-red-600/10"}`}>{acc}٪</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-3">
          <a href="/analytics" className="bg-white/5 hover:bg-white/10 rounded-xl py-4 text-center border border-white/5 transition-all">
            <span className="text-xl block">📊</span>
            <span className="text-indigo-300 text-xs">تحليلات مفصّلة</span>
          </a>
          <a href="/report" className="bg-white/5 hover:bg-white/10 rounded-xl py-4 text-center border border-white/5 transition-all">
            <span className="text-xl block">📋</span>
            <span className="text-indigo-300 text-xs">تقرير شامل</span>
          </a>
          <a href="/brain-map" className="bg-white/5 hover:bg-white/10 rounded-xl py-4 text-center border border-white/5 transition-all">
            <span className="text-xl block">🧠</span>
            <span className="text-indigo-300 text-xs">الخريطة الدماغية</span>
          </a>
        </div>

        <DonationCTA variant="card" />
      </div>
    </div>
  );
}

function ProfileStat({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    yellow: "from-yellow-600/15 to-yellow-700/5 border-yellow-500/15",
    green: "from-green-600/15 to-green-700/5 border-green-500/15",
    indigo: "from-indigo-600/15 to-indigo-700/5 border-indigo-500/15",
    orange: "from-orange-600/15 to-orange-700/5 border-orange-500/15",
    cyan: "from-cyan-600/15 to-cyan-700/5 border-cyan-500/15",
    purple: "from-purple-600/15 to-purple-700/5 border-purple-500/15",
    pink: "from-pink-600/15 to-pink-700/5 border-pink-500/15",
    amber: "from-amber-600/15 to-amber-700/5 border-amber-500/15",
  };
  return (
    <div className={`bg-gradient-to-bl ${colors[color] || colors.indigo} rounded-xl p-3 border text-center`}>
      <span className="text-lg">{icon}</span>
      <p className="text-lg font-bold text-white mt-0.5">{value}</p>
      <p className="text-indigo-300 text-[10px]">{label}</p>
    </div>
  );
}

function PrefCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 border border-white/5">
      <p className="text-indigo-400 text-[10px]">{label}</p>
      <p className="text-white text-sm font-bold">{value}</p>
    </div>
  );
}
