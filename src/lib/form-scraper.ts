/**
 * Universal Form Scraper: Extracts questions from Google Forms AND Microsoft Forms.
 * 
 * Google Forms: Uses FB_PUBLIC_LOAD_DATA_ embedded JavaScript variable.
 * Microsoft Forms: Fetches form page and extracts embedded JSON data.
 * 
 * Supports:
 * - Text-based MCQ, dropdown, and checkbox questions
 * - Image-based questions (images embedded in questions and choices)
 * - Correct answer extraction (quiz mode for Google, answer keys for Microsoft)
 * - Auto-testing answers by submitting trial responses (fallback)
 */

const QUESTION_TYPE_MULTIPLE_CHOICE = 2;
const QUESTION_TYPE_DROPDOWN = 3;
const QUESTION_TYPE_CHECKBOXES = 4;

export const MCQ_COMPATIBLE_TYPES = new Set([
  QUESTION_TYPE_MULTIPLE_CHOICE,
  QUESTION_TYPE_DROPDOWN,
  QUESTION_TYPE_CHECKBOXES,
]);

export type FormPlatform = "google" | "microsoft" | "unknown";

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
  platform: FormPlatform;
}

// ============================================================
// Platform Detection
// ============================================================

export function detectFormPlatform(url: string): FormPlatform {
  const lower = url.toLowerCase();
  if (
    lower.includes("docs.google.com/forms") ||
    lower.includes("google.com/forms")
  ) {
    return "google";
  }
  if (
    lower.includes("forms.office.com") ||
    lower.includes("forms.microsoft.com") ||
    lower.includes("forms.osi.office.net")
  ) {
    return "microsoft";
  }
  return "unknown";
}

/**
 * Universal form scraper: auto-detects platform and scrapes accordingly.
 */
export async function scrapeForm(formUrl: string): Promise<FormData> {
  const platform = detectFormPlatform(formUrl);
  switch (platform) {
    case "google":
      return scrapeGoogleForm(formUrl);
    case "microsoft":
      return scrapeMicrosoftForm(formUrl);
    default:
      throw new Error(
        "رابط غير مدعوم. يرجى استخدام رابط Google Forms أو Microsoft Forms."
      );
  }
}

// ============================================================
// Google Forms Scraper
// ============================================================

function normalizeGoogleFormUrl(url: string): string {
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
  try {
    if (item.length > 6 && item[6] && Array.isArray(item[6])) {
      const url = extractImageUrl(item[6]);
      if (url) return url;
    }
  } catch {
    // ignore
  }
  try {
    if (item[4]?.[0]) {
      const qDetails = item[4][0];
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
  try {
    if (opt.length > 2 && Array.isArray(opt[2]) && opt[2].length > 0) {
      const imgData = opt[2][0];
      if (
        Array.isArray(imgData) &&
        imgData.length > 0 &&
        typeof imgData[0] === "string"
      ) {
        return imgData[0];
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function extractCorrectAnswer(qDetails: any): Set<string> | null {
  const correctAnswers = new Set<string>();

  try {
    if (qDetails.length > 4 && qDetails[4] && Array.isArray(qDetails[4])) {
      const grading = qDetails[4];
      for (const rule of grading) {
        if (!Array.isArray(rule)) continue;
        if (rule.length > 1 && Array.isArray(rule[1])) {
          for (const ans of rule[1]) {
            if (
              Array.isArray(ans) &&
              ans.length > 0 &&
              typeof ans[0] === "string"
            ) {
              correctAnswers.add(ans[0]);
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }

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
  const normalizedUrl = normalizeGoogleFormUrl(formUrl);

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
    throw new Error(
      "لا يمكن استخراج بيانات النموذج. تأكد من أن النموذج عام."
    );
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

  let isQuiz = false;
  try {
    isQuiz =
      rawData[1]?.[10]?.[0] === 1 || rawData[1]?.[16] != null;
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

      const correctAnswers = extractCorrectAnswer(qDetails);

      const choices: FormChoice[] = [];
      if (qDetails.length > 1 && Array.isArray(qDetails[1])) {
        for (const opt of qDetails[1]) {
          if (!Array.isArray(opt)) continue;
          const choiceText = opt[0] || "";
          const choiceImage = extractChoiceImage(opt);
          const isCorrect = correctAnswers
            ? correctAnswers.has(choiceText)
            : null;
          choices.push({
            text: choiceText,
            image_url: choiceImage,
            is_correct: isCorrect,
          });
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

  return {
    title,
    description,
    form_url: normalizedUrl,
    questions,
    is_quiz: isQuiz,
    platform: "google",
  };
}

// ============================================================
// Google Forms Answer Auto-Testing
// ============================================================

/**
 * Attempts to discover correct answers by submitting trial responses
 * to a Google Forms quiz that shows scores after submission.
 * Only works if the form is configured to "Show score immediately".
 */
export async function autoTestGoogleFormAnswers(
  formUrl: string,
  formData: FormData
): Promise<Record<string, number>> {
  const discovered: Record<string, number> = {};

  // Extract form action URL for submission
  const normalizedUrl = normalizeGoogleFormUrl(formUrl);
  const submitUrl = normalizedUrl.replace("/viewform", "/formResponse");

  // Get entry IDs from the form
  const res = await fetch(normalizedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AinexBot/1.0)" },
  });
  if (!res.ok) return discovered;
  const html = await res.text();

  // Extract FB_PUBLIC_LOAD_DATA_ to get entry IDs
  const regex = /FB_PUBLIC_LOAD_DATA_\s*=\s*([\s\S]*?);\s*<\/script>/;
  const match = html.match(regex);
  if (!match) return discovered;

  let rawData: any;
  try {
    rawData = JSON.parse(match[1]);
  } catch {
    return discovered;
  }

  const items = rawData[1]?.[1] || [];
  const entryMap: Record<string, string> = {};

  for (const item of items) {
    try {
      if (!item[4] || !item[4][0]) continue;
      const qDetails = item[4][0];
      const qId = String(qDetails[0]);
      entryMap[qId] = `entry.${qDetails[0]}`;
    } catch {
      continue;
    }
  }

  for (const question of formData.questions) {
    if (question.has_answer_key) continue;
    if (question.choices.length < 2) continue;

    const entryId = entryMap[question.question_id];
    if (!entryId) continue;

    for (let i = 0; i < question.choices.length; i++) {
      try {
        const body = new URLSearchParams();
        body.append(entryId, question.choices[i].text);

        const submitRes = await fetch(submitUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (compatible; AinexBot/1.0)",
          },
          body: body.toString(),
          redirect: "follow",
        });

        if (!submitRes.ok) continue;
        const responseHtml = await submitRes.text();

        // Check for score indicators in the response
        // Google Forms shows "X / Y points" for correct answers
        const scoreMatch = responseHtml.match(
          /data-score="(\d+)"/
        );
        if (scoreMatch && parseInt(scoreMatch[1]) > 0) {
          discovered[question.question_id] = i;
          break;
        }

        // Alternative: check for class that indicates correct answer
        if (
          responseHtml.includes("freebirdFormviewerViewItemsItemGradeCorrect")
        ) {
          discovered[question.question_id] = i;
          break;
        }
      } catch {
        continue;
      }
    }
  }

  return discovered;
}

// ============================================================
// Microsoft Forms Scraper
// ============================================================

interface MsFormQuestion {
  id: string;
  title: string;
  type: string;
  choices?: MsFormChoice[];
  image?: { source: string } | null;
  required?: boolean;
  correctAnswer?: string | string[];
}

interface MsFormChoice {
  description: string;
  value: string;
  image?: { source: string } | null;
  isCorrect?: boolean;
}

function normalizeMicrosoftFormUrl(url: string): string {
  return url.split("?")[0].replace(/\/$/, "");
}

function extractMsFormId(url: string): string | null {
  // Forms URLs: .../Pages/ResponsePage.aspx?id=FORM_ID
  const idMatch = url.match(/[?&]id=([^&]+)/);
  if (idMatch) return idMatch[1];

  // Direct form links: .../e/FORM_ID/...
  const eMatch = url.match(/\/e\/([^/]+)/);
  if (eMatch) return eMatch[1];

  // Forms with /r/ prefix
  const rMatch = url.match(/\/r\/([^/?]+)/);
  if (rMatch) return rMatch[1];

  return null;
}

export async function scrapeMicrosoftForm(
  formUrl: string
): Promise<FormData> {
  const res = await fetch(formUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    throw new Error(`فشل في الوصول إلى نموذج Microsoft: ${res.status}`);
  }

  const html = await res.text();

  // Microsoft Forms embeds form data in __NEXT_DATA__ or window.__page_data__ or ServerSideProps
  let formDataObj: any = null;

  // Method 1: Extract from __buildInfo or __rendererConfig
  const serverDataMatch = html.match(
    /var\s+_sd\s*=\s*({[\s\S]*?});\s*<\/script>/
  );
  if (serverDataMatch) {
    try {
      formDataObj = JSON.parse(serverDataMatch[1]);
    } catch {
      // ignore
    }
  }

  // Method 2: Look for window.__page_model__
  if (!formDataObj) {
    const pageModelMatch = html.match(
      /window\.__page_model__\s*=\s*([\s\S]*?);\s*(?:<\/script>|window\.)/
    );
    if (pageModelMatch) {
      try {
        formDataObj = JSON.parse(pageModelMatch[1]);
      } catch {
        // ignore
      }
    }
  }

  // Method 3: Extract from ServerSideRenderData
  if (!formDataObj) {
    const ssrMatch = html.match(
      /ServerSideRenderData\s*=\s*([\s\S]*?);\s*<\/script>/
    );
    if (ssrMatch) {
      try {
        formDataObj = JSON.parse(ssrMatch[1]);
      } catch {
        // ignore
      }
    }
  }

  // Method 4: Extract from __FORM_DATA__ or similar
  if (!formDataObj) {
    const formDataMatch = html.match(
      /(?:__FORM_DATA__|__NEXT_DATA__|__page_data__|__state__)\s*=\s*([\s\S]*?);\s*<\/script>/
    );
    if (formDataMatch) {
      try {
        formDataObj = JSON.parse(formDataMatch[1]);
      } catch {
        // ignore
      }
    }
  }

  // Method 5: Try to extract JSON from script tags containing question-like structures
  if (!formDataObj) {
    const scriptTags = html.match(
      /<script[^>]*>([\s\S]*?)<\/script>/gi
    );
    if (scriptTags) {
      for (const script of scriptTags) {
        const content = script.replace(/<\/?script[^>]*>/gi, "");
        // Look for patterns that indicate form data
        if (
          content.includes('"questions"') ||
          content.includes('"choices"') ||
          content.includes('"title"')
        ) {
          const jsonMatch = content.match(/({[\s\S]*"questions"[\s\S]*})/);
          if (jsonMatch) {
            try {
              formDataObj = JSON.parse(jsonMatch[1]);
              break;
            } catch {
              // try next
            }
          }
        }
      }
    }
  }

  // Parse the extracted data
  const title = extractMsFormTitle(formDataObj, html);
  const description = extractMsFormDescription(formDataObj, html);
  const rawQuestions = extractMsFormQuestions(formDataObj, html);
  const isQuiz = checkMsFormIsQuiz(formDataObj, rawQuestions);

  const questions: FormQuestion[] = rawQuestions.map((q) => {
    const hasAnswerKey =
      q.correctAnswer !== undefined && q.correctAnswer !== null;
    const correctSet = new Set<string>();
    if (hasAnswerKey) {
      if (Array.isArray(q.correctAnswer)) {
        for (const a of q.correctAnswer) correctSet.add(a);
      } else if (typeof q.correctAnswer === "string") {
        correctSet.add(q.correctAnswer);
      }
    }

    const choices: FormChoice[] = (q.choices || []).map((c) => ({
      text: c.description || c.value || "",
      image_url: c.image?.source || null,
      is_correct: hasAnswerKey
        ? correctSet.has(c.value) || correctSet.has(c.description) || (c.isCorrect === true)
        : null,
    }));

    return {
      question_id: q.id,
      text: q.title || "",
      question_type:
        q.type === "Choice" || q.type === "MultiChoice"
          ? QUESTION_TYPE_MULTIPLE_CHOICE
          : q.type === "Dropdown"
            ? QUESTION_TYPE_DROPDOWN
            : null,
      choices,
      image_url: q.image?.source || null,
      has_answer_key: hasAnswerKey,
    };
  });

  if (questions.length === 0) {
    throw new Error(
      "لم يتم العثور على أسئلة في نموذج Microsoft. تأكد من أن النموذج عام ويحتوي على أسئلة اختيار من متعدد."
    );
  }

  return {
    title,
    description,
    form_url: formUrl,
    questions,
    is_quiz: isQuiz,
    platform: "microsoft",
  };
}

function extractMsFormTitle(data: any, html: string): string {
  if (data) {
    if (data.title) return data.title;
    if (data.form?.title) return data.form.title;
    if (data.formInfo?.title) return data.formInfo.title;
    if (data.name) return data.name;
  }
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  if (titleMatch) return titleMatch[1].replace("| Microsoft Forms", "").trim();
  return "نموذج Microsoft بدون عنوان";
}

function extractMsFormDescription(data: any, html: string): string {
  if (data) {
    if (data.description) return data.description;
    if (data.form?.description) return data.form.description;
    if (data.formInfo?.description) return data.formInfo.description;
  }
  const descMatch = html.match(
    /meta\s+name="description"\s+content="([^"]+)"/
  );
  return descMatch ? descMatch[1] : "";
}

function extractMsFormQuestions(
  data: any,
  html: string
): MsFormQuestion[] {
  const questions: MsFormQuestion[] = [];

  if (data) {
    const rawQs = findQuestionsInObject(data);
    if (rawQs.length > 0) return rawQs;
  }

  // Fallback: parse from HTML structure
  const questionBlocks = html.match(
    /data-question-id="([^"]+)"[\s\S]*?<\/div>/gi
  );
  if (questionBlocks) {
    for (const block of questionBlocks) {
      const idMatch = block.match(/data-question-id="([^"]+)"/);
      const titleMatch = block.match(
        /class="[^"]*question-title[^"]*"[^>]*>([^<]+)/
      );
      if (idMatch) {
        questions.push({
          id: idMatch[1],
          title: titleMatch ? titleMatch[1].trim() : "",
          type: "Choice",
          choices: [],
        });
      }
    }
  }

  return questions;
}

function findQuestionsInObject(obj: any): MsFormQuestion[] {
  if (!obj || typeof obj !== "object") return [];

  // Direct questions array
  if (Array.isArray(obj.questions)) {
    return obj.questions
      .filter(
        (q: any) =>
          q &&
          (q.type === "Choice" ||
            q.type === "MultiChoice" ||
            q.type === "Dropdown" ||
            q.questionType === "Choice" ||
            (q.choices && q.choices.length >= 2))
      )
      .map(normalizeMsQuestion);
  }

  // Nested in form/formInfo
  if (obj.form?.questions) return findQuestionsInObject(obj.form);
  if (obj.formInfo?.questions)
    return findQuestionsInObject(obj.formInfo);
  if (obj.pages) {
    const allQs: MsFormQuestion[] = [];
    for (const page of Array.isArray(obj.pages) ? obj.pages : []) {
      if (page.questions) {
        allQs.push(...findQuestionsInObject(page));
      }
    }
    if (allQs.length > 0) return allQs;
  }

  // Deep search
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === "object" && obj[key] !== null) {
      const found = findQuestionsInObject(obj[key]);
      if (found.length > 0) return found;
    }
  }

  return [];
}

function normalizeMsQuestion(q: any): MsFormQuestion {
  return {
    id: q.id || q.questionId || String(Math.random()),
    title: q.title || q.questionTitle || q.text || "",
    type: q.type || q.questionType || "Choice",
    choices: (q.choices || q.options || []).map((c: any) => ({
      description: c.description || c.text || c.label || "",
      value: c.value || c.id || c.description || "",
      image: c.image || c.media || null,
      isCorrect: c.isCorrect || c.correct || false,
    })),
    image: q.image || q.media || null,
    correctAnswer: q.correctAnswer || q.answer || q.correctAnswers || undefined,
  };
}

function checkMsFormIsQuiz(data: any, questions: MsFormQuestion[]): boolean {
  if (data) {
    if (data.isQuiz === true || data.form?.isQuiz === true) return true;
    if (data.settings?.isQuiz === true) return true;
  }
  return questions.some(
    (q) => q.correctAnswer !== undefined || q.choices?.some((c) => c.isCorrect)
  );
}
