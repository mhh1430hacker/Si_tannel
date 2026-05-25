import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  if (!category) {
    return NextResponse.json({ detail: "التصنيف مطلوب" }, { status: 400 });
  }

  try {
    let result = await sql`
      SELECT id, content, skill_category, difficulty, expected_time_seconds, image_url
      FROM questions WHERE skill_category = ${category} AND difficulty = 'سهل'
      ORDER BY RANDOM() LIMIT 1
    `;
    if (result.rows.length === 0) {
      result = await sql`
        SELECT id, content, skill_category, difficulty, expected_time_seconds, image_url
        FROM questions WHERE skill_category = ${category} AND difficulty = 'متوسط'
        ORDER BY RANDOM() LIMIT 1
      `;
    }
    if (result.rows.length === 0) {
      result = await sql`
        SELECT id, content, skill_category, difficulty, expected_time_seconds, image_url
        FROM questions WHERE skill_category = ${category}
        ORDER BY RANDOM() LIMIT 1
      `;
    }
    if (result.rows.length === 0) {
      return NextResponse.json({ detail: "لا توجد أسئلة في هذا التصنيف" }, { status: 404 });
    }

    const q = result.rows[0];
    const choices = await sql`
      SELECT id, choice_text, image_url FROM question_choices WHERE question_id = ${q.id}
    `;

    return NextResponse.json({
      id: q.id,
      content: q.content,
      skill_category: q.skill_category,
      difficulty: q.difficulty,
      expected_time_seconds: q.expected_time_seconds,
      image_url: q.image_url,
      choices: choices.rows.map((c) => ({ id: c.id, choice_text: c.choice_text, image_url: c.image_url })),
    });
  } catch {
    return NextResponse.json({ detail: "خطأ في قاعدة البيانات" }, { status: 500 });
  }
}
