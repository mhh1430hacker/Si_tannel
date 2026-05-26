"use client";

import { useState } from "react";
import { resetPassword } from "@/lib/supabase-auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) {
      setError("البريد الإلكتروني غير صالح");
      return;
    }

    if (!isSupabaseConfigured()) {
      setError("قاعدة البيانات غير مربوطة — تواصل مع مدير المنصة");
      return;
    }

    setSubmitting(true);
    const result = await resetPassword(email.trim());

    if (!result.success) {
      setError(result.error?.message ?? "حدث خطأ");
      setSubmitting(false);
      return;
    }

    setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white/[0.07] backdrop-blur-lg rounded-2xl p-8 border border-white/10">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="text-xl font-bold text-white mb-3">تم إرسال رابط الاستعادة</h2>
            <p className="text-indigo-200/70 text-sm mb-6 leading-relaxed">
              تحقق من بريدك الإلكتروني <span dir="ltr" className="text-indigo-400 font-medium">{email}</span> واتبع التعليمات لإعادة تعيين كلمة المرور
            </p>
            <a
              href="/login"
              className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium transition-all"
            >
              العودة لتسجيل الدخول
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">نسيت كلمة المرور؟</h1>
          <p className="text-indigo-200/60 text-sm">أدخل بريدك وسنرسل لك رابط استعادة</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.07] backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/10">
          {error && (
            <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-indigo-200 text-sm mb-1.5">البريد الإلكتروني</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="example@email.com"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
              dir="ltr"
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-all hover:shadow-lg hover:shadow-indigo-500/30"
          >
            {submitting ? "جارٍ الإرسال..." : "إرسال رابط الاستعادة"}
          </button>
        </form>

        <p className="text-center mt-4">
          <a href="/login" className="text-indigo-400 hover:text-white text-sm transition-colors">← العودة لتسجيل الدخول</a>
        </p>
      </div>
    </div>
  );
}
