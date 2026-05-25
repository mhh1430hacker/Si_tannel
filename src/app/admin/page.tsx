"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { QUDRAT_SECTIONS, QudratQuestion } from "@/data/qudrat-questions";
import { getAllUsers, AdminUserData } from "@/lib/supabase-api";

// Admin credentials (hardcoded for now — production should use env vars)
const ADMIN_EMAIL = "admin@ainex.com";
const ADMIN_PASS = "admin123";

type Tab = "overview" | "users" | "questions" | "challenges" | "rewards" | "settings";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  total_points: number;
  total_questions: number;
  accuracy: number;
  league: string;
  last_active: string;
  streak: number;
}

interface PlatformStats {
  totalUsers: number;
  totalQuestions: number;
  totalSessions: number;
  totalChallenges: number;
  avgAccuracy: number;
  activeToday: number;
}

function getStoredUsers(): AdminUser[] {
  if (typeof window === "undefined") return [];
  const keys = Object.keys(localStorage);
  const users: AdminUser[] = [];
  for (const key of keys) {
    if (key === "qudrat_user_data") {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "");
        if (data?.profile) {
          const totalQ = data.sessions?.reduce((s: number, r: { total_questions: number }) => s + r.total_questions, 0) || 0;
          const totalC = data.sessions?.reduce((s: number, r: { correct_count: number }) => s + r.correct_count, 0) || 0;
          users.push({
            id: data.profile.id,
            name: data.profile.name,
            email: data.profile.email,
            total_points: data.total_points || 0,
            total_questions: totalQ,
            accuracy: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0,
            league: data.total_points >= 5000 ? "ماسي" : data.total_points >= 2000 ? "ذهبي" : data.total_points >= 1000 ? "فضي" : "برونزي",
            last_active: data.last_active || "",
            streak: data.streak?.current || 0,
          });
        }
      } catch { /* skip */ }
    }
  }
  return users;
}

function getStats(): PlatformStats {
  const users = getStoredUsers();
  let totalSessions = 0;
  let totalChallenges = 0;
  try {
    const data = JSON.parse(localStorage.getItem("qudrat_user_data") || "{}");
    totalSessions = data.sessions?.length || 0;
    totalChallenges = data.sessions?.filter((s: { category: string }) => s.category?.includes("تحدي"))?.length || 0;
  } catch { /* skip */ }
  const totalQuestions = QUDRAT_SECTIONS.reduce((s, sec) => s + sec.questions.length, 0);
  return {
    totalUsers: users.length,
    totalQuestions,
    totalSessions,
    totalChallenges,
    avgAccuracy: users.length > 0 ? Math.round(users.reduce((s, u) => s + u.accuracy, 0) / users.length) : 0,
    activeToday: users.filter(u => u.last_active && new Date(u.last_active).toDateString() === new Date().toDateString()).length,
  };
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<PlatformStats>({ totalUsers: 0, totalQuestions: 0, totalSessions: 0, totalChallenges: 0, avgAccuracy: 0, activeToday: 0 });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editQuestion, setEditQuestion] = useState<{ sectionIdx: number; questionIdx: number; question: QudratQuestion } | null>(null);
  const [newQuestion, setNewQuestion] = useState(false);
  const [newQ, setNewQ] = useState<{ text: string; choices: string[]; correct_index: number; section: string; difficulty: string; explanation: string }>({
    text: "", choices: ["", "", "", ""], correct_index: 0, section: "kamy", difficulty: "متوسط", explanation: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [questionFilter, setQuestionFilter] = useState("all");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("admin_auth") : null;
    if (saved === "true") setIsAdmin(true);
  }, []);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      setStats(getStats());
      loadAllUsers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function loadAllUsers() {
    setLoadingUsers(true);
    const supabaseUsers = await getAllUsers();
    if (supabaseUsers.length > 0) {
      setSupabaseConnected(true);
      const mapped: AdminUser[] = supabaseUsers.map((u: AdminUserData) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        total_points: u.total_points,
        total_questions: u.total_questions,
        accuracy: Math.round(u.accuracy),
        league: u.league || "bronze",
        last_active: u.last_active || "",
        streak: u.streak_current,
      }));
      setUsers(mapped);
      setStats((prev) => ({
        ...prev,
        totalUsers: mapped.length,
        avgAccuracy: mapped.length > 0 ? Math.round(mapped.reduce((s, u) => s + u.accuracy, 0) / mapped.length) : 0,
        activeToday: mapped.filter(u => u.last_active && new Date(u.last_active).toDateString() === new Date().toDateString()).length,
      }));
    } else {
      setUsers(getStoredUsers());
    }
    setLoadingUsers(false);
  }

  function handleAdminLogin() {
    if (loginEmail === ADMIN_EMAIL && loginPass === ADMIN_PASS) {
      setIsAdmin(true);
      localStorage.setItem("admin_auth", "true");
      setLoginError("");
    } else {
      setLoginError("البريد أو كلمة المرور غير صحيحة");
    }
  }

  function handleAdminLogout() {
    setIsAdmin(false);
    localStorage.removeItem("admin_auth");
  }

  // Admin login screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8">
            <div className="text-center mb-8">
              <span className="text-5xl block mb-3">🛡️</span>
              <h1 className="text-2xl font-bold text-white mb-1">لوحة الإدارة</h1>
              <p className="text-indigo-400 text-sm">تسجيل دخول المسؤول</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-indigo-300 text-xs block mb-1 text-right">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-indigo-400/50 focus:outline-none focus:border-indigo-500 text-right"
                  placeholder="admin@ainex.com"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-indigo-300 text-xs block mb-1 text-right">كلمة المرور</label>
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-indigo-400/50 focus:outline-none focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>
              {loginError && <p className="text-red-400 text-xs text-center">{loginError}</p>}
              <button
                onClick={handleAdminLogin}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-colors"
              >
                تسجيل دخول
              </button>
            </div>

            <p className="text-indigo-500 text-[10px] text-center mt-6">
              هذه اللوحة مخصصة للمسؤولين فقط
            </p>
          </div>
        </div>
      </div>
    );
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "overview", label: "نظرة عامة", icon: "📊" },
    { id: "users", label: "المستخدمون", icon: "👥" },
    { id: "questions", label: "الأسئلة", icon: "📝" },
    { id: "challenges", label: "التحديات", icon: "⚔️" },
    { id: "rewards", label: "الجوائز", icon: "🎁" },
    { id: "settings", label: "الإعدادات", icon: "⚙️" },
  ];

  const allQuestions = QUDRAT_SECTIONS.flatMap((sec, si) =>
    sec.questions.map((q, qi) => ({ ...q, sectionIdx: si, questionIdx: qi, sectionName: sec.section_name }))
  );

  const filteredQuestions = allQuestions.filter(q => {
    if (questionFilter !== "all" && !q.sectionName.includes(questionFilter === "kamy" ? "كمي" : "لفظي")) return false;
    if (searchTerm && !q.text.includes(searchTerm)) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      {/* Top bar */}
      <header className="bg-black/40 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <h1 className="text-white font-bold text-sm sm:text-base">لوحة إدارة معمل قدرات</h1>
            <p className="text-indigo-400 text-[10px]">مرحباً، المسؤول</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/dashboard" className="text-indigo-400 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-all hidden sm:block">
            ← العودة للمنصة
          </a>
          <button onClick={handleAdminLogout} className="text-red-400 hover:text-red-300 text-xs px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-600/10 transition-all">
            خروج
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        {/* Sidebar tabs */}
        <nav className="lg:w-56 lg:min-h-[calc(100vh-52px)] bg-black/20 border-b lg:border-b-0 lg:border-l border-white/10 overflow-x-auto lg:overflow-x-visible">
          <div className="flex lg:flex-col gap-1 p-2 lg:p-3">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all ${
                  tab === t.id
                    ? "bg-indigo-600/30 text-white border border-indigo-500/30"
                    : "text-indigo-300 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
              >
                <span>{t.icon}</span>
                <span className="text-xs">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">📊 نظرة عامة</h2>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                {[
                  { label: "المستخدمون", value: stats.totalUsers, icon: "👥", color: "indigo" },
                  { label: "الأسئلة", value: stats.totalQuestions, icon: "📝", color: "purple" },
                  { label: "الجلسات", value: stats.totalSessions, icon: "📊", color: "blue" },
                  { label: "التحديات", value: stats.totalChallenges, icon: "⚔️", color: "red" },
                  { label: "متوسط الدقة", value: `${stats.avgAccuracy}٪`, icon: "🎯", color: "green" },
                  { label: "نشطون اليوم", value: stats.activeToday, icon: "🔥", color: "orange" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{s.icon}</span>
                      <span className="text-indigo-400 text-[10px]">{s.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <h3 className="text-white font-bold mb-3 text-sm">إجراءات سريعة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                <button onClick={() => setTab("questions")} className="bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 rounded-xl p-4 text-right transition-all">
                  <span className="text-2xl block mb-2">➕</span>
                  <p className="text-white font-bold text-sm">إضافة أسئلة</p>
                  <p className="text-indigo-400 text-xs">أضف أسئلة جديدة لبنك الأسئلة</p>
                </button>
                <button onClick={() => setTab("users")} className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/20 rounded-xl p-4 text-right transition-all">
                  <span className="text-2xl block mb-2">👥</span>
                  <p className="text-white font-bold text-sm">إدارة المستخدمين</p>
                  <p className="text-purple-400 text-xs">عرض وإدارة حسابات المستخدمين</p>
                </button>
                <a href="/import" className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 rounded-xl p-4 text-right transition-all block">
                  <span className="text-2xl block mb-2">📥</span>
                  <p className="text-white font-bold text-sm">استيراد من نموذج</p>
                  <p className="text-blue-400 text-xs">استيراد أسئلة من Google/Microsoft Forms</p>
                </a>
                <button onClick={() => setTab("settings")} className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/20 rounded-xl p-4 text-right transition-all">
                  <span className="text-2xl block mb-2">⚙️</span>
                  <p className="text-white font-bold text-sm">إعدادات المنصة</p>
                  <p className="text-green-400 text-xs">تخصيص إعدادات المنصة</p>
                </button>
              </div>

              {/* Sections breakdown */}
              <h3 className="text-white font-bold mb-3 text-sm">توزيع الأسئلة</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUDRAT_SECTIONS.map((sec) => (
                  <div key={sec.section_id} className="bg-white/5 rounded-2xl p-5 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-bold text-sm">{sec.section_name}</span>
                      <span className="text-indigo-400 text-sm font-bold">{sec.questions.length} سؤال</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${(sec.questions.length / allQuestions.length) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] text-indigo-400">
                      <span>سهل: {sec.questions.filter(q => q.difficulty === "سهل").length}</span>
                      <span>متوسط: {sec.questions.filter(q => q.difficulty === "متوسط" || !q.difficulty).length}</span>
                      <span>صعب: {sec.questions.filter(q => q.difficulty === "صعب").length}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {tab === "users" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">👥 إدارة المستخدمين</h2>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${supabaseConnected ? "bg-green-400" : "bg-yellow-400"}`} />
                  <span className="text-xs text-indigo-400">{supabaseConnected ? "Supabase متصل" : "بيانات محلية"}</span>
                  <button onClick={loadAllUsers} className="text-indigo-400 hover:text-white text-xs bg-white/10 px-2 py-1 rounded-lg">تحديث</button>
                </div>
              </div>

              {loadingUsers ? (
                <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
                  <div className="animate-pulse text-indigo-300">جارٍ تحميل المستخدمين...</div>
                </div>
              ) : users.length === 0 ? (
                <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
                  <span className="text-5xl block mb-4">👥</span>
                  <h3 className="text-white font-bold text-lg mb-2">لا يوجد مستخدمون بعد</h3>
                  <p className="text-indigo-400 text-sm mb-4">المستخدمون المسجلون سيظهرون هنا</p>
                  {!supabaseConnected && (
                    <div className="bg-yellow-600/10 border border-yellow-500/20 rounded-xl p-4 text-right">
                      <p className="text-yellow-300 text-sm font-bold mb-1">تنبيه: Supabase غير مربوط</p>
                      <p className="text-yellow-400/70 text-xs">لعرض المستخدمين يجب ربط قاعدة البيانات وتشغيل SQL Schema. راجع التعليمات أدناه.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((u) => (
                    <div key={u.id} className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600/30 flex items-center justify-center text-white font-bold shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm">{u.name}</p>
                        <p className="text-indigo-400 text-xs">{u.email}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="bg-indigo-600/20 text-indigo-300 px-2 py-1 rounded-lg">{u.total_points} نقطة</span>
                        <span className="bg-purple-600/20 text-purple-300 px-2 py-1 rounded-lg">{u.accuracy}٪ دقة</span>
                        <span className="bg-blue-600/20 text-blue-300 px-2 py-1 rounded-lg">{u.total_questions} سؤال</span>
                        <span className="bg-green-600/20 text-green-300 px-2 py-1 rounded-lg">{u.league}</span>
                        {u.streak > 0 && <span className="bg-orange-600/20 text-orange-300 px-2 py-1 rounded-lg">🔥 {u.streak}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* QUESTIONS TAB */}
          {tab === "questions" && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <h2 className="text-xl font-bold text-white">📝 إدارة الأسئلة</h2>
                <button
                  onClick={() => setNewQuestion(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                >
                  ➕ إضافة سؤال جديد
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="🔍 بحث في الأسئلة..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-indigo-400/50 focus:outline-none focus:border-indigo-500 text-right"
                />
                <div className="flex gap-2">
                  {[
                    { id: "all", label: "الكل" },
                    { id: "kamy", label: "كمي" },
                    { id: "lafzy", label: "لفظي" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setQuestionFilter(f.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        questionFilter === f.id
                          ? "bg-indigo-600 text-white"
                          : "bg-white/10 text-indigo-300 hover:bg-white/20"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-indigo-400 text-xs mb-3">{filteredQuestions.length} سؤال</p>

              {/* New question form */}
              {newQuestion && (
                <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4 sm:p-6 mb-4">
                  <h3 className="text-white font-bold mb-4">إضافة سؤال جديد</h3>
                  <div className="space-y-3">
                    <textarea
                      value={newQ.text}
                      onChange={(e) => setNewQ({ ...newQ, text: e.target.value })}
                      placeholder="نص السؤال..."
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-indigo-400/50 focus:outline-none focus:border-indigo-500 text-right resize-none"
                      rows={3}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {newQ.choices.map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correct"
                            checked={newQ.correct_index === i}
                            onChange={() => setNewQ({ ...newQ, correct_index: i })}
                            className="accent-green-500"
                          />
                          <input
                            value={c}
                            onChange={(e) => {
                              const choices = [...newQ.choices];
                              choices[i] = e.target.value;
                              setNewQ({ ...newQ, choices });
                            }}
                            placeholder={`الخيار ${i + 1}`}
                            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-indigo-400/50 focus:outline-none focus:border-indigo-500 text-right"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={newQ.section}
                        onChange={(e) => setNewQ({ ...newQ, section: e.target.value })}
                        className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      >
                        <option value="kamy">كمي</option>
                        <option value="lafzy">لفظي</option>
                      </select>
                      <select
                        value={newQ.difficulty}
                        onChange={(e) => setNewQ({ ...newQ, difficulty: e.target.value })}
                        className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                      >
                        <option value="سهل">سهل</option>
                        <option value="متوسط">متوسط</option>
                        <option value="صعب">صعب</option>
                      </select>
                    </div>
                    <textarea
                      value={newQ.explanation}
                      onChange={(e) => setNewQ({ ...newQ, explanation: e.target.value })}
                      placeholder="شرح الإجابة (اختياري)..."
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-indigo-400/50 focus:outline-none focus:border-indigo-500 text-right resize-none"
                      rows={2}
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setNewQuestion(false)} className="px-4 py-2 bg-white/10 text-indigo-300 rounded-xl text-sm hover:bg-white/20 transition-colors">
                        إلغاء
                      </button>
                      <button
                        onClick={() => {
                          alert("تم حفظ السؤال! (في الإصدار القادم سيُحفظ في قاعدة البيانات)");
                          setNewQuestion(false);
                        }}
                        disabled={!newQ.text || newQ.choices.some(c => !c)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        حفظ السؤال
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Questions list */}
              <div className="space-y-2">
                {filteredQuestions.slice(0, 50).map((q, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-3 sm:p-4 border border-white/10 hover:border-indigo-500/20 transition-all">
                    <div className="flex items-start gap-3">
                      <span className="text-indigo-500 text-xs font-mono mt-1 shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm leading-relaxed line-clamp-2">{q.text}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[10px] bg-indigo-600/20 text-indigo-300 px-2 py-0.5 rounded-full">{q.sectionName}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            q.difficulty === "سهل" ? "bg-green-600/20 text-green-300" :
                            q.difficulty === "صعب" ? "bg-red-600/20 text-red-300" :
                            "bg-yellow-600/20 text-yellow-300"
                          }`}>{q.difficulty || "متوسط"}</span>
                          <span className="text-[10px] bg-green-600/20 text-green-300 px-2 py-0.5 rounded-full">
                            الإجابة: {q.choices[q.correct_index]?.substring(0, 20)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredQuestions.length > 50 && (
                  <p className="text-indigo-400 text-xs text-center py-4">يُعرض أول 50 سؤال من {filteredQuestions.length}</p>
                )}
              </div>
            </div>
          )}

          {/* CHALLENGES TAB */}
          {tab === "challenges" && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">⚔️ إدارة التحديات</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
                  <span className="text-4xl block mb-2">⚔️</span>
                  <p className="text-3xl font-bold text-white mb-1">{stats.totalChallenges}</p>
                  <p className="text-indigo-400 text-sm">إجمالي التحديات</p>
                </div>
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-center">
                  <span className="text-4xl block mb-2">🤖</span>
                  <p className="text-3xl font-bold text-white mb-1">5</p>
                  <p className="text-indigo-400 text-sm">خصوم AI متاحون</p>
                </div>
              </div>

              <h3 className="text-white font-bold mb-3 text-sm">خصوم AI</h3>
              <div className="space-y-2">
                {[
                  { name: "نورة", difficulty: "مبتدئة", accuracy: "45٪", avatar: "👧" },
                  { name: "فهد", difficulty: "سريع", accuracy: "55٪", avatar: "🧑" },
                  { name: "سارة", difficulty: "ذكية", accuracy: "70٪", avatar: "👩" },
                  { name: "خالد", difficulty: "خبير", accuracy: "82٪", avatar: "👨‍🎓" },
                  { name: "ريم", difficulty: "أسطورية", accuracy: "92٪", avatar: "👩‍💼" },
                ].map((opp) => (
                  <div key={opp.name} className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-3">
                    <span className="text-2xl">{opp.avatar}</span>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{opp.name}</p>
                      <p className="text-indigo-400 text-xs">{opp.difficulty} — دقة {opp.accuracy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REWARDS TAB */}
          {tab === "rewards" && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">🎁 إدارة الجوائز والمكافآت</h2>
              <div className="space-y-3">
                {[
                  { title: "شارة المتميز", icon: "⭐", requirement: "500 نقطة", status: "نشط" },
                  { title: "شارة البطل", icon: "🥈", requirement: "1000 نقطة + فضي", status: "نشط" },
                  { title: "شارة الأسطورة", icon: "🥇", requirement: "2000 نقطة + ذهبي", status: "نشط" },
                  { title: "جائزة الماسي", icon: "💎", requirement: "5000 نقطة + ماسي", status: "نشط" },
                ].map((r) => (
                  <div key={r.title} className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center gap-3">
                    <span className="text-3xl">{r.icon}</span>
                    <div className="flex-1">
                      <p className="text-white font-bold text-sm">{r.title}</p>
                      <p className="text-indigo-400 text-xs">{r.requirement}</p>
                    </div>
                    <span className="text-green-400 text-xs bg-green-600/20 px-2 py-1 rounded-lg">{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {tab === "settings" && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">⚙️ إعدادات المنصة</h2>
              <div className="space-y-4">
                <div className="bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10">
                  <h3 className="text-white font-bold mb-4 text-sm">إعدادات عامة</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-indigo-300 text-xs block mb-1">اسم المنصة</label>
                      <input
                        defaultValue="معمل قدرات — Ainex"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 text-right"
                      />
                    </div>
                    <div>
                      <label className="text-indigo-300 text-xs block mb-1">الإصدار</label>
                      <input
                        defaultValue="3.0"
                        disabled
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-indigo-400 text-sm cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10">
                  <h3 className="text-white font-bold mb-4 text-sm">Supabase</h3>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-3 h-3 rounded-full ${typeof window !== "undefined" && localStorage.getItem("sb-url") ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-indigo-300 text-sm">
                      {typeof window !== "undefined" && localStorage.getItem("sb-url") ? "متصل" : "غير متصل — البيانات محلية فقط"}
                    </span>
                  </div>
                  <p className="text-indigo-500 text-xs">لتفعيل قاعدة البيانات، اربط Supabase من لوحة Vercel</p>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10">
                  <h3 className="text-white font-bold mb-4 text-sm">بيانات الأدمن</h3>
                  <p className="text-indigo-400 text-xs mb-2">البريد: {ADMIN_EMAIL}</p>
                  <p className="text-indigo-500 text-[10px]">لتغيير بيانات الأدمن، عدّل ADMIN_EMAIL و ADMIN_PASS في الكود</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
