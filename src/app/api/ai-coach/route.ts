/**
 * AI Coach Proxy — Serverless function as proxy to LLM APIs
 *
 * Batches and compresses student context before sending to the LLM,
 * ensuring minimal function invocations per session.
 * Falls back to rule-based coaching when no API key is configured.
 */

import { NextRequest, NextResponse } from "next/server";

interface CoachRequest {
  studentId: string;
  question: string;
  context: {
    currentScore: number;
    weakAreas: string[];
    recentErrors: { question: string; correctAnswer: string }[];
    section: "kamy" | "lafzy";
    sessionCount: number;
  };
}

const COACHING_PATTERNS: Record<string, string[]> = {
  "المتوسطات": [
    "في مسائل المتوسطات، تذكر أن المتوسط = مجموع القيم ÷ عددها. إذا أُضيف عنصر جديد، أعد حساب المجموع أولاً.",
    "نصيحة: إذا كان المتوسط معطى وعدد العناصر معطى، يمكنك إيجاد المجموع بالضرب.",
  ],
  "النسب والتناسب": [
    "النسبة والتناسب: اجعل x هو المجهول، ثم اضرب طرفين في وسطين.",
    "تذكر: إذا زادت قيمة بنسبة 20%، فالقيمة الجديدة = القديمة × 1.2",
  ],
  "المعادلات": [
    "في المعادلات الخطية: اعزل المتغير في طرف والأرقام في الطرف الآخر.",
    "نصيحة: تحقق من إجابتك بتعويضها في المعادلة الأصلية.",
  ],
  "الهندسة": [
    "في مسائل الدائرة: تذكر أن المساحة = π×نق² والمحيط = 2×π×نق",
    "المثلث: مجموع الزوايا = 180°. استخدم فيثاغورس للمثلث القائم: أ² + ب² = ج²",
  ],
  "التناظر اللفظي": [
    "في التناظر اللفظي: حدد العلاقة بين الكلمتين أولاً (ترادف، تضاد، جزء-كل، سبب-نتيجة).",
    "نصيحة: اصنع جملة تربط الكلمتين، ثم طبقها على الخيارات.",
  ],
  "إكمال الجمل": [
    "اقرأ الجملة كاملة أولاً. ابحث عن كلمات مفتاحية تحدد المعنى المطلوب (لكن، إذ، بل).",
    "نصيحة: جرب كل خيار في الفراغ ذهنياً واختر الأكثر انسجاماً مع السياق.",
  ],
  "استيعاب المقروء": [
    "اقرأ الأسئلة أولاً قبل النص — هذا يساعدك تركز على المعلومات المطلوبة.",
    "الفكرة الرئيسية عادةً في أول جملة أو آخر جملة من الفقرة.",
  ],
  "الأنماط": [
    "في مسائل الأنماط: اكتشف الفرق بين كل رقمين متتاليين أولاً.",
    "إذا لم يكن الفرق ثابتاً، جرب النسبة (اقسم كل رقم على الذي قبله).",
  ],
  "الإحصاء": [
    "الوسيط: رتب الأرقام تصاعدياً واختر الأوسط. إذا كان العدد زوجياً، خذ متوسط الرقمين الأوسطين.",
    "المنوال: القيمة الأكثر تكراراً. المدى: أكبر قيمة - أصغر قيمة.",
  ],
};

function generateCoachResponse(req: CoachRequest): string {
  const parts: string[] = [];

  // Greeting based on score
  if (req.context.currentScore >= 80) {
    parts.push("أداؤك رائع! إليك بعض النصائح للوصول للتميز:");
  } else if (req.context.currentScore >= 60) {
    parts.push("تقدم جيد! لنعمل على نقاط الضعف:");
  } else {
    parts.push("كل رحلة تبدأ بخطوة. إليك خطة تحسين مركّزة:");
  }

  // Targeted advice for weak areas
  if (req.context.weakAreas.length > 0) {
    parts.push("");
    parts.push("📌 نقاط تحتاج تركيز:");
    for (const area of req.context.weakAreas.slice(0, 3)) {
      const tips = COACHING_PATTERNS[area];
      if (tips) {
        parts.push(`\n**${area}:**`);
        parts.push(tips[Math.floor(Math.random() * tips.length)]);
      }
    }
  }

  // Address recent errors
  if (req.context.recentErrors.length > 0) {
    parts.push("");
    parts.push("📝 من أخطائك الأخيرة:");
    for (const err of req.context.recentErrors.slice(0, 2)) {
      parts.push(`- "${err.question.slice(0, 60)}..." → الإجابة الصحيحة: ${err.correctAnswer}`);
    }
  }

  // Study strategy
  parts.push("");
  if (req.context.section === "kamy") {
    parts.push("💡 استراتيجية: في الكمي، تدرب على النوع الذي تخطئ فيه أكثر. 15 دقيقة تركيز أفضل من ساعة مشتتة.");
  } else {
    parts.push("💡 استراتيجية: في اللفظي، اقرأ يومياً ولو صفحة واحدة. كل كلمة جديدة تتعلمها تزيد فرصتك.");
  }

  return parts.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body: CoachRequest = await req.json();

    if (!body.studentId || !body.context) {
      return NextResponse.json(
        { error: "بيانات غير مكتملة" },
        { status: 400 },
      );
    }

    // Check for external LLM API key
    const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

    if (apiKey && process.env.OPENAI_API_KEY) {
      // Proxy to OpenAI with compressed context
      const systemPrompt = `أنت مدرس قدرات خبير. الطالب مستواه ${body.context.currentScore}%.
نقاط ضعفه: ${body.context.weakAreas.join("، ")}.
القسم: ${body.context.section === "kamy" ? "كمي" : "لفظي"}.
أجب بإيجاز (3-5 جمل) بالعربية. لا تكرر السؤال.`;

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: body.question },
            ],
            max_tokens: 200,
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json({
            response: data.choices[0].message.content,
            source: "openai",
            tokensUsed: data.usage?.total_tokens || 0,
          });
        }
      } catch {
        // Fall through to rule-based
      }
    }

    // Rule-based coaching (free, no API needed)
    const response = generateCoachResponse(body);
    return NextResponse.json({
      response,
      source: "rule-based",
      tokensUsed: 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "فشل في المساعد الذكي", details: message },
      { status: 500 },
    );
  }
}
