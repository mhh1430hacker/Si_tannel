"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { QUDRAT_SECTIONS } from "@/data/qudrat-questions";
import type { QudratQuestion } from "@/data/qudrat-questions";
import { getWrongAnswers, saveWrongAnswer, removeWrongAnswer } from "@/lib/user-store";
import { loadAIState, saveAIState, type AIState, type FSRSRating } from "@/lib/ai/engine";
import { initCard, reviewCard, getScheduleOptions, type FSRSCard } from "@/lib/ai/fsrs";

export default function ReviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [wrongQuestions, setWrongQuestions] = useState<(QudratQuestion & { sectionId: string; wrongCount: number; questionId: string })[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [phase, setPhase] = useState<"list" | "quiz">("list");
  const [mastered, setMastered] = useState(0);
  const [aiState, setAiState] = useState<AIState | null>(null);
  const [schedule, setSchedule] = useState<{ again: number; hard: number; good: number; easy: number } | null>(null);
  const qStartTime = useRef(Date.now());

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    loadWrongQuestions();
    setAiState(loadAIState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  function loadWrongQuestions() {
    const wrongs = getWrongAnswers();
    const questions: (QudratQuestion & { sectionId: string; wrongCount: number; questionId: string })[] = [];
    for (const wrong of wrongs) {
      for (const section of QUDRAT_SECTIONS) {
        const q = section.questions.find((qu) => qu.text === wrong.questionText);
        if (q) {
          const qId = `review-${section.section_id}-${q.text.slice(0, 20)}`;
          questions.push({ ...q, sectionId: section.section_id, wrongCount: wrong.wrongCount, questionId: qId });
          break;
        }
      }
    }
    // Sort by FSRS urgency if available, else by wrong count
    const state = loadAIState();
    questions.sort((a, b) => {
      const cardA = state.fsrsCards[a.questionId];
      const cardB = state.fsrsCards[b.questionId];
      if (cardA && cardB) {
        const nowDays = Date.now() / (1000 * 60 * 60 * 24);
        const overdueA = nowDays - (cardA.lastReview / (1000 * 60 * 60 * 24)) - cardA.scheduledDay;
        const overdueB = nowDays - (cardB.lastReview / (1000 * 60 * 60 * 24)) - cardB.scheduledDay;
        return overdueB - overdueA;
      }
      return b.wrongCount - a.wrongCount;
    });
    setWrongQuestions(questions);
  }

  function startReview() {
    if (wrongQuestions.length === 0) return;
    setCurrentQ(0);
    setSelected(null);
    setShowAnswer(false);
    setMastered(0);
    setPhase("quiz");
    qStartTime.current = Date.now();
  }

  function checkAnswer() {
    if (selected === null || !aiState) return;
    setShowAnswer(true);
    const q = wrongQuestions[currentQ];
    if (selected === q.correct_index) {
      removeWrongAnswer(q.text);
      setMastered((m) => m + 1);
    } else {
      saveWrongAnswer(q.text, q.sectionId);
    }

    // Show FSRS schedule options
    const card = aiState.fsrsCards[q.questionId] || initCard(q.questionId);
    setSchedule(getScheduleOptions(card));
  }

  function rateAndNext(rating: FSRSRating) {
    if (!aiState) return;
    const q = wrongQuestions[currentQ];
    const card = aiState.fsrsCards[q.questionId] || initCard(q.questionId);
    const updated = reviewCard(card, rating);

    const newState = {
      ...aiState,
      fsrsCards: { ...aiState.fsrsCards, [q.questionId]: updated },
    };
    setAiState(newState);
    saveAIState(newState);

    goNext();
  }

  function goNext() {
    setSelected(null);
    setShowAnswer(false);
    setSchedule(null);
    qStartTime.current = Date.now();
    if (currentQ + 1 >= wrongQuestions.length) {
      loadWrongQuestions();
      setPhase("list");
    } else {
      setCurrentQ((c) => c + 1);
    }
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  if (phase === "list") {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-xl font-bold text-white">مراجعة الأخطاء</h1>
            <span className="text-indigo-300/50 text-xs">{wrongQuestions.length} سؤال</span>
          </div>

          {wrongQuestions.length === 0 ? (
            <div className="bg-white/[0.04] rounded-2xl p-12 border border-white/10 text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-lg font-bold text-white mb-2">ممتاز — لا أخطاء حالياً!</h2>
              <p className="text-indigo-300/60 text-sm mb-6">أجبت على جميع الأسئلة بشكل صحيح</p>
              <a href="/practice" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors">
                تدريب جديد
              </a>
            </div>
          ) : (
            <>
              {/* FSRS Status */}
              {aiState && Object.keys(aiState.fsrsCards).length > 0 && (
                <div className="bg-white/[0.04] rounded-xl p-4 border border-white/5 mb-4">
                  <p className="text-indigo-300/50 text-[10px] mb-2">نظام FSRS — المراجعة المتباعدة</p>
                  <div className="flex gap-4 text-xs">
                    <span className="text-indigo-200">
                      {Object.values(aiState.fsrsCards).filter((c) => {
                        const elapsed = (Date.now() - c.lastReview) / (1000 * 60 * 60 * 24);
                        return elapsed >= c.scheduledDay;
                      }).length} مستحق الآن
                    </span>
                    <span className="text-indigo-300/40">|</span>
                    <span className="text-indigo-300/60">
                      {Object.values(aiState.fsrsCards).filter((c) => c.stability >= 21).length} مستقر
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-5">
                {wrongQuestions.map((q, i) => {
                  const card = aiState?.fsrsCards[q.questionId];
                  const daysText = card ? `مراجعة بعد ${Math.round(card.scheduledDay)} يوم` : "";
                  return (
                    <div key={i} className="bg-white/[0.04] rounded-xl p-3 border border-white/5 flex items-center justify-between">
                      <p className="text-indigo-100 text-xs flex-1 truncate">{q.text}</p>
                      <div className="flex items-center gap-2 shrink-0 mr-2">
                        {daysText && <span className="text-indigo-400/40 text-[9px]">{daysText}</span>}
                        <span className="text-amber-400/60 text-[10px]">{q.wrongCount > 1 ? `${q.wrongCount}x` : ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button onClick={startReview} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all active:scale-[0.98]">
                ابدأ المراجعة ({wrongQuestions.length})
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const q = wrongQuestions[currentQ];
  if (!q) return null;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { loadWrongQuestions(); setPhase("list"); }} className="text-indigo-300/60 hover:text-white text-xs transition-all">العودة</button>
          <span className="text-indigo-300/40 text-xs">{currentQ + 1}/{wrongQuestions.length} — أتقنت {mastered}</span>
        </div>

        {/* Progress */}
        <div className="w-full bg-white/5 rounded-full h-1 mb-5">
          <div className="bg-indigo-500 h-1 rounded-full transition-all" style={{ width: `${((currentQ + 1) / wrongQuestions.length) * 100}%` }} />
        </div>

        <div className="bg-white/[0.07] backdrop-blur rounded-2xl border border-white/10 p-6 mb-2">
          <p className="text-white text-base leading-relaxed">{q.text}</p>
          <p className="text-amber-300/40 text-[10px] mt-2">هذا السؤال يحتاج تركيزاً إضافياً</p>
        </div>

        <div className="space-y-2.5 mb-5">
          {q.choices.map((choice, i) => {
            let style = "border-white/5 bg-white/[0.03] text-indigo-100 hover:bg-white/[0.07]";
            if (showAnswer) {
              if (i === q.correct_index) style = "border-green-500/30 bg-green-600/10 text-green-200";
              else if (i === selected) style = "border-amber-500/30 bg-amber-600/10 text-amber-200";
              else style = "border-white/5 bg-white/[0.02] text-indigo-400/50";
            } else if (selected === i) {
              style = "border-indigo-500/50 bg-indigo-600/20 text-white";
            }
            return (
              <button key={i} onClick={() => { if (!showAnswer) setSelected(i); }} disabled={showAnswer} className={`w-full text-right py-3 px-5 rounded-xl border transition-all ${style}`}>
                {choice}
              </button>
            );
          })}
        </div>

        {showAnswer && q.explanation && (
          <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-xl p-4 mb-4">
            <p className="text-indigo-200/70 text-sm">{q.explanation}</p>
          </div>
        )}

        {!showAnswer ? (
          <button onClick={checkAnswer} disabled={selected === null} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-bold transition-all active:scale-[0.98]">
            تحقق
          </button>
        ) : (
          <div>
            {schedule ? (
              <div className="space-y-2">
                <p className="text-indigo-300/40 text-[10px] text-center mb-2">كيف كان تذكّرك لهذا السؤال؟ (FSRS)</p>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => rateAndNext(1)} className="py-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-xl text-xs font-medium border border-red-500/10 transition-all">
                    لم أتذكر
                    <span className="block text-[8px] text-red-400/50 mt-0.5">{schedule.again === 0 ? "الآن" : `${schedule.again} يوم`}</span>
                  </button>
                  <button onClick={() => rateAndNext(2)} className="py-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-xl text-xs font-medium border border-amber-500/10 transition-all">
                    صعب
                    <span className="block text-[8px] text-amber-400/50 mt-0.5">{Math.round(schedule.hard * 10) / 10} يوم</span>
                  </button>
                  <button onClick={() => rateAndNext(3)} className="py-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl text-xs font-medium border border-indigo-500/10 transition-all">
                    جيد
                    <span className="block text-[8px] text-indigo-400/50 mt-0.5">{Math.round(schedule.good * 10) / 10} يوم</span>
                  </button>
                  <button onClick={() => rateAndNext(4)} className="py-3 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded-xl text-xs font-medium border border-green-500/10 transition-all">
                    سهل
                    <span className="block text-[8px] text-green-400/50 mt-0.5">{Math.round(schedule.easy * 10) / 10} يوم</span>
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={goNext} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all active:scale-[0.98]">
                التالي
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
