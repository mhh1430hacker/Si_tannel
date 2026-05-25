import { sql, hasDatabase } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { importId: string } }
) {
  if (!hasDatabase) {
    return NextResponse.json({ detail: "يتطلب قاعدة بيانات" }, { status: 503 });
  }
  const importId = parseInt(params.importId);
  if (isNaN(importId)) {
    return NextResponse.json({ detail: "معرف غير صالح" }, { status: 400 });
  }
  try {
    const ex = await sql`SELECT id FROM form_imports WHERE id = ${importId}`;
    if (ex.rows.length === 0) {
      return NextResponse.json({ detail: "غير موجود" }, { status: 404 });
    }
    await sql`DELETE FROM questions WHERE form_import_id = ${importId}`;
    await sql`DELETE FROM form_imports WHERE id = ${importId}`;
    return NextResponse.json({ detail: "تم الحذف بنجاح" });
  } catch {
    return NextResponse.json({ detail: "خطأ" }, { status: 500 });
  }
}
