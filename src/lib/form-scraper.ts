/**
 * Google Form Scraper: Extracts questions from public Google Forms.
 * Uses FB_PUBLIC_LOAD_DATA_ JavaScript variable embedded in the form HTML.
 * No OAuth or API key required — only works with PUBLIC forms.
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
}

export interface FormQuestion {
  question_id: string;
  text: string;
  question_type: number | null;
  choices: FormChoice[];
  image_url: string | null;
}

export interface FormData {
  title: string;
  description: string;
  form_url: string;
  questions: FormQuestion[];
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
  const questions: FormQuestion[] = [];

  for (const item of items) {
    try {
      const titleText = item?.[1] || "";
      let imageUrl: string | null = null;

      try {
        if (item.length > 6 && item[6] && Array.isArray(item[6])) {
          for (const media of item[6]) {
            if (Array.isArray(media)) {
              for (const inner of media) {
                if (
                  Array.isArray(inner) &&
                  inner.length > 0 &&
                  typeof inner[0] === "string" &&
                  inner[0].startsWith("http")
                ) {
                  imageUrl = inner[0];
                  break;
                }
              }
            }
            if (imageUrl) break;
          }
        }
      } catch {
        // ignore image extraction errors
      }

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
        questionType = 0; // short text
      }

      const choices: FormChoice[] = [];
      if (qDetails.length > 1 && Array.isArray(qDetails[1])) {
        for (const opt of qDetails[1]) {
          if (!Array.isArray(opt)) continue;
          const choiceText = opt[0] || "";
          let choiceImage: string | null = null;
          if (opt.length > 2 && Array.isArray(opt[2]) && opt[2].length > 0) {
            const imgData = opt[2][0];
            if (Array.isArray(imgData) && imgData.length > 1) {
              choiceImage = imgData[0] || null;
            }
          }
          choices.push({ text: choiceText, image_url: choiceImage });
        }
      }

      questions.push({
        question_id: questionId,
        text: titleText,
        question_type: questionType,
        choices,
        image_url: imageUrl,
      });
    } catch {
      continue;
    }
  }

  return { title, description, form_url: normalizedUrl, questions };
}
