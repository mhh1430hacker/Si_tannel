import { sql } from "@/lib/db";
import { QUDRAT_SECTIONS } from "@/data/qudrat-questions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { section_id, difficulty = "متوسط" } = await request.json();
    if (!section_id) {
      return NextResponse.json({ detail: "القسم مطلوب" }, { status: 400 });
    }

    const section = QUDRAT_SECTIONS.find((s) => s.section_id === section_id);
    if (!section) {
      return NextResponse.json({ detail: "القسم غير موجود" }, { status: 404 });
    }

    const skillCategory = section.section_name;
    let imported = 0;
    let skipped = 0;

    for (const q of section.questions) {
      // Check if question already exists (by content + category)
      const existing = await sql`
        SELECT id FROM questions
        WHERE content = ${q.text} AND skill_category = ${skillCategory}
        LIMIT 1
      `;
      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      const qr = await sql`
        INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds, image_url)
        VALUES (${q.text}, ${skillCategory}, ${difficulty}, 60, ${q.image_url || null})
        RETURNING id
      `;
      const qid = qr.rows[0].id;

      for (let i = 0; i < q.choices.length; i++) {
        await sql`
          INSERT INTO question_choices (question_id, choice_text, is_correct)
          VALUES (${qid}, ${q.choices[i]}, ${i === q.correct_index})
        `;
      }
      imported++;
    }

    return NextResponse.json({
      section_name: section.section_name,
      total_available: section.questions.length,
      imported,
      skipped_duplicates: skipped,
    });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message || "فشل في الاستيراد" }, { status: 500 });
  }
}
