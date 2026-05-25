import { sql, hasDatabase } from "@/lib/db";
import { getCategories } from "@/lib/memory-store";
import { NextResponse } from "next/server";

export async function GET() {
  if (!hasDatabase) {
    return NextResponse.json(getCategories());
  }
  try {
    const result = await sql`SELECT DISTINCT skill_category FROM questions ORDER BY skill_category`;
    const dbCats = result.rows.map((r) => r.skill_category);
    return NextResponse.json(dbCats.length > 0 ? dbCats : getCategories());
  } catch {
    return NextResponse.json(getCategories());
  }
}
