"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { motion } from "framer-motion";
import { Sparkles, BrainCircuit, Target, Trophy, ChevronLeft, Star } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0C10]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h1 className="text-xl font-bold text-white mb-2 tracking-wide">أينكس للقدرات</h1>
          <p className="text-indigo-400/80 animate-pulse text-sm">تجهيز بيئة التعلم...</p>
        </div>
      </div>
    );
  }

  if (user) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <div className="min-h-screen bg-[#0B0C10] text-gray-100 overflow-hidden relative selection:bg-indigo-500/30">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-emerald-600/10 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md bg-[#0B0C10]/60 border-b border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-wide">أينكس</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/login" className="px-5 py-2 text-white/80 hover:text-white hover:bg-white/5 rounded-xl text-sm font-medium transition-all">
              تسجيل الدخول
            </a>
            <a href="/register" className="px-5 py-2 bg-white text-black hover:bg-gray-100 rounded-xl text-sm font-bold transition-all shadow-lg shadow-white/10 hover:shadow-white/20 hover:-translate-y-0.5">
              ابدأ الآن
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-5xl mx-auto text-center"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-8">
            <Star className="w-3.5 h-3.5" />
            <span>المنصة التعليمية الأذكى في العالم العربي</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-gray-400 leading-[1.2] mb-6 tracking-tight">
            تجاوز طموحاتك في
            <br />
            <span className="bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">اختبار القدرات</span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            منصة تعليمية مدعومة بالذكاء الاصطناعي تحلل أداءك، تكتشف نقاط ضعفك، وتبني لك خطة دراسية مخصصة تضمن لك أعلى الدرجات.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/register"
              className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-1"
            >
              <span>ابدأ رحلتك مجاناً</span>
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </a>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-medium text-lg transition-all border border-white/10 backdrop-blur-sm"
            >
              اكتشف المميزات
            </a>
          </motion.div>

          {/* Abstract Dashboard Preview or Mockup could go here */}
          <motion.div variants={itemVariants} className="mt-20 relative mx-auto max-w-4xl">
             <div className="absolute inset-0 bg-gradient-to-t from-[#0B0C10] via-transparent to-transparent z-10" />
             <div className="rounded-2xl md:rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-2 shadow-2xl">
               <div className="rounded-xl md:rounded-2xl bg-[#0B0C10] border border-white/5 overflow-hidden aspect-[16/9] relative flex items-center justify-center">
                 {/* Decorative mock UI */}
                 <div className="absolute top-4 left-4 right-4 flex gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500/50" />
                   <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                   <div className="w-3 h-3 rounded-full bg-green-500/50" />
                 </div>
                 <div className="text-center space-y-4 opacity-50">
                   <BrainCircuit className="w-16 h-16 mx-auto text-indigo-400" />
                   <p className="text-lg font-medium text-white">الذكاء الاصطناعي يحلل مستواك...</p>
                 </div>
               </div>
             </div>
          </motion.div>

        </motion.div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-24 relative z-10 border-t border-white/5 bg-[#0B0C10]/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">تقنية فائقة لنتائج استثنائية</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">صممنا كل أداة في المنصة بعناية لتسريع عملية تعلمك وزيادة استيعابك.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <BrainCircuit className="w-6 h-6 text-purple-400" />,
                title: "خوارزميات التكيف",
                desc: "تتغير صعوبة الأسئلة تلقائياً بناءً على مستواك لضمان تحدي مستمر دون إحباط.",
                color: "from-purple-500/20 to-transparent",
                border: "group-hover:border-purple-500/50"
              },
              {
                icon: <Target className="w-6 h-6 text-emerald-400" />,
                title: "تحليل الأداء الدقيق",
                desc: "تقارير تفصيلية تكشف نقاط ضعفك بدقة لنوجه جهودك نحو ما يحتاج للتحسين فعلاً.",
                color: "from-emerald-500/20 to-transparent",
                border: "group-hover:border-emerald-500/50"
              },
              {
                icon: <Trophy className="w-6 h-6 text-amber-400" />,
                title: "بيئة تنافسية محفزة",
                desc: "نظام دوريات ومكافآت يحول التعلم إلى تحدٍ ممتع يدفعك للاستمرار يومياً.",
                color: "from-amber-500/20 to-transparent",
                border: "group-hover:border-amber-500/50"
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`group p-8 rounded-3xl bg-white/5 border border-white/5 ${feature.border} transition-all duration-300 hover:bg-white/10 relative overflow-hidden`}
              >
                <div className={`absolute top-0 right-0 w-full h-32 bg-gradient-to-b ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="w-12 h-12 rounded-2xl bg-[#0B0C10] border border-white/10 flex items-center justify-center mb-6 relative z-10 shadow-lg">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 relative z-10">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed relative z-10">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-gray-400 text-sm font-medium">أينكس للقدرات © {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-gray-500 hover:text-white transition-colors">الشروط والأحكام</a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors">سياسة الخصوصية</a>
            <a href="mailto:support@ainex.com" className="text-gray-500 hover:text-white transition-colors">الدعم الفني</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
