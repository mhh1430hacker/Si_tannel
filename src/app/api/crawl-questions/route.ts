import { NextResponse } from "next/server";
import { addCrawledQuestions } from "@/lib/supabase-api";

interface CrawledQuestion {
  text: string;
  choices: string[];
  correct_index: number;
  section: string;
  difficulty: string;
  source_url: string;
  explanation?: string;
}

// Template-based question generation from various patterns
// Simulates crawling by generating diverse, realistic Qudrat questions
function generateCrawledQuestions(): CrawledQuestion[] {
  const questions: CrawledQuestion[] = [];

  // ===== KAMY (Quantitative) — diverse templates =====

  // Percentage problems
  const pctItems = [
    { item: "كتاب", price: 120, pct: 25 },
    { item: "هاتف", price: 2400, pct: 15 },
    { item: "حقيبة", price: 350, pct: 30 },
    { item: "ساعة", price: 800, pct: 20 },
    { item: "حذاء", price: 450, pct: 10 },
  ];
  for (const p of pctItems) {
    const discount = Math.round(p.price * p.pct / 100);
    const final = p.price - discount;
    const wrong1 = final + 10;
    const wrong2 = final - 15;
    const wrong3 = p.price;
    questions.push({
      text: `إذا كان سعر ${p.item} ${p.price} ريال وعُرض بخصم ${p.pct}٪، فما السعر بعد الخصم؟`,
      choices: [`${final}`, `${wrong1}`, `${wrong2}`, `${wrong3}`].sort(() => Math.random() - 0.5),
      correct_index: 0,
      section: "kamy",
      difficulty: "سهل",
      source_url: "qudrat-patterns/percentage",
      explanation: `الخصم = ${p.price} × ${p.pct}٪ = ${discount}، السعر النهائي = ${p.price} - ${discount} = ${final}`,
    });
    // Fix correct_index after shuffle
    const idx = questions[questions.length - 1].choices.indexOf(`${final}`);
    questions[questions.length - 1].correct_index = idx;
  }

  // Ratio problems
  const ratios = [
    { text: "إذا كانت نسبة الأولاد إلى البنات في فصل ٣:٢ وعدد الطلاب ٢٥، فكم عدد الأولاد؟", answer: "١٥", wrongs: ["١٠", "١٢", "٢٠"], explanation: "المجموع = ٣+٢ = ٥ أجزاء، كل جزء = ٢٥÷٥ = ٥، الأولاد = ٣×٥ = ١٥" },
    { text: "إذا كان محيط مستطيل ٤٨ سم ونسبة الطول للعرض ٣:١، فما الطول؟", answer: "١٨", wrongs: ["١٢", "٦", "٢٤"], explanation: "نصف المحيط = ٢٤، ٣س+س = ٢٤، ٤س = ٢٤، س = ٦، الطول = ١٨" },
    { text: "قسّم ٦٠٠ ريال بين شخصين بنسبة ١:٣. كم نصيب الأكبر؟", answer: "٤٥٠", wrongs: ["٢٠٠", "٣٠٠", "١٥٠"], explanation: "المجموع = ٤ أجزاء، كل جزء = ١٥٠، النصيب الأكبر = ٣×١٥٠ = ٤٥٠" },
  ];
  for (const r of ratios) {
    const choices = [r.answer, ...r.wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      text: r.text,
      choices,
      correct_index: choices.indexOf(r.answer),
      section: "kamy",
      difficulty: "متوسط",
      source_url: "qudrat-patterns/ratio",
      explanation: r.explanation,
    });
  }

  // Sequence / pattern problems
  const sequences = [
    { text: "أكمل النمط: ٢، ٦، ١٨، ٥٤، ...", answer: "١٦٢", wrongs: ["١٠٨", "١٢٠", "١٨٠"], explanation: "كل حد = الحد السابق × ٣" },
    { text: "أكمل النمط: ١، ٤، ٩، ١٦، ٢٥، ...", answer: "٣٦", wrongs: ["٣٠", "٤٩", "٣٥"], explanation: "مربعات الأعداد: ١²، ٢²، ٣²، ٤²، ٥²، ٦² = ٣٦" },
    { text: "أكمل النمط: ٣، ٥، ٩، ١٥، ٢٣، ...", answer: "٣٣", wrongs: ["٣١", "٢٩", "٣٥"], explanation: "الفروق: ٢، ٤، ٦، ٨، ١٠ — الحد التالي = ٢٣ + ١٠ = ٣٣" },
    { text: "أكمل النمط: ١٠٠، ٩٥، ٨٥، ٧٠، ...", answer: "٥٠", wrongs: ["٥٥", "٦٠", "٤٥"], explanation: "الفروق: −٥، −١٠، −١٥، −٢٠ — الحد التالي = ٧٠ − ٢٠ = ٥٠" },
  ];
  for (const s of sequences) {
    const choices = [s.answer, ...s.wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      text: s.text,
      choices,
      correct_index: choices.indexOf(s.answer),
      section: "kamy",
      difficulty: "متوسط",
      source_url: "qudrat-patterns/sequence",
      explanation: s.explanation,
    });
  }

  // Algebra
  const algebraProblems = [
    { text: "إذا كان ٣س − ٧ = ٢٠، فما قيمة س؟", answer: "٩", wrongs: ["٧", "٨", "١٠"], explanation: "٣س = ٢٧ → س = ٩" },
    { text: "إذا كان (س+٣)(س−٢) = ٠، فما قيم س الممكنة؟", answer: "−٣ أو ٢", wrongs: ["٣ أو −٢", "−٣ أو −٢", "٣ أو ٢"], explanation: "س+٣=٠ → س=−٣ أو س−٢=٠ → س=٢" },
    { text: "إذا كان س² = ١٤٤، فما قيمة س الموجبة؟", answer: "١٢", wrongs: ["١٠", "١٤", "١١"], explanation: "√١٤٤ = ١٢" },
    { text: "إذا كان ٢س + ٣ص = ١٢ و ص = ٢، فما قيمة س؟", answer: "٣", wrongs: ["٤", "٢", "٥"], explanation: "٢س + ٦ = ١٢ → ٢س = ٦ → س = ٣" },
  ];
  for (const a of algebraProblems) {
    const choices = [a.answer, ...a.wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      text: a.text,
      choices,
      correct_index: choices.indexOf(a.answer),
      section: "kamy",
      difficulty: "متوسط",
      source_url: "qudrat-patterns/algebra",
      explanation: a.explanation,
    });
  }

  // Geometry
  const geoProblems = [
    { text: "مثلث قائم الزاوية أطوال ضلعيه ٣ و ٤. ما طول الوتر؟", answer: "٥", wrongs: ["٦", "٧", "٣٫٥"], explanation: "فيثاغورس: √(٩+١٦) = √٢٥ = ٥" },
    { text: "دائرة نصف قطرها ٧ سم. ما مساحتها تقريباً؟", answer: "١٥٤ سم²", wrongs: ["٤٩ سم²", "٤٤ سم²", "٢٢٠ سم²"], explanation: "π×٧² = ٢٢/٧ × ٤٩ = ١٥٤" },
    { text: "مربع محيطه ٤٨ سم. ما مساحته؟", answer: "١٤٤ سم²", wrongs: ["٩٦ سم²", "١٢٠ سم²", "١٦٠ سم²"], explanation: "الضلع = ٤٨÷٤ = ١٢، المساحة = ١٢² = ١٤٤" },
  ];
  for (const g of geoProblems) {
    const choices = [g.answer, ...g.wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      text: g.text,
      choices,
      correct_index: choices.indexOf(g.answer),
      section: "kamy",
      difficulty: "صعب",
      source_url: "qudrat-patterns/geometry",
      explanation: g.explanation,
    });
  }

  // Speed/Distance/Time
  const speedProblems = [
    { text: "سيارة تقطع ٢٤٠ كم في ٣ ساعات. ما سرعتها؟", answer: "٨٠ كم/ساعة", wrongs: ["٧٠ كم/ساعة", "٩٠ كم/ساعة", "٦٠ كم/ساعة"], explanation: "السرعة = المسافة ÷ الزمن = ٢٤٠÷٣ = ٨٠" },
    { text: "قطار يسير بسرعة ١٢٠ كم/ساعة. كم يقطع في ٤٥ دقيقة؟", answer: "٩٠ كم", wrongs: ["٦٠ كم", "١٢٠ كم", "٧٥ كم"], explanation: "٤٥ دقيقة = ¾ ساعة، المسافة = ١٢٠ × ¾ = ٩٠" },
  ];
  for (const sp of speedProblems) {
    const choices = [sp.answer, ...sp.wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      text: sp.text,
      choices,
      correct_index: choices.indexOf(sp.answer),
      section: "kamy",
      difficulty: "متوسط",
      source_url: "qudrat-patterns/speed",
      explanation: sp.explanation,
    });
  }

  // ===== LAFZY (Verbal) =====

  // Analogies
  const analogies = [
    { text: "كتاب : مؤلف :: لوحة : ...", answer: "رسام", wrongs: ["شاعر", "موسيقار", "معلم"], explanation: "الكتاب ينتجه المؤلف، واللوحة ينتجها الرسام" },
    { text: "ماء : عطش :: طعام : ...", answer: "جوع", wrongs: ["شبع", "نوم", "تعب"], explanation: "الماء يُزيل العطش، والطعام يُزيل الجوع" },
    { text: "عين : إبصار :: أذن : ...", answer: "سمع", wrongs: ["كلام", "شم", "لمس"], explanation: "العين وظيفتها الإبصار، والأذن وظيفتها السمع" },
    { text: "شجاعة : جبن :: كرم : ...", answer: "بخل", wrongs: ["سخاء", "حسد", "غرور"], explanation: "الشجاعة عكس الجبن، والكرم عكس البخل" },
    { text: "قلم : كتابة :: مفتاح : ...", answer: "فتح", wrongs: ["إغلاق", "قفل", "باب"], explanation: "القلم أداة الكتابة، والمفتاح أداة الفتح" },
    { text: "طبيب : مستشفى :: معلم : ...", answer: "مدرسة", wrongs: ["جامعة", "مكتبة", "شركة"], explanation: "الطبيب يعمل في المستشفى، والمعلم يعمل في المدرسة" },
    { text: "نحلة : عسل :: بقرة : ...", answer: "حليب", wrongs: ["لحم", "جلد", "صوف"], explanation: "النحلة تنتج العسل، والبقرة تنتج الحليب" },
    { text: "سيف : حرب :: قلم : ...", answer: "علم", wrongs: ["حبر", "ورق", "كتاب"], explanation: "السيف أداة الحرب، والقلم أداة العلم" },
  ];
  for (const an of analogies) {
    const choices = [an.answer, ...an.wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      text: an.text,
      choices,
      correct_index: choices.indexOf(an.answer),
      section: "lafzy",
      difficulty: "متوسط",
      source_url: "qudrat-patterns/analogy",
      explanation: an.explanation,
    });
  }

  // Sentence completion
  const completions = [
    { text: "العلم ... والجهل ظلام", answer: "نور", wrongs: ["قوة", "سلاح", "كنز"], explanation: "المقابلة: العلم نور والجهل ظلام" },
    { text: "من جدّ ... ومن زرع ...", answer: "وجد، حصد", wrongs: ["نجح، فاز", "سعد، فرح", "وصل، كسب"], explanation: "من جد وجد ومن زرع حصد — مثل عربي مشهور" },
    { text: "... المرء في خدمة ... والناس", answer: "خير، نفسه", wrongs: ["سعي، ماله", "عمل، بيته", "هدف، عقله"], explanation: "خير المرء في خدمة نفسه والناس" },
    { text: "الصبر مفتاح ...", answer: "الفرج", wrongs: ["النجاح", "القوة", "الحكمة"], explanation: "الصبر مفتاح الفرج — مثل عربي" },
    { text: "إذا أردت أن تُطاع فاطلب ...", answer: "المستطاع", wrongs: ["الكثير", "القليل", "المعقول"], explanation: "إذا أردت أن تطاع فاطلب المستطاع — حكمة عربية" },
    { text: "العقل السليم في الجسم ...", answer: "السليم", wrongs: ["القوي", "الكبير", "الصحي"], explanation: "العقل السليم في الجسم السليم — مقولة شهيرة" },
  ];
  for (const c of completions) {
    const choices = [c.answer, ...c.wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      text: c.text,
      choices,
      correct_index: choices.indexOf(c.answer),
      section: "lafzy",
      difficulty: "سهل",
      source_url: "qudrat-patterns/completion",
      explanation: c.explanation,
    });
  }

  // Context error
  const contextErrors = [
    { text: "حدد الكلمة الخطأ: \"ذهب الطالب إلى المكتبة ليشتري كتاباً جديداً\"", answer: "ليشتري (الصحيح: ليستعير)", wrongs: ["ذهب", "المكتبة", "كتاباً"], explanation: "المكتبة مكان للاستعارة لا للشراء" },
    { text: "حدد الخطأ: \"الشمس تشرق من الغرب كل صباح\"", answer: "الغرب (الصحيح: الشرق)", wrongs: ["الشمس", "تشرق", "صباح"], explanation: "الشمس تشرق من الشرق لا الغرب" },
    { text: "حدد الخطأ: \"الحوت من أكبر الزواحف في البحر\"", answer: "الزواحف (الصحيح: الثدييات)", wrongs: ["الحوت", "أكبر", "البحر"], explanation: "الحوت من الثدييات وليس الزواحف" },
  ];
  for (const ce of contextErrors) {
    const choices = [ce.answer, ...ce.wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      text: ce.text,
      choices,
      correct_index: choices.indexOf(ce.answer),
      section: "lafzy",
      difficulty: "صعب",
      source_url: "qudrat-patterns/context-error",
      explanation: ce.explanation,
    });
  }

  // Word meanings
  const meanings = [
    { text: "ما معنى كلمة \"الوجيز\"؟", answer: "المختصر", wrongs: ["الطويل", "الجميل", "القديم"], explanation: "الوجيز يعني المختصر أو الموجز" },
    { text: "ما معنى كلمة \"التقوى\"؟", answer: "خشية الله", wrongs: ["الشجاعة", "الحكمة", "الصبر"], explanation: "التقوى هي خشية الله واتقاء غضبه" },
    { text: "ما مرادف \"الأريب\"؟", answer: "الذكي", wrongs: ["الكريم", "الشجاع", "الجميل"], explanation: "الأريب يعني الذكي الفطن" },
    { text: "ما ضد كلمة \"الوفير\"؟", answer: "الشحيح", wrongs: ["الكثير", "الوافر", "الغني"], explanation: "الوفير يعني الكثير، وضده الشحيح (القليل)" },
  ];
  for (const m of meanings) {
    const choices = [m.answer, ...m.wrongs].sort(() => Math.random() - 0.5);
    questions.push({
      text: m.text,
      choices,
      correct_index: choices.indexOf(m.answer),
      section: "lafzy",
      difficulty: "متوسط",
      source_url: "qudrat-patterns/meaning",
      explanation: m.explanation,
    });
  }

  return questions;
}

export async function POST() {
  try {
    const questions = generateCrawledQuestions();

    // Try to save to Supabase
    const saved = await addCrawledQuestions(questions);

    return NextResponse.json({
      status: "ok",
      message: `تم جلب ${questions.length} سؤال (${saved} محفوظ في قاعدة البيانات)`,
      total_generated: questions.length,
      saved_to_db: saved,
      sections: {
        kamy: questions.filter((q) => q.section === "kamy").length,
        lafzy: questions.filter((q) => q.section === "lafzy").length,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }
}

export async function GET() {
  const questions = generateCrawledQuestions();
  return NextResponse.json({
    total: questions.length,
    kamy: questions.filter((q) => q.section === "kamy").length,
    lafzy: questions.filter((q) => q.section === "lafzy").length,
    sample: questions.slice(0, 3),
  });
}
