"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getUserData, saveUserData } from "@/lib/user-store";
import type { OnboardingPreferences } from "@/lib/user-store";

const STEPS = [
  { id: "welcome", title: "مرحباً بك!", subtitle: "دعنا نتعرف عليك لنخصّص تجربتك" },
  { id: "learning_style", title: "كيف تتعلم أفضل؟", subtitle: "اختر أسلوب التعلم المفضل لديك" },
  { id: "experience", title: "ما مستوى خبرتك؟", subtitle: "في اختبارات القدرات" },
  { id: "weak_areas", title: "ما نقاط ضعفك؟", subtitle: "اختر المجالات التي تريد تحسينها" },
  { id: "goals", title: "ما هدفك؟", subtitle: "حدد درجتك المستهدفة وهدفك اليومي" },
  { id: "schedule", title: "متى تفضل الدراسة؟", subtitle: "سنُذكّرك في أفضل وقت" },
  { id: "motivation", title: "ما دافعك؟", subtitle: "لماذا تريد تحسين درجتك في القدرات؟" },
  { id: "complete", title: "تم التخصيص!", subtitle: "المنصة جاهزة لك" },
];

export default function OnboardingPage() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<OnboardingPreferences>({
    learning_style: "",
    study_time: "",
    session_duration: 30,
    experience_level: "",
    weak_areas: [],
    target_score: 70,
    daily_goal: 20,
    motivation: "",
    completed: false,
  });

  useEffect(() => {
    if (user?.onboarding?.completed) {
      router.push("/dashboard");
    }
  }, [user, router]);

  function saveAndNext() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function finish() {
    const data = getUserData();
    if (data) {
      data.onboarding = { ...prefs, completed: true };
      saveUserData(data);
      refresh();
    }
    router.push("/dashboard");
  }

  function toggleWeakArea(area: string) {
    setPrefs((p) => ({
      ...p,
      weak_areas: p.weak_areas.includes(area)
        ? p.weak_areas.filter((a) => a !== area)
        : [...p.weak_areas, area],
    }));
  }

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-indigo-300 mb-1">
            <span>الخطوة {step + 1} من {STEPS.length}</span>
            <span>{Math.round(progress)}٪</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">{current.title}</h1>
            <p className="text-indigo-300 text-sm">{current.subtitle}</p>
          </div>

          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="text-7xl mb-6">🧠</div>
              <p className="text-indigo-200 mb-6 leading-relaxed">
                سنطرح عليك بعض الأسئلة لفهم أسلوبك في التعلم وتفضيلاتك.
                <br />هذا سيساعدنا في تخصيص خطة دراسية مثالية لك.
              </p>
              <button onClick={saveAndNext} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all">
                هيا نبدأ! 🚀
              </button>
            </div>
          )}

          {/* Step 1: Learning Style */}
          {step === 1 && (
            <div className="space-y-3">
              {[
                { value: "visual" as const, icon: "👁️", label: "بصري", desc: "أتعلم بالصور والرسوم والألوان" },
                { value: "auditory" as const, icon: "👂", label: "سمعي", desc: "أتعلم بالاستماع والشرح الصوتي" },
                { value: "reading" as const, icon: "📖", label: "قراءة وكتابة", desc: "أتعلم بالقراءة والملاحظات" },
                { value: "kinesthetic" as const, icon: "✋", label: "عملي/حركي", desc: "أتعلم بالممارسة والتجربة" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setPrefs((p) => ({ ...p, learning_style: opt.value })); }}
                  className={`w-full text-right py-4 px-5 rounded-2xl border transition-all flex items-center gap-4 ${
                    prefs.learning_style === opt.value
                      ? "bg-indigo-600/30 border-indigo-500/50 text-white"
                      : "bg-white/5 border-white/10 text-indigo-200 hover:bg-white/10"
                  }`}
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <div>
                    <span className="font-bold block">{opt.label}</span>
                    <span className="text-xs text-indigo-400">{opt.desc}</span>
                  </div>
                </button>
              ))}
              <button
                onClick={saveAndNext}
                disabled={!prefs.learning_style}
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 disabled:text-indigo-400 text-white rounded-xl font-bold transition-all"
              >
                التالي →
              </button>
            </div>
          )}

          {/* Step 2: Experience Level */}
          {step === 2 && (
            <div className="space-y-3">
              {[
                { value: "beginner" as const, icon: "🌱", label: "مبتدئ", desc: "أول مرة أتدرب على القدرات" },
                { value: "intermediate" as const, icon: "📈", label: "متوسط", desc: "تدربت بعض الشيء وأريد تحسين مستواي" },
                { value: "advanced" as const, icon: "🎯", label: "متقدم", desc: "لدي خبرة وأريد الوصول لدرجة عالية" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPrefs((p) => ({ ...p, experience_level: opt.value }))}
                  className={`w-full text-right py-4 px-5 rounded-2xl border transition-all flex items-center gap-4 ${
                    prefs.experience_level === opt.value
                      ? "bg-indigo-600/30 border-indigo-500/50 text-white"
                      : "bg-white/5 border-white/10 text-indigo-200 hover:bg-white/10"
                  }`}
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <div>
                    <span className="font-bold block">{opt.label}</span>
                    <span className="text-xs text-indigo-400">{opt.desc}</span>
                  </div>
                </button>
              ))}
              <button onClick={saveAndNext} disabled={!prefs.experience_level} className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 disabled:text-indigo-400 text-white rounded-xl font-bold transition-all">
                التالي →
              </button>
            </div>
          )}

          {/* Step 3: Weak Areas */}
          {step === 3 && (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { id: "algebra", icon: "🔢", label: "الجبر والمعادلات" },
                  { id: "geometry", icon: "📐", label: "الهندسة" },
                  { id: "statistics", icon: "📊", label: "الإحصاء والاحتمالات" },
                  { id: "arithmetic", icon: "➗", label: "الحساب السريع" },
                  { id: "analogy", icon: "🔗", label: "التناظر اللفظي" },
                  { id: "completion", icon: "✏️", label: "إكمال الجمل" },
                  { id: "comprehension", icon: "📖", label: "استيعاب المقروء" },
                  { id: "context_error", icon: "🔍", label: "الخطأ السياقي" },
                ].map((area) => (
                  <button
                    key={area.id}
                    onClick={() => toggleWeakArea(area.id)}
                    className={`py-3 px-3 rounded-xl border text-center transition-all ${
                      prefs.weak_areas.includes(area.id)
                        ? "bg-red-600/20 border-red-500/30 text-red-200"
                        : "bg-white/5 border-white/10 text-indigo-200 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-2xl block mb-1">{area.icon}</span>
                    <span className="text-xs">{area.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-indigo-400 text-xs text-center mb-4">اختر واحداً أو أكثر (أو تخطَّ)</p>
              <button onClick={saveAndNext} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all">
                التالي →
              </button>
            </div>
          )}

          {/* Step 4: Goals */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <label className="text-white font-bold block mb-3">الدرجة المستهدفة في القدرات</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={40}
                    max={100}
                    value={prefs.target_score}
                    onChange={(e) => setPrefs((p) => ({ ...p, target_score: parseInt(e.target.value) }))}
                    className="flex-1 accent-indigo-500"
                  />
                  <span className="text-2xl font-bold text-indigo-300 w-16 text-center">{prefs.target_score}</span>
                </div>
                <div className="flex justify-between text-xs text-indigo-400 mt-1">
                  <span>٤٠</span>
                  <span>٧٠ (متوسط)</span>
                  <span>١٠٠</span>
                </div>
              </div>
              <div>
                <label className="text-white font-bold block mb-3">كم سؤال تريد حلّه يومياً؟</label>
                <div className="flex gap-3 justify-center">
                  {[10, 20, 30, 50].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPrefs((p) => ({ ...p, daily_goal: n }))}
                      className={`px-5 py-3 rounded-xl border font-bold transition-all ${
                        prefs.daily_goal === n
                          ? "bg-indigo-600/30 border-indigo-500/50 text-white"
                          : "bg-white/5 border-white/10 text-indigo-300 hover:bg-white/10"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={saveAndNext} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all">
                التالي →
              </button>
            </div>
          )}

          {/* Step 5: Schedule */}
          {step === 5 && (
            <div className="space-y-3">
              {[
                { value: "morning" as const, icon: "🌅", label: "الصباح", desc: "٦ - ١٢ صباحاً" },
                { value: "afternoon" as const, icon: "☀️", label: "الظهيرة", desc: "١٢ - ٥ مساءً" },
                { value: "evening" as const, icon: "🌇", label: "المساء", desc: "٥ - ٩ مساءً" },
                { value: "night" as const, icon: "🌙", label: "الليل", desc: "٩ مساءً - ١ صباحاً" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPrefs((p) => ({ ...p, study_time: opt.value }))}
                  className={`w-full text-right py-4 px-5 rounded-2xl border transition-all flex items-center gap-4 ${
                    prefs.study_time === opt.value
                      ? "bg-indigo-600/30 border-indigo-500/50 text-white"
                      : "bg-white/5 border-white/10 text-indigo-200 hover:bg-white/10"
                  }`}
                >
                  <span className="text-3xl">{opt.icon}</span>
                  <div>
                    <span className="font-bold block">{opt.label}</span>
                    <span className="text-xs text-indigo-400">{opt.desc}</span>
                  </div>
                </button>
              ))}
              <div className="mt-4">
                <label className="text-indigo-300 text-sm block mb-2">مدة الجلسة الواحدة (بالدقائق)</label>
                <div className="flex gap-3 justify-center">
                  {[15, 30, 45, 60].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPrefs((p) => ({ ...p, session_duration: n }))}
                      className={`px-4 py-2 rounded-lg border text-sm font-bold transition-all ${
                        prefs.session_duration === n
                          ? "bg-indigo-600/30 border-indigo-500/50 text-white"
                          : "bg-white/5 border-white/10 text-indigo-300 hover:bg-white/10"
                      }`}
                    >
                      {n} د
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={saveAndNext} disabled={!prefs.study_time} className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 disabled:text-indigo-400 text-white rounded-xl font-bold transition-all">
                التالي →
              </button>
            </div>
          )}

          {/* Step 6: Motivation */}
          {step === 6 && (
            <div className="space-y-3">
              {[
                { value: "university", icon: "🎓", label: "القبول الجامعي" },
                { value: "scholarship", icon: "💰", label: "منحة دراسية" },
                { value: "career", icon: "💼", label: "فرصة وظيفية" },
                { value: "self_improvement", icon: "📈", label: "تطوير الذات" },
                { value: "competition", icon: "🏆", label: "التحدي والمنافسة" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPrefs((p) => ({ ...p, motivation: opt.value }))}
                  className={`w-full text-right py-3 px-5 rounded-2xl border transition-all flex items-center gap-3 ${
                    prefs.motivation === opt.value
                      ? "bg-indigo-600/30 border-indigo-500/50 text-white"
                      : "bg-white/5 border-white/10 text-indigo-200 hover:bg-white/10"
                  }`}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="font-bold">{opt.label}</span>
                </button>
              ))}
              <button onClick={saveAndNext} disabled={!prefs.motivation} className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50 disabled:text-indigo-400 text-white rounded-xl font-bold transition-all">
                التالي →
              </button>
            </div>
          )}

          {/* Step 7: Complete */}
          {step === 7 && (
            <div className="text-center">
              <div className="text-7xl mb-4">🎉</div>
              <div className="bg-white/5 rounded-2xl p-4 mb-6 text-right space-y-2">
                <p className="text-indigo-200 text-sm">
                  <span className="text-white font-bold">أسلوبك:</span>{" "}
                  {prefs.learning_style === "visual" ? "بصري 👁️" : prefs.learning_style === "auditory" ? "سمعي 👂" : prefs.learning_style === "reading" ? "قراءة 📖" : "عملي ✋"}
                </p>
                <p className="text-indigo-200 text-sm">
                  <span className="text-white font-bold">مستواك:</span>{" "}
                  {prefs.experience_level === "beginner" ? "مبتدئ 🌱" : prefs.experience_level === "intermediate" ? "متوسط 📈" : "متقدم 🎯"}
                </p>
                <p className="text-indigo-200 text-sm">
                  <span className="text-white font-bold">هدفك:</span> درجة {prefs.target_score} — {prefs.daily_goal} سؤال/يوم
                </p>
                <p className="text-indigo-200 text-sm">
                  <span className="text-white font-bold">وقت الدراسة:</span>{" "}
                  {prefs.study_time === "morning" ? "الصباح 🌅" : prefs.study_time === "afternoon" ? "الظهيرة ☀️" : prefs.study_time === "evening" ? "المساء 🌇" : "الليل 🌙"}
                </p>
                {prefs.weak_areas.length > 0 && (
                  <p className="text-indigo-200 text-sm">
                    <span className="text-white font-bold">مجالات للتحسين:</span> {prefs.weak_areas.length} مجال
                  </p>
                )}
              </div>
              <p className="text-indigo-300 text-sm mb-6">سنستخدم هذه المعلومات لتخصيص خطتك الدراسية والتوصيات</p>
              <button onClick={finish} className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition-all hover:shadow-lg hover:shadow-indigo-500/30">
                ابدأ رحلتك! 🚀
              </button>
            </div>
          )}

          {/* Back button */}
          {step > 0 && step < STEPS.length - 1 && (
            <button onClick={() => setStep((s) => s - 1)} className="w-full mt-3 py-2 text-indigo-400 hover:text-white text-sm transition-all">
              ← رجوع
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
