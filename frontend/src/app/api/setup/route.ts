import { initializeDatabase } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await initializeDatabase();
    return NextResponse.json({ status: "ok", message: "تم إنشاء جداول قاعدة البيانات بنجاح" });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "ok", message: "API is running" });
}
