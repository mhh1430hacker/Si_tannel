"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { QUDRAT_SECTIONS } from "@/data/qudrat-questions";
import type { QudratQuestion } from "@/data/qudrat-questions";
import { loadAIState, saveAIState, processAnswer, selectAdaptiveQuestion, type AIState } from "@/lib/ai/engine";

export default function PracticePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [section, setSection] = useState<"kamy" | "lafzy">("kamy");
  const [questions, setQuestions] = useState<QudratQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [aiState, setAiState] = useState<AIState | null>(null);
  const [aiReason, setAiReason] = useState("");
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set());
  const qStartTime = useRef(Date.now());

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    setAiState(loadAIState());
  }, []);

  useEffect(() => {
    const sec = QUDRAT_SECTIONS.find((s) => s.section_id === section);
    if (sec) {
      const shuffled = [...sec.questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setQuestions(shuffled);
      setCurrentQ(0);
      setSelected(null);
      setShowAnswer(false);
      setShowHint(false);
      setStats({ correct: 0, wrong: 0 });
      setAnsweredIds(new Set());
      setAiReason("");
      qStartTime.current = Date.now();
    }
  }, [section]);

  const selectNextAdaptive = useCallback((qs: QudratQuestion[], answered: Set<string>, state: AIState) => {
    const available = qs.map((q, i) => ({
      id: `${section}-${i}-${q.text.slice(0, 20)}`,
      text: q.text,
      difficulty: q.difficulty,
      section,
      index: i,
    }));

    const result = selectAdaptiveQuestion(state, available, answered);
    if (result) {
      setCurrentQ(result.questionIndex);
      setAiReason(result.reason);
    }
  }, [section]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const q = questions[currentQ];
  if (!q) return null;
  const questionId = `${section}-${currentQ}-${q.text.slice(0, 20)}`;
  const progress = questions.length > 0 ? ((stats.correct + stats.wrong) / questions.length) * 100 : 0;

  function checkAnswer() {
    if (selected === null || !aiState) return;
    setShowAnswer(true);
    const isCorrect = selected === q.correct_index;
    const responseTime = Math.round((Date.now() - qStartTime.current) / 1000);

    if (isCorrect) {
      setStats((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
    }

    // Process through AI engine (client-side)
    const newState = processAnswer(
      aiState,
      questionId,
      q.text,
      q.difficulty,
      section,
      isCorrect,
      responseTime,
      currentQ,
    );
    setAiState(newState);
    setAnsweredIds((prev) => { const next = new Set(Array.from(prev)); next.add(questionId); return next; });

    // Edge adaptive engine (async, non-blocking)
    fetch("/api/adaptive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: user?.profile.id || "anon",
        currentTheta: newState.irtTheta,
        currentElo: newState.studentElo.rating,
        questionDifficulty: q.difficulty === "\u0633\u0647\u0644" ? -1 : q.difficulty === "\u0635\u0639\u0628" ? 1 : 0,
        isCorrect,
        responseTimeMs: responseTime * 1000,
        sessionQuestionsAnswered: stats.correct + stats.wrong + 1,
        section,
      }),
    }).catch(() => {});
  }

  function nextQuestion() {
    setSelected(null);
    setShowAnswer(false);
    setShowHint(false);
    qStartTime.current = Date.now();

    const newAnswered = new Set(Array.from(answeredIds)); newAnswered.add(questionId);

    // Use AI to select next question
    if (aiState && questions.length > 0) {
      selectNextAdaptive(questions, newAnswered, aiState);
    } else {
      setCurrentQ((c) => (c + 1) % questions.length);
    }
  }

  // AI insight bar
  const eloRating = aiState?.studentElo.rating || 1200;
  const theta = aiState?.irtTheta || 0;
  const abilityLabel = theta > 1 ? "متقدم" : theta > 0 ? "جيد" : theta > -1 ? "متوسط" : "مبتدئ";

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-1">
          <h1 className="text-xl font-bold text-white">تدريب حر</h1>
          <p className="text-indigo-300/70 text-xs">سؤال {stats.correct + stats.wrong + 1} من {questions.length}</p>
        </div>

        {/* AI Stats Bar */}
        <div className="flex items-center justify-center gap-4 mb-4 text-[10px]">
          <span className="text-indigo-300/70">{stats.correct} صح</span>
          <span className="text-indigo-300/40">|</span>
          <span className="text-indigo-300/70">{stats.wrong} خطأ</span>
          <span className="text-indigo-300/40">|</span>
          <span className="text-indigo-300/70">Elo: {Math.round(eloRating)}</span>
          <span className="text-indigo-300/40">|</span>
          <span className="text-indigo-300/70">المستوى: {abilityLabel}</span>
        </div>

        {/* Section toggle */}
        <div className="flex bg-white/5 rounded-xl p-1 mb-5">
          <button onClick={() => setSection("kamy")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${section === "kamy" ? "bg-indigo-600 text-white" : "text-indigo-300/70 hover:text-white"}`}>
            كمي
          </button>
          <button onClick={() => setSection("lafzy")} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${section === "lafzy" ? "bg-indigo-600 text-white" : "text-indigo-300/70 hover:text-white"}`}>
            لفظي
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/5 rounded-full h-1 mb-5">
          <div className="bg-indigo-500 h-1 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* AI Reason */}
        {aiReason && (
          <p className="text-indigo-400/60 text-[10px] text-center mb-3">{aiReason}</p>
        )}

        {/* Question card */}
        <div className="bg-white/[0.07] backdrop-blur rounded-2xl border border-white/10 p-6 mb-5">
          <p className="text-white text-base leading-relaxed">{q.text}</p>
          {q.difficulty && (
            <span className={`inline-block mt-3 text-[10px] px-2.5 py-1 rounded-full font-medium ${
              q.difficulty === "سهل" ? "bg-green-500/10 text-green-300" :
              q.difficulty === "متوسط" ? "bg-yellow-500/10 text-yellow-300" :
              "bg-red-500/10 text-red-300"
            }`}>{q.difficulty}</span>
          )}
        </div>

        {/* Hint */}
        {!showAnswer && q.hint && (
          <button onClick={() => setShowHint(!showHint)} className="text-indigo-400 hover:text-indigo-300 text-xs mb-4 transition-all">
            {showHint ? "إخفاء التلميح" : "عرض تلميح"}
          </button>
        )}
        {showHint && !showAnswer && q.hint && (
          <div className="bg-indigo-600/10 border border-indigo-500/10 rounded-xl p-3 mb-4 text-indigo-200 text-sm">
            {q.hint}
          </div>
        )}

        {/* Choices */}
        <div className="space-y-2.5 mb-5">
          {q.choices.map((choice, i) => {
            let style = "border-white/5 bg-white/[0.03] text-indigo-100 hover:bg-white/[0.07] hover:border-white/10";
            if (showAnswer) {
              if (i === q.correct_index) style = "border-green-500/30 bg-green-600/10 text-green-200";
              else if (i === selected) style = "border-amber-500/30 bg-amber-600/10 text-amber-200";
              else style = "border-white/5 bg-white/[0.02] text-indigo-400/50";
            } else if (selected === i) {
              style = "border-indigo-500/50 bg-indigo-600/20 text-white";
            }
            return (
              <button
                key={i}
                onClick={() => { if (!showAnswer) setSelected(i); }}
                disabled={showAnswer}
                className={`w-full text-right py-3 px-5 rounded-xl border transition-all ${style}`}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {showAnswer && (
          <div className={`rounded-xl p-4 mb-5 ${selected === q.correct_index ? "bg-green-600/10 border border-green-500/10" : "bg-amber-600/5 border border-amber-500/10"}`}>
            {selected === q.correct_index ? (
              <p className="text-green-300 text-sm font-medium mb-1">إجابة صحيحة</p>
            ) : (
              <p className="text-amber-300 text-sm font-medium mb-1">أغلب الطلاب يخطئون في هذا السؤال — التكرار يصنع الإتقان</p>
            )}
            {q.explanation && <p className="text-indigo-200/70 text-sm leading-relaxed mt-1">{q.explanation}</p>}
          </div>
        )}

        {/* Actions */}
        {!showAnswer ? (
          <button onClick={checkAnswer} disabled={selected === null} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-bold transition-all active:scale-[0.98]">
            تحقق
          </button>
        ) : (
          <button onClick={nextQuestion} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all active:scale-[0.98]">
            التالي
          </button>
        )}
      </div>
    </div>
  );
}
