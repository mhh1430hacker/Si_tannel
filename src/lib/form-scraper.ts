/**
 * Google Form Scraper: Extracts questions from public Google Forms.
 * Uses FB_PUBLIC_LOAD_DATA_ JavaScript variable embedded in the form HTML.
 * No OAuth or API key required — only works with PUBLIC forms.
 *
 * Supports:
 * - Text-based MCQ, dropdown, and checkbox questions
 * - Image-based questions (images embedded in questions and choices)
 * - Correct answer extraction from quiz-enabled forms (when available)
 */

const QUESTION_TYPE_MULTIPLE_CHOICE = 2;
const QUESTION_TYPE_DROPDOWN = 3;
const QUESTION_TYPE_CHECKBOXES = 4;

export const MCQ_COMPATIBLE_TYPES = new Set([
  QUESTION_TYPE_MULTIPLE_CHOICE,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_CHECKBOXES,
]);

export interface FormChoice {
  text: string;
  image_url: string | null;
  is_correct: boolean | null;
}

export interface FormQuestion {
  question_id: string;
  text: string;
  question_type: number | null;
  choices: FormChoice[];
  image_url: string | null;
  has_answer_key: boolean;
}

export interface FormData {
  title: string;
  description: string;
  form_url: string;
  questions: FormQuestion[];
  is_quiz: boolean;
}

function normalizeFormUrl(url: string): string {
  const match = url.match(/\/forms\/d\/e\/([^/]+)/);
  if (match) {
    return `https://docs.google.com/forms/d/e/${match[1]}/viewform`;
  }
  const match2 = url.match(/\/forms\/d\/([^/]+)/);
  if (match2) {
    return `https://docs.google.com/forms/d/${match2[1]}/viewform`;
  }
  return url;
}

function extractImageUrl(data: any): string | null {
  if (!data) return null;
  try {
    if (typeof data === "string" && data.startsWith("http")) return data;
    if (Array.isArray(data)) {
      for (const item of data) {
        const found = extractImageUrl(item);
        if (found) return found;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function extractQuestionImage(item: any): string | null {
  // Primary: item[6] contains media/image data
  try {
    if (item.length > 6 && item[6] && Array.isArray(item[6])) {
      const url = extractImageUrl(item[6]);
      if (url) return url;
    }
  } catch {
    // ignore
  }

  // Secondary: check item[4][0] for embedded image references
  try {
    if (item[4]?.[0]) {
      const qDetails = item[4][0];
      // Some forms embed images at qDetails[6] or deeper
      if (qDetails.length > 6 && qDetails[6]) {
        const url = extractImageUrl(qDetails[6]);
        if (url) return url;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

function extractChoiceImage(opt: any[]): string | null {
  // Choice images are at opt[2] → [[url, width, height]]
  try {
    if (opt.length > 2 && Array.isArray(opt[2]) && opt[2].length > 0) {
      const imgData = opt[2][0];
      if (Array.isArray(imgData) && imgData.length > 0 && typeof imgData[0] === "string") {
        return imgData[0];
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function extractCorrectAnswer(qDetails: any): Set<string> | null {
  // For quiz-enabled forms, correct answers may be at qDetails[4]
  // Structure: [[gradeType, [[correctAnswerText, ...], ...]], feedback...]
  const correctAnswers = new Set<string>();

  try {
    if (qDetails.length > 4 && qDetails[4] && Array.isArray(qDetails[4])) {
      const grading = qDetails[4];
      for (const rule of grading) {
        if (!Array.isArray(rule)) continue;
        if (rule.length > 1 && Array.isArray(rule[1])) {
          for (const ans of rule[1]) {
            if (Array.isArray(ans) && ans.length > 0 && typeof ans[0] === "string") {
              correctAnswers.add(ans[0]);
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // Also check choice-level flags: opt[4] might be 1 for correct choices
  try {
    if (qDetails.length > 1 && Array.isArray(qDetails[1])) {
      for (const opt of qDetails[1]) {
        if (Array.isArray(opt) && opt.length > 4 && opt[4] === 1) {
          correctAnswers.add(opt[0]);
        }
      }
    }
  } catch {
    // ignore
  }

  return correctAnswers.size > 0 ? correctAnswers : null;
}

export async function scrapeGoogleForm(formUrl: string): Promise<FormData> {
  const normalizedUrl = normalizeFormUrl(formUrl);

  const res = await fetch(normalizedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AinexBot/1.0)" },
  });

  if (!res.ok) {
    throw new Error(`فشل في الوصول إلى النموذج: ${res.status}`);
  }

  const html = await res.text();

  const regex = new RegExp(
    "FB_PUBLIC_LOAD_DATA_\\s*=\\s*([\\s\\S]*?);\\s*<\\/script>"
  );
  const match = html.match(regex);
  if (!match) {
    throw new Error("لا يمكن استخراج بيانات النموذج. تأكد من أن النموذج عام.");
  }

  let rawData: any;
  try {
    rawData = JSON.parse(match[1]);
  } catch {
    throw new Error("فشل في تحليل بيانات النموذج.");
  }

  const title = rawData[1]?.[8] || rawData[3] || "نموذج بدون عنوان";
  const description = rawData[1]?.[0] || "";
  const items = rawData[1]?.[1] || [];

  // Detect quiz mode: data[1][10][0] === 1 or data[1][16] exists
  let isQuiz = false;
  try {
    isQuiz = rawData[1]?.[10]?.[0] === 1 || (rawData[1]?.[16] != null);
  } catch {
    // ignore
  }

  const questions: FormQuestion[] = [];

  for (const item of items) {
    try {
      const titleText = item?.[1] || "";
      const imageUrl = extractQuestionImage(item);

      if (!item[4] || item[4].length === 0) continue;
      const qDetails = item[4][0];
      if (!qDetails) continue;

      const questionId =
        qDetails[0] != null ? String(qDetails[0]) : "";

      let questionType: number | null = null;
      if (qDetails.length > 3 && qDetails[3] != null) {
        questionType = qDetails[3];
      } else if (
        qDetails.length > 1 &&
        Array.isArray(qDetails[1]) &&
        qDetails[1].length >= 2
      ) {
        questionType = QUESTION_TYPE_MULTIPLE_CHOICE;
      } else {
        questionType = 0;
      }

      // Extract correct answers if available
      const correctAnswers = extractCorrectAnswer(qDetails);

      const choices: FormChoice[] = [];
      if (qDetails.length > 1 && Array.isArray(qDetails[1])) {
        for (const opt of qDetails[1]) {
          if (!Array.isArray(opt)) continue;
          const choiceText = opt[0] || "";
          const choiceImage = extractChoiceImage(opt);
          const isCorrect = correctAnswers ? correctAnswers.has(choiceText) : null;
          choices.push({ text: choiceText, image_url: choiceImage, is_correct: isCorrect });
        }
      }

      questions.push({
        question_id: questionId,
        text: titleText,
        question_type: questionType,
        choices,
        image_url: imageUrl,
        has_answer_key: correctAnswers !== null,
      });
    } catch {
      continue;
    }
  }

  return { title, description, form_url: normalizedUrl, questions, is_quiz: isQuiz };
}
