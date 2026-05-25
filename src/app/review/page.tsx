"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { QUDRAT_SECTIONS } from "@/data/qudrat-questions";
import type { QudratQuestion } from "@/data/qudrat-questions";
import { getWrongAnswers, saveWrongAnswer, removeWrongAnswer } from "@/lib/user-store";

export default function ReviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [wrongQuestions, setWrongQuestions] = useState<(QudratQuestion & { sectionId: string; wrongCount: number })[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [phase, setPhase] = useState<"list" | "quiz">("list");
  const [mastered, setMastered] = useState(0);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    loadWrongQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  function loadWrongQuestions() {
    const wrongs = getWrongAnswers();
    const questions: (QudratQuestion & { sectionId: string; wrongCount: number })[] = [];
    for (const wrong of wrongs) {
      for (const section of QUDRAT_SECTIONS) {
        const q = section.questions.find((qu) => qu.text === wrong.questionText);
        if (q) {
          questions.push({ ...q, sectionId: section.section_id, wrongCount: wrong.wrongCount });
          break;
        }
      }
    }
    // Sort by most wrong first
    questions.sort((a, b) => b.wrongCount - a.wrongCount);
    setWrongQuestions(questions);
  }

  function startReview() {
    if (wrongQuestions.length === 0) return;
    setCurrentQ(0);
    setSelected(null);
    setShowAnswer(false);
    setMastered(0);
    setPhase("quiz");
  }

  function checkAnswer() {
    if (selected === null) return;
    setShowAnswer(true);
    const q = wrongQuestions[currentQ];
    if (selected === q.correct_index) {
      removeWrongAnswer(q.text);
      setMastered((m) => m + 1);
    } else {
      saveWrongAnswer(q.text, q.sectionId);
    }
  }

  function nextQuestion() {
    setSelected(null);
    setShowAnswer(false);
    if (currentQ + 1 >= wrongQuestions.length) {
      loadWrongQuestions();
      setPhase("list");
    } else {
      setCurrentQ((c) => c + 1);
    }
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  // List phase
  if (phase === "list") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="flex items-center justify-between mb-6">
            <a href="/dashboard" className="text-indigo-300 hover:text-white text-sm">→ العودة</a>
            <h1 className="text-xl font-bold text-white">🔄 مراجعة الأخطاء</h1>
            <span className="text-indigo-300 text-sm">{wrongQuestions.length} سؤال</span>
          </div>

          {wrongQuestions.length === 0 ? (
            <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
              <span className="text-5xl block mb-4">🎉</span>
              <h2 className="text-xl font-bold text-white mb-2">لا توجد أخطاء!</h2>
              <p className="text-indigo-300 mb-6">أجبت على جميع الأسئلة بشكل صحيح. جرّب اختبار محاكي جديد!</p>
              <a href="/exam" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors">
                اختبار محاكي
              </a>
            </div>
          ) : (
            <>
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
                <p className="text-indigo-200 text-sm mb-4">الأسئلة التي أخطأت فيها سابقاً — سيتم إزالتها عند الإجابة الصحيحة</p>
                <div className="space-y-2">
                  {wrongQuestions.map((q, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/5 flex items-center justify-between">
                      <p className="text-white text-sm flex-1 truncate">{q.text}</p>
                      <span className="text-red-400 text-xs shrink-0 mr-2">خطأ {q.wrongCount}×</span>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={startReview} className="w-full py-4 bg-gradient-to-l from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-all">
                ابدأ المراجعة ({wrongQuestions.length} سؤال)
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Quiz phase
  const q = wrongQuestions[currentQ];
  if (!q) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
      <div className="max-w-2xl mx-auto pt-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => { loadWrongQuestions(); setPhase("list"); }} className="text-indigo-300 hover:text-white text-sm">→ العودة</button>
          <span className="text-indigo-300 text-sm">{currentQ + 1} / {wrongQuestions.length} (أتقنت {mastered})</span>
        </div>

        <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-6 mb-4">
          <p className="text-white text-lg leading-relaxed">{q.text}</p>
          <span className="text-red-400 text-xs">أخطأت {q.wrongCount} مرة</span>
        </div>

        <div className="space-y-3 mb-4">
          {q.choices.map((choice, i) => {
            let style = "border-white/10 bg-white/5 text-indigo-200 hover:bg-white/10";
            if (showAnswer) {
              if (i === q.correct_index) style = "border-green-500 bg-green-600/20 text-green-200";
              else if (i === selected) style = "border-red-500 bg-red-600/20 text-red-200";
              else style = "border-white/5 bg-white/5 text-indigo-400";
            } else if (selected === i) {
              style = "border-indigo-500 bg-indigo-600/30 text-white";
            }
            return (
              <button key={i} onClick={() => { if (!showAnswer) setSelected(i); }} disabled={showAnswer} className={`w-full text-right py-3 px-5 rounded-xl border transition-all ${style}`}>
                {choice}
              </button>
            );
          })}
        </div>

        {showAnswer && q.explanation && (
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 mb-4">
            <p className="text-indigo-100 text-sm">{q.explanation}</p>
          </div>
        )}

        {!showAnswer ? (
          <button onClick={checkAnswer} disabled={selected === null} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-bold transition-all">
            تحقق
          </button>
        ) : (
          <button onClick={nextQuestion} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all">
            التالي ←
          </button>
        )}
      </div>
    </div>
  );
}


