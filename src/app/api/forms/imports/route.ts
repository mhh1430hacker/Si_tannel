import { sql, hasDatabase } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  if (!hasDatabase) {
    return NextResponse.json([]);
  }
  try {
    const result = await sql`
      SELECT id, form_url, form_title, skill_category, difficulty, questions_imported, imported_at
      FROM form_imports ORDER BY imported_at DESC
    `;
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json([]);
  }
}
