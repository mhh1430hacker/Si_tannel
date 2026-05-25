import { sql, hasDatabase } from "@/lib/db";
import {
  submitAnswer,
  getNextQuestion,
  getQuestionById,
  stripCorrectFlag,
} from "@/lib/memory-store";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, session_id, question_id, chosen_choice_id, time_taken_seconds } = body;

    // ---- In-memory mode (no DB) ----
    if (!hasDatabase) {
      const result = submitAnswer(session_id, question_id, chosen_choice_id, time_taken_seconds);
      if (!result) {
        return NextResponse.json({ detail: "السؤال أو الاختيار غير موجود" }, { status: 404 });
      }

      const question = getQuestionById(question_id);
      const nextQ = getNextQuestion(
        session_id,
        question?.skill_category || "",
        question?.difficulty || "متوسط",
        result.is_correct
      );

      return NextResponse.json({
        is_correct: result.is_correct,
        correct_choice_id: result.correct_choice_id,
        next_question: nextQ ? stripCorrectFlag(nextQ) : null,
        nudge: null,
      });
    }

    // ---- Database mode ----
    const questionResult = await sql`
      SELECT id, skill_category, difficulty FROM questions WHERE id = ${question_id}
    `;
    if (questionResult.rows.length === 0) {
      // Fallback to memory store
      const result = submitAnswer(session_id, question_id, chosen_choice_id, time_taken_seconds);
      if (!result) {
        return NextResponse.json({ detail: "السؤال غير موجود" }, { status: 404 });
      }
      const memQ = getQuestionById(question_id);
      const nextQ = getNextQuestion(session_id, memQ?.skill_category || "", memQ?.difficulty || "متوسط", result.is_correct);
      return NextResponse.json({
        is_correct: result.is_correct,
        correct_choice_id: result.correct_choice_id,
        next_question: nextQ ? stripCorrectFlag(nextQ) : null,
        nudge: null,
      });
    }
    const question = questionResult.rows[0];

    const choiceResult = await sql`
      SELECT id, is_correct FROM question_choices WHERE id = ${chosen_choice_id}
    `;
    if (choiceResult.rows.length === 0) {
      return NextResponse.json({ detail: "الاختيار غير موجود" }, { status: 404 });
    }
    const isCorrect = choiceResult.rows[0].is_correct;

    const correctChoiceResult = await sql`
      SELECT id FROM question_choices WHERE question_id = ${question_id} AND is_correct = true LIMIT 1
    `;
    const correctChoiceId = correctChoiceResult.rows.length > 0
      ? correctChoiceResult.rows[0].id
      : chosen_choice_id;

    await sql`
      INSERT INTO user_answers (user_id, session_id, question_id, chosen_choice_id, time_taken_seconds, is_correct)
      VALUES (${user_id}::uuid, ${session_id}::uuid, ${question_id}, ${chosen_choice_id}, ${time_taken_seconds}, ${isCorrect})
    `;

    const difficultyMap: Record<string, number> = { "سهل": 0, "متوسط": 1, "صعب": 2 };
    const revMap: Record<number, string> = { 0: "سهل", 1: "متوسط", 2: "صعب" };
    const currentLevel = difficultyMap[question.difficulty] ?? 1;
    const nextLevel = isCorrect ? Math.min(2, currentLevel + 1) : Math.max(0, currentLevel - 1);
    const targetDifficulty = revMap[nextLevel];

    let nextResult = await sql`
      SELECT id, content, skill_category, difficulty, expected_time_seconds, image_url
      FROM questions
      WHERE skill_category = ${question.skill_category}
        AND difficulty = ${targetDifficulty}
        AND id NOT IN (SELECT question_id FROM user_answers WHERE session_id = ${session_id}::uuid)
      ORDER BY RANDOM() LIMIT 1
    `;
    if (nextResult.rows.length === 0) {
      nextResult = await sql`
        SELECT id, content, skill_category, difficulty, expected_time_seconds, image_url
        FROM questions
        WHERE skill_category = ${question.skill_category}
          AND difficulty = 'متوسط'
          AND id NOT IN (SELECT question_id FROM user_answers WHERE session_id = ${session_id}::uuid)
        ORDER BY RANDOM() LIMIT 1
      `;
    }
    if (nextResult.rows.length === 0) {
      nextResult = await sql`
        SELECT id, content, skill_category, difficulty, expected_time_seconds, image_url
        FROM questions
        WHERE skill_category = ${question.skill_category}
          AND id NOT IN (SELECT question_id FROM user_answers WHERE session_id = ${session_id}::uuid)
        ORDER BY RANDOM() LIMIT 1
      `;
    }

    let nextQuestion = null;
    if (nextResult.rows.length > 0) {
      const nq = nextResult.rows[0];
      const nextChoices = await sql`
        SELECT id, choice_text, image_url FROM question_choices WHERE question_id = ${nq.id}
      `;
      nextQuestion = {
        id: nq.id,
        content: nq.content,
        skill_category: nq.skill_category,
        difficulty: nq.difficulty,
        expected_time_seconds: nq.expected_time_seconds,
        image_url: nq.image_url,
        choices: nextChoices.rows.map((c) => ({ id: c.id, choice_text: c.choice_text, image_url: c.image_url })),
      };
    }

    return NextResponse.json({
      is_correct: isCorrect,
      correct_choice_id: correctChoiceId,
      next_question: nextQuestion,
      nudge: null,
    });
  } catch {
    return NextResponse.json({ detail: "خطأ في معالجة الإجابة" }, { status: 500 });
  }
}
