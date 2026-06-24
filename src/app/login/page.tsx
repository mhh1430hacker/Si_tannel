"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { signIn } from "@/lib/supabase-auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Mail, Lock, Eye, EyeOff, Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !email.includes("@")) { setError("البريد الإلكتروني غير صالح"); return; }
    if (!password) { setError("كلمة المرور مطلوبة"); return; }

    if (!isSupabaseConfigured()) {
      setError("قاعدة البيانات غير مربوطة — تواصل مع مدير المنصة");
      return;
    }

    setSubmitting(true);
    const result = await signIn(email.trim(), password);

    if (!result.success) {
      setError(result.error?.message ?? "حدث خطأ");
      setSubmitting(false);
      return;
    }

    loginWithAuth({
      id: result.userId!,
      email: result.email!,
      name: "",
    });

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0C10] p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
             <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">مرحباً بعودتك</h1>
          <p className="text-gray-400 text-sm">سجل دخولك لاستكمال رحلة التعلم</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>

          <form onSubmit={handleSubmit} className="relative z-10">
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">البريد الإلكتروني</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    placeholder="example@domain.com"
                    className="w-full bg-[#0B0C10]/50 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-left"
                    dir="ltr"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-300 text-sm font-medium">كلمة المرور</label>
                  <a href="/forgot-password" className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors">
                    نسيت كلمة المرور؟
                  </a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    className="w-full bg-[#0B0C10]/50 border border-white/10 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-left font-mono"
                    dir="ltr"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
            >
              {submitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center space-y-4">
          <p className="text-gray-400 text-sm">
            ليس لديك حساب؟{" "}
            <a href="/register" className="text-white hover:text-indigo-400 font-bold transition-colors">إنشاء حساب جديد</a>
          </p>
          <a href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-xs transition-colors">
            <ArrowRight className="w-3 h-3" /> العودة للصفحة الرئيسية
          </a>
        </div>
      </motion.div>
    </div>
  );
}
