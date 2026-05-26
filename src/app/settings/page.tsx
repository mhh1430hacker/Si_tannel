"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

const SETTINGS_KEY = "qudrat_settings";

interface AppSettings {
  questionsPerExam: number;
  examTimeMinutes: number;
  showHints: boolean;
  showExplanations: boolean;
  soundEffects: boolean;
  notifications: boolean;
  dailyGoalQuestions: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  questionsPerExam: 20,
  examTimeMinutes: 25,
  showHints: true,
  showExplanations: true,
  soundEffects: false,
  notifications: true,
  dailyGoalQuestions: 10,
};

function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
  } catch { return DEFAULT_SETTINGS; }
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    setSettings(loadSettings());
  }, [loading, user, router]);

  function updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      saveSettings(next);
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function clearAllData() {
    if (confirm("هل أنت متأكد؟ سيتم حذف جميع بياناتك نهائياً!")) {
      localStorage.clear();
      logout();
      router.push("/login");
    }
  }

  function exportData() {
    const data = {
      profile: user?.profile,
      sessions: user?.sessions,
      achievements: user?.achievements,
      points: user?.total_points,
      streak: user?.streak,
      settings,
      exportDate: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qudrat-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">الإعدادات</h1>
          {saved && <span className="text-green-400 text-sm animate-pulse">تم الحفظ</span>}
        </div>

        {/* Exam settings */}
        <Section title="إعدادات الاختبار">
          <NumberSetting label="عدد الأسئلة الافتراضي" value={settings.questionsPerExam} options={[10, 15, 20, 25, 30]} onChange={(v) => updateSetting("questionsPerExam", v)} />
          <NumberSetting label="وقت الاختبار (دقيقة)" value={settings.examTimeMinutes} options={[10, 15, 20, 25, 30, 45]} onChange={(v) => updateSetting("examTimeMinutes", v)} />
        </Section>

        {/* Learning settings */}
        <Section title="إعدادات التعلم">
          <ToggleSetting label="عرض التلميحات" description="إظهار تلميح قبل الإجابة في وضع التدريب" value={settings.showHints} onChange={(v) => updateSetting("showHints", v)} />
          <ToggleSetting label="عرض الشروحات" description="إظهار شرح تفصيلي بعد كل إجابة" value={settings.showExplanations} onChange={(v) => updateSetting("showExplanations", v)} />
          <NumberSetting label="هدف الأسئلة اليومي" value={settings.dailyGoalQuestions} options={[5, 10, 15, 20, 30, 50]} onChange={(v) => updateSetting("dailyGoalQuestions", v)} />
        </Section>

        {/* Notification settings */}
        <Section title="التنبيهات">
          <ToggleSetting label="التنبيهات الذكية" description="تنبيهات لتذكيرك بالدراسة وتحفيزك" value={settings.notifications} onChange={(v) => updateSetting("notifications", v)} />
        </Section>

        {/* Data management */}
        <Section title="إدارة البيانات">
          <div className="space-y-3">
            <button onClick={exportData} className="w-full py-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded-xl text-sm border border-indigo-500/30 transition-all">
              📦 تصدير البيانات (JSON)
            </button>
            <button onClick={clearAllData} className="w-full py-3 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-xl text-sm border border-red-500/30 transition-all">
              🗑️ حذف جميع البيانات
            </button>
          </div>
        </Section>

        {/* About */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mt-6 text-center">
          <p className="text-white font-bold">🧠 معمل قدرات — Ainex</p>
          <p className="text-indigo-400 text-xs mt-1">منصة ذكية للتدريب على اختبارات القدرات</p>
          <p className="text-indigo-500 text-[10px] mt-2">الإصدار ٢.٠</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-4">
      <h2 className="text-white font-bold mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function ToggleSetting({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white text-sm">{label}</p>
        <p className="text-indigo-400 text-xs">{description}</p>
      </div>
      <button onClick={() => onChange(!value)} className={`w-12 h-6 rounded-full transition-all ${value ? "bg-indigo-600" : "bg-white/20"}`}>
        <div className={`w-5 h-5 bg-white rounded-full transition-all transform ${value ? "-translate-x-6" : "-translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function NumberSetting({ label, value, options, onChange }: { label: string; value: number; options: number[]; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="text-white text-sm mb-2">{label}</p>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button key={opt} onClick={() => onChange(opt)} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${value === opt ? "bg-indigo-600 text-white" : "bg-white/10 text-indigo-300 hover:bg-white/20"}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
