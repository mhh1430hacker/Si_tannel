import { sql, hasDatabase } from "@/lib/db";
import { getSessionSummary } from "@/lib/memory-store";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;

  if (!hasDatabase) {
    const summary = getSessionSummary(sessionId);
    if (!summary) {
      return NextResponse.json({ detail: "الجلسة غير موجودة" }, { status: 404 });
    }
    return NextResponse.json(summary);
  }

  try {
    const result = await sql`
      SELECT is_correct, time_taken_seconds FROM user_answers WHERE session_id = ${sessionId}::uuid
    `;
    if (result.rows.length === 0) {
      const memSummary = getSessionSummary(sessionId);
      if (memSummary) return NextResponse.json(memSummary);
      return NextResponse.json({ detail: "الجلسة غير موجودة" }, { status: 404 });
    }
    const answers = result.rows;
    const correctCount = answers.filter((a) => a.is_correct).length;
    const total = answers.length;
    const totalTime = answers.reduce((sum, a) => sum + a.time_taken_seconds, 0);

    return NextResponse.json({
      session_id: sessionId,
      total_questions: total,
      correct_count: correctCount,
      incorrect_count: total - correctCount,
      accuracy_percentage: total > 0 ? Math.round((correctCount / total) * 1000) / 10 : 0,
      total_time_seconds: totalTime,
    });
  } catch {
    const memSummary = getSessionSummary(sessionId);
    if (memSummary) return NextResponse.json(memSummary);
    return NextResponse.json({ detail: "خطأ في قاعدة البيانات" }, { status: 500 });
  }
}
