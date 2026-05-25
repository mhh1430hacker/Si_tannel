"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics } from "@/lib/user-store";

interface StudyTask {
  time: string;
  title: string;
  description: string;
  icon: string;
  duration: string;
  link: string;
  priority: "high" | "medium" | "low";
}

function generateDailyPlan(data: ReturnType<typeof useAuth>["user"]): StudyTask[] {
  if (!data) return [];
  const a = getPerformanceAnalytics(data);
  const tasks: StudyTask[] = [];

  // Morning warm-up
  tasks.push({
    time: "صباحاً",
    title: "إحماء — بطاقات تعليمية",
    description: "راجع ١٠ بطاقات لتنشيط الذاكرة",
    icon: "📇",
    duration: "١٠ دقائق",
    link: "/flashcards",
    priority: "medium",
  });

  // Focus on weak areas
  if (a.weakAreas.length > 0) {
    const weak = a.weakAreas[0];
    tasks.push({
      time: "منتصف الصباح",
      title: `تدريب مركّز: ${weak.category}`,
      description: `دقتك ${weak.accuracy}٪ — حل ١٥ سؤال في وضع التدريب مع قراءة الشروحات`,
      icon: "🎯",
      duration: "٢٥ دقيقة",
      link: "/practice",
      priority: "high",
    });
  } else {
    tasks.push({
      time: "منتصف الصباح",
      title: "تدريب عام",
      description: "حل ١٥ سؤال متنوع في وضع التدريب",
      icon: "🎯",
      duration: "٢٠ دقيقة",
      link: "/practice",
      priority: "medium",
    });
  }

  // Error review
  tasks.push({
    time: "الظهر",
    title: "مراجعة الأخطاء",
    description: "راجع الأسئلة التي أخطأت فيها سابقاً وحاول حلها مجدداً",
    icon: "🔄",
    duration: "١٥ دقيقة",
    link: "/review",
    priority: a.totalQuestions > 10 ? "high" : "low",
  });

  // Exam simulation
  if (a.totalSessions >= 3) {
    tasks.push({
      time: "بعد الظهر",
      title: "اختبار محاكي",
      description: "اختبار بتوقيت حقيقي — ١٠ أسئلة في ١٥ دقيقة",
      icon: "📝",
      duration: "١٥ دقيقة",
      link: "/exam",
      priority: "high",
    });
  }

  // Speed training
  if (a.avgTimePerQuestion > 60) {
    tasks.push({
      time: "العصر",
      title: "تدريب السرعة",
      description: `متوسطك ${a.avgTimePerQuestion} ث/سؤال — جرّب الحل في أقل من ٦٠ ثانية`,
      icon: "⚡",
      duration: "١٠ دقائق",
      link: "/practice",
      priority: "high",
    });
  }

  // Evening review
  tasks.push({
    time: "المساء",
    title: "مراجعة يومية",
    description: "اطّلع على تحليل أدائك وتقدمك اليوم",
    icon: "📊",
    duration: "٥ دقائق",
    link: "/analytics",
    priority: "low",
  });

  // AI chat
  tasks.push({
    time: "قبل النوم",
    title: "استشارة المساعد الذكي",
    description: "اسأل المساعد عن نصائح مخصصة لتحسين أدائك",
    icon: "🤖",
    duration: "٥ دقائق",
    link: "/ai-chat",
    priority: "low",
  });

  return tasks;
}

function generateWeeklyGoals(data: ReturnType<typeof useAuth>["user"]): string[] {
  if (!data) return [];
  const a = getPerformanceAnalytics(data);
  const goals: string[] = [];

  const targetQuestions = Math.max(50, a.totalQuestions + 50);
  goals.push(`حل ${targetQuestions - a.totalQuestions} سؤال جديد هذا الأسبوع`);

  if (a.overallAccuracy < 70) {
    goals.push(`رفع الدقة من ${a.overallAccuracy}٪ إلى ${Math.min(100, a.overallAccuracy + 10)}٪`);
  }

  if (a.avgTimePerQuestion > 60) {
    goals.push(`تقليل متوسط الوقت من ${a.avgTimePerQuestion} إلى ${Math.max(30, a.avgTimePerQuestion - 15)} ثانية`);
  }

  goals.push("الدراسة ٧ أيام متتالية (بناء سلسلة)");

  if (a.weakAreas.length > 0) {
    goals.push(`تحسين ${a.weakAreas[0].category} إلى ${Math.min(100, a.weakAreas[0].accuracy + 20)}٪`);
  }

  goals.push("إكمال ٣ اختبارات محاكية على الأقل");

  return goals;
}

export default function StudyPlanPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    // Load from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("study_plan_completed") || "[]");
      const today = new Date().toDateString();
      const savedDate = localStorage.getItem("study_plan_date");
      if (savedDate === today) {
        setCompletedTasks(new Set(saved));
      }
    } catch { /* ignore */ }
  }, [loading, user, router]);

  function toggleTask(index: number) {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      localStorage.setItem("study_plan_completed", JSON.stringify(Array.from(next)));
      localStorage.setItem("study_plan_date", new Date().toDateString());
      return next;
    });
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const dailyPlan = generateDailyPlan(user);
  const weeklyGoals = generateWeeklyGoals(user);
  const completionRate = dailyPlan.length > 0 ? Math.round((completedTasks.size / dailyPlan.length) * 100) : 0;

  const priorityColors = { high: "border-red-500/30 bg-red-600/10", medium: "border-yellow-500/30 bg-yellow-600/10", low: "border-white/10 bg-white/5" };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <div className="flex items-center justify-between mb-6">
          <a href="/dashboard" className="text-indigo-300 hover:text-white text-sm">→ العودة</a>
          <h1 className="text-xl font-bold text-white">📅 خطة دراسية</h1>
          <span className="text-indigo-300 text-sm">{completionRate}٪</span>
        </div>

        {/* Daily progress */}
        <div className="bg-gradient-to-l from-indigo-600/20 to-purple-600/20 rounded-2xl p-5 border border-indigo-500/20 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-white font-bold">خطة اليوم</h2>
            <span className="text-indigo-300 text-sm">{completedTasks.size}/{dailyPlan.length} مهمة</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${completionRate}%` }} />
          </div>
        </div>

        {/* Daily tasks */}
        <div className="space-y-3 mb-8">
          {dailyPlan.map((task, i) => (
            <div key={i} className={`rounded-xl p-4 border transition-all ${completedTasks.has(i) ? "bg-green-600/10 border-green-500/20 opacity-70" : priorityColors[task.priority]}`}>
              <div className="flex items-start gap-3">
                <button onClick={() => toggleTask(i)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${completedTasks.has(i) ? "border-green-500 bg-green-500 text-white" : "border-white/30 hover:border-indigo-400"}`}>
                  {completedTasks.has(i) && "✓"}
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${completedTasks.has(i) ? "text-green-300 line-through" : "text-white"}`}>
                      {task.icon} {task.title}
                    </span>
                    <span className="text-indigo-400 text-xs">{task.time}</span>
                  </div>
                  <p className="text-indigo-300 text-xs mt-1">{task.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-indigo-400 text-xs">⏱ {task.duration}</span>
                    <a href={task.link} className="text-indigo-400 hover:text-indigo-300 text-xs">ابدأ ←</a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Weekly goals */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h2 className="text-lg font-bold text-white mb-4">🎯 أهداف الأسبوع</h2>
          <div className="space-y-2">
            {weeklyGoals.map((goal, i) => (
              <div key={i} className="flex items-center gap-2 text-indigo-200 text-sm">
                <span className="text-indigo-400">○</span>
                <span>{goal}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
