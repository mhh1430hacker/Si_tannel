"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/Notifications";
import { getLeague } from "@/lib/league-system";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "🏠", label: "الرئيسية" },
  { href: "/challenge", icon: "⚔️", label: "تحدي الأقران" },
  { href: "/exam", icon: "📝", label: "اختبار محاكي" },
  { href: "/practice", icon: "🎯", label: "تدريب" },
  { href: "/review", icon: "🔄", label: "مراجعة الأخطاء" },
  { href: "/leaderboard", icon: "🏅", label: "المتصدرين" },
  { href: "/brain-map", icon: "🧠", label: "الخريطة الدماغية" },
  { href: "/skill-tree", icon: "🌳", label: "شجرة المهارات" },
  { href: "/flashcards", icon: "📇", label: "بطاقات" },
  { href: "/ai-chat", icon: "🤖", label: "المساعد الذكي" },
  { href: "/analytics", icon: "📊", label: "تحليل الأداء" },
  { href: "/report", icon: "📋", label: "تقرير شامل" },
  { href: "/study-plan", icon: "📅", label: "خطة دراسية" },
  { href: "/profile", icon: "👤", label: "الملف الشخصي" },
  { href: "/settings", icon: "⚙️", label: "الإعدادات" },
  { href: "/import", icon: "📥", label: "استيراد أسئلة" },
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 h-screen z-50 flex flex-col bg-black/40 backdrop-blur-xl border-l border-white/10 transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            {!collapsed && <span className="text-white font-bold text-lg">معمل قدرات</span>}
          </div>
          {!collapsed && <NotificationBell />}
        </div>

        {/* User */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: user.profile.avatar_color }}
              >
                {user.profile.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.profile.name}</p>
                <p className="text-indigo-400 text-xs">{getLeague(user.total_points).icon} {user.total_points} نقطة</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active
                    ? "bg-indigo-600/30 text-white border border-indigo-500/30"
                    : "text-indigo-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="text-lg shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </a>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center gap-3 px-3 py-2 text-indigo-400 hover:text-white text-sm rounded-lg hover:bg-white/5 transition-all"
          >
            <span className="text-lg">{collapsed ? "→" : "←"}</span>
            {!collapsed && <span>طي القائمة</span>}
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-400 hover:text-red-300 text-sm rounded-lg hover:bg-red-600/10 transition-all"
          >
            <span className="text-lg">🚪</span>
            {!collapsed && <span>تسجيل خروج</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden bg-black/30 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-white text-xl p-1">☰</button>
          <span className="text-white font-bold">🧠 معمل قدرات</span>
          <NotificationBell />
        </header>
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
