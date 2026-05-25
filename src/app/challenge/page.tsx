"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { AI_OPPONENTS, simulateOpponentAnswer, getLeague } from "@/lib/league-system";
import type { AiOpponent } from "@/lib/league-system";
import { generateQuestions } from "@/lib/question-generator";
import type { QudratQuestion } from "@/data/qudrat-questions";
import { addSessionRecord } from "@/lib/user-store";
import { launchConfetti, playCorrectSound, playWrongSound, playChallengeWinSound, particleBurst } from "@/lib/effects";

type Phase = "select" | "countdown" | "battle" | "result";

interface BattleState {
  userScore: number;
  opponentScore: number;
  userStreak: number;
  opponentStreak: number;
  userTimes: number[];
  opponentTimes: number[];
}

export default function ChallengePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("select");
  const [opponent, setOpponent] = useState<AiOpponent | null>(null);
  const [questions, setQuestions] = useState<QudratQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [battle, setBattle] = useState<BattleState>({ userScore: 0, opponentScore: 0, userStreak: 0, opponentStreak: 0, userTimes: [], opponentTimes: [] });
  const [opponentAnswering, setOpponentAnswering] = useState(false);
  const [opponentChoice, setOpponentChoice] = useState<number | null>(null);
  const [qStartTime, setQStartTime] = useState(0);
  const opponentTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const processNextQuestion = useCallback(() => {
    setSelected(null);
    setShowResult(false);
    setOpponentChoice(null);
    setOpponentAnswering(false);
    if (currentQ + 1 >= questions.length) {
      // Battle ends
      const userTotal = battle.userScore + (selected === questions[currentQ]?.correct_index ? 1 : 0);
      addSessionRecord({
        session_id: crypto.randomUUID(),
        category: "تحدي أقران",
        total_questions: questions.length,
        correct_count: userTotal,
        total_time_seconds: battle.userTimes.reduce((s, t) => s + t, 0),
        date: new Date().toISOString(),
      });
      setPhase("result");
    } else {
      setCurrentQ((c) => c + 1);
      setQStartTime(Date.now());
      // Start opponent timer for next question
      if (opponent) {
        const opTime = Math.max(3, opponent.speed + (Math.random() - 0.5) * 8) * 1000;
        if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
        opponentTimerRef.current = setTimeout(() => {
          setOpponentAnswering(true);
        }, opTime);
      }
    }
  }, [currentQ, questions, battle, selected, opponent]);

  function startChallenge(opp: AiOpponent) {
    setOpponent(opp);
    setQuestions(generateQuestions(10, "both"));
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setBattle({ userScore: 0, opponentScore: 0, userStreak: 0, opponentStreak: 0, userTimes: [], opponentTimes: [] });
    setCountdown(3);
    setPhase("countdown");

    // Countdown
    let c = 3;
    const interval = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(interval);
        setPhase("battle");
        setQStartTime(Date.now());
        // Start opponent timer
        const opTime = Math.max(3, opp.speed + (Math.random() - 0.5) * 8) * 1000;
        opponentTimerRef.current = setTimeout(() => {
          setOpponentAnswering(true);
        }, opTime);
      }
    }, 1000);
  }

  function submitAnswer(choiceIdx: number) {
    if (showResult || selected !== null) return;
    setSelected(choiceIdx);
    setShowResult(true);

    const timeSpent = Math.round((Date.now() - qStartTime) / 1000);
    const q = questions[currentQ];
    const userCorrect = choiceIdx === q.correct_index;

    // Opponent answer
    const oppResult = opponent ? simulateOpponentAnswer(opponent) : { correct: false, timeSpent: 20 };
    const oppChoiceIdx = oppResult.correct ? q.correct_index : q.choices.findIndex((_, i) => i !== q.correct_index);
    setOpponentChoice(oppChoiceIdx >= 0 ? oppChoiceIdx : 0);

    // Effects
    if (userCorrect) {
      playCorrectSound();
      particleBurst(window.innerWidth / 2, window.innerHeight / 2, "#10b981");
    } else {
      playWrongSound();
    }

    setBattle((prev) => ({
      userScore: prev.userScore + (userCorrect ? 1 : 0),
      opponentScore: prev.opponentScore + (oppResult.correct ? 1 : 0),
      userStreak: userCorrect ? prev.userStreak + 1 : 0,
      opponentStreak: oppResult.correct ? prev.opponentStreak + 1 : 0,
      userTimes: [...prev.userTimes, timeSpent],
      opponentTimes: [...prev.opponentTimes, oppResult.timeSpent],
    }));

    if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);

    setTimeout(processNextQuestion, 2000);
  }

  // Trigger win effects when result phase is reached
  useEffect(() => {
    if (phase === "result" && battle.userScore > battle.opponentScore) {
      launchConfetti(4000);
      playChallengeWinSound();
    }
  }, [phase, battle.userScore, battle.opponentScore]);

  useEffect(() => {
    return () => {
      if (opponentTimerRef.current) clearTimeout(opponentTimerRef.current);
    };
  }, []);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  // ===== SELECT OPPONENT =====
  if (phase === "select") {
    const userLeague = getLeague(user.total_points);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <a href="/dashboard" className="text-indigo-300 hover:text-white text-sm mb-6 inline-block">→ العودة</a>
          <h1 className="text-2xl font-bold text-white text-center mb-2">⚔️ تحدي الأقران</h1>
          <p className="text-indigo-300 text-center text-sm mb-8">اختر خصمك وانطلق!</p>

          <div className="space-y-3">
            {AI_OPPONENTS.map((opp) => {
              const oppLeague = getLeague(opp.accuracy * 10000);
              return (
                <button
                  key={opp.id}
                  onClick={() => startChallenge(opp)}
                  className="w-full bg-white/5 hover:bg-white/10 rounded-2xl p-4 border border-white/10 hover:border-indigo-500/30 transition-all text-right"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{opp.avatar}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-bold text-lg">{opp.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-indigo-300">{opp.personality}</span>
                        <span className="text-xs">{LEAGUES_MAP[opp.league]?.icon}</span>
                      </div>
                      <p className="text-indigo-400 text-xs">{opp.description}</p>
                      <p className="text-yellow-400 text-xs mt-1">💬 &quot;{opp.catchphrase}&quot;</p>
                    </div>
                    <div className="text-center">
                      <span className="text-2xl">⚔️</span>
                      <p className="text-indigo-400 text-[10px]">تحدي</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 text-center text-indigo-400 text-xs">
            رتبتك: {userLeague.icon} {userLeague.nameAr} ({user.total_points} نقطة)
          </div>
        </div>
      </div>
    );
  }

  // ===== COUNTDOWN =====
  if (phase === "countdown") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center gap-12 mb-12">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-indigo-600/30 flex items-center justify-center text-3xl mb-2 border-2 border-indigo-500">
                {user.profile.name.charAt(0)}
              </div>
              <p className="text-white font-bold">{user.profile.name}</p>
            </div>
            <span className="text-3xl font-bold text-red-400 animate-pulse">VS</span>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-red-600/30 flex items-center justify-center text-4xl mb-2 border-2 border-red-500">
                {opponent?.avatar}
              </div>
              <p className="text-white font-bold">{opponent?.name}</p>
            </div>
          </div>
          <div className="text-8xl font-bold text-white animate-bounce">{countdown}</div>
          <p className="text-indigo-300 mt-4">استعد...</p>
        </div>
      </div>
    );
  }

  // ===== RESULT =====
  if (phase === "result" && opponent) {
    const userWon = battle.userScore > battle.opponentScore;
    const draw = battle.userScore === battle.opponentScore;
    const userAvgTime = battle.userTimes.length > 0 ? Math.round(battle.userTimes.reduce((s, t) => s + t, 0) / battle.userTimes.length) : 0;
    const oppAvgTime = battle.opponentTimes.length > 0 ? Math.round(battle.opponentTimes.reduce((s, t) => s + t, 0) / battle.opponentTimes.length) : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
        <div className="max-w-lg mx-auto pt-8">
          <div className={`text-center py-8 rounded-3xl border-2 mb-6 ${userWon ? "bg-green-600/10 border-green-500/30" : draw ? "bg-yellow-600/10 border-yellow-500/30" : "bg-red-600/10 border-red-500/30"}`}>
            <span className="text-6xl block mb-4">{userWon ? "🏆" : draw ? "🤝" : "😤"}</span>
            <h1 className="text-3xl font-bold text-white mb-2">
              {userWon ? "فوز!" : draw ? "تعادل!" : "خسارة!"}
            </h1>
            <p className="text-indigo-300">
              {userWon ? `تفوقت على ${opponent.name}!` : draw ? "أداء متساوٍ!" : `${opponent.name} فازت هذه المرة!`}
            </p>
          </div>

          {/* Score comparison */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-white font-bold text-xl mb-1">{user.profile.name}</p>
                <p className="text-3xl font-bold text-indigo-400">{battle.userScore}</p>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-2xl text-indigo-500">—</span>
              </div>
              <div>
                <p className="text-white font-bold text-xl mb-1">{opponent.name}</p>
                <p className="text-3xl font-bold text-red-400">{battle.opponentScore}</p>
              </div>
            </div>
          </div>

          {/* Stats comparison */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
            <h3 className="text-white font-bold mb-4 text-center">📊 مقارنة الأداء</h3>
            <CompareBar label="الدقة" userVal={`${Math.round((battle.userScore / questions.length) * 100)}٪`} oppVal={`${Math.round((battle.opponentScore / questions.length) * 100)}٪`} userPct={(battle.userScore / questions.length) * 100} oppPct={(battle.opponentScore / questions.length) * 100} />
            <CompareBar label="متوسط الوقت" userVal={`${userAvgTime} ث`} oppVal={`${oppAvgTime} ث`} userPct={Math.max(0, 100 - userAvgTime * 2)} oppPct={Math.max(0, 100 - oppAvgTime * 2)} />
            <CompareBar label="أفضل سلسلة" userVal={`${battle.userStreak}`} oppVal={`${battle.opponentStreak}`} userPct={battle.userStreak * 10} oppPct={battle.opponentStreak * 10} />
          </div>

          <div className="flex gap-3 justify-center">
            <button onClick={() => startChallenge(opponent)} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-colors">
              إعادة التحدي
            </button>
            <button onClick={() => setPhase("select")} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors">
              خصم آخر
            </button>
            <a href="/leaderboard" className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors border border-white/10">
              المتصدرين
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ===== BATTLE =====
  const q = questions[currentQ];
  if (!q || !opponent) return null;
  const progress = ((currentQ + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Score bar */}
        <div className="bg-black/40 backdrop-blur rounded-2xl p-3 mb-4 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-600/40 flex items-center justify-center text-sm text-white font-bold border border-indigo-500">
                {user.profile.name.charAt(0)}
              </div>
              <span className="text-indigo-300 text-sm font-bold">{battle.userScore}</span>
              {battle.userStreak >= 2 && <span className="text-orange-400 text-xs">🔥{battle.userStreak}</span>}
            </div>
            <span className="text-white text-sm font-bold">{currentQ + 1}/{questions.length}</span>
            <div className="flex items-center gap-2">
              {battle.opponentStreak >= 2 && <span className="text-orange-400 text-xs">🔥{battle.opponentStreak}</span>}
              <span className="text-red-300 text-sm font-bold">{battle.opponentScore}</span>
              <div className="w-8 h-8 rounded-full bg-red-600/40 flex items-center justify-center text-lg border border-red-500">
                {opponent.avatar}
              </div>
            </div>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Opponent status */}
        {opponentAnswering && !showResult && (
          <div className="text-center text-yellow-400 text-xs mb-2 animate-pulse">
            {opponent.name} أجاب/ت! 🏃
          </div>
        )}

        {/* Question */}
        <div className="bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-6 mb-4">
          <p className="text-white text-lg leading-relaxed">{q.text}</p>
        </div>

        {/* Choices */}
        <div className="space-y-3 mb-4">
          {q.choices.map((choice, i) => {
            let style = "border-white/10 bg-white/5 text-indigo-200 hover:bg-white/10";
            if (showResult) {
              if (i === q.correct_index) style = "border-green-500 bg-green-600/20 text-green-200";
              else if (i === selected && i !== q.correct_index) style = "border-red-500 bg-red-600/20 text-red-200";
              else if (i === opponentChoice && i !== q.correct_index) style = "border-orange-500 bg-orange-600/20 text-orange-200";
              else style = "border-white/5 bg-white/5 text-indigo-400";
            } else if (selected === i) {
              style = "border-indigo-500 bg-indigo-600/30 text-white";
            }
            return (
              <button
                key={i}
                onClick={() => submitAnswer(i)}
                disabled={showResult}
                className={`w-full text-right py-3 px-5 rounded-xl border transition-all relative ${style}`}
              >
                {choice}
                {showResult && i === opponentChoice && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">{opponent.avatar}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {showResult && q.explanation && (
          <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-3 text-indigo-200 text-sm">
            💡 {q.explanation}
          </div>
        )}
      </div>
    </div>
  );
}

function CompareBar({ label, userVal, oppVal, userPct, oppPct }: { label: string; userVal: string; oppVal: string; userPct: number; oppPct: number }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between text-xs text-indigo-300 mb-1">
        <span>{userVal}</span>
        <span>{label}</span>
        <span>{oppVal}</span>
      </div>
      <div className="flex gap-1 h-3">
        <div className="flex-1 bg-white/10 rounded-full overflow-hidden">
          <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, userPct)}%`, marginRight: "auto" }} />
        </div>
        <div className="flex-1 bg-white/10 rounded-full overflow-hidden">
          <div className="bg-red-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, oppPct)}%` }} />
        </div>
      </div>
    </div>
  );
}

// Helper — map league id to league data
import { LEAGUES } from "@/lib/league-system";
const LEAGUES_MAP: Record<string, typeof LEAGUES[0]> = {};
for (const l of LEAGUES) LEAGUES_MAP[l.id] = l;
