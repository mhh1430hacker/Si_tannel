"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { QUDRAT_SECTIONS } from "@/data/qudrat-questions";
import type { QudratQuestion } from "@/data/qudrat-questions";

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

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

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
    }
  }, [section]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const q = questions[currentQ];
  if (!q) return null;

  const total = stats.correct + stats.wrong;

  function checkAnswer() {
    if (selected === null) return;
    setShowAnswer(true);
    if (selected === q.correct_index) {
      setStats((s) => ({ ...s, correct: s.correct + 1 }));
    } else {
      setStats((s) => ({ ...s, wrong: s.wrong + 1 }));
    }
  }

  function nextQuestion() {
    setSelected(null);
    setShowAnswer(false);
    setShowHint(false);
    setCurrentQ((c) => (c + 1) % questions.length);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white font-bold text-lg">تدريب حر</h1>
            <p className="text-indigo-300/60 text-xs mt-0.5">سؤال {currentQ + 1} من {questions.length}</p>
          </div>
          {total > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-400 font-medium">{stats.correct} صح</span>
              <span className="text-indigo-300/40">|</span>
              <span className="text-amber-400 font-medium">{stats.wrong} خطأ</span>
            </div>
          )}
        </div>

        {/* Section toggle */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
          <button
            onClick={() => setSection("kamy")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              section === "kamy" ? "bg-indigo-600 text-white" : "text-indigo-300/70 hover:text-white"
            }`}
          >
            كمي
          </button>
          <button
            onClick={() => setSection("lafzy")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              section === "lafzy" ? "bg-indigo-600 text-white" : "text-indigo-300/70 hover:text-white"
            }`}
          >
            لفظي
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/5 rounded-full h-1 mb-6">
          <div
            className="h-1 rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <div className="bg-white/[0.07] backdrop-blur rounded-2xl border border-white/10 p-6 mb-5">
          <p className="text-white text-base leading-relaxed">{q.text}</p>
          {q.difficulty && (
            <span className={`inline-block mt-3 text-[10px] px-2.5 py-1 rounded-full font-medium ${
              q.difficulty === "سهل" ? "bg-green-500/10 text-green-300" : q.difficulty === "متوسط" ? "bg-amber-500/10 text-amber-300" : "bg-red-500/10 text-red-300"
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
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3.5 mb-5 text-amber-200/80 text-sm">
            {q.hint}
          </div>
        )}

        {/* Choices */}
        <div className="space-y-2.5 mb-5">
          {q.choices.map((choice, i) => {
            let style = "border-white/5 bg-white/[0.03] text-indigo-100 hover:bg-white/[0.07] hover:border-white/10";
            if (showAnswer) {
              if (i === q.correct_index) style = "border-green-500/30 bg-green-500/10 text-green-200";
              else if (i === selected) style = "border-amber-500/30 bg-amber-500/10 text-amber-200";
              else style = "border-white/5 bg-white/[0.02] text-indigo-300/40";
            } else if (selected === i) {
              style = "border-indigo-500/40 bg-indigo-600/15 text-white";
            }
            return (
              <button
                key={i}
                onClick={() => { if (!showAnswer) setSelected(i); }}
                disabled={showAnswer}
                className={`w-full text-right py-3.5 px-5 rounded-xl border transition-all ${style}`}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {showAnswer && (
          <div className="bg-white/[0.04] border border-white/5 rounded-xl p-4 mb-5 animate-fade-in">
            {selected === q.correct_index ? (
              <p className="text-green-300 text-sm font-medium">إجابة صحيحة</p>
            ) : (
              <p className="text-amber-300 text-sm font-medium">أغلب الطلاب يخطئون في هذا السؤال — التكرار يصنع الإتقان</p>
            )}
            {q.explanation && <p className="text-indigo-200/70 text-sm leading-relaxed mt-2">{q.explanation}</p>}
          </div>
        )}

        {/* Action button */}
        {!showAnswer ? (
          <button
            onClick={checkAnswer}
            disabled={selected === null}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-xl font-bold transition-all active:scale-[0.98]"
          >
            تحقق
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all active:scale-[0.98]"
          >
            التالي
          </button>
        )}
      </div>
    </div>
  );
}
