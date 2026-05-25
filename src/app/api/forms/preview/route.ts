import {
  scrapeForm,
  MCQ_COMPATIBLE_TYPES,
  detectFormPlatform,
  autoTestGoogleFormAnswers,
} from "@/lib/form-scraper";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { form_url, auto_test_answers } = await request.json();
    if (!form_url) {
      return NextResponse.json(
        { detail: "رابط النموذج مطلوب" },
        { status: 400 }
      );
    }

    const platform = detectFormPlatform(form_url);
    const formData = await scrapeForm(form_url);

    // Count questions without answer keys
    const questionsWithoutKeys = formData.questions.filter(
      (q) =>
        !q.has_answer_key &&
        q.question_type !== null &&
        MCQ_COMPATIBLE_TYPES.has(q.question_type) &&
        q.choices.length >= 2
    );

    // Auto-test answers for Google Forms quizzes if requested and some lack answer keys
    let autoTestedAnswers: Record<string, number> = {};
    if (
      auto_test_answers &&
      platform === "google" &&
      questionsWithoutKeys.length > 0
    ) {
      try {
        autoTestedAnswers = await autoTestGoogleFormAnswers(
          form_url,
          formData
        );
        // Apply discovered answers
        for (const q of formData.questions) {
          if (autoTestedAnswers[q.question_id] !== undefined) {
            const correctIdx = autoTestedAnswers[q.question_id];
            q.choices = q.choices.map((c, i) => ({
              ...c,
              is_correct: i === correctIdx,
            }));
            q.has_answer_key = true;
          }
        }
      } catch {
        // auto-test failed silently
      }
    }

    const questions = formData.questions.map((q) => {
      const isMcq =
        q.question_type !== null &&
        MCQ_COMPATIBLE_TYPES.has(q.question_type) &&
        q.choices.length >= 2;
      return {
        question_id: q.question_id,
        text: q.text,
        image_url: q.image_url,
        question_type: q.question_type,
        choices: q.choices.map((c) => ({
          text: c.text,
          image_url: c.image_url,
          is_correct: c.is_correct,
        })),
        is_mcq: isMcq,
        has_answer_key: q.has_answer_key,
      };
    });

    return NextResponse.json({
      title: formData.title,
      description: formData.description,
      total_questions: formData.questions.length,
      mcq_questions: questions.filter((q) => q.is_mcq).length,
      questions,
      is_quiz: formData.is_quiz,
      platform: formData.platform,
      auto_tested_count: Object.keys(autoTestedAnswers).length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error.message || "فشل في استخراج النموذج" },
      { status: 400 }
    );
  }
}
