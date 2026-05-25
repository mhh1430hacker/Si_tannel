import { sql } from "@/lib/db";
import { scrapeGoogleForm, MCQ_COMPATIBLE_TYPES } from "@/lib/form-scraper";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { form_url, skill_category, difficulty = "متوسط", correct_answers } = body;
    if (!form_url || !skill_category) {
      return NextResponse.json({ detail: "رابط النموذج والتصنيف مطلوبان" }, { status: 400 });
    }

    // correct_answers: optional map of question_id -> correct choice index (0-based)
    const manualAnswers: Record<string, number> = correct_answers || {};

    const formData = await scrapeGoogleForm(form_url);

    const existing = await sql`SELECT id FROM form_imports WHERE form_url = ${formData.form_url}`;
    let formImportId: number;
    if (existing.rows.length > 0) {
      formImportId = existing.rows[0].id;
      await sql`UPDATE form_imports SET last_synced_at = CURRENT_TIMESTAMP, form_title = ${formData.title} WHERE id = ${formImportId}`;
    } else {
      const ins = await sql`
        INSERT INTO form_imports (form_url, form_title, skill_category, difficulty)
        VALUES (${formData.form_url}, ${formData.title}, ${skill_category}, ${difficulty})
        RETURNING id
      `;
      formImportId = ins.rows[0].id;
    }

    const imported: any[] = [];
    let skipped = 0;

    for (const fq of formData.questions) {
      if (fq.question_type === null || !MCQ_COMPATIBLE_TYPES.has(fq.question_type) || fq.choices.length < 2) {
        skipped++;
        continue;
      }
      const ex = await sql`SELECT id, content, image_url FROM questions WHERE form_import_id = ${formImportId} AND form_question_id = ${fq.question_id}`;
      if (ex.rows.length > 0) {
        const cnt = await sql`SELECT COUNT(*) as c FROM question_choices WHERE question_id = ${ex.rows[0].id}`;
        imported.push({ id: ex.rows[0].id, content: ex.rows[0].content, image_url: ex.rows[0].image_url, choices_count: parseInt(cnt.rows[0].c) });
        continue;
      }

      const content = fq.text || (fq.image_url ? "[سؤال مصور]" : "");
      const qr = await sql`
        INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds, image_url, form_import_id, form_question_id)
        VALUES (${content}, ${skill_category}, ${difficulty}, 45, ${fq.image_url}, ${formImportId}, ${fq.question_id})
        RETURNING id
      `;
      const qid = qr.rows[0].id;

      // Determine correct answer: manual override > form answer key > none
      const manualIdx = manualAnswers[fq.question_id];

      for (let i = 0; i < fq.choices.length; i++) {
        let isCorrect = false;
        if (manualIdx !== undefined) {
          isCorrect = i === manualIdx;
        } else if (fq.choices[i].is_correct === true) {
          isCorrect = true;
        }
        await sql`
          INSERT INTO question_choices (question_id, choice_text, is_correct, image_url)
          VALUES (${qid}, ${fq.choices[i].text}, ${isCorrect}, ${fq.choices[i].image_url})
        `;
      }
      imported.push({ id: qid, content, image_url: fq.image_url, choices_count: fq.choices.length });
    }

    await sql`UPDATE form_imports SET questions_imported = ${imported.length} WHERE id = ${formImportId}`;

    return NextResponse.json({
      form_title: formData.title,
      total_extracted: formData.questions.length,
      questions_imported: imported.length,
      skipped_non_mcq: skipped,
      questions: imported,
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || "فشل في الاستيراد" }, { status: 400 });
  }
}
