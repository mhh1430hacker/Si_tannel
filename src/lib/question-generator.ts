/**
 * Smart Question Generator — creates new questions from templates.
 * Generates unique questions every time using pattern-based math templates
 * and Arabic language pattern matching.
 */

import type { QudratQuestion } from "@/data/qudrat-questions";

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function toArabicNumeral(n: number): string {
  return n.toString().replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d)]);
}

// ===== Math Question Templates =====

type QGen = () => QudratQuestion;

const mathGenerators: QGen[] = [
  // Percentage
  () => {
    const base = rand(50, 500) * 10;
    const pct = rand(1, 9) * 10;
    const answer = (base * pct) / 100;
    const wrong = [answer + rand(10, 50) * 10, answer - rand(10, 50) * 10, (base * (pct + 10)) / 100].filter((w) => w > 0 && w !== answer);
    const choices = shuffle([answer, ...wrong.slice(0, 3)]);
    while (choices.length < 4) choices.push(answer + rand(1, 9) * 100);
    return {
      text: `ما هو ${toArabicNumeral(pct)}٪ من ${toArabicNumeral(base)}؟`,
      choices: choices.slice(0, 4).map((c) => toArabicNumeral(c)),
      correct_index: choices.indexOf(answer),
      explanation: `${toArabicNumeral(pct)}٪ من ${toArabicNumeral(base)} = ${toArabicNumeral(base)} × ${toArabicNumeral(pct)}/١٠٠ = ${toArabicNumeral(answer)}`,
      hint: "اضرب العدد في النسبة واقسم على ١٠٠",
      difficulty: "سهل" as const,
    };
  },

  // Linear equation
  () => {
    const a = rand(2, 8);
    const x = rand(1, 15);
    const b = rand(1, 20);
    const result = a * x + b;
    const wrong = [x + 1, x - 1, x + 2].filter((w) => w > 0 && w !== x);
    const choices = shuffle([x, ...wrong.slice(0, 3)]);
    while (choices.length < 4) choices.push(x + rand(3, 7));
    return {
      text: `إذا كان ${toArabicNumeral(a)}س + ${toArabicNumeral(b)} = ${toArabicNumeral(result)}، فما قيمة س؟`,
      choices: choices.slice(0, 4).map((c) => toArabicNumeral(c)),
      correct_index: choices.indexOf(x),
      explanation: `${toArabicNumeral(a)}س + ${toArabicNumeral(b)} = ${toArabicNumeral(result)} → ${toArabicNumeral(a)}س = ${toArabicNumeral(result - b)} → س = ${toArabicNumeral(x)}`,
      hint: "انقل الثابت إلى الطرف الآخر ثم اقسم",
      difficulty: "متوسط" as const,
    };
  },

  // Area calculation
  () => {
    const w = rand(3, 15);
    const h = rand(3, 15);
    const area = w * h;
    const wrong = [w + h, 2 * (w + h), area + rand(5, 20)].filter((wr) => wr !== area);
    const choices = shuffle([area, ...wrong.slice(0, 3)]);
    while (choices.length < 4) choices.push(area + rand(1, 30));
    return {
      text: `مساحة مستطيل طوله ${toArabicNumeral(w)} سم وعرضه ${toArabicNumeral(h)} سم =`,
      choices: choices.slice(0, 4).map((c) => `${toArabicNumeral(c)} سم²`),
      correct_index: choices.indexOf(area),
      explanation: `المساحة = الطول × العرض = ${toArabicNumeral(w)} × ${toArabicNumeral(h)} = ${toArabicNumeral(area)} سم²`,
      hint: "المساحة = الطول × العرض",
      difficulty: "سهل" as const,
    };
  },

  // Ratio
  () => {
    const a = rand(2, 6);
    const b = rand(2, 6);
    const total = rand(3, 10) * (a + b);
    const partA = (total * a) / (a + b);
    const wrong = [(total * b) / (a + b), total - partA + rand(1, 10), partA + rand(5, 20)].filter((w) => w !== partA);
    const choices = shuffle([partA, ...wrong.slice(0, 3)]);
    while (choices.length < 4) choices.push(partA + rand(1, 30));
    return {
      text: `إذا كانت نسبة أ : ب = ${toArabicNumeral(a)} : ${toArabicNumeral(b)} ومجموعهما ${toArabicNumeral(total)}، فما قيمة أ؟`,
      choices: choices.slice(0, 4).map((c) => toArabicNumeral(c)),
      correct_index: choices.indexOf(partA),
      explanation: `مجموع أجزاء النسبة = ${toArabicNumeral(a + b)}، قيمة الجزء = ${toArabicNumeral(total)}/${toArabicNumeral(a + b)} = ${toArabicNumeral(total / (a + b))}، أ = ${toArabicNumeral(a)} × ${toArabicNumeral(total / (a + b))} = ${toArabicNumeral(partA)}`,
      hint: "اقسم المجموع على مجموع أجزاء النسبة",
      difficulty: "متوسط" as const,
    };
  },

  // Average
  () => {
    const count = rand(3, 6);
    const numbers = Array.from({ length: count }, () => rand(10, 99));
    const sum = numbers.reduce((s, n) => s + n, 0);
    const avg = Math.round(sum / count);
    const wrong = [avg + rand(1, 10), avg - rand(1, 10), Math.round(sum / (count + 1))].filter((w) => w !== avg && w > 0);
    const choices = shuffle([avg, ...wrong.slice(0, 3)]);
    while (choices.length < 4) choices.push(avg + rand(5, 15));
    return {
      text: `ما متوسط الأعداد: ${numbers.map(toArabicNumeral).join("، ")}؟`,
      choices: choices.slice(0, 4).map((c) => toArabicNumeral(c)),
      correct_index: choices.indexOf(avg),
      explanation: `المتوسط = (${numbers.map(toArabicNumeral).join(" + ")}) ÷ ${toArabicNumeral(count)} = ${toArabicNumeral(sum)} ÷ ${toArabicNumeral(count)} ≈ ${toArabicNumeral(avg)}`,
      hint: "اجمع الأعداد ثم اقسم على عددها",
      difficulty: "سهل" as const,
    };
  },

  // Power/Exponent
  () => {
    const base = rand(2, 9);
    const exp = rand(2, 4);
    const result = Math.pow(base, exp);
    const wrong = [base * exp, result + rand(1, 20), result - rand(1, 15)].filter((w) => w > 0 && w !== result);
    const choices = shuffle([result, ...wrong.slice(0, 3)]);
    while (choices.length < 4) choices.push(result + rand(1, 50));
    return {
      text: `ما قيمة ${toArabicNumeral(base)} أُس ${toArabicNumeral(exp)}؟`,
      choices: choices.slice(0, 4).map((c) => toArabicNumeral(c)),
      correct_index: choices.indexOf(result),
      explanation: `${toArabicNumeral(base)}^${toArabicNumeral(exp)} = ${Array(exp).fill(toArabicNumeral(base)).join(" × ")} = ${toArabicNumeral(result)}`,
      hint: "اضرب العدد في نفسه عدد مرات الأُس",
      difficulty: "متوسط" as const,
    };
  },

  // Speed/Distance/Time
  () => {
    const speed = rand(3, 12) * 10;
    const time = rand(2, 8);
    const distance = speed * time;
    const wrong = [distance + speed, distance - speed, speed + time].filter((w) => w > 0 && w !== distance);
    const choices = shuffle([distance, ...wrong.slice(0, 3)]);
    while (choices.length < 4) choices.push(distance + rand(10, 100));
    return {
      text: `سيارة تسير بسرعة ${toArabicNumeral(speed)} كم/ساعة. كم تقطع في ${toArabicNumeral(time)} ساعات؟`,
      choices: choices.slice(0, 4).map((c) => `${toArabicNumeral(c)} كم`),
      correct_index: choices.indexOf(distance),
      explanation: `المسافة = السرعة × الزمن = ${toArabicNumeral(speed)} × ${toArabicNumeral(time)} = ${toArabicNumeral(distance)} كم`,
      hint: "المسافة = السرعة × الزمن",
      difficulty: "سهل" as const,
    };
  },
];

// ===== Verbal Question Templates =====
const analogyPairs: [string, string, string, string, string[]][] = [
  ["ليل", "نهار", "ظلام", "نور", ["حزن : فرح", "بطيء : سريع"]],
  ["قلب", "حب", "عقل", "تفكير", ["عين : رؤية", "أنف : تنفس"]],
  ["سيف", "محارب", "قلم", "كاتب", ["ميكروفون : مغني", "فرشاة : رسام"]],
  ["سماء", "أزرق", "عشب", "أخضر", ["شمس : ذهبي", "ثلج : أبيض"]],
  ["نحلة", "عسل", "بقرة", "حليب", ["دجاجة : بيض", "شجرة : ثمار"]],
  ["مدرسة", "تعليم", "مستشفى", "علاج", ["مطعم : طعام", "مسجد : صلاة"]],
];

const completionSentences: [string, string, string[]][] = [
  ["الصدق ......... والكذب هلاك", "نجاة", ["خطر", "راحة", "سعادة"]],
  ["العلم في الصغر كالنقش على .........", "الحجر", ["الماء", "الورق", "الرمل"]],
  ["من صبر .........", "ظفر", ["سقط", "عجز", "تراجع"]],
  ["اليد التي لا تستطيع قطعها .........", "قبّلها", ["اضربها", "اتركها", "أمسكها"]],
  ["لا تؤجل عمل اليوم إلى .........", "الغد", ["العام", "الليل", "الصباح"]],
];

function generateVerbalQuestion(): QudratQuestion {
  const type = rand(0, 1);
  if (type === 0 && analogyPairs.length > 0) {
    // Analogy
    const idx = rand(0, analogyPairs.length - 1);
    const [a, b, c, d, wrongs] = analogyPairs[idx];
    const correct = `${c} : ${d}`;
    const allChoices = shuffle([correct, ...wrongs, `${d} : ${c}`]);
    return {
      text: `التناظر اللفظي: ${a} : ${b}`,
      choices: allChoices.slice(0, 4),
      correct_index: allChoices.indexOf(correct),
      explanation: `العلاقة: ${a} مقابل ${b}، فكذلك ${c} مقابل ${d}`,
      hint: "حدد العلاقة بين الزوج الأول ثم طبّقها",
      difficulty: "سهل",
    };
  } else {
    // Completion
    const idx = rand(0, completionSentences.length - 1);
    const [sentence, correct, wrongs] = completionSentences[idx];
    const allChoices = shuffle([correct, ...wrongs]);
    while (allChoices.length < 4) allChoices.push("لا شيء مما سبق");
    return {
      text: `أكمل: ${sentence}`,
      choices: allChoices.slice(0, 4),
      correct_index: allChoices.indexOf(correct),
      explanation: `الإجابة الصحيحة: "${correct}" — وهي حكمة/مثل عربي معروف`,
      hint: "فكّر في الأمثال العربية المشهورة",
      difficulty: "سهل",
    };
  }
}

// ===== Public API =====

export function generateQuestions(count: number, section: "kamy" | "lafzy" | "both"): QudratQuestion[] {
  const questions: QudratQuestion[] = [];
  for (let i = 0; i < count; i++) {
    if (section === "kamy") {
      questions.push(mathGenerators[rand(0, mathGenerators.length - 1)]());
    } else if (section === "lafzy") {
      questions.push(generateVerbalQuestion());
    } else {
      // Alternate
      if (i % 2 === 0) questions.push(mathGenerators[rand(0, mathGenerators.length - 1)]());
      else questions.push(generateVerbalQuestion());
    }
  }
  return questions;
}
