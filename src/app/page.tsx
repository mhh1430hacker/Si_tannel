"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

const FEATURES = [
  { icon: "📝", title: "اختبارات محاكية", desc: "اختبارات بتوقيت حقيقي تحاكي اختبار القدرات الفعلي" },
  { icon: "🧠", title: "خريطة دماغية", desc: "شبكة عصبية تفاعلية تعرض نقاط قوتك وضعفك" },
  { icon: "⚔️", title: "تحدي أقران", desc: "تحدَّ خصوماً ذكية أو لاعبين حقيقيين وارتقِ بتصنيفك" },
  { icon: "🤖", title: "مساعد ذكي", desc: "مساعد AI يحلل أداءك ويقدم خطط دراسية مخصصة" },
  { icon: "📊", title: "تحليلات عميقة", desc: "تقارير شاملة ودقيقة عن أدائك من كل الزوايا" },
  { icon: "🏅", title: "دوريات وجوائز", desc: "5 رُتب تنافسية مع مكافآت حقيقية ولوحة متصدرين" },
];

const STATS = [
  { value: "50+", label: "سؤال جاهز" },
  { value: "22", label: "مهارة مُتتبعة" },
  { value: "5", label: "رُتب تنافسية" },
  { value: "∞", label: "اختبارات محاكية" },
];

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
          <span className="text-5xl block mb-4">🧠</span>
          <h1 className="text-2xl font-bold text-white mb-2">معمل قدرات</h1>
          <p className="text-indigo-300 animate-pulse">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        </div>

        <header className="relative z-10 px-4 py-4 flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🧠</span>
            <span className="text-white font-bold text-lg">معمل قدرات</span>
          </div>
          <a
            href="/login"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all"
          >
            دخول
          </a>
        </header>

        <div className={`relative z-10 max-w-4xl mx-auto px-4 pt-16 pb-20 text-center transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <div className="inline-block px-4 py-1.5 bg-indigo-600/20 border border-indigo-500/20 rounded-full text-indigo-300 text-xs font-bold mb-6">
            Ainex Qudrat Lab — منصة متكاملة
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
            منصة تحضير القدرات
            <br />
            <span className="bg-gradient-to-l from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              الأذكى في العالم العربي
            </span>
          </h1>
          <p className="text-indigo-200/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            ذكاء اصطناعي يحلل أداءك، خريطة دماغية تفاعلية، تحديات أقران حقيقية،
            وأكثر من 50 ميزة مبتكرة لتحقيق درجة أحلامك
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/login"
              className="px-8 py-4 bg-gradient-to-l from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
            >
              ابدأ مجاناً
            </a>
            <a
              href="#features"
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-200 rounded-2xl font-bold text-lg transition-all"
            >
              اكتشف الميزات
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 -mt-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-indigo-400 text-xs mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div id="features" className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-3">ميزات لا تجدها في أي منصة أخرى</h2>
        <p className="text-indigo-300 text-center text-sm mb-12">كل ما تحتاجه للتفوق في اختبار القدرات</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="bg-white/5 hover:bg-white/10 backdrop-blur border border-white/10 hover:border-indigo-500/30 rounded-2xl p-6 transition-all group"
            >
              <span className="text-3xl block mb-3 group-hover:scale-110 transition-transform">{f.icon}</span>
              <h3 className="text-white font-bold text-lg mb-1">{f.title}</h3>
              <p className="text-indigo-300 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        <div className="bg-gradient-to-l from-indigo-600/20 to-purple-600/20 rounded-3xl p-10 border border-indigo-500/20 text-center">
          <span className="text-5xl block mb-4">🚀</span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">جاهز لتحقيق درجة أحلامك؟</h2>
          <p className="text-indigo-200/80 mb-6 max-w-lg mx-auto">
            سجّل الآن مجاناً وابدأ رحلتك نحو التفوق في اختبار القدرات
          </p>
          <a
            href="/login"
            className="inline-block px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-600/20"
          >
            سجّل مجاناً الآن
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-4 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <span className="text-indigo-400 text-sm">معمل قدرات — Ainex Qudrat Lab</span>
          </div>
          <a href="https://buymeacoffee.com/khalas" target="_blank" rel="noopener noreferrer" className="text-amber-400/60 hover:text-amber-300 text-xs transition-colors">
            ☕ ادعم المطور
          </a>
          <p className="text-indigo-500 text-xs">جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
