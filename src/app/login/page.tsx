"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("الاسم مطلوب");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("البريد الإلكتروني غير صالح");
      return;
    }
    login(name.trim(), email.trim());
    router.push("/onboarding");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600/30 backdrop-blur mb-4">
            <span className="text-4xl">🧠</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">معمل قدرات</h1>
          <p className="text-indigo-200 text-sm">منصة ذكية للتدريب على اختبارات القدرات</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-6 text-center">تسجيل الدخول</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 text-red-200 text-sm rounded-lg p-3 mb-4 text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-indigo-200 text-sm mb-1.5">الاسم</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(""); }}
                placeholder="أدخل اسمك"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
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
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg transition-all hover:shadow-lg hover:shadow-indigo-500/30"
          >
            دخول
          </button>

          <p className="text-indigo-300/60 text-xs text-center mt-4">
            بياناتك محفوظة محلياً ويتم مزامنتها تلقائياً عند الاتصال بالسحابة
          </p>
        </form>
        <p className="text-center mt-4">
          <a href="/" className="text-indigo-400 hover:text-white text-sm transition-colors">→ العودة للصفحة الرئيسية</a>
        </p>
      </div>
    </div>
  );
}
