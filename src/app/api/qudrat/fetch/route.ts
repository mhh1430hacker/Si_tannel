import { QUDRAT_SECTIONS } from "@/data/qudrat-questions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const section = request.nextUrl.searchParams.get("section");

  if (section) {
    const found = QUDRAT_SECTIONS.find((s) => s.section_id === section);
    if (!found) {
      return NextResponse.json({ detail: "القسم غير موجود" }, { status: 404 });
    }
    return NextResponse.json(found);
  }

  return NextResponse.json({
    sections: QUDRAT_SECTIONS.map((s) => ({
      section_id: s.section_id,
      section_name: s.section_name,
      question_count: s.questions.length,
    })),
  });
}
