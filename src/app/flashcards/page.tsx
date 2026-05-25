"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { QUDRAT_SECTIONS } from "@/data/qudrat-questions";

interface Flashcard {
  question: string;
  answer: string;
  category: string;
}

export default function FlashcardsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<"all" | "kamy" | "lafzy">("all");
  const [known, setKnown] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    loadCards("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  function loadCards(m: "all" | "kamy" | "lafzy") {
    setMode(m);
    const allCards: Flashcard[] = [];
    for (const section of QUDRAT_SECTIONS) {
      if (m !== "all" && section.section_id !== m) continue;
      for (const q of section.questions) {
        allCards.push({
          question: q.text,
          answer: q.choices[q.correct_index],
          category: section.section_name,
        });
      }
    }
    // Shuffle
    for (let i = allCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allCards[i], allCards[j]] = [allCards[j], allCards[i]];
    }
    setCards(allCards);
    setCurrentIndex(0);
    setFlipped(false);
    setKnown(new Set());
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950">
        <div className="animate-pulse text-indigo-300">جارٍ التحميل...</div>
      </div>
    );
  }

  const card = cards[currentIndex];
  const remaining = cards.length - known.size;

  function next(isKnown: boolean) {
    if (isKnown) {
      setKnown((prev) => new Set(prev).add(currentIndex));
    }
    setFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setCurrentIndex(0);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950">
      <header className="bg-black/20 backdrop-blur border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-indigo-300 hover:text-white transition-colors">→</a>
          <h1 className="text-xl font-bold text-white">📇 البطاقات التعليمية</h1>
        </div>
        <span className="text-indigo-300 text-sm">{remaining} متبقية</span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Mode selector */}
        <div className="flex gap-2 justify-center mb-8">
          {[
            { id: "all" as const, label: "الكل" },
            { id: "kamy" as const, label: "📐 كمي" },
            { id: "lafzy" as const, label: "📖 لفظي" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => loadCards(m.id)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                mode === m.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white/10 text-indigo-300 hover:bg-white/20"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Card */}
        {card && (
          <>
            <div
              onClick={() => setFlipped(!flipped)}
              className="cursor-pointer select-none"
            >
              <div className={`bg-white/10 backdrop-blur rounded-2xl border border-white/20 p-8 min-h-[300px] flex flex-col items-center justify-center text-center transition-all ${
                flipped ? "bg-indigo-600/20 border-indigo-500/30" : ""
              }`}>
                <span className="text-xs text-indigo-400 mb-4">{card.category}</span>
                <p className="text-indigo-300 text-xs mb-2">
                  {flipped ? "الإجابة" : "السؤال"} — {currentIndex + 1}/{cards.length}
                </p>
                {!flipped ? (
                  <p className="text-white text-xl leading-relaxed">{card.question}</p>
                ) : (
                  <div>
                    <p className="text-green-400 text-2xl font-bold mb-3">{card.answer}</p>
                    <p className="text-indigo-300 text-sm">{card.question}</p>
                  </div>
                )}
                {!flipped && (
                  <p className="text-indigo-400 text-xs mt-6">اضغط لإظهار الإجابة</p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-4 justify-center mt-6">
              <button
                onClick={() => next(false)}
                className="flex-1 py-3 bg-red-600/30 hover:bg-red-600/50 border border-red-500/30 text-red-200 rounded-xl text-sm font-bold transition-all"
              >
                ❌ لم أعرفها
              </button>
              <button
                onClick={() => next(true)}
                className="flex-1 py-3 bg-green-600/30 hover:bg-green-600/50 border border-green-500/30 text-green-200 rounded-xl text-sm font-bold transition-all"
              >
                ✓ عرفتها
              </button>
            </div>

            {/* Progress */}
            <div className="mt-6">
              <div className="flex justify-between text-xs text-indigo-300 mb-1">
                <span>التقدم</span>
                <span>{known.size}/{cards.length} معروفة</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${cards.length > 0 ? (known.size / cards.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </>
        )}

        {known.size === cards.length && cards.length > 0 && (
          <div className="text-center py-12">
            <span className="text-5xl block mb-4">🎉</span>
            <h2 className="text-2xl font-bold text-white mb-2">أحسنت!</h2>
            <p className="text-indigo-300 mb-6">راجعت جميع البطاقات</p>
            <button
              onClick={() => loadCards(mode)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-colors"
            >
              إعادة المراجعة
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
