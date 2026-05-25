"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics } from "@/lib/user-store";

interface Skill {
  id: string;
  name: string;
  icon: string;
  description: string;
  xpRequired: number;
  tier: number; // 0=root, 1=branch, 2=leaf
  children: string[];
  category: "core" | "kamy" | "lafzy" | "mastery";
}

const SKILLS: Skill[] = [
  // Tier 0 — Root
  { id: "start", name: "البداية", icon: "🌱", description: "سجّل في المنصة وابدأ رحلتك", xpRequired: 0, tier: 0, children: ["first_quiz", "first_practice"], category: "core" },

  // Tier 1 — First steps
  { id: "first_quiz", name: "أول اختبار", icon: "📝", description: "أكمل أول اختبار محاكي", xpRequired: 50, tier: 1, children: ["quiz_5", "kamy_basics"], category: "core" },
  { id: "first_practice", name: "أول تدريب", icon: "🎯", description: "أكمل جلسة تدريب واحدة", xpRequired: 50, tier: 1, children: ["practice_10", "lafzy_basics"], category: "core" },

  // Tier 2 — Kamy branch
  { id: "kamy_basics", name: "أساسيات الكمي", icon: "📐", description: "أجب على ١٠ أسئلة كمية صحيحة", xpRequired: 150, tier: 2, children: ["kamy_50", "speed_kamy"], category: "kamy" },
  { id: "kamy_50", name: "خبير الكمي", icon: "🔢", description: "أجب على ٥٠ سؤال كمي صحيح", xpRequired: 500, tier: 2, children: ["kamy_master"], category: "kamy" },
  { id: "speed_kamy", name: "سريع الحساب", icon: "⚡", description: "أجب على ٥ أسئلة كمية في أقل من ١٥ ثانية", xpRequired: 300, tier: 2, children: ["kamy_master"], category: "kamy" },
  { id: "kamy_master", name: "إتقان الكمي", icon: "👑", description: "دقة ٨٠٪+ في القسم الكمي", xpRequired: 1000, tier: 2, children: [], category: "kamy" },

  // Tier 2 — Lafzy branch
  { id: "lafzy_basics", name: "أساسيات اللفظي", icon: "📖", description: "أجب على ١٠ أسئلة لفظية صحيحة", xpRequired: 150, tier: 2, children: ["lafzy_50", "analogy_pro"], category: "lafzy" },
  { id: "lafzy_50", name: "خبير اللفظي", icon: "📚", description: "أجب على ٥٠ سؤال لفظي صحيح", xpRequired: 500, tier: 2, children: ["lafzy_master"], category: "lafzy" },
  { id: "analogy_pro", name: "ملك التناظر", icon: "🔗", description: "أجب على ١٠ أسئلة تناظر صحيحة متتالية", xpRequired: 400, tier: 2, children: ["lafzy_master"], category: "lafzy" },
  { id: "lafzy_master", name: "إتقان اللفظي", icon: "👑", description: "دقة ٨٠٪+ في القسم اللفظي", xpRequired: 1000, tier: 2, children: [], category: "lafzy" },

  // Tier 2 — Core progression
  { id: "quiz_5", name: "مثابر", icon: "💪", description: "أكمل ٥ اختبارات محاكية", xpRequired: 250, tier: 2, children: ["quiz_20", "challenger"], category: "core" },
  { id: "practice_10", name: "متدرب", icon: "🏋️", description: "أكمل ١٠ جلسات تدريب", xpRequired: 300, tier: 2, children: ["streak_7"], category: "core" },
  { id: "quiz_20", name: "محترف", icon: "🎖️", description: "أكمل ٢٠ اختبار محاكي", xpRequired: 600, tier: 2, children: ["grand_master"], category: "core" },
  { id: "streak_7", name: "أسبوع كامل", icon: "🔥", description: "ادرس ٧ أيام متتالية", xpRequired: 350, tier: 2, children: ["grand_master"], category: "core" },
  { id: "challenger", name: "متحدي", icon: "⚔️", description: "اربح ٣ تحديات أقران", xpRequired: 450, tier: 2, children: ["grand_master"], category: "mastery" },

  // Tier 3 — Ultimate
  { id: "grand_master", name: "الأسطورة", icon: "🏆", description: "أكمل جميع المهارات السابقة", xpRequired: 2000, tier: 2, children: [], category: "mastery" },
];

function getUnlockedSkills(totalPoints: number, totalQuestions: number, sessions: number, streak: number): Set<string> {
  const unlocked = new Set<string>();
  unlocked.add("start");
  if (sessions >= 1) { unlocked.add("first_quiz"); unlocked.add("first_practice"); }
  if (totalQuestions >= 10) { unlocked.add("kamy_basics"); unlocked.add("lafzy_basics"); }
  if (sessions >= 5) unlocked.add("quiz_5");
  if (sessions >= 10) unlocked.add("practice_10");
  if (sessions >= 20) unlocked.add("quiz_20");
  if (totalQuestions >= 50) { unlocked.add("kamy_50"); unlocked.add("lafzy_50"); }
  if (streak >= 7) unlocked.add("streak_7");
  if (totalPoints >= 300) unlocked.add("speed_kamy");
  if (totalPoints >= 400) unlocked.add("analogy_pro");
  if (totalPoints >= 450) unlocked.add("challenger");
  if (totalPoints >= 1000) { unlocked.add("kamy_master"); unlocked.add("lafzy_master"); }
  if (totalPoints >= 2000) unlocked.add("grand_master");
  return unlocked;
}

export default function SkillTreePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const a = getPerformanceAnalytics(user);
  const unlocked = getUnlockedSkills(user.total_points, a.totalQuestions, a.totalSessions, user.streak.current);
  const totalSkills = SKILLS.length;
  const unlockedCount = unlocked.size;
  const progress = Math.round((unlockedCount / totalSkills) * 100);

  const catColors = {
    core: { bg: "bg-blue-600/20", border: "border-blue-500/30", text: "text-blue-300", glow: "shadow-blue-500/20" },
    kamy: { bg: "bg-indigo-600/20", border: "border-indigo-500/30", text: "text-indigo-300", glow: "shadow-indigo-500/20" },
    lafzy: { bg: "bg-purple-600/20", border: "border-purple-500/30", text: "text-purple-300", glow: "shadow-purple-500/20" },
    mastery: { bg: "bg-yellow-600/20", border: "border-yellow-500/30", text: "text-yellow-300", glow: "shadow-yellow-500/20" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
      <div className="max-w-3xl mx-auto pt-6">
        <div className="flex items-center justify-between mb-4">
          <a href="/dashboard" className="text-indigo-300 hover:text-white text-sm">→ العودة</a>
          <h1 className="text-xl font-bold text-white">🌳 شجرة المهارات</h1>
          <span className="text-indigo-300 text-sm">{unlockedCount}/{totalSkills}</span>
        </div>

        {/* Progress */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-bold">التقدم الكلي</span>
            <span className="text-indigo-300 text-sm">{progress}٪</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-3">
            <div className="bg-gradient-to-l from-indigo-500 to-purple-500 h-3 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Skill tree */}
        <div className="space-y-3">
          {SKILLS.map((skill) => {
            const isUnlocked = unlocked.has(skill.id);
            const c = catColors[skill.category];
            const canUnlock = !isUnlocked && skill.children.length === 0 ? false : !isUnlocked;

            return (
              <div
                key={skill.id}
                className={`rounded-2xl p-4 border transition-all ${
                  isUnlocked
                    ? `${c.bg} ${c.border} shadow-lg ${c.glow}`
                    : "bg-white/5 border-white/5 opacity-50"
                }`}
                style={{ marginRight: skill.tier * 20 + "px" }}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-3xl ${isUnlocked ? "" : "grayscale"}`}>{skill.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${isUnlocked ? "text-white" : "text-indigo-400"}`}>{skill.name}</span>
                      {isUnlocked && <span className="text-green-400 text-xs">✓ مفتوح</span>}
                      {!isUnlocked && <span className="text-indigo-500 text-xs">🔒 مقفل</span>}
                    </div>
                    <p className={`text-xs ${isUnlocked ? c.text : "text-indigo-500"}`}>{skill.description}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white text-sm font-bold">{skill.xpRequired}</p>
                    <p className="text-indigo-400 text-[10px]">XP</p>
                  </div>
                </div>
                {/* Connection indicator */}
                {skill.children.length > 0 && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {skill.children.map((childId) => {
                      const child = SKILLS.find((s) => s.id === childId);
                      if (!child) return null;
                      return (
                        <span key={childId} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-indigo-400">
                          → {child.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
