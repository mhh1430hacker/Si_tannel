import { scrapeGoogleForm, MCQ_COMPATIBLE_TYPES } from "@/lib/form-scraper";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { form_url } = await request.json();
    if (!form_url) {
      return NextResponse.json({ detail: "رابط النموذج مطلوب" }, { status: 400 });
    }
    const formData = await scrapeGoogleForm(form_url);
    const questions = formData.questions.map((q) => {
      const isMcq = q.question_type !== null && MCQ_COMPATIBLE_TYPES.has(q.question_type) && q.choices.length >= 2;
      return {
        question_id: q.question_id,
        text: q.text,
        image_url: q.image_url,
        question_type: q.question_type,
        choices: q.choices.map((c) => ({ text: c.text, image_url: c.image_url })),
        is_mcq: isMcq,
      };
    });
    return NextResponse.json({
      title: formData.title,
      description: formData.description,
      total_questions: formData.questions.length,
      mcq_questions: questions.filter((q) => q.is_mcq).length,
      questions,
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || "فشل في استخراج النموذج" }, { status: 400 });
  }
}
