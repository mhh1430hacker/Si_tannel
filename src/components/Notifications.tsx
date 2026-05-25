"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getPerformanceAnalytics } from "@/lib/user-store";

interface Notification {
  id: string;
  icon: string;
  title: string;
  body: string;
  type: "info" | "achievement" | "reminder" | "tip";
  time: string;
}

function generateNotifications(data: ReturnType<typeof useAuth>["user"]): Notification[] {
  if (!data) return [];
  const notifs: Notification[] = [];
  const a = getPerformanceAnalytics(data);
  const now = new Date();
  const hour = now.getHours();

  // Streak reminder
  if (data.streak.current > 0 && data.study_minutes_today === 0) {
    notifs.push({
      id: "streak",
      icon: "🔥",
      title: "لا تكسر السلسلة!",
      body: `لديك سلسلة ${data.streak.current} يوم. ادرس اليوم للحفاظ عليها!`,
      type: "reminder",
      time: "الآن",
    });
  }

  // Morning greeting
  if (hour >= 6 && hour < 12) {
    notifs.push({
      id: "morning",
      icon: "☀️",
      title: "صباح الخير!",
      body: "الصباح أفضل وقت للدراسة — ابدأ بجلسة تدريب قصيرة",
      type: "tip",
      time: "صباحاً",
    });
  }

  // New achievement unlocked recently
  const recentAch = data.achievements.find((ach) => {
    if (!ach.unlocked || !ach.unlocked_at) return false;
    const diff = now.getTime() - new Date(ach.unlocked_at).getTime();
    return diff < 3600000; // within last hour
  });
  if (recentAch) {
    notifs.push({
      id: `ach-${recentAch.id}`,
      icon: recentAch.icon,
      title: "إنجاز جديد!",
      body: `فتحت "${recentAch.title}" — ${recentAch.description}`,
      type: "achievement",
      time: "مؤخراً",
    });
  }

  // Performance milestone
  if (a.totalQuestions > 0 && a.totalQuestions % 50 === 0) {
    notifs.push({
      id: `milestone-${a.totalQuestions}`,
      icon: "🎯",
      title: `${a.totalQuestions} سؤال!`,
      body: "وصلت لمرحلة جديدة! استمر بهذا الإيقاع الرائع",
      type: "info",
      time: "مؤخراً",
    });
  }

  // Weak area alert
  if (a.weakAreas.length > 0) {
    const weakest = a.weakAreas[0];
    notifs.push({
      id: "weak-area",
      icon: "📌",
      title: `تحتاج تركيز: ${weakest.category}`,
      body: `دقتك ${weakest.accuracy}٪ فقط. جرّب التدريب المركّز`,
      type: "tip",
      time: "تذكير",
    });
  }

  return notifs;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      setNotifications(generateNotifications(user));
    }
  }, [user]);

  const activeNotifs = notifications.filter((n) => !dismissed.has(n.id));

  if (!user) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-indigo-300 hover:text-white transition-colors">
        <span className="text-lg">🔔</span>
        {activeNotifs.length > 0 && (
          <span className="absolute -top-0.5 -left-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center">
            {activeNotifs.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-2 w-80 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="p-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-white font-bold text-sm">التنبيهات</span>
              {activeNotifs.length > 0 && (
                <button onClick={() => setDismissed(new Set(notifications.map((n) => n.id)))} className="text-indigo-400 text-xs hover:text-indigo-300">
                  مسح الكل
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {activeNotifs.length === 0 ? (
                <div className="p-6 text-center text-indigo-400 text-sm">لا توجد تنبيهات</div>
              ) : (
                activeNotifs.map((notif) => {
                  const typeColors = {
                    info: "border-r-blue-500",
                    achievement: "border-r-yellow-500",
                    reminder: "border-r-red-500",
                    tip: "border-r-green-500",
                  };
                  return (
                    <div
                      key={notif.id}
                      className={`p-3 border-b border-white/5 border-r-2 ${typeColors[notif.type]} hover:bg-white/5 transition-colors`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{notif.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-white text-xs font-bold">{notif.title}</span>
                            <span className="text-indigo-500 text-[10px]">{notif.time}</span>
                          </div>
                          <p className="text-indigo-300 text-[11px] mt-0.5">{notif.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
