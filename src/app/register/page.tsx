"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { signUp } from "@/lib/supabase-auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Mail, Lock, Eye, EyeOff, Sparkles, AlertCircle, ArrowRight, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const { loginWithAuth } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) { toast.error("الاسم مطلوب"); return; }
    if (!email.trim() || !email.includes("@")) { toast.error("البريد الإلكتروني غير صالح"); return; }
    if (password.length < 6) { toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل"); return; }
    if (password !== confirmPassword) { toast.error("كلمتا المرور غير متطابقتين"); return; }

    if (!isSupabaseConfigured()) {
      toast.error("قاعدة البيانات غير مربوطة — تواصل مع مدير المنصة");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUp(email.trim(), password, name.trim());

      if (!result.success) {
        toast.error(result.error?.message ?? "حدث خطأ أثناء إنشاء الحساب");
        setSubmitting(false);
        return;
      }

      toast.success("تم إنشاء الحساب بنجاح! جاري تحويلك لإكمال ملفك...");
      loginWithAuth({
        id: result.userId!,
        email: result.email!,
        name: name.trim(),
      });

      router.push("/onboarding");
    } catch (err) {
      console.error(err);
      toast.error("حدث عطل في الخادم. حاول مجدداً.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0C10] p-4 relative overflow-hidden py-12">
      {/* Background elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4">
             <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">ابدأ رحلتك</h1>
          <p className="text-gray-400 text-sm">أنشئ حسابك وانطلق نحو درجة الأحلام</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>

          <form onSubmit={handleSubmit} className="relative z-10">
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">الاسم الكامل</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="أدخل اسمك"
                    className="w-full bg-[#0B0C10]/50 border border-white/10 rounded-xl pr-11 pl-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">البريد الإلكتروني</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@domain.com"
                    className="w-full bg-[#0B0C10]/50 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-left"
                    dir="ltr"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">كلمة المرور</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">تأكيد كلمة المرور</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#0B0C10]/50 border border-white/10 rounded-xl pl-11 pr-12 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all text-left font-mono"
                    dir="ltr"
                    disabled={submitting}
                  />
                </div>
              </div>
            </div>

            {password.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <div className="flex flex-1 gap-1 h-1.5">
                  <div className={`h-full flex-1 rounded-full transition-colors ${password.length >= 1 ? (password.length >= 8 ? "bg-emerald-500" : password.length >= 6 ? "bg-amber-500" : "bg-red-500") : "bg-white/10"}`} />
                  <div className={`h-full flex-1 rounded-full transition-colors ${password.length >= 6 ? (password.length >= 8 ? "bg-emerald-500" : "bg-amber-500") : "bg-white/10"}`} />
                  <div className={`h-full flex-1 rounded-full transition-colors ${password.length >= 8 ? "bg-emerald-500" : "bg-white/10"}`} />
                </div>
                <span className={`text-xs font-medium w-12 text-center ${password.length >= 8 ? "text-emerald-400" : password.length >= 6 ? "text-amber-400" : "text-red-400"}`}>
                  {password.length >= 8 ? "قوية" : password.length >= 6 ? "مقبولة" : "ضعيفة"}
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]"
            >
              {submitting ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>إنشاء حساب</span>
                  <ArrowRight className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <p className="text-gray-500 text-xs text-center mt-6">
              بتسجيلك فإنك توافق على <a href="#" className="text-indigo-400 hover:text-white transition-colors">شروط الاستخدام</a> و <a href="#" className="text-indigo-400 hover:text-white transition-colors">سياسة الخصوصية</a>
            </p>
          </form>
        </div>

        <div className="mt-8 text-center space-y-4">
          <p className="text-gray-400 text-sm">
            لديك حساب بالفعل؟{" "}
            <a href="/login" className="text-white hover:text-indigo-400 font-bold transition-colors">تسجيل الدخول</a>
          </p>
          <a href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-xs transition-colors">
            <ArrowRight className="w-3 h-3" /> العودة للصفحة الرئيسية
          </a>
        </div>
      </motion.div>
    </div>
  );
}
