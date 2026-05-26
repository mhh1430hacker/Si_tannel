"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { QUDRAT_SECTIONS } from "@/data/qudrat-questions";
import type { QudratQuestion } from "@/data/qudrat-questions";
import { addSessionRecord } from "@/lib/user-store";
import { syncToCloud } from "@/lib/local-sync";


type ExamPhase = "setup" | "running" | "review";

interface ExamAnswer {
  questionIndex: number;
  selectedChoice: number | null;
  isCorrect: boolean;
  timeSpent: number;
}

export default function ExamPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Setup
  const [phase, setPhase] = useState<ExamPhase>("setup");
  const [section, setSection] = useState<"kamy" | "lafzy" | "both">("both");
  const [questionCount, setQuestionCount] = useState(20);
  const [timeLimitMin, setTimeLimitMin] = useState(25);

  // Exam state
  const [questions, setQuestions] = useState<QudratQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<ExamAnswer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [qStartTime, setQStartTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const savedRef = useRef(false);

  const saveSession = useCallback((finalAnswers: ExamAnswer[]) => {
    if (savedRef.current) return;
    savedRef.current = true;
    const correct = finalAnswers.filter((a) => a.isCorrect).length;
    const totalTime = finalAnswers.reduce((s, a) => s + a.timeSpent, 0);
    addSessionRecord({
      session_id: crypto.randomUUID(),
      category: section === "kamy" ? "كمي — الرياضيات" : section === "lafzy" ? "لفظي — اللغة العربية" : "كمي + لفظي",
      total_questions: finalAnswers.length,
      correct_count: correct,
      total_time_seconds: totalTime,
      date: new Date().toISOString(),
    });
    // Trigger cloud sync after session completion
    syncToCloud().catch(() => {});
  }, [section]);

  const endExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    saveSession(answers);
    setPhase("review");
  }, [answers, saveSession]);

  useEffect(() => {
    if (phase !== "running") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          endExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, endExam]);

  function startExam() {
    let pool: QudratQuestion[] = [];
    for (const s of QUDRAT_SECTIONS) {
      if (section === "both" || s.section_id === section) {
        pool = [...pool, ...s.questions];
      }
    }
    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setQuestions(pool.slice(0, questionCount));
    setAnswers([]);
    setCurrentQ(0);
    setSelected(null);
    setTimeLeft(timeLimitMin * 60);
    setQStartTime(Date.now());
    savedRef.current = false;
    setPhase("running");
  }

  function submitAnswer() {
    const timeSpent = Math.round((Date.now() - qStartTime) / 1000);
    const q = questions[currentQ];
    const isCorrect = selected === q.correct_index;
    const newAnswers = [...answers, { questionIndex: currentQ, selectedChoice: selected, isCorrect, timeSpent }];
    setAnswers(newAnswers);

    if (currentQ + 1 >= questions.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      saveSession(newAnswers);
      setPhase("review");
    } else {
      setCurrentQ((c) => c + 1);
      setSelected(null);
      setQStartTime(Date.now());
    }
  }

  function skipQuestion() {
    const timeSpent = Math.round((Date.now() - qStartTime) / 1000);
    setAnswers((prev) => [...prev, { questionIndex: currentQ, selectedChoice: null, isCorrect: false, timeSpent }]);
    if (currentQ + 1 >= questions.length) {
      endExam();
    } else {
      setCurrentQ((c) => c + 1);
      setSelected(null);
      setQStartTime(Date.now());
    }
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // Setup phase
  if (phase === "setup") {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-lg mx-auto">
          <a href="/dashboard" className="text-indigo-400 hover:text-white text-xs mb-6 inline-block">→ العودة</a>
          <div className="bg-white/[0.07] backdrop-blur rounded-2xl border border-white/10 p-6 md:p-8">
            <h1 className="text-xl font-bold text-white mb-2 text-center">اختبار محاكي</h1>
            <p className="text-indigo-300/60 text-sm text-center mb-8">يحاكي الاختبار الحقيقي بتوقيت وعدد أسئلة محدد</p>

            <div className="space-y-6">
              <div>
                <label className="text-indigo-200 text-sm mb-2 block">القسم</label>
                <div className="flex gap-1 bg-white/5 rounded-xl p-1">
                  {([["both", "كمي + لفظي"], ["kamy", "كمي"], ["lafzy", "لفظي"]] as const).map(([id, label]) => (
                    <button key={id} onClick={() => setSection(id)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${section === id ? "bg-indigo-600 text-white" : "text-indigo-300/70 hover:text-white"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-indigo-200 text-sm mb-2 block">عدد الأسئلة</label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 20, 25].map((n) => (
                    <button key={n} onClick={() => setQuestionCount(n)} className={`py-2.5 rounded-lg text-sm transition-all ${questionCount === n ? "bg-indigo-600 text-white" : "bg-white/10 text-indigo-300 hover:bg-white/20"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-indigo-200 text-sm mb-2 block">الوقت (دقيقة)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 20, 25, 30].map((t) => (
                    <button key={t} onClick={() => setTimeLimitMin(t)} className={`py-2.5 rounded-lg text-sm transition-all ${timeLimitMin === t ? "bg-indigo-600 text-white" : "bg-white/10 text-indigo-300 hover:bg-white/20"}`}>
                      {t} د
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button onClick={startExam} className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all active:scale-[0.98]">
              ابدأ الاختبار
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Review phase
  if (phase === "review") {
    const correct = answers.filter((a) => a.isCorrect).length;
    const accuracy = answers.length > 0 ? Math.round((correct / answers.length) * 100) : 0;
    const totalTime = answers.reduce((s, a) => s + a.timeSpent, 0);
    const avgTime = answers.length > 0 ? Math.round(totalTime / answers.length) : 0;
    const skipped = answers.filter((a) => a.selectedChoice === null).length;
    // Score prediction (out of 100 Qudrat scale)
    const predictedScore = Math.round(40 + (accuracy / 100) * 60);

    return (
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-white text-center mb-2">نتيجة الاختبار</h1>
          <p className="text-indigo-200/80 text-center text-sm mb-8">
            {accuracy >= 80 ? "أداء رائع — أنت من أفضل الطلاب" : accuracy >= 60 ? "أداء جيد — بتدريب إضافي ستصل للتميّز" : accuracy >= 40 ? "بداية موفقة — أغلب الطلاب يحتاجون عدة محاولات" : "كل خبير كان مبتدئاً — استمر وستلاحظ الفرق"}
          </p>

          {/* Score circle */}
          <div className="flex justify-center mb-8 animate-scale-in">
            <div className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center ${accuracy >= 70 ? "border-green-500 bg-green-600/20" : accuracy >= 50 ? "border-yellow-500 bg-yellow-600/20" : "border-amber-500 bg-amber-600/20"}`}>
              <span className="text-3xl font-bold text-white">{accuracy}٪</span>
              <span className="text-xs text-indigo-200">الدقة</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatBox label="صحيحة" value={correct.toString()} color="green" />
            <StatBox label="خاطئة" value={(answers.length - correct - skipped).toString()} color="red" />
            <StatBox label="تم تخطيها" value={skipped.toString()} color="yellow" />
            <StatBox label="متوسط الوقت" value={`${avgTime} ث`} color="blue" />
          </div>

          {/* Score prediction */}
          <div className="bg-gradient-to-l from-purple-600/20 to-indigo-600/20 rounded-2xl p-6 border border-purple-500/20 mb-6 text-center">
            <p className="text-indigo-300 text-sm mb-1">الدرجة المتوقعة في القدرات</p>
            <p className="text-4xl font-bold text-white">{predictedScore} <span className="text-lg text-indigo-300">/ ١٠٠</span></p>
            <p className="text-indigo-400 text-xs mt-1">تقدير تقريبي بناءً على أدائك</p>
          </div>

          {/* Question review */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
            <h2 className="text-lg font-bold text-white mb-4">مراجعة الأسئلة</h2>
            <div className="space-y-3">
              {answers.map((a, i) => {
                const q = questions[a.questionIndex];
                return (
                  <div key={i} className={`rounded-lg p-4 border transition-all ${a.isCorrect ? "bg-green-600/10 border-green-500/20" : "bg-amber-600/5 border-amber-500/20"}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-white text-sm flex-1">{i + 1}. {q.text}</p>
                      <span className={`text-xs shrink-0 ${a.isCorrect ? "text-green-400" : "text-amber-400"}`}>{a.isCorrect ? "✓" : "✗"}</span>
                    </div>
                    <div className="text-xs space-y-1">
                      {a.selectedChoice !== null && !a.isCorrect && (
                        <p className="text-amber-300">إجابتك: {q.choices[a.selectedChoice]}</p>
                      )}
                      {a.selectedChoice === null && <p className="text-yellow-300">تم التخطي</p>}
                      <p className="text-green-300">الصحيحة: {q.choices[q.correct_index]}</p>
                      {q.explanation && <p className="text-indigo-200 mt-1">💡 {q.explanation}</p>}
                      {!a.isCorrect && !q.explanation && (
                        <p className="text-indigo-300/60 mt-1">💡 هذا السؤال يخطئ فيه الكثير من الطلاب — راجعه وستتقنه</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <button onClick={() => { setPhase("setup"); setAnswers([]); }} className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all">
              اختبار جديد
            </button>
            <a href="/review" className="px-5 py-3 bg-white/5 text-indigo-300 rounded-xl text-sm hover:bg-white/10 transition-all border border-white/5">
              مراجعة أخطاء
            </a>
            <a href="/analytics" className="px-5 py-3 bg-white/5 text-indigo-300 rounded-xl text-sm hover:bg-white/10 transition-all border border-white/5">
              تحليلات
            </a>
          </div>


        </div>
      </div>
    );
  }

  // Running phase
  const q = questions[currentQ];
  const timeWarning = timeLeft < 60;
  const progress = ((currentQ + 1) / questions.length) * 100;

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Timer bar */}
        <div className="sticky top-0 bg-black/40 backdrop-blur rounded-2xl p-3 mb-6 border border-white/5 z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-indigo-300 text-sm">{currentQ + 1} / {questions.length}</span>
            <span className={`font-mono font-bold text-lg ${timeWarning ? "text-red-400 animate-pulse" : "text-white"}`}>
              ⏱ {formatTime(timeLeft)}
            </span>
            <button onClick={endExam} className="text-red-400 hover:text-red-300 text-sm">إنهاء</button>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white/[0.07] backdrop-blur rounded-2xl border border-white/10 p-6 mb-5">
          <p className="text-white text-base leading-relaxed">{q.text}</p>
        </div>

        {/* Choices */}
        <div className="space-y-3 mb-6">
          {q.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={`w-full text-right py-3.5 px-5 rounded-xl border transition-all ${
                selected === i
                  ? "border-indigo-500 bg-indigo-600/30 text-white"
                  : "border-white/10 bg-white/5 text-indigo-200 hover:bg-white/10"
              }`}
            >
              <span className="inline-flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
                  selected === i ? "border-indigo-400 bg-indigo-500 text-white" : "border-white/30"
                }`}>
                  {selected === i && "●"}
                </span>
                {choice}
              </span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={submitAnswer}
            disabled={selected === null}
            className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl font-bold transition-all"
          >
            تأكيد
          </button>
          <button onClick={skipQuestion} className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-indigo-300 rounded-xl text-sm transition-all border border-white/10">
            تخطي
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = { green: "bg-green-600/20 border-green-500/20", red: "bg-red-600/20 border-red-500/20", yellow: "bg-yellow-600/20 border-yellow-500/20", blue: "bg-blue-600/20 border-blue-500/20" };
  return (
    <div className={`${colors[color]} rounded-xl p-3 border text-center`}>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-indigo-300">{label}</p>
    </div>
  );
}
