"use client";

import { useState } from "react";

interface PreviewChoice {
  text: string;
  image_url: string | null;
  is_correct: boolean | null;
}

interface PreviewQuestion {
  question_id: string;
  text: string;
  image_url: string | null;
  choices: PreviewChoice[];
  is_mcq: boolean;
  has_answer_key: boolean;
}

interface FormPreview {
  title: string;
  description: string;
  total_questions: number;
  mcq_questions: number;
  questions: PreviewQuestion[];
  is_quiz: boolean;
  platform?: string;
  auto_tested_count?: number;
}

interface FormImport {
  id: number;
  form_url: string;
  form_title: string;
  skill_category: string;
  difficulty: string;
  questions_imported: number;
  imported_at: string;
}

interface QudratSectionInfo {
  section_id: string;
  section_name: string;
  question_count: number;
}

const PLATFORM_LABELS: Record<string, string> = {
  google: "Google Forms",
  microsoft: "Microsoft Forms",
};

export default function ImportPage() {
  const [formUrl, setFormUrl] = useState("");
  const [skillCategory, setSkillCategory] = useState("");
  const [difficulty, setDifficulty] = useState("متوسط");
  const [section, setSection] = useState("kamy");
  const [preview, setPreview] = useState<FormPreview | null>(null);
  const [imports, setImports] = useState<FormImport[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showImports, setShowImports] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, number>>({});
  const [autoTestAnswers, setAutoTestAnswers] = useState(false);
  const [autoTesting, setAutoTesting] = useState(false);

  // Qudrat section state
  const [qudratSections, setQudratSections] = useState<QudratSectionInfo[] | null>(null);
  const [loadingQudrat, setLoadingQudrat] = useState(false);
  const [importingQudrat, setImportingQudrat] = useState<string | null>(null);
  const [qudratDifficulty, setQudratDifficulty] = useState("متوسط");

  function detectPlatformHint(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes("google.com/forms")) return "google";
    if (lower.includes("forms.office.com") || lower.includes("forms.microsoft.com")) return "microsoft";
    return "";
  }

  async function handlePreview() {
    if (!formUrl.trim()) return;
    setLoading(true);
    setError(null);
    setPreview(null);
    setCorrectAnswers({});
    try {
      const res = await fetch(`/api/forms/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_url: formUrl, auto_test_answers: autoTestAnswers }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "فشل في المعاينة");
      }
      const data: FormPreview = await res.json();
      setPreview(data);
      if (!skillCategory && data.title) setSkillCategory(data.title);

      const autoAnswers: Record<string, number> = {};
      for (const q of data.questions) {
        if (!q.is_mcq) continue;
        const correctIdx = q.choices.findIndex((c) => c.is_correct === true);
        if (correctIdx >= 0) {
          autoAnswers[q.question_id] = correctIdx;
        }
      }
      if (Object.keys(autoAnswers).length > 0) {
        setCorrectAnswers(autoAnswers);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoTest() {
    if (!formUrl.trim() || !preview) return;
    setAutoTesting(true);
    setError(null);
    try {
      const res = await fetch(`/api/forms/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_url: formUrl, auto_test_answers: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "فشل في اختبار الإجابات");
      }
      const data: FormPreview = await res.json();
      setPreview(data);

      const newAnswers: Record<string, number> = { ...correctAnswers };
      for (const q of data.questions) {
        if (!q.is_mcq) continue;
        const correctIdx = q.choices.findIndex((c) => c.is_correct === true);
        if (correctIdx >= 0 && newAnswers[q.question_id] === undefined) {
          newAnswers[q.question_id] = correctIdx;
        }
      }
      setCorrectAnswers(newAnswers);

      if (data.auto_tested_count && data.auto_tested_count > 0) {
        setSuccess(`تم اكتشاف ${data.auto_tested_count} إجابة صحيحة تلقائياً`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAutoTesting(false);
    }
  }

  async function handleImport() {
    if (!formUrl.trim() || !skillCategory.trim()) return;
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/forms/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_url: formUrl,
          skill_category: skillCategory,
          difficulty,
          correct_answers: correctAnswers,
          section,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "فشل في الاستيراد");
      }
      const data = await res.json();
      const platform = PLATFORM_LABELS[data.platform] || data.platform;
      setSuccess(
        `تم استيراد ${data.questions_imported} سؤال من "${data.form_title}" (${platform})` +
          (data.skipped_duplicates > 0
            ? ` • تم تخطي ${data.skipped_duplicates} سؤال مكرر`
            : "")
      );
      setPreview(null);
      setFormUrl("");
      setCorrectAnswers({});
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  async function loadImports() {
    try {
      const res = await fetch(`/api/forms/imports`);
      const data = await res.json();
      setImports(data);
      setShowImports(true);
    } catch {
      setError("فشل في تحميل قائمة الاستيرادات");
    }
  }

  async function deleteImport(id: number) {
    try {
      await fetch(`/api/forms/imports/${id}`, { method: "DELETE" });
      setImports(imports.filter((i) => i.id !== id));
    } catch {
      setError("فشل في الحذف");
    }
  }

  function setCorrectAnswer(questionId: string, choiceIdx: number) {
    setCorrectAnswers((prev) => ({ ...prev, [questionId]: choiceIdx }));
  }

  async function fetchQudratSections() {
    setLoadingQudrat(true);
    setError(null);
    try {
      const res = await fetch(`/api/qudrat/fetch`);
      const data = await res.json();
      setQudratSections(data.sections);
    } catch {
      setError("فشل في تحميل أقسام القدرات");
    } finally {
      setLoadingQudrat(false);
    }
  }

  async function importQudratSection(sectionId: string) {
    setImportingQudrat(sectionId);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/qudrat/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: sectionId, difficulty: qudratDifficulty }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "فشل في الاستيراد");
      }
      const data = await res.json();
      if (data.imported > 0) {
        setSuccess(`تم استيراد ${data.imported} سؤال جديد في "${data.section_name}"`);
      } else {
        setSuccess(`جميع الأسئلة مستوردة مسبقاً (${data.skipped_duplicates} سؤال موجود)`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImportingQudrat(null);
    }
  }

  const mcqQuestions = preview?.questions.filter((q) => q.is_mcq) || [];
  const questionsWithAnswers = mcqQuestions.filter(
    (q) => correctAnswers[q.question_id] !== undefined
  ).length;
  const questionsWithoutAnswers = mcqQuestions.length - questionsWithAnswers;
  const platformHint = detectPlatformHint(formUrl);

  return (
    <main className="flex flex-col items-center min-h-screen p-8" dir="rtl">
      <div className="max-w-2xl w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">استيراد الأسئلة</h1>
          <a href="/" className="text-sm text-blue-600 hover:underline">
            ← الرئيسية
          </a>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
            {success}
          </div>
        )}

        {/* ====== Qudrat Questions from Internet ====== */}
        <div className="bg-white rounded-xl border-2 border-indigo-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">📚</span>
            <div>
              <h2 className="text-lg font-bold text-indigo-900">أسئلة قدرات جاهزة</h2>
              <p className="text-xs text-gray-500">
                أسئلة تدريبية للقسم الكمي واللفظي مع الإجابات الصحيحة
              </p>
            </div>
          </div>

          {!qudratSections ? (
            <button
              onClick={fetchQudratSections}
              disabled={loadingQudrat}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loadingQudrat ? "جارٍ التحميل..." : "جلب أسئلة القدرات من الإنترنت"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  مستوى الصعوبة
                </label>
                <select
                  value={qudratDifficulty}
                  onChange={(e) => setQudratDifficulty(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="سهل">سهل</option>
                  <option value="متوسط">متوسط</option>
                  <option value="صعب">صعب</option>
                </select>
              </div>
              {qudratSections.map((sec) => (
                <div
                  key={sec.section_id}
                  className="flex items-center justify-between p-4 rounded-lg border border-indigo-100 bg-indigo-50/30"
                >
                  <div>
                    <p className="font-medium text-indigo-900">{sec.section_name}</p>
                    <p className="text-xs text-gray-500">
                      {sec.question_count} سؤال مع الإجابات
                    </p>
                  </div>
                  <button
                    onClick={() => importQudratSection(sec.section_id)}
                    disabled={importingQudrat === sec.section_id}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {importingQudrat === sec.section_id ? "جارٍ..." : "استيراد"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ====== Form Import (Google + Microsoft) ====== */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-2">
              <span className="text-xl">📝</span>
            </div>
            <div>
              <h2 className="text-lg font-bold">
                استيراد من نماذج إلكترونية
              </h2>
              <p className="text-xs text-gray-500">
                يدعم Google Forms و Microsoft Forms — يكتشف المنصة تلقائياً
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                platformHint === "google"
                  ? "bg-blue-100 text-blue-700 border border-blue-200"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              Google Forms
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                platformHint === "microsoft"
                  ? "bg-purple-100 text-purple-700 border border-purple-200"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              Microsoft Forms
            </span>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            رابط النموذج
          </label>
          <input
            type="url"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            placeholder="https://docs.google.com/forms/d/e/...  أو  https://forms.office.com/..."
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            dir="ltr"
          />

          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="autoTest"
              checked={autoTestAnswers}
              onChange={(e) => setAutoTestAnswers(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="autoTest" className="text-xs text-gray-600">
              محاولة اكتشاف الإجابات الصحيحة تلقائياً (بتجريب الإجابات)
            </label>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handlePreview}
              disabled={loading || !formUrl.trim()}
              className="px-5 py-2 bg-gray-800 text-white text-sm rounded-lg disabled:opacity-50 hover:bg-gray-900 transition-colors"
            >
              {loading ? "جارٍ المعاينة..." : "معاينة"}
            </button>
            <button
              onClick={loadImports}
              className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              عرض الاستيرادات السابقة
            </button>
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold">{preview.title}</h2>
              {preview.platform && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    preview.platform === "google"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {PLATFORM_LABELS[preview.platform] || preview.platform}
                </span>
              )}
            </div>
            {preview.description && (
              <p className="text-sm text-gray-600 mb-3">{preview.description}</p>
            )}
            <p className="text-sm text-gray-500 mb-2">
              {preview.total_questions} سؤال إجمالي • {preview.mcq_questions} اختيار من
              متعدد
            </p>
            {preview.is_quiz && (
              <p className="text-xs text-blue-600 mb-2">
                هذا النموذج اختبار (Quiz) — يتم استخراج الإجابات الصحيحة تلقائياً إن
                توفرت
              </p>
            )}
            <div className="flex items-center gap-4 mb-4">
              <p className="text-xs text-gray-400">
                {questionsWithAnswers} / {mcqQuestions.length} سؤال لديه إجابة صحيحة
                محددة
              </p>
              {questionsWithoutAnswers > 0 && (
                <button
                  onClick={handleAutoTest}
                  disabled={autoTesting}
                  className="px-3 py-1 bg-amber-100 text-amber-800 text-xs rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors border border-amber-200"
                >
                  {autoTesting
                    ? "جارٍ اكتشاف الإجابات..."
                    : `اكتشاف الإجابات (${questionsWithoutAnswers} سؤال)`}
                </button>
              )}
            </div>

            <div className="grid gap-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  التصنيف
                </label>
                <input
                  type="text"
                  value={skillCategory}
                  onChange={(e) => setSkillCategory(e.target.value)}
                  placeholder="مثال: الجبر، الهندسة"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    المستوى
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="سهل">سهل</option>
                    <option value="متوسط">متوسط</option>
                    <option value="صعب">صعب</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    القسم
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="kamy">كمي — الرياضيات</option>
                    <option value="lafzy">لفظي — اللغة العربية</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={importing || !skillCategory.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
            >
              {importing
                ? "جارٍ الاستيراد..."
                : `استيراد ${preview.mcq_questions} سؤال وحفظها في قاعدة البيانات`}
            </button>

            {/* Question list with answer selection */}
            <div className="mt-4 border-t pt-4 space-y-4">
              <p className="text-xs text-gray-500 font-medium">
                اضغط على الاختيار الصحيح لكل سؤال (اختياري):
              </p>
              {preview.questions.map((q, qi) => (
                <div
                  key={q.question_id || qi}
                  className={`p-3 rounded-lg border ${
                    q.is_mcq ? "border-gray-200" : "border-gray-100 opacity-50"
                  }`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xs text-gray-400 mt-0.5">{qi + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {q.text || "[سؤال مصور]"}
                      </p>
                      {!q.is_mcq && (
                        <span className="text-xs text-red-500">(غير مدعوم)</span>
                      )}
                    </div>
                  </div>

                  {q.image_url && (
                    <div className="mb-2 mr-5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={q.image_url}
                        alt="صورة السؤال"
                        className="max-h-48 rounded-lg border border-gray-200 shadow-sm"
                      />
                    </div>
                  )}

                  {q.is_mcq && (
                    <div className="mr-5 space-y-1">
                      {q.choices.map((c, ci) => {
                        const isSelected = correctAnswers[q.question_id] === ci;
                        const isAutoCorrect =
                          c.is_correct === true &&
                          correctAnswers[q.question_id] === undefined;
                        return (
                          <button
                            key={ci}
                            onClick={() => setCorrectAnswer(q.question_id, ci)}
                            className={`w-full text-right px-3 py-2 rounded text-xs border transition-colors flex items-center gap-2
                              ${
                                isSelected
                                  ? "border-green-500 bg-green-50 text-green-800"
                                  : isAutoCorrect
                                    ? "border-green-300 bg-green-50/50 text-green-700"
                                    : "border-gray-200 hover:border-gray-400 text-gray-700"
                              }`}
                          >
                            {c.image_url ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={c.image_url}
                                  alt=""
                                  className="max-h-12 rounded"
                                />
                              </>
                            ) : null}
                            <span className="flex-1">{c.text || "[صورة]"}</span>
                            {(isSelected || isAutoCorrect) && (
                              <span className="text-green-600 font-bold">صح</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import History */}
        {showImports && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4">الاستيرادات السابقة</h2>
            {imports.length === 0 ? (
              <p className="text-sm text-gray-500">لا توجد استيرادات</p>
            ) : (
              <div className="space-y-3">
                {imports.map((imp) => (
                  <div
                    key={imp.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {imp.form_title || imp.form_url}
                      </p>
                      <p className="text-xs text-gray-500">
                        {imp.skill_category} • {imp.questions_imported} سؤال •{" "}
                        {new Date(imp.imported_at).toLocaleDateString("ar")}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteImport(imp.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
