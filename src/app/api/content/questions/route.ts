/**
 * Static Content API — Pre-built question sets served via CDN
 *
 * Uses ISR (Incremental Static Regeneration) to serve questions
 * as static content, minimizing bandwidth consumption.
 * Revalidates every hour.
 */

import { NextRequest, NextResponse } from "next/server";
import { QUDRAT_SECTIONS } from "@/data/qudrat-questions";

export const revalidate = 3600; // ISR: regenerate every hour

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section") || "all";
  const difficulty = req.nextUrl.searchParams.get("difficulty");
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);

  let questions = QUDRAT_SECTIONS.flatMap((s) => {
    if (section !== "all" && s.section_id !== section) return [];
    return s.questions.map((q, i) => ({
      id: `${s.section_id}-${i}`,
      text: q.text,
      choices: q.choices,
      difficulty: q.difficulty,
      section: s.section_id,
      hint: q.hint,
    }));
  });

  // Filter by difficulty
  if (difficulty) {
    questions = questions.filter((q) => q.difficulty === difficulty);
  }

  // Limit
  questions = questions.slice(0, limit);

  return NextResponse.json({
    questions,
    total: questions.length,
    section,
    generatedAt: new Date().toISOString(),
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
