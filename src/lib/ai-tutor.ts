/**
 * Rule-based AI Tutor — lightweight, no external API.
 * Analyzes user patterns, generates personalized advice,
 * and provides contextual responses.
 */

import { UserData, getPerformanceAnalytics } from "./user-store";

export interface AiMessage {
  role: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface AiInsight {
  type: "strength" | "weakness" | "tip" | "motivation" | "warning";
  icon: string;
  title: string;
  body: string;
  priority: number;
}

// ===== Pattern Analysis =====

export function analyzeUserPatterns(data: UserData): AiInsight[] {
  const analytics = getPerformanceAnalytics(data);
  const insights: AiInsight[] = [];

  if (analytics.totalSessions === 0) {
    insights.push({
      type: "tip",
      icon: "💡",
      title: "ابدأ رحلتك",
      body: "لم تبدأ أي اختبار بعد. جرّب القسم الكمي أو اللفظي لنتعرف على مستواك!",
      priority: 100,
    });
    return insights;
  }

  // Accuracy insights
  if (analytics.overallAccuracy >= 85) {
    insights.push({
      type: "strength",
      icon: "🌟",
      title: "أداء متميز!",
      body: `دقتك الإجمالية ${analytics.overallAccuracy}٪ — مستوى ممتاز! ركّز الآن على السرعة لتحسين أدائك في الاختبار الحقيقي.`,
      priority: 80,
    });
  } else if (analytics.overallAccuracy >= 60) {
    insights.push({
      type: "tip",
      icon: "📈",
      title: "في الطريق الصحيح",
      body: `دقتك ${analytics.overallAccuracy}٪. أنت قريب من مستوى الامتياز! ركّز على المجالات الضعيفة.`,
      priority: 70,
    });
  } else {
    insights.push({
      type: "warning",
      icon: "⚠️",
      title: "تحتاج تركيز أكثر",
      body: `دقتك ${analytics.overallAccuracy}٪ فقط. لا تقلق — التدرب المستمر هو المفتاح. حاول قراءة السؤال بتمعّن قبل الإجابة.`,
      priority: 90,
    });
  }

  // Category-specific insights
  for (const cat of analytics.categoryBreakdown) {
    if (cat.accuracy < 50 && cat.questions >= 5) {
      insights.push({
        type: "weakness",
        icon: "🎯",
        title: `نقطة ضعف: ${cat.category}`,
        body: `دقتك في "${cat.category}" هي ${cat.accuracy}٪ فقط من ${cat.questions} سؤال. أنصحك بمراجعة أساسيات هذا القسم وحل المزيد من التمارين.`,
        priority: 85,
      });
    } else if (cat.accuracy >= 80 && cat.questions >= 5) {
      insights.push({
        type: "strength",
        icon: "💪",
        title: `نقطة قوة: ${cat.category}`,
        body: `أداؤك في "${cat.category}" ممتاز (${cat.accuracy}٪)! حافظ على هذا المستوى.`,
        priority: 50,
      });
    }
  }

  // Time analysis
  if (analytics.avgTimePerQuestion > 90) {
    insights.push({
      type: "tip",
      icon: "⏱️",
      title: "إدارة الوقت",
      body: `متوسط وقتك ${analytics.avgTimePerQuestion} ثانية لكل سؤال. في الاختبار الحقيقي المتاح حوالي ٦٠ ثانية. تدرّب على السرعة!`,
      priority: 75,
    });
  } else if (analytics.avgTimePerQuestion < 15 && analytics.overallAccuracy < 60) {
    insights.push({
      type: "warning",
      icon: "🐢",
      title: "لا تستعجل!",
      body: "أنت تجيب بسرعة كبيرة لكن الدقة منخفضة. خذ وقتاً أكثر في قراءة السؤال والخيارات.",
      priority: 85,
    });
  }

  // Streak motivation
  if (data.streak.current >= 7) {
    insights.push({
      type: "motivation",
      icon: "🔥",
      title: "سلسلة مذهلة!",
      body: `${data.streak.current} يوم متتالي من الدراسة! أنت تبني عادة رائعة. استمر!`,
      priority: 60,
    });
  } else if (data.streak.current === 0 && analytics.totalSessions > 0) {
    insights.push({
      type: "motivation",
      icon: "💫",
      title: "عُد للمسار",
      body: "مرحباً بعودتك! الاستمرارية هي سر النجاح. ابدأ جلسة اليوم!",
      priority: 65,
    });
  }

  // Progress milestone
  const totalQ = analytics.totalQuestions;
  if (totalQ >= 10 && totalQ < 50) {
    insights.push({
      type: "motivation",
      icon: "🏃",
      title: `${totalQ} سؤال!`,
      body: `أجبت على ${totalQ} سؤال حتى الآن. هدفك القادم: ٥٠ سؤال!`,
      priority: 40,
    });
  }

  // Recent trend analysis
  if (analytics.recentTrend.length >= 3) {
    const recent = analytics.recentTrend.slice(-3);
    const avgRecent = recent.reduce((s, r) => s + r.accuracy, 0) / recent.length;
    const older = analytics.recentTrend.slice(0, -3);
    if (older.length >= 2) {
      const avgOlder = older.reduce((s, r) => s + r.accuracy, 0) / older.length;
      if (avgRecent > avgOlder + 10) {
        insights.push({
          type: "motivation",
          icon: "📊",
          title: "تحسّن ملحوظ!",
          body: `أداؤك في الجلسات الأخيرة (${Math.round(avgRecent)}٪) أفضل بكثير من السابق (${Math.round(avgOlder)}٪). تقدّم رائع!`,
          priority: 70,
        });
      } else if (avgRecent < avgOlder - 10) {
        insights.push({
          type: "warning",
          icon: "📉",
          title: "تراجع في الأداء",
          body: "أداؤك في الجلسات الأخيرة أقل. قد تحتاج لمراجعة الأساسيات أو أخذ استراحة قصيرة.",
          priority: 75,
        });
      }
    }
  }

  return insights.sort((a, b) => b.priority - a.priority);
}

// ===== Chat Responses =====

const GREETING_PATTERNS = [
  /^(مرحبا|هلا|السلام|أهلا|هاي|مساء|صباح)/,
  /^(hi|hello|hey)/i,
];

const HELP_PATTERNS = [
  /كيف (أبدأ|ابدأ|أدرس|أتحسن|أتعلم)/,
  /(ساعدني|مساعدة|أحتاج|عندي مشكلة)/,
  /(help|how)/i,
];

const SCORE_PATTERNS = [
  /(نتيجتي|درجتي|مستواي|أدائي|كم نسبتي|إحصائيات)/,
  /(score|result|stats)/i,
];

const STUDY_PATTERNS = [
  /(ماذا أدرس|وش أدرس|أيش أذاكر|خطة|نصيحة|اقتراح)/,
  /(what.*study|recommend|suggest|plan)/i,
];

const KAMY_PATTERNS = [
  /(كمي|رياضيات|حساب|أرقام|هندسة)/,
  /(math|quantitative|numbers)/i,
];

const LAFZY_PATTERNS = [
  /(لفظي|لغة|عربي|تناظر|قراءة|إكمال)/,
  /(verbal|arabic|language|reading)/i,
];

const MOTIVATION_PATTERNS = [
  /(محبط|صعب|مستحيل|ما أقدر|يائس|زهقت|ملل)/,
  /(difficult|hard|impossible|frustrated|bored)/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function generateChatResponse(message: string, data: UserData): string {
  const text = message.trim();
  const analytics = getPerformanceAnalytics(data);

  // Greetings
  if (matchesAny(text, GREETING_PATTERNS)) {
    const name = data.profile.name.split(" ")[0];
    if (analytics.totalSessions === 0) {
      return `أهلاً ${name}! 👋 أنا مساعدك الذكي في معمل القدرات. ابدأ أول اختبار من الصفحة الرئيسية وسأتابع تقدمك وأقدم لك نصائح مخصصة!`;
    }
    return `أهلاً ${name}! 👋 لديك ${analytics.totalSessions} جلسة سابقة بدقة ${analytics.overallAccuracy}٪. كيف أقدر أساعدك اليوم؟`;
  }

  // Score/stats queries
  if (matchesAny(text, SCORE_PATTERNS)) {
    if (analytics.totalSessions === 0) {
      return "لم تكمل أي اختبار بعد! ابدأ أول جلسة لنتعرف على مستواك. 📝";
    }
    let response = `📊 إحصائياتك:\n`;
    response += `• الجلسات: ${analytics.totalSessions}\n`;
    response += `• الأسئلة: ${analytics.totalQuestions} (${analytics.totalCorrect} صحيحة)\n`;
    response += `• الدقة: ${analytics.overallAccuracy}٪\n`;
    response += `• متوسط الوقت: ${analytics.avgTimePerQuestion} ثانية/سؤال\n`;
    if (analytics.categoryBreakdown.length > 0) {
      response += `\nالأقسام:\n`;
      for (const cat of analytics.categoryBreakdown) {
        response += `• ${cat.category}: ${cat.accuracy}٪ (${cat.questions} سؤال)\n`;
      }
    }
    return response;
  }

  // Study recommendations
  if (matchesAny(text, STUDY_PATTERNS)) {
    if (analytics.totalSessions === 0) {
      return "أنصحك بالبدء بالقسم الكمي — الرياضيات. ابدأ بحل ١٠ أسئلة على الأقل ثم ارجع لي وسأحلل أداءك وأعطيك خطة مخصصة! 📋";
    }
    let response = "📋 خطتك الدراسية:\n\n";
    if (analytics.weakAreas.length > 0) {
      response += `1️⃣ ركّز على: ${analytics.weakAreas.map((w) => w.category).join("، ")}\n`;
    }
    response += `2️⃣ حل ${Math.max(10, 50 - analytics.totalQuestions)} سؤال إضافي هذا الأسبوع\n`;
    if (analytics.avgTimePerQuestion > 60) {
      response += `3️⃣ تدرّب على السرعة — حاول الإجابة في أقل من ٦٠ ثانية\n`;
    }
    response += `4️⃣ ادرس يومياً حتى لو ١٥ دقيقة فقط\n`;
    const unlockedCount = data.achievements.filter((a) => a.unlocked).length;
    response += `\nإنجازاتك: ${unlockedCount}/${data.achievements.length} — أكمل المزيد!`;
    return response;
  }

  // Quantitative section help
  if (matchesAny(text, KAMY_PATTERNS)) {
    const kamyCat = analytics.categoryBreakdown.find((c) => c.category.includes("كمي"));
    if (kamyCat) {
      return `📐 القسم الكمي:\nدقتك: ${kamyCat.accuracy}٪ من ${kamyCat.questions} سؤال.\n\nنصائح:\n• ركّز على التناسب والنسب المئوية\n• تعلّم قوانين المساحات والمحيطات\n• تدرّب على المتتاليات العددية\n• حل المعادلات خطوة بخطوة`;
    }
    return "📐 القسم الكمي يشمل: المتتاليات، النسب المئوية، المعادلات، الهندسة، والإحصاء. ابدأ الاختبار الكمي وسأحلل أداءك!";
  }

  // Verbal section help
  if (matchesAny(text, LAFZY_PATTERNS)) {
    const lafzyCat = analytics.categoryBreakdown.find((c) => c.category.includes("لفظي"));
    if (lafzyCat) {
      return `📖 القسم اللفظي:\nدقتك: ${lafzyCat.accuracy}٪ من ${lafzyCat.questions} سؤال.\n\nنصائح:\n• اقرأ خيارات التناظر بعناية\n• ابحث عن العلاقة بين الكلمتين أولاً\n• في الإكمال، اقرأ الجملة كاملة\n• تدرّب على استيعاب المقروء يومياً`;
    }
    return "📖 القسم اللفظي يشمل: التناظر اللفظي، إكمال الجمل، الخطأ السياقي، واستيعاب المقروء. ابدأ الاختبار اللفظي وسأحلل أداءك!";
  }

  // Motivation
  if (matchesAny(text, MOTIVATION_PATTERNS)) {
    const motivations = [
      `لا تقلق ${data.profile.name.split(" ")[0]}! كل خبير كان مبتدئاً. المهم أنك تحاول وتتعلم من أخطائك. 💪`,
      "الصعوبة تعني أنك تتعلم شيئاً جديداً! خذ استراحة قصيرة ثم عد بطاقة متجددة. 🌟",
      "تذكّر: النجاح ليس عدم الفشل، بل الاستمرار رغم الفشل. كل سؤال تخطئ فيه هو درس تتعلمه! 📚",
      `لديك ${data.total_points} نقطة و${data.achievements.filter((a) => a.unlocked).length} إنجاز! أنت تتقدم أكثر مما تظن. 🏆`,
    ];
    return motivations[Math.floor(Math.random() * motivations.length)];
  }

  // Help
  if (matchesAny(text, HELP_PATTERNS)) {
    return `يمكنني مساعدتك في:\n\n📊 "إحصائياتي" — عرض أدائك وتحليله\n📋 "خطة دراسية" — نصائح مخصصة لك\n📐 "الكمي" — نصائح للقسم الكمي\n📖 "اللفظي" — نصائح للقسم اللفظي\n💪 "محبط" — تحفيز ودعم\n\nأو اسألني أي سؤال وسأحاول مساعدتك!`;
  }

  // Default: contextual response
  if (analytics.totalSessions === 0) {
    return "أنا مساعدك الذكي! ابدأ أول اختبار من الصفحة الرئيسية وسأتمكن من تحليل أدائك وتقديم نصائح مخصصة لك. 🎯\n\nاكتب 'مساعدة' لرؤية ما أستطيع فعله.";
  }

  return `أنا هنا لمساعدتك! حالياً دقتك ${analytics.overallAccuracy}٪ من ${analytics.totalQuestions} سؤال.\n\nجرّب أن تسألني:\n• "إحصائياتي" لعرض أدائك\n• "خطة دراسية" لنصائح مخصصة\n• "الكمي" أو "اللفظي" لنصائح محددة`;
}

// ===== Question Explanations =====

export function getQuestionExplanation(questionText: string, correctAnswer: string, userAnswer: string, isCorrect: boolean): string {
  if (isCorrect) {
    const praises = [
      "إجابة صحيحة! أحسنت 🎯",
      "ممتاز! أنت على الطريق الصحيح 🌟",
      "رائع! استمر بهذا الأداء 💪",
      "صحيح! ذكاء وسرعة 🧠",
    ];
    return praises[Math.floor(Math.random() * praises.length)];
  }

  return `الإجابة الصحيحة هي: ${correctAnswer}\n\nراجع السؤال مرة أخرى وحاول فهم لماذا هذا هو الجواب الصحيح. التعلم من الأخطاء هو أفضل طريقة للتحسن!`;
}

// ===== Motivational Messages =====

export function getDailyMotivation(data: UserData): string {
  const analytics = getPerformanceAnalytics(data);
  const hour = new Date().getHours();
  const name = data.profile.name.split(" ")[0];

  let greeting = "";
  if (hour < 12) greeting = `صباح الخير ${name}!`;
  else if (hour < 18) greeting = `مساء النور ${name}!`;
  else greeting = `مساء الخير ${name}!`;

  if (analytics.totalSessions === 0) {
    return `${greeting} 🌟\nجاهز لبدء التدريب؟ كل رحلة تبدأ بخطوة واحدة!`;
  }

  if (data.streak.current >= 3) {
    return `${greeting} 🔥\nسلسلة ${data.streak.current} أيام! لا تكسر السلسلة — ابدأ جلسة اليوم.`;
  }

  if (analytics.overallAccuracy >= 80) {
    return `${greeting} 🏆\nأداؤك ممتاز (${analytics.overallAccuracy}٪)! حان وقت التحدي — جرّب أسئلة أصعب.`;
  }

  return `${greeting} 💪\nلديك ${analytics.totalQuestions} سؤال محلول. أكمل المزيد اليوم!`;
}
