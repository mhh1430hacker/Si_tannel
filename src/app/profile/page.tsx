"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics } from "@/lib/user-store";

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
  const memberSince = new Date(user.profile.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" });
  const predictedScore = a.totalQuestions > 0 ? Math.round(40 + (a.overallAccuracy / 100) * 60) : 0;
  const level = a.totalQuestions >= 200 ? "خبير" : a.totalQuestions >= 100 ? "متقدم" : a.totalQuestions >= 50 ? "متوسط" : a.totalQuestions >= 10 ? "مبتدئ" : "جديد";
  const unlockedCount = user.achievements.filter((x) => x.unlocked).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="flex items-center justify-between mb-6">
          <a href="/dashboard" className="text-indigo-300 hover:text-white text-sm">→ العودة</a>
          <h1 className="text-xl font-bold text-white">👤 الملف الشخصي</h1>
          <div />
        </div>

        {/* Avatar & info */}
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 mb-6 text-center">
          <div
            className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-white font-bold text-4xl mb-4"
            style={{ backgroundColor: user.profile.avatar_color }}
          >
            {user.profile.name.charAt(0)}
          </div>
          <h2 className="text-2xl font-bold text-white">{user.profile.name}</h2>
          <p className="text-indigo-300 text-sm">{user.profile.email}</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="px-3 py-1 bg-indigo-600/30 rounded-full text-indigo-200 text-xs border border-indigo-500/30">
              مستوى: {level}
            </span>
            <span className="px-3 py-1 bg-purple-600/30 rounded-full text-purple-200 text-xs border border-purple-500/30">
              عضو منذ {memberSince}
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <ProfileStat icon="🏆" label="النقاط" value={user.total_points.toString()} />
          <ProfileStat icon="🎯" label="الدقة" value={`${a.overallAccuracy}٪`} />
          <ProfileStat icon="📝" label="الأسئلة" value={a.totalQuestions.toString()} />
          <ProfileStat icon="🔥" label="أطول سلسلة" value={`${user.streak.longest} يوم`} />
          <ProfileStat icon="⏱️" label="وقت الدراسة" value={`${Math.floor(a.studyTimeTotal / 60)} د`} />
          <ProfileStat icon="📊" label="الدرجة المتوقعة" value={`${predictedScore}/١٠٠`} />
        </div>

        {/* Achievements */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">الإنجازات</h3>
            <span className="text-indigo-300 text-sm">{unlockedCount}/{user.achievements.length}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {user.achievements.map((ach) => (
              <div key={ach.id} className={`rounded-lg p-2 text-center transition-all ${ach.unlocked ? "bg-indigo-600/20 border border-indigo-500/30" : "bg-white/5 border border-white/5 opacity-30"}`}>
                <span className="text-2xl block">{ach.icon}</span>
                <p className="text-[9px] text-indigo-300 mt-0.5">{ach.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Session history */}
        {user.sessions.length > 0 && (
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4">سجل الجلسات ({user.sessions.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...user.sessions].reverse().map((s, i) => {
                const acc = s.total_questions > 0 ? Math.round((s.correct_count / s.total_questions) * 100) : 0;
                return (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/5">
                    <div>
                      <span className="text-white text-sm">{s.category}</span>
                      <span className="text-indigo-400 text-xs mr-2">{new Date(s.date).toLocaleDateString("ar-SA")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-indigo-300 text-xs">{s.correct_count}/{s.total_questions}</span>
                      <span className={`text-sm font-bold ${acc >= 70 ? "text-green-400" : acc >= 50 ? "text-yellow-400" : "text-red-400"}`}>{acc}٪</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileStat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
      <span className="text-xl">{icon}</span>
      <p className="text-lg font-bold text-white mt-1">{value}</p>
      <p className="text-indigo-300 text-xs">{label}</p>
    </div>
  );
}
