"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
      return;
    }
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-2">معمل قدرات</h1>
          <p className="text-indigo-300/60 animate-pulse text-sm">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <span className="text-white font-bold text-sm">معمل قدرات</span>
        <a href="/login" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all">
          دخول
        </a>
      </header>

      {/* Hero */}
      <div className={`max-w-3xl mx-auto px-4 pt-20 pb-16 text-center transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4">
          حضّر للقدرات
          <br />
          <span className="text-indigo-400">بأذكى طريقة</span>
        </h1>
        <p className="text-indigo-200/60 text-base md:text-lg max-w-xl mx-auto mb-8 leading-relaxed">
          اختبارات محاكية، تحليل أداء، تحدي أقران، وخطة دراسية مخصصة — كل ما تحتاجه في مكان واحد
        </p>
        <a
          href="/login"
          className="inline-block px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all active:scale-[0.98]"
        >
          ابدأ مجاناً
        </a>
      </div>

      {/* Stats */}
      <div className="max-w-3xl mx-auto px-4 mb-16">
        <div className="grid grid-cols-3 gap-4">
          {[
            { value: "50+", label: "سؤال جاهز" },
            { value: "5", label: "رُتب تنافسية" },
            { value: "∞", label: "اختبارات محاكية" },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-indigo-400/60 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-white font-bold text-lg text-center mb-8">ما الذي يميزنا؟</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { title: "اختبارات محاكية", desc: "تحاكي الاختبار الحقيقي بتوقيت وعدد أسئلة" },
            { title: "تحليل أداء", desc: "تقارير شاملة عن نقاط القوة والضعف" },
            { title: "تحدي أقران", desc: "نافس لاعبين آخرين وارتقِ بتصنيفك" },
            { title: "مساعد ذكي", desc: "يحلل أداءك ويقدم نصائح مخصصة" },
          ].map((f, i) => (
            <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-5 hover:bg-white/[0.07] transition-all">
              <h3 className="text-white font-bold text-sm mb-1">{f.title}</h3>
              <p className="text-indigo-300/50 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="text-indigo-400/40 text-xs">معمل قدرات</span>
          <a href="https://buymeacoffee.com/khalas" target="_blank" rel="noopener noreferrer" className="text-indigo-400/40 hover:text-indigo-300 text-xs transition-colors">
            ادعم المطور
          </a>
        </div>
      </footer>
    </div>
  );
}
