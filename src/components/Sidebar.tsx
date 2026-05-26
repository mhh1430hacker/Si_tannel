"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/Notifications";
import { getLeague } from "@/lib/league-system";

const NAV_ITEMS = [
  { href: "/dashboard", label: "الرئيسية" },
  { href: "/practice", label: "تدريب" },
  { href: "/exam", label: "اختبار محاكي" },
  { href: "/challenge", label: "تحدي" },
  { href: "/analytics", label: "تحليل الأداء" },
  { href: "/review", label: "مراجعة الأخطاء" },
  { href: "/flashcards", label: "بطاقات تعليمية" },
  { href: "/study-plan", label: "خطة دراسية" },
  { href: "/leaderboard", label: "المتصدرين" },
];

const MORE_ITEMS = [
  { href: "/ai-chat", label: "المساعد الذكي" },
  { href: "/challenge/real", label: "تحدي أقران" },
  { href: "/brain-map", label: "الخريطة الدماغية" },
  { href: "/skill-tree", label: "شجرة المهارات" },
  { href: "/mastery-map", label: "خريطة الإتقان" },
  { href: "/test-lab", label: "معمل الاختبار" },
  { href: "/report", label: "تقرير شامل" },
  { href: "/rewards", label: "الجوائز" },
  { href: "/import", label: "استيراد أسئلة" },
  { href: "/settings", label: "الإعدادات" },
  { href: "/profile", label: "الملف الشخصي" },
];

const BOTTOM_NAV = [
  { href: "/dashboard", label: "الرئيسية" },
  { href: "/practice", label: "تدريب" },
  { href: "/exam", label: "اختبار" },
  { href: "/analytics", label: "تحليل" },
  { href: "/profile", label: "حسابي" },
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const publicPages = ["/", "/login", "/register", "/forgot-password", "/admin"];
  if (!user || publicPages.includes(pathname)) return <>{children}</>;

  const league = getLeague(user.total_points);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  const renderNavLink = (item: { href: string; label: string }, onClick?: () => void) => (
    <a
      key={item.href}
      href={item.href}
      onClick={onClick}
      className={`block px-4 py-2.5 rounded-lg text-sm transition-all ${
        isActive(item.href)
          ? "bg-indigo-600/20 text-white font-medium"
          : "text-indigo-200/80 hover:bg-white/5 hover:text-white"
      }`}
    >
      {item.label}
    </a>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop sidebar */}
      {sidebarVisible && (
        <aside className="hidden md:flex sticky top-0 h-screen z-50 flex-col w-56 bg-black/30 backdrop-blur-xl border-l border-white/5">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
            <a href="/dashboard" className="text-white font-bold text-sm">معمل قدرات</a>
            <NotificationBell />
          </div>

          {/* User */}
          <div className="px-4 py-3 border-b border-white/5">
            <a href="/profile" className="flex items-center gap-2.5 group">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                style={{ backgroundColor: user.profile.avatar_color }}
              >
                {user.profile.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{user.profile.name}</p>
                <p className="text-indigo-400 text-[10px]">{league.icon} {league.nameAr}</p>
              </div>
            </a>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {NAV_ITEMS.map((item) => renderNavLink(item))}

            {/* More toggle */}
            <button
              onClick={() => setShowMore(!showMore)}
              className="w-full text-right px-4 py-2.5 rounded-lg text-sm text-indigo-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {showMore ? "عرض أقل ↑" : "المزيد ↓"}
            </button>

            {showMore && (
              <div className="space-y-0.5 animate-fade-in">
                {MORE_ITEMS.map((item) => renderNavLink(item))}
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="border-t border-white/5 p-2">
            <button
              onClick={() => setSidebarVisible(false)}
              className="w-full px-4 py-2 text-indigo-400/60 hover:text-white text-xs rounded-lg hover:bg-white/5 transition-all text-right"
            >
              إخفاء القائمة
            </button>
            <button
              onClick={logout}
              className="w-full px-4 py-2.5 text-red-400/80 hover:text-red-300 text-xs rounded-lg hover:bg-red-600/10 transition-all text-right"
            >
              تسجيل خروج
            </button>
          </div>
        </aside>
      )}

      {/* Mobile sidebar */}
      {mobileOpen && (
        <aside className="md:hidden fixed top-0 right-0 h-screen z-50 flex flex-col w-64 bg-gray-900/95 backdrop-blur-xl border-l border-white/10 animate-slide-in">
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
            <span className="text-white font-bold text-sm">معمل قدرات</span>
            <button onClick={() => setMobileOpen(false)} className="text-indigo-300 hover:text-white p-2 text-lg">✕</button>
          </div>

          <div className="px-4 py-3 border-b border-white/5">
            <a href="/profile" className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0"
                style={{ backgroundColor: user.profile.avatar_color }}
              >
                {user.profile.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-medium truncate">{user.profile.name}</p>
                <p className="text-indigo-400 text-[10px]">{league.icon} {league.nameAr}</p>
              </div>
            </a>
          </div>

          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {NAV_ITEMS.map((item) => renderNavLink(item, () => setMobileOpen(false)))}

            <button
              onClick={() => setShowMore(!showMore)}
              className="w-full text-right px-4 py-2.5 rounded-lg text-sm text-indigo-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {showMore ? "عرض أقل ↑" : "المزيد ↓"}
            </button>

            {showMore && (
              <div className="space-y-0.5 animate-fade-in">
                {MORE_ITEMS.map((item) => renderNavLink(item, () => setMobileOpen(false)))}
              </div>
            )}
          </nav>

          <div className="border-t border-white/5 p-2">
            <button
              onClick={logout}
              className="w-full px-4 py-2.5 text-red-400/80 hover:text-red-300 text-xs rounded-lg hover:bg-red-600/10 transition-all text-right"
            >
              تسجيل خروج
            </button>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden bg-black/30 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-white text-lg p-1">☰</button>
          <span className="text-white font-bold text-sm">معمل قدرات</span>
          <NotificationBell />
        </header>

        {/* Desktop: show sidebar toggle when hidden */}
        {!sidebarVisible && (
          <button
            onClick={() => setSidebarVisible(true)}
            className="hidden md:flex fixed top-4 right-4 z-50 items-center px-3 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-lg text-indigo-300 hover:text-white hover:bg-black/80 transition-all text-xs"
          >
            القائمة ☰
          </button>
        )}

        <main className="min-h-screen pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/5 z-40 pb-safe">
          <div className="flex items-center justify-around px-2 py-2">
            {BOTTOM_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                  isActive(item.href) ? "text-white" : "text-indigo-300/50"
                }`}
              >
                <span className={`text-xs font-medium ${isActive(item.href) ? "text-white" : ""}`}>{item.label}</span>
              </a>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
