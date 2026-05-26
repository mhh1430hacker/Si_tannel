"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { signUp } from "@/lib/supabase-auth";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const { loginWithAuth } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) { setError("الاسم مطلوب"); return; }
    if (!email.trim() || !email.includes("@")) { setError("البريد الإلكتروني غير صالح"); return; }
    if (password.length < 6) { setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    if (password !== confirmPassword) { setError("كلمتا المرور غير متطابقتين"); return; }

    if (!isSupabaseConfigured()) {
      setError("قاعدة البيانات غير مربوطة — تواصل مع مدير المنصة");
      return;
    }

    setSubmitting(true);
    const result = await signUp(email.trim(), password, name.trim());

    if (!result.success) {
      setError(result.error?.message ?? "حدث خطأ");
      setSubmitting(false);
      return;
    }

    loginWithAuth({
      id: result.userId!,
      email: result.email!,
      name: name.trim(),
    });

    router.push("/onboarding");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">إنشاء حساب جديد</h1>
          <p className="text-indigo-200/60 text-sm">سجّل حسابك وابدأ رحلتك مع القدرات</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/[0.07] backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/10">
          {error && (
            <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-indigo-200 text-sm mb-1.5">الاسم الكامل</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="أدخل اسمك"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                disabled={submitting}
              />
            </div>

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

            <div>
              <label className="block text-indigo-200 text-sm mb-1.5">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="6 أحرف على الأقل"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                  dir="ltr"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300/60 hover:text-white text-sm transition-colors"
                >
                  {showPassword ? "إخفاء" : "عرض"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-indigo-200 text-sm mb-1.5">تأكيد كلمة المرور</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                placeholder="أعد كتابة كلمة المرور"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                dir="ltr"
                disabled={submitting}
              />
            </div>
          </div>

          {password.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className={`h-1.5 flex-1 rounded-full ${password.length >= 8 ? "bg-green-500" : password.length >= 6 ? "bg-yellow-500" : "bg-red-500"}`} />
              <span className={`text-xs ${password.length >= 8 ? "text-green-400" : password.length >= 6 ? "text-yellow-400" : "text-red-400"}`}>
                {password.length >= 8 ? "قوية" : password.length >= 6 ? "مقبولة" : "ضعيفة"}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-all hover:shadow-lg hover:shadow-indigo-500/30"
          >
            {submitting ? "جارٍ التسجيل..." : "إنشاء حساب"}
          </button>

          <p className="text-indigo-300/60 text-xs text-center mt-4">
            بتسجيلك فإنك توافق على شروط الاستخدام وسياسة الخصوصية
          </p>
        </form>

        <p className="text-center mt-4">
          <span className="text-indigo-300/60 text-sm">لديك حساب بالفعل؟ </span>
          <a href="/login" className="text-indigo-400 hover:text-white text-sm font-medium transition-colors">تسجيل الدخول</a>
        </p>
        <p className="text-center mt-2">
          <a href="/" className="text-indigo-400/60 hover:text-white text-xs transition-colors">← العودة للصفحة الرئيسية</a>
        </p>
      </div>
    </div>
  );
}
