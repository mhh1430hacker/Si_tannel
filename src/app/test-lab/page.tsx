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
  const [loading, setLoading] = useState(true);
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
      "w-full text-right py-3 px-5 rounded-lg border-2 transition-all cursor-pointer ";

    if (lastResult) {
      if (choiceId === lastResult.correct_choice_id) {
        return base + "border-green-500 bg-green-50 text-green-800";
      }
      if (choiceId === selectedChoice && !lastResult.is_correct) {
        return base + "border-red-500 bg-red-50 text-red-800";
      }
      return base + "border-gray-200 bg-white text-gray-400";
    }

    if (choiceId === selectedChoice) {
      return base + "border-blue-500 bg-blue-50 text-blue-800";
    }
    return base + "border-gray-200 bg-white hover:border-gray-400";
  }

  // Summary view
  if (summary) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold mb-6">ملخص الجلسة</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-3xl font-bold text-green-600">
                {summary.correct_count}
              </div>
              <div className="text-sm text-green-700">إجابات صحيحة</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-3xl font-bold text-red-600">
                {summary.incorrect_count}
              </div>
              <div className="text-sm text-red-700">إجابات خاطئة</div>
            </div>
          </div>
          <div className="mb-4">
            <div className="text-4xl font-bold text-blue-600">
              {summary.accuracy_percentage}%
            </div>
            <div className="text-sm text-gray-600">نسبة الدقة</div>
          </div>
          <div className="text-gray-500 text-sm mb-6">
            الوقت الإجمالي: {Math.floor(summary.total_time_seconds / 60)} دقيقة و{" "}
            {summary.total_time_seconds % 60} ثانية
          </div>
          <div className="flex gap-3 justify-center">
            <a
              href="/dashboard"
              className="inline-block py-3 px-8 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              لوحة التحكم
            </a>
            <a
              href="/analytics"
              className="inline-block py-3 px-6 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
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
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-20 bg-gray-200 rounded-xl" />
            <div className="space-y-3">
              <div className="h-12 bg-gray-200 rounded-lg" />
              <div className="h-12 bg-gray-200 rounded-lg" />
              <div className="h-12 bg-gray-200 rounded-lg" />
              <div className="h-12 bg-gray-200 rounded-lg" />
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
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">
            لا توجد أسئلة متاحة في هذا التصنيف
          </p>
          <a href="/" className="text-blue-600 hover:underline font-medium">
            العودة للرئيسية
          </a>
        </div>
      </main>
    );
  }

  // Active question view
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-gray-500">السؤال {questionNumber}</span>
          <span className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-600">
            {question.difficulty} • {question.skill_category}
          </span>
        </div>

        {/* Question */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <p className="text-lg leading-relaxed">{question.content}</p>
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
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-medium text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "جاري الإرسال..." : "تأكيد وإرسال"}
          </button>
        )}

        {/* Result feedback */}
        {lastResult && (
          <div
            className={`text-center py-3 rounded-xl font-medium ${
              lastResult.is_correct
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {lastResult.is_correct ? "إجابة صحيحة ✓" : "إجابة خاطئة ✗"}
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
