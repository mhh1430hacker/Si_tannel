"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/Notifications";
import { getLeague, getLeagueProgress, getNextLeague } from "@/lib/league-system";

const NAV_GROUPS = [
  {
    title: "الرئيسية",
    items: [
      { href: "/dashboard", icon: "🏠", label: "لوحة التحكم" },
      { href: "/ai-chat", icon: "🤖", label: "المساعد الذكي" },
    ],
  },
  {
    title: "التعلم",
    items: [
      { href: "/exam", icon: "📝", label: "اختبار محاكي" },
      { href: "/practice", icon: "🎯", label: "تدريب حر" },
      { href: "/review", icon: "🔄", label: "مراجعة الأخطاء" },
      { href: "/flashcards", icon: "📇", label: "بطاقات تعليمية" },
      { href: "/study-plan", icon: "📅", label: "خطة دراسية" },
      { href: "/test-lab", icon: "🧪", label: "معمل الاختبار" },
    ],
  },
  {
    title: "المنافسة",
    items: [
      { href: "/challenge", icon: "⚔️", label: "تحدي AI" },
      { href: "/challenge/real", icon: "🎮", label: "تحدي أقران" },
      { href: "/leaderboard", icon: "🏅", label: "المتصدرين" },
      { href: "/rewards", icon: "🎁", label: "الجوائز" },
    ],
  },
  {
    title: "التحليلات",
    items: [
      { href: "/analytics", icon: "📊", label: "تحليل الأداء" },
      { href: "/report", icon: "📋", label: "تقرير شامل" },
      { href: "/brain-map", icon: "🧠", label: "الخريطة الدماغية" },
      { href: "/skill-tree", icon: "🌳", label: "شجرة المهارات" },
      { href: "/mastery-map", icon: "🗺️", label: "خريطة الإتقان" },
    ],
  },
  {
    title: "الحساب",
    items: [
      { href: "/profile", icon: "👤", label: "الملف الشخصي" },
      { href: "/settings", icon: "⚙️", label: "الإعدادات" },
      { href: "/import", icon: "📥", label: "استيراد أسئلة" },
      { href: "/admin", icon: "🛡️", label: "لوحة الإدارة" },
    ],
  },
];

const BOTTOM_NAV = [
  { href: "/dashboard", icon: "🏠", label: "الرئيسية" },
  { href: "/exam", icon: "📝", label: "اختبار" },
  { href: "/challenge", icon: "⚔️", label: "تحدي" },
  { href: "/analytics", icon: "📊", label: "تحليل" },
  { href: "/profile", icon: "👤", label: "حسابي" },
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Skip sidebar for admin page and login page
  if (!user || pathname === "/admin") return <>{children}</>;

  const league = getLeague(user.total_points);
  const nextLeague = getNextLeague(user.total_points);
  const progress = getLeagueProgress(user.total_points);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 h-screen z-50 flex flex-col bg-black/40 backdrop-blur-xl border-l border-white/10 transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        {/* Logo + Close on mobile */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-white/10">
          <a href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            {!collapsed && <span className="text-white font-bold">معمل قدرات</span>}
          </a>
          <div className="flex items-center gap-2">
            {!collapsed && <NotificationBell />}
            <button
              onClick={() => setMobileOpen(false)}
              className="md:hidden text-indigo-300 hover:text-white p-1 text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* User + League */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-white/5">
            <a href="/profile" className="flex items-center gap-2 group">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ring-2 ring-white/20 group-hover:ring-indigo-500/50 transition-all"
                style={{ backgroundColor: user.profile.avatar_color }}
              >
                {user.profile.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{user.profile.name}</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs">{league.icon}</span>
                  <span className="text-indigo-400 text-[10px]">{league.nameAr}</span>
                </div>
              </div>
            </a>
            {nextLeague && (
              <div className="mt-2">
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: league.color }} />
                </div>
                <p className="text-indigo-500 text-[9px] mt-0.5">{user.total_points} / {nextLeague.minPoints} نقطة</p>
              </div>
            )}
          </div>
        )}

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-2">
              {!collapsed && (
                <p className="text-indigo-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1">{group.title}</p>
              )}
              {collapsed && <div className="border-t border-white/5 my-1" />}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        active
                          ? "bg-indigo-600/30 text-white border border-indigo-500/20"
                          : "text-indigo-300 hover:bg-white/5 hover:text-white border border-transparent"
                      }`}
                    >
                      <span className="text-base shrink-0">{item.icon}</span>
                      {!collapsed && <span className="text-xs">{item.label}</span>}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-2 space-y-0.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center gap-2.5 px-3 py-2 text-indigo-400 hover:text-white text-sm rounded-lg hover:bg-white/5 transition-all"
          >
            <span className="text-base">{collapsed ? "→" : "←"}</span>
            {!collapsed && <span className="text-xs">طي القائمة</span>}
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-red-400 hover:text-red-300 text-sm rounded-lg hover:bg-red-600/10 transition-all"
          >
            <span className="text-base">🚪</span>
            {!collapsed && <span className="text-xs">تسجيل خروج</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden bg-black/30 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-white text-xl p-2 -m-1">☰</button>
          <a href="/dashboard" className="text-white font-bold flex items-center gap-2">
            <span>🧠</span>
            <span className="text-sm">معمل قدرات</span>
          </a>
          <NotificationBell />
        </header>
        <main className="min-h-screen pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-40 pb-safe">
          <div className="flex items-center justify-around px-1 py-1">
            {BOTTOM_NAV.map((item) => {
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0 ${
                    active
                      ? "text-indigo-400 bg-indigo-600/20"
                      : "text-indigo-400/60 hover:text-white"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-[9px] font-medium truncate">{item.label}</span>
                </a>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
