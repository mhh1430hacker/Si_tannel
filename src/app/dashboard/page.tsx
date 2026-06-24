"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics } from "@/lib/user-store";
import { getDailyMotivation } from "@/lib/ai-tutor";
import { getLeague, getLeagueProgress, getNextLeague } from "@/lib/league-system";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { Play, Sparkles, Trophy, BrainCircuit, Target, Flame, ArrowLeft, Activity, CalendarDays, Clock, Swords, AlertCircle, Layers, Map } from "lucide-react";
import { motion } from "framer-motion";

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
    return <LoadingSkeleton />;
  }

  const analytics = getPerformanceAnalytics(user);
  const motivation = getDailyMotivation(user);
  const league = getLeague(user.total_points);
  const nextLeague = getNextLeague(user.total_points);
  const leagueProgress = getLeagueProgress(user.total_points);
  const onboardingDone = user.onboarding?.completed;

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="p-4 md:p-8 lg:p-10 max-w-5xl mx-auto">
      <motion.main
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* Header / Welcome Area */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-xs font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>أينكس للقدرات - لوحة القيادة</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">مرحباً بعودتك، {user.profile.name} 👋</h1>
            <p className="text-indigo-300/80 mt-2 text-lg max-w-2xl">{motivation}</p>
          </div>

          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 shrink-0">
             <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
               <Flame className="w-6 h-6 text-orange-500" />
             </div>
             <div>
               <p className="text-gray-400 text-xs">سلسلة الأيام</p>
               <p className="text-white font-bold text-xl">{user.streak.current} <span className="text-sm font-normal text-gray-500">أيام</span></p>
             </div>
          </div>
        </motion.div>

        {/* Onboarding reminder */}
        {!onboardingDone && (
          <motion.a variants={item} href="/onboarding" className="block relative overflow-hidden bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-3xl p-5 md:p-6 border border-amber-500/20 hover:border-amber-500/40 transition-all group">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">تخصيص الخطة الدراسية</h3>
                  <p className="text-amber-200/70 text-sm">أكمل الاستبيان السريع لنجعل الذكاء الاصطناعي يبني خطتك.</p>
                </div>
              </div>
              <span className="inline-flex items-center justify-center px-6 py-2.5 bg-amber-500 text-black font-bold rounded-xl text-sm group-hover:bg-amber-400 transition-colors">
                ابدأ الآن
              </span>
            </div>
          </motion.a>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Action Area (Left/Main col on desktop) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Primary Action Card */}
            <motion.div variants={item} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-1 group cursor-pointer shadow-2xl shadow-indigo-500/20" onClick={() => router.push("/practice")}>
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05] mix-blend-overlay"></div>
              <div className="relative z-10 bg-[#0B0C10]/20 backdrop-blur-sm rounded-[22px] p-6 md:p-8 h-full flex items-center justify-between transition-colors group-hover:bg-[#0B0C10]/10">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium mb-4 backdrop-blur-md">
                    <BrainCircuit className="w-3.5 h-3.5" /> مسار الذكاء الاصطناعي
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-2">استكمال التدريب المخصص</h2>
                  <p className="text-indigo-100/80 text-sm max-w-md">نحن نركز حالياً على تحسين مهاراتك في &quot;الجبر&quot; بناءً على أداءك الأخير.</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0">
                  <Play className="w-7 h-7 ml-1" fill="currentColor" />
                </div>
              </div>
            </motion.div>

            {/* Secondary Actions */}
            <motion.div variants={item} className="grid grid-cols-2 gap-4">
              <button
                onClick={() => router.push("/exam")}
                className="group bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl p-5 md:p-6 text-right transition-all flex flex-col justify-between min-h-[140px]"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">اختبار محاكي</h3>
                  <p className="text-gray-400 text-xs mt-1">اختبر قدراتك بوقت محدد</p>
                </div>
              </button>
              <button
                onClick={() => router.push("/challenge")}
                className="group bg-white/5 hover:bg-white/10 border border-white/5 rounded-3xl p-5 md:p-6 text-right transition-all flex flex-col justify-between min-h-[140px]"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">تحدي الأقران</h3>
                  <p className="text-gray-400 text-xs mt-1">نافس وارتقِ بتصنيفك</p>
                </div>
              </button>
            </motion.div>

            {/* Performance Stats Overview */}
            <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "الدقة الكلية", value: `${analytics.overallAccuracy}٪`, icon: <Activity className="w-4 h-4 text-emerald-400" /> },
                { label: "أسئلة محلولة", value: analytics.totalQuestions, icon: <BrainCircuit className="w-4 h-4 text-indigo-400" /> },
                { label: "جلسات تدريب", value: analytics.totalSessions, icon: <CalendarDays className="w-4 h-4 text-blue-400" /> },
                { label: "نقاطك", value: user.total_points, icon: <Sparkles className="w-4 h-4 text-amber-400" /> }
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-2">
                    {stat.icon}
                    <span className="text-gray-400 text-xs font-medium">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              ))}
            </motion.div>

          </div>

          {/* Right Sidebar Area (Desktop) */}
          <div className="space-y-6">

            {/* League progress */}
            <motion.div variants={item} className="bg-white/5 rounded-3xl p-6 border border-white/5 relative overflow-hidden">
              <div className="absolute -right-6 -top-6 text-9xl opacity-5">{league.icon}</div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl shadow-inner border border-white/5">
                    {league.icon}
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs font-medium">الرتبة الحالية</p>
                    <h3 className="text-white font-bold text-lg">{league.nameAr}</h3>
                  </div>
                </div>

                {nextLeague ? (
                  <div>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-indigo-300">{user.total_points} نقطة</span>
                      <span className="text-gray-500">{nextLeague.minPoints} نقطة</span>
                    </div>
                    <div className="w-full bg-[#0B0C10] rounded-full h-2.5 border border-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full relative"
                        style={{ width: `${leagueProgress}%`, backgroundColor: league.color }}
                      >
                         <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full" />
                      </div>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-3">
                      باقي <span className="text-white font-bold">{nextLeague.minPoints - user.total_points}</span> نقطة للوصول إلى {nextLeague.nameAr}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
                      <Trophy className="w-3.5 h-3.5" /> أعلى رتبة
                    </span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Category Mastery */}
            {analytics.totalSessions > 0 && (
              <motion.div variants={item} className="bg-white/5 rounded-3xl p-6 border border-white/5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-white font-bold">إتقان الأقسام</h3>
                  <a href="/analytics" className="text-indigo-400 text-xs hover:text-white transition-colors flex items-center gap-1">
                    التفاصيل <ArrowLeft className="w-3 h-3" />
                  </a>
                </div>
                <div className="space-y-4">
                  {analytics.categoryBreakdown.map((cat) => (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-gray-300 text-sm">{cat.category}</span>
                        <span className={`text-xs font-bold ${cat.accuracy >= 70 ? "text-emerald-400" : cat.accuracy >= 50 ? "text-amber-400" : "text-red-400"}`}>
                          {cat.accuracy}٪
                        </span>
                      </div>
                      <div className="w-full bg-[#0B0C10] rounded-full h-1.5 border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${cat.accuracy >= 70 ? "bg-emerald-500" : cat.accuracy >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${Math.max(cat.accuracy, 2)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Quick Links Menu */}
            <motion.div variants={item} className="bg-white/5 rounded-3xl p-2 border border-white/5 grid grid-cols-2 gap-2">
              {[
                { href: "/review", label: "مراجعة الأخطاء", icon: <AlertCircle className="w-4 h-4 text-red-400" /> },
                { href: "/flashcards", label: "بطاقات الحفظ", icon: <Layers className="w-4 h-4 text-purple-400" /> },
                { href: "/study-plan", label: "الخطة الدراسية", icon: <Map className="w-4 h-4 text-emerald-400" /> },
                { href: "/ai-chat", label: "المساعد الذكي", icon: <BrainCircuit className="w-4 h-4 text-indigo-400" /> },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl hover:bg-white/5 transition-colors text-center group"
                >
                  <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                    {link.icon}
                  </div>
                  <span className="text-gray-400 text-xs font-medium group-hover:text-white transition-colors">{link.label}</span>
                </a>
              ))}
            </motion.div>

          </div>
        </div>
      </motion.main>
    </div>
  );
}
