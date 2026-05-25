"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { findWaitingRoom, createRoom, joinRoom, getRoom, submitAnswer, subscribeToRoom, cancelRoom, syncUserToSupabase, isSupabaseConfigured } from "@/lib/supabase-api";
import type { ChallengeRoom } from "@/lib/supabase-api";
import { generateQuestions } from "@/lib/question-generator";
import type { QudratQuestion } from "@/data/qudrat-questions";
import { getLeague } from "@/lib/league-system";
import { getPerformanceAnalytics } from "@/lib/user-store";
import { playCorrectSound, playWrongSound, launchConfetti, playChallengeWinSound } from "@/lib/effects";

type Phase = "lobby" | "searching" | "countdown" | "battle" | "result";

export default function RealChallengePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("lobby");
  const [section, setSection] = useState("both");
  const [room, setRoom] = useState<ChallengeRoom | null>(null);
  const [playerNum, setPlayerNum] = useState<1 | 2>(1);
  const [countdown, setCountdown] = useState(3);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [myScore, setMyScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentName, setOpponentName] = useState("...");
  const [searchTime, setSearchTime] = useState(0);
  const [questions, setQuestions] = useState<QudratQuestion[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof subscribeToRoom> | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      if (channelRef.current) channelRef.current.unsubscribe();
    };
  }, []);

  const startSearch = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      router.push("/challenge");
      return;
    }

    setPhase("searching");
    setSearchTime(0);
    searchTimerRef.current = setInterval(() => setSearchTime((t) => t + 1), 1000);

    // Sync user first
    const analytics = getPerformanceAnalytics(user);
    await syncUserToSupabase({
      id: user.profile.id,
      name: user.profile.name,
      email: user.profile.email,
      avatar_color: user.profile.avatar_color,
      total_points: user.total_points,
      total_questions: analytics.totalQuestions,
      total_correct: analytics.totalCorrect,
      accuracy: analytics.overallAccuracy,
      streak_current: user.streak.current,
      streak_longest: user.streak.longest,
      league: getLeague(user.total_points).id,
    });

    // Look for waiting room
    const waiting = await findWaitingRoom(user.profile.id, section);
    if (waiting) {
      // Join existing room
      const joined = await joinRoom(waiting.id, user.profile.id);
      if (joined) {
        setRoom(joined);
        setPlayerNum(2);
        setQuestions(joined.questions as QudratQuestion[]);
        if (searchTimerRef.current) clearInterval(searchTimerRef.current);
        startBattle(joined.id, 2);
        return;
      }
    }

    // Create new room
    const qs = generateQuestions(10, section as "kamy" | "lafzy" | "both");
    const created = await createRoom(user.profile.id, section, qs);
    if (created) {
      setRoom(created);
      setPlayerNum(1);
      setQuestions(qs);

      // Subscribe to room updates (waiting for opponent)
      channelRef.current = subscribeToRoom(created.id, (updated) => {
        if (updated.status === "active" && updated.player2_id) {
          setRoom(updated);
          if (searchTimerRef.current) clearInterval(searchTimerRef.current);
          startBattle(created.id, 1);
        }
      });
    }
  }, [user, section, router]);

  function startBattle(roomId: string, pNum: 1 | 2) {
    setPhase("countdown");
    let c = 3;
    setCountdown(c);
    const ci = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(ci);
        setPhase("battle");
        setCurrentQ(0);
        setSelected(null);
        setShowResult(false);
        setMyScore(0);
        setOpponentScore(0);

        // Subscribe to real-time updates for opponent score
        if (channelRef.current) channelRef.current.unsubscribe();
        channelRef.current = subscribeToRoom(roomId, (updated) => {
          const oppScoreField = pNum === 1 ? "player2_score" : "player1_score";
          setOpponentScore(updated[oppScoreField] as number);
          if (updated.status === "completed") {
            setRoom(updated);
          }
        });
      }
    }, 1000);
  }

  async function handleAnswer(idx: number) {
    if (selected !== null || !room || !user) return;
    setSelected(idx);
    setShowResult(true);

    const q = questions[currentQ];
    const isCorrect = idx === q.correct_index;

    if (isCorrect) {
      playCorrectSound();
      setMyScore((s) => s + 1);
    } else {
      playWrongSound();
    }

    await submitAnswer(room.id, playerNum, idx, isCorrect);

    setTimeout(() => {
      if (currentQ + 1 < questions.length) {
        setCurrentQ((c) => c + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        finishBattle();
      }
    }, 1500);
  }

  async function finishBattle() {
    if (!room) return;
    // Fetch final room state
    const final = await getRoom(room.id);
    if (final) setRoom(final);
    setPhase("result");

    const finalMyScore = playerNum === 1
      ? (final?.player1_score ?? myScore)
      : (final?.player2_score ?? myScore);
    const finalOppScore = playerNum === 1
      ? (final?.player2_score ?? opponentScore)
      : (final?.player1_score ?? opponentScore);

    setMyScore(finalMyScore);
    setOpponentScore(finalOppScore);

    if (finalMyScore > finalOppScore) {
      launchConfetti(4000);
      playChallengeWinSound();
    }
  }

  function cancelSearch() {
    if (searchTimerRef.current) clearInterval(searchTimerRef.current);
    if (room) cancelRoom(room.id);
    if (channelRef.current) channelRef.current.unsubscribe();
    setPhase("lobby");
  }

  // Load opponent name
  useEffect(() => {
    if (room && phase !== "lobby" && phase !== "searching") {
      const oppId = playerNum === 1 ? room.player2_id : room.player1_id;
      if (oppId) setOpponentName("خصم حقيقي");
    }
  }, [room, playerNum, phase]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  // ===== LOBBY =====
  if (phase === "lobby") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
        <div className="max-w-lg mx-auto pt-8">
          <a href="/challenge" className="text-indigo-300 hover:text-white text-sm mb-6 inline-block">→ تحدي AI</a>
          <h1 className="text-2xl font-bold text-white text-center mb-2">⚔️ تحدي أقران حقيقي</h1>
          <p className="text-indigo-300 text-center text-sm mb-8">تنافس مع لاعبين حقيقيين في الوقت الحقيقي!</p>

          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
            <h3 className="text-white font-bold mb-4">اختر القسم</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "both", label: "الكل", icon: "📚" },
                { id: "kamy", label: "كمي", icon: "📐" },
                { id: "lafzy", label: "لفظي", icon: "📖" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`py-3 rounded-xl border text-center transition-all ${section === s.id ? "bg-indigo-600/30 border-indigo-500/50 text-white" : "bg-white/5 border-white/10 text-indigo-300 hover:bg-white/10"}`}
                >
                  <span className="text-2xl block">{s.icon}</span>
                  <span className="text-xs">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={startSearch}
            className="w-full py-4 bg-gradient-to-l from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-red-600/20"
          >
            🔍 ابحث عن خصم حقيقي
          </button>

          <p className="text-indigo-400 text-xs text-center mt-4">سيتم مطابقتك مع لاعب يبحث أيضاً عن تحدي</p>
        </div>
      </div>
    );
  }

  // ===== SEARCHING =====
  if (phase === "searching") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
          <h2 className="text-2xl font-bold text-white mb-2">جارٍ البحث عن خصم...</h2>
          <p className="text-indigo-300 text-sm mb-4">⏱ {searchTime} ثانية</p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm">متصل</span>
          </div>
          <button onClick={cancelSearch} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-indigo-300 rounded-xl text-sm transition-all">
            إلغاء البحث
          </button>
          {searchTime > 15 && (
            <p className="text-yellow-400 text-xs mt-4">💡 لا يوجد لاعبون حالياً — جرّب تحدي AI بدلاً</p>
          )}
          {searchTime > 30 && (
            <button onClick={() => { cancelSearch(); router.push("/challenge"); }} className="mt-2 px-6 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-xl text-sm transition-all">
              ⚔️ تحدي AI بدلاً
            </button>
          )}
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
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-2 border-2 border-indigo-500" style={{ backgroundColor: user.profile.avatar_color }}>
                {user.profile.name.charAt(0)}
              </div>
              <p className="text-white font-bold">{user.profile.name}</p>
            </div>
            <span className="text-3xl font-bold text-red-400 animate-pulse">VS</span>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-red-600/30 flex items-center justify-center text-4xl mb-2 border-2 border-red-500">
                👤
              </div>
              <p className="text-white font-bold">{opponentName}</p>
            </div>
          </div>
          <div className="text-8xl font-bold text-white animate-bounce">{countdown}</div>
          <p className="text-indigo-300 mt-4">استعد...</p>
        </div>
      </div>
    );
  }

  // ===== BATTLE =====
  if (phase === "battle" && questions[currentQ]) {
    const q = questions[currentQ];
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
        <div className="max-w-lg mx-auto pt-4">
          {/* Score bar */}
          <div className="flex items-center justify-between bg-white/5 rounded-2xl p-3 border border-white/10 mb-4">
            <div className="text-center">
              <p className="text-white font-bold text-lg">{myScore}</p>
              <p className="text-indigo-400 text-xs">{user.profile.name}</p>
            </div>
            <div className="text-center">
              <span className="text-red-400 font-bold text-sm">VS</span>
              <p className="text-indigo-400 text-xs">{currentQ + 1}/{questions.length}</p>
            </div>
            <div className="text-center">
              <p className="text-red-400 font-bold text-lg">{opponentScore}</p>
              <p className="text-red-300 text-xs">{opponentName}</p>
            </div>
          </div>

          {/* Question */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-4">
            <p className="text-white text-lg leading-relaxed text-right">{q.text}</p>
          </div>

          {/* Choices */}
          <div className="space-y-3">
            {q.choices.map((choice, idx) => {
              let bg = "bg-white/5 border-white/10 hover:bg-white/10";
              if (showResult) {
                if (idx === q.correct_index) bg = "bg-green-600/20 border-green-500/30";
                else if (idx === selected) bg = "bg-red-600/20 border-red-500/30";
              } else if (idx === selected) {
                bg = "bg-indigo-600/20 border-indigo-500/30";
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={selected !== null}
                  className={`w-full text-right py-4 px-5 rounded-2xl border transition-all ${bg}`}
                >
                  <span className="text-white">{choice}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ===== RESULT =====
  if (phase === "result") {
    const won = myScore > opponentScore;
    const draw = myScore === opponentScore;
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
        <div className="max-w-lg mx-auto pt-8">
          <div className={`text-center py-8 rounded-3xl border-2 mb-6 ${won ? "bg-green-600/10 border-green-500/30" : draw ? "bg-yellow-600/10 border-yellow-500/30" : "bg-red-600/10 border-red-500/30"}`}>
            <span className="text-6xl block mb-4">{won ? "🏆" : draw ? "🤝" : "😤"}</span>
            <h1 className="text-3xl font-bold text-white mb-2">
              {won ? "فوز!" : draw ? "تعادل!" : "خسارة!"}
            </h1>
            <p className="text-indigo-300">{won ? "أحسنت! تفوقت على خصمك!" : draw ? "أداء متساوٍ!" : "حظ أوفر في المرة القادمة!"}</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-white font-bold">{user.profile.name}</p>
                <p className="text-3xl font-bold text-indigo-400">{myScore}</p>
              </div>
              <div className="flex items-center justify-center">
                <span className="text-2xl text-indigo-500">—</span>
              </div>
              <div>
                <p className="text-white font-bold">{opponentName}</p>
                <p className="text-3xl font-bold text-red-400">{opponentScore}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setPhase("lobby"); setRoom(null); }} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all">
              🔄 تحدي جديد
            </button>
            <a href="/leaderboard" className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-indigo-300 rounded-xl font-bold text-center transition-all">
              🏅 المتصدرين
            </a>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
