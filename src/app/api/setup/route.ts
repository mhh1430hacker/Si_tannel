import { initializeDatabase, hasDatabase } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  if (!hasDatabase) {
    return NextResponse.json({
      status: "ok",
      message: "التطبيق يعمل بدون قاعدة بيانات — الأسئلة المدمجة متاحة مباشرة. لتفعيل كل الميزات، أضف Vercel Postgres من إعدادات المشروع.",
      mode: "memory",
    });
  }
  try {
    await initializeDatabase();
    return NextResponse.json({ status: "ok", message: "تم إنشاء جداول قاعدة البيانات بنجاح", mode: "database" });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "API is running",
    mode: hasDatabase ? "database" : "memory",
  });
}
