import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await sql`SELECT DISTINCT skill_category FROM questions ORDER BY skill_category`;
    return NextResponse.json(result.rows.map((r) => r.skill_category));
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
