"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/Notifications";
import { getLeague } from "@/lib/league-system";
import {
  Home, BookOpen, Clock, Swords, BarChart2, AlertCircle,
  Layers, Map, Trophy, MessageSquare, Brain, Share2,
  MapPin, FlaskConical, FileText, Gift, Download,
  Settings, User, ChevronDown, ChevronUp, LogOut, PanelLeftClose, PanelRightOpen, Menu, X, Sparkles
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "الرئيسية", icon: <Home className="w-4 h-4" /> },
  { href: "/practice", label: "تدريب", icon: <BookOpen className="w-4 h-4" /> },
  { href: "/exam", label: "اختبار محاكي", icon: <Clock className="w-4 h-4" /> },
  { href: "/challenge", label: "تحدي", icon: <Swords className="w-4 h-4" /> },
  { href: "/analytics", label: "تحليل الأداء", icon: <BarChart2 className="w-4 h-4" /> },
  { href: "/review", label: "مراجعة الأخطاء", icon: <AlertCircle className="w-4 h-4" /> },
  { href: "/flashcards", label: "بطاقات تعليمية", icon: <Layers className="w-4 h-4" /> },
  { href: "/study-plan", label: "خطة دراسية", icon: <Map className="w-4 h-4" /> },
  { href: "/leaderboard", label: "المتصدرين", icon: <Trophy className="w-4 h-4" /> },
];

const MORE_ITEMS = [
  { href: "/ai-chat", label: "المساعد الذكي", icon: <MessageSquare className="w-4 h-4" /> },
  { href: "/challenge/real", label: "تحدي أقران", icon: <Swords className="w-4 h-4 text-purple-400" /> },
  { href: "/brain-map", label: "الخريطة الدماغية", icon: <Brain className="w-4 h-4" /> },
  { href: "/skill-tree", label: "شجرة المهارات", icon: <Share2 className="w-4 h-4" /> },
  { href: "/mastery-map", label: "خريطة الإتقان", icon: <MapPin className="w-4 h-4" /> },
  { href: "/test-lab", label: "معمل الاختبار", icon: <FlaskConical className="w-4 h-4" /> },
  { href: "/report", label: "تقرير شامل", icon: <FileText className="w-4 h-4" /> },
  { href: "/rewards", label: "الجوائز", icon: <Gift className="w-4 h-4" /> },
  { href: "/import", label: "استيراد أسئلة", icon: <Download className="w-4 h-4" /> },
  { href: "/settings", label: "الإعدادات", icon: <Settings className="w-4 h-4" /> },
  { href: "/profile", label: "الملف الشخصي", icon: <User className="w-4 h-4" /> },
];

const BOTTOM_NAV = [
  { href: "/dashboard", label: "الرئيسية", icon: <Home className="w-5 h-5" /> },
  { href: "/practice", label: "تدريب", icon: <BookOpen className="w-5 h-5" /> },
  { href: "/exam", label: "اختبار", icon: <Clock className="w-5 h-5" /> },
  { href: "/analytics", label: "تحليل", icon: <BarChart2 className="w-5 h-5" /> },
  { href: "/profile", label: "حسابي", icon: <User className="w-5 h-5" /> },
];

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const publicPages = ["/", "/login", "/register", "/forgot-password", "/admin", "/onboarding"];
  if (!user || publicPages.includes(pathname)) return <>{children}</>;

  const league = getLeague(user.total_points);

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));

  const renderNavLink = (item: { href: string; label: string; icon: React.ReactNode }, onClick?: () => void) => (
    <a
      key={item.href}
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive(item.href)
          ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
          : "text-gray-400 hover:bg-white/5 hover:text-white border border-transparent"
      }`}
    >
      <span className={isActive(item.href) ? "text-indigo-400" : "text-gray-500"}>{item.icon}</span>
      {item.label}
    </a>
  );

  return (
    <div className="min-h-screen bg-[#0B0C10] flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-[#0B0C10]/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop sidebar */}
      {sidebarVisible && (
        <aside className="hidden md:flex sticky top-0 h-screen z-50 flex-col w-64 bg-[#0B0C10]/95 backdrop-blur-xl border-l border-white/5 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
            <a href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold tracking-wide">أينكس</span>
            </a>
            <NotificationBell />
          </div>

          {/* User */}
          <div className="px-4 py-4 border-b border-white/5">
            <a href="/profile" className="flex items-center gap-3 group p-2 rounded-xl hover:bg-white/5 transition-colors">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner"
                style={{ backgroundColor: user.profile.avatar_color }}
              >
                {user.profile.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold truncate group-hover:text-indigo-300 transition-colors">{user.profile.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs">{league.icon}</span>
                  <p className="text-gray-400 text-[11px] truncate">{league.nameAr}</p>
                </div>
              </div>
            </a>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
            {NAV_ITEMS.map((item) => renderNavLink(item))}

            {/* More toggle */}
            <div className="pt-2 mt-2 border-t border-white/5">
              <button
                onClick={() => setShowMore(!showMore)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500"><Layers className="w-4 h-4" /></span>
                  <span>المزيد من الأدوات</span>
                </div>
                {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showMore && (
                <div className="space-y-1 mt-1 pl-2 border-r-2 border-white/5 mr-2 pr-2 animate-fade-in-up">
                  {MORE_ITEMS.map((item) => renderNavLink(item))}
                </div>
              )}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-white/5 p-3 space-y-1 bg-[#0B0C10]">
            <button
              onClick={() => setSidebarVisible(false)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-400 hover:text-white text-sm font-medium rounded-xl hover:bg-white/5 transition-all"
            >
              <PanelLeftClose className="w-4 h-4" />
              <span>إخفاء القائمة</span>
            </button>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400/80 hover:text-red-400 text-sm font-medium rounded-xl hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </aside>
      )}

      {/* Mobile sidebar */}
      {mobileOpen && (
        <aside className="md:hidden fixed top-0 right-0 h-screen z-50 flex flex-col w-72 bg-[#0B0C10] shadow-2xl border-l border-white/10 animate-slide-in">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0B0C10]">
            <a href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold tracking-wide">أينكس</span>
            </a>
            <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 py-4 border-b border-white/5">
            <a href="/profile" className="flex items-center gap-3 group p-2 rounded-xl hover:bg-white/5 transition-colors" onClick={() => setMobileOpen(false)}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner"
                style={{ backgroundColor: user.profile.avatar_color }}
              >
                {user.profile.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-semibold truncate">{user.profile.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-xs">{league.icon}</span>
                  <p className="text-gray-400 text-[11px] truncate">{league.nameAr}</p>
                </div>
              </div>
            </a>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {NAV_ITEMS.map((item) => renderNavLink(item, () => setMobileOpen(false)))}

            <div className="pt-2 mt-2 border-t border-white/5">
              <button
                onClick={() => setShowMore(!showMore)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="text-gray-500"><Layers className="w-4 h-4" /></span>
                  <span>المزيد من الأدوات</span>
                </div>
                {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showMore && (
                <div className="space-y-1 mt-1 pl-2 border-r-2 border-white/5 mr-2 pr-2 animate-fade-in-up">
                  {MORE_ITEMS.map((item) => renderNavLink(item, () => setMobileOpen(false)))}
                </div>
              )}
            </div>
          </nav>

          <div className="border-t border-white/5 p-3 space-y-1 bg-[#0B0C10]">
            <button
              onClick={() => { logout(); setMobileOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-400/80 hover:text-red-400 text-sm font-medium rounded-xl hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل خروج</span>
            </button>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        {/* Mobile header */}
        <header className="md:hidden bg-[#0B0C10]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setMobileOpen(true)} className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-white font-bold text-sm tracking-wide">أينكس</span>
          </div>
          <NotificationBell />
        </header>

        {/* Desktop: show sidebar toggle when hidden */}
        {!sidebarVisible && (
          <button
            onClick={() => setSidebarVisible(true)}
            className="hidden md:flex fixed top-6 right-6 z-50 items-center justify-center w-10 h-10 bg-[#0B0C10]/80 backdrop-blur-xl border border-white/10 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all shadow-lg"
            title="إظهار القائمة"
          >
            <PanelRightOpen className="w-5 h-5" />
          </button>
        )}

        <main className="flex-1 pb-24 md:pb-8 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#0B0C10] to-[#0B0C10] pointer-events-none" />
          <div className="relative z-10 h-full">
            {children}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0B0C10]/90 backdrop-blur-xl border-t border-white/10 z-40 pb-safe px-2 py-1 shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between">
            {BOTTOM_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 ${
                  isActive(item.href) ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive(item.href) ? "bg-indigo-500/10" : "bg-transparent"}`}>
                  {item.icon}
                </div>
                <span className={`text-[10px] font-medium transition-colors ${isActive(item.href) ? "text-indigo-300" : ""}`}>{item.label}</span>
              </a>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
