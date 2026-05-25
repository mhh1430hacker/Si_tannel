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
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const q = questions[currentQ];
  if (!q) return null;

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
    <div className="p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-white">🎯 تدريب حر</h1>
          <div className="flex items-center gap-3">
            <span className="text-green-400 text-sm font-bold">{stats.correct}✓</span>
            <span className="text-amber-400 text-sm font-bold">{stats.wrong}✗</span>
            <a href="/exam" className="px-3 py-1 bg-white/10 hover:bg-white/15 text-indigo-300 rounded-lg text-xs transition-all">📝 اختبار</a>
          </div>
        </div>

        {/* Section toggle */}
        <div className="flex gap-2 justify-center mb-6">
          <button onClick={() => setSection("kamy")} className={`px-5 py-2 rounded-lg text-sm ${section === "kamy" ? "bg-indigo-600 text-white" : "bg-white/10 text-indigo-300"}`}>
            📐 كمي
          </button>
          <button onClick={() => setSection("lafzy")} className={`px-5 py-2 rounded-lg text-sm ${section === "lafzy" ? "bg-indigo-600 text-white" : "bg-white/10 text-indigo-300"}`}>
            📖 لفظي
          </button>
        </div>

        {/* Progress */}
        <p className="text-center text-indigo-400 text-xs mb-4">{currentQ + 1} / {questions.length}</p>

        {/* Question */}
        <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-6 mb-4">
          <p className="text-white text-lg leading-relaxed">{q.text}</p>
          {q.difficulty && (
            <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
              q.difficulty === "سهل" ? "bg-green-600/20 text-green-300" : q.difficulty === "متوسط" ? "bg-yellow-600/20 text-yellow-300" : "bg-red-600/20 text-red-300"
            }`}>{q.difficulty}</span>
          )}
        </div>

        {/* Hint */}
        {!showAnswer && q.hint && (
          <button onClick={() => setShowHint(!showHint)} className="text-yellow-400 hover:text-yellow-300 text-sm mb-3 flex items-center gap-1">
            💡 {showHint ? "إخفاء التلميح" : "عرض تلميح"}
          </button>
        )}
        {showHint && !showAnswer && q.hint && (
          <div className="bg-yellow-600/10 border border-yellow-500/20 rounded-xl p-3 mb-4 text-yellow-200 text-sm">
            💡 {q.hint}
          </div>
        )}

        {/* Choices */}
        <div className="space-y-3 mb-4">
          {q.choices.map((choice, i) => {
            let style = "border-white/10 bg-white/5 text-indigo-200 hover:bg-white/10";
            if (showAnswer) {
              if (i === q.correct_index) style = "border-green-500 bg-green-600/20 text-green-200";
              else if (i === selected) style = "border-amber-500 bg-amber-600/20 text-amber-200";
              else style = "border-white/5 bg-white/5 text-indigo-400";
            } else if (selected === i) {
              style = "border-indigo-500 bg-indigo-600/30 text-white";
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

        {/* Explanation */}
        {showAnswer && (
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 mb-4 animate-fade-in">
            {selected === q.correct_index ? (
              <p className="text-green-300 text-sm font-bold mb-1">إجابة صحيحة — أحسنت!</p>
            ) : (
              <p className="text-amber-300 text-sm font-bold mb-1">أغلب الطلاب يخطئون في هذا السؤال — التكرار يصنع الإتقان</p>
            )}
            {q.explanation && <p className="text-indigo-100 text-sm leading-relaxed mt-1">{q.explanation}</p>}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!showAnswer ? (
            <button onClick={checkAnswer} disabled={selected === null} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-bold transition-all">
              تحقق من الإجابة
            </button>
          ) : (
            <button onClick={nextQuestion} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all">
              السؤال التالي ←
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
