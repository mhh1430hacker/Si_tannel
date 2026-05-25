"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ObservationalNudge from "@/components/ObservationalNudge";
import { addSessionRecord } from "@/lib/user-store";

interface Choice {
  id: number;
  choice_text: string;
  image_url: string | null;
}

interface Question {
  id: number;
  content: string;
  skill_category: string;
  difficulty: string;
  expected_time_seconds: number;
  image_url: string | null;
  choices: Choice[];
}

interface SessionSummary {
  session_id: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  accuracy_percentage: number;
  total_time_seconds: number;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

export default function TestLab() {
  const [category, setCategory] = useState("");
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [lastResult, setLastResult] = useState<{
    is_correct: boolean;
    correct_choice_id: number;
  } | null>(null);
  const [activeNudge, setActiveNudge] = useState<string | null>(null);

  const userIdRef = useRef(generateUUID());
  const sessionIdRef = useRef(generateUUID());
  const timerRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const skeletonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCategory(params.get("category") || "");
  }, []);

  const startTimer = useCallback(() => {
    timerRef.current = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      timerRef.current += 1;
    }, 1000);
  }, []);

  const stopTimer = useCallback((): number => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    return timerRef.current;
  }, []);

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    fetchFirstQuestion();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  async function fetchFirstQuestion() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/question/first?category=${encodeURIComponent(category)}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data: Question = await res.json();
      setQuestion(data);
      startTimer();
    } catch {
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!question || selectedChoice === null) return;

    setSubmitting(true);
    const timeTaken = stopTimer();

    skeletonTimerRef.current = setTimeout(() => setShowSkeleton(true), 300);

    try {
      const res = await fetch(`/api/answer/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userIdRef.current,
          session_id: sessionIdRef.current,
          question_id: question.id,
          chosen_choice_id: selectedChoice,
          time_taken_seconds: timeTaken,
        }),
      });

      if (!res.ok) throw new Error("Submit failed");
      const data = await res.json();

      if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
      setShowSkeleton(false);

      setLastResult({
        is_correct: data.is_correct,
        correct_choice_id: data.correct_choice_id,
      });

      // Deliver nudge if the Shadow Engine produced one (rare, max 2 per session)
      if (data.nudge) {
        setActiveNudge(data.nudge);
      }

      await new Promise((resolve) => setTimeout(resolve, 1200));

      if (data.next_question) {
        setQuestion(data.next_question);
        setSelectedChoice(null);
        setLastResult(null);
        setQuestionNumber((n) => n + 1);
        startTimer();
      } else {
        await fetchSummary();
      }
    } catch {
      if (skeletonTimerRef.current) clearTimeout(skeletonTimerRef.current);
      setShowSkeleton(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function fetchSummary() {
    try {
      const res = await fetch(
        `/api/session/${sessionIdRef.current}/summary`
      );
      if (res.ok) {
        const data: SessionSummary = await res.json();
        setSummary(data);
        // Save to user store for analytics
        addSessionRecord({
          session_id: data.session_id,
          category: category,
          total_questions: data.total_questions,
          correct_count: data.correct_count,
          total_time_seconds: data.total_time_seconds,
          date: new Date().toISOString(),
        });
      }
    } catch {
      // Graceful degradation: summary failure doesn't break the app
    }
  }

  function getChoiceStyle(choiceId: number): string {
    const base =
      "w-full text-right py-3 px-5 rounded-lg border-2 transition-all duration-200 cursor-pointer ";

    if (lastResult) {
      if (choiceId === lastResult.correct_choice_id) {
        return base + "border-green-500 bg-green-600/10 text-green-300";
      }
      if (choiceId === selectedChoice && !lastResult.is_correct) {
        return base + "border-red-500 bg-red-600/10 text-red-300";
      }
      return base + "border-white/10 bg-white/5 text-indigo-300/50";
    }

    if (choiceId === selectedChoice) {
      return base + "border-indigo-500 bg-indigo-600/10 text-white";
    }
    return base + "border-white/10 bg-white/5 text-indigo-200 hover:border-indigo-500/30 hover:bg-white/10";
  }

  // Category selection view
  if (!category && !loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-lg w-full space-y-6 animate-fade-in">
          <div className="text-center">
            <span className="text-5xl block mb-3">🧪</span>
            <h1 className="text-2xl font-bold text-white mb-2">معمل الاختبار</h1>
            <p className="text-indigo-300 text-sm">اختر قسماً لبدء جلسة تكيّفية ذكية</p>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setCategory("كمي — الرياضيات")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/40 rounded-2xl p-5 text-right transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl group-hover:scale-110 transition-transform">📐</span>
                <div>
                  <h3 className="text-white font-bold">كمي — الرياضيات</h3>
                  <p className="text-indigo-300/70 text-xs mt-1">أسئلة كمية مع صعوبة متكيّفة</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setCategory("لفظي — اللغة العربية")}
              className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 rounded-2xl p-5 text-right transition-all duration-200 group"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl group-hover:scale-110 transition-transform">📖</span>
                <div>
                  <h3 className="text-white font-bold">لفظي — اللغة العربية</h3>
                  <p className="text-indigo-300/70 text-xs mt-1">أسئلة لفظية مع صعوبة متكيّفة</p>
                </div>
              </div>
            </button>
          </div>
          <a href="/dashboard" className="block text-center text-indigo-400 text-sm hover:text-indigo-300 transition-colors">
            → العودة للوحة التحكم
          </a>
        </div>
      </main>
    );
  }

  // Summary view
  if (summary) {
    const pct = summary.accuracy_percentage;
    const encourageMsg = pct >= 80 ? "أداء ممتاز! أنت في المسار الصحيح 🌟" : pct >= 60 ? "أداء جيد! مع التدريب ستتحسن أكثر 💪" : "أغلب الطلاب يحتاجون تدريباً أكثر على هذا المستوى — استمر! 🚀";
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl shadow-lg p-8 text-center animate-fade-in">
          <h2 className="text-2xl font-bold text-white mb-2">ملخص الجلسة</h2>
          <p className="text-indigo-300 text-sm mb-6">{encourageMsg}</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-600/10 border border-green-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-400">
                {summary.correct_count}
              </div>
              <div className="text-sm text-green-300/70">إجابات صحيحة</div>
            </div>
            <div className="bg-red-600/10 border border-red-500/20 rounded-xl p-4">
              <div className="text-3xl font-bold text-red-400">
                {summary.incorrect_count}
              </div>
              <div className="text-sm text-red-300/70">إجابات خاطئة</div>
            </div>
          </div>
          <div className="mb-4">
            <div className="text-4xl font-bold text-indigo-400">
              {summary.accuracy_percentage}%
            </div>
            <div className="text-sm text-indigo-300/70">نسبة الدقة</div>
          </div>
          <div className="text-indigo-300/60 text-sm mb-6">
            الوقت الإجمالي: {Math.floor(summary.total_time_seconds / 60)} دقيقة و{" "}
            {summary.total_time_seconds % 60} ثانية
          </div>
          <div className="flex gap-3 justify-center">
            <a
              href="/dashboard"
              className="inline-block py-3 px-8 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-500 transition-all"
            >
              لوحة التحكم
            </a>
            <a
              href="/analytics"
              className="inline-block py-3 px-6 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-500 transition-all"
            >
              تحليل الأداء
            </a>
          </div>
        </div>
      </main>
    );
  }

  // Loading state
  if (loading || showSkeleton) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="max-w-2xl w-full">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-white/10 rounded w-1/4" />
            <div className="h-20 bg-white/10 rounded-xl" />
            <div className="space-y-3">
              <div className="h-12 bg-white/10 rounded-lg" />
              <div className="h-12 bg-white/10 rounded-lg" />
              <div className="h-12 bg-white/10 rounded-lg" />
              <div className="h-12 bg-white/10 rounded-lg" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // No question available
  if (!question) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center animate-fade-in">
          <span className="text-5xl block mb-4">📭</span>
          <p className="text-xl text-indigo-300 mb-2">
            لا توجد أسئلة متاحة في هذا التصنيف
          </p>
          <p className="text-indigo-300/60 text-sm mb-6">جرّب قسماً آخر أو استورد أسئلة جديدة</p>
          <div className="flex gap-3 justify-center">
            <a href="/dashboard" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all">
              لوحة التحكم
            </a>
            <a href="/import" className="px-6 py-3 bg-white/10 text-indigo-300 rounded-xl font-bold hover:bg-white/15 transition-all">
              استيراد أسئلة
            </a>
          </div>
        </div>
      </main>
    );
  }

  // Active question view
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl w-full animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-indigo-300/70">السؤال {questionNumber}</span>
          <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-indigo-300">
            {question.difficulty} • {question.skill_category}
          </span>
        </div>

        {/* Question */}
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 mb-6">
          <p className="text-lg leading-relaxed text-white">{question.content}</p>
          {question.image_url && (
            <div className="mt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={question.image_url} alt="صورة السؤال" className="max-h-64 rounded-lg border border-gray-200" />
            </div>
          )}
        </div>

        {/* Choices */}
        <div className="space-y-3 mb-6">
          {question.choices.map((choice) => (
            <button
              key={choice.id}
              onClick={() => {
                if (!lastResult) setSelectedChoice(choice.id);
              }}
              disabled={!!lastResult}
              className={getChoiceStyle(choice.id)}
            >
              {choice.image_url && (
                <span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={choice.image_url} alt="" className="max-h-12 rounded inline-block ml-2" />
                </span>
              )}
              {choice.choice_text}
            </button>
          ))}
        </div>

        {/* Submit button */}
        {!lastResult && (
          <button
            onClick={handleSubmit}
            disabled={selectedChoice === null || submitting}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-medium text-lg hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            {submitting ? "جاري الإرسال..." : "تأكيد وإرسال"}
          </button>
        )}

        {/* Result feedback */}
        {lastResult && (
          <div
            className={`text-center py-3 rounded-xl font-medium transition-all duration-200 ${
              lastResult.is_correct
                ? "bg-green-600/10 border border-green-500/20 text-green-300"
                : "bg-amber-600/10 border border-amber-500/20 text-amber-300"
            }`}
          >
            {lastResult.is_correct ? "إجابة صحيحة ✓" : "أغلب الطلاب يخطئون هنا — لا تقلق، كل خطأ يقرّبك من الإتقان 💪"}
          </div>
        )}
      </div>

      {/* Observational Nudge — rare, clinical, data-driven */}
      {activeNudge && (
        <ObservationalNudge
          text={activeNudge}
          onDismiss={() => setActiveNudge(null)}
        />
      )}
    </main>
  );
}
