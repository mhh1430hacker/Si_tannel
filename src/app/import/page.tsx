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

export default function ImportPage() {
  const [formUrl, setFormUrl] = useState("");
  const [skillCategory, setSkillCategory] = useState("");
  const [difficulty, setDifficulty] = useState("متوسط");
  const [preview, setPreview] = useState<FormPreview | null>(null);
  const [imports, setImports] = useState<FormImport[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showImports, setShowImports] = useState(false);
  // Track manually selected correct answers: question_id -> choice index
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, number>>({});

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
        body: JSON.stringify({ form_url: formUrl }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "فشل في المعاينة");
      }
      const data: FormPreview = await res.json();
      setPreview(data);
      if (!skillCategory && data.title) setSkillCategory(data.title);

      // Pre-fill correct answers from form data
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
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "فشل في الاستيراد");
      }
      const data = await res.json();
      setSuccess(`تم استيراد ${data.questions_imported} سؤال من "${data.form_title}"`);
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

  const mcqQuestions = preview?.questions.filter((q) => q.is_mcq) || [];
  const questionsWithAnswers = mcqQuestions.filter((q) => correctAnswers[q.question_id] !== undefined).length;

  return (
    <main className="flex flex-col items-center min-h-screen p-8">
      <div className="max-w-2xl w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">استيراد أسئلة من Google Forms</h1>
          <a href="/" className="text-sm text-blue-600 hover:underline">← الرئيسية</a>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">{success}</div>
        )}

        {/* Form URL Input */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">رابط النموذج</label>
          <input
            type="url"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            placeholder="https://docs.google.com/forms/d/e/..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm"
            dir="ltr"
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={handlePreview}
              disabled={loading || !formUrl.trim()}
              className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg disabled:opacity-50"
            >
              {loading ? "جارٍ المعاينة..." : "معاينة"}
            </button>
            <button
              onClick={loadImports}
              className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50"
            >
              عرض الاستيرادات السابقة
            </button>
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-bold mb-2">{preview.title}</h2>
            {preview.description && <p className="text-sm text-gray-600 mb-3">{preview.description}</p>}
            <p className="text-sm text-gray-500 mb-2">
              {preview.total_questions} سؤال إجمالي • {preview.mcq_questions} اختيار من متعدد
            </p>
            {preview.is_quiz && (
              <p className="text-xs text-blue-600 mb-2">هذا النموذج اختبار (Quiz) — يتم استخراج الإجابات الصحيحة تلقائياً إن توفرت</p>
            )}
            <p className="text-xs text-gray-400 mb-4">
              {questionsWithAnswers} / {mcqQuestions.length} سؤال لديه إجابة صحيحة محددة
            </p>

            <div className="grid gap-3 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                <input
                  type="text"
                  value={skillCategory}
                  onChange={(e) => setSkillCategory(e.target.value)}
                  placeholder="مثال: الجبر، الهندسة"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المستوى</label>
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
            </div>

            <button
              onClick={handleImport}
              disabled={importing || !skillCategory.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {importing ? "جارٍ الاستيراد..." : `استيراد ${preview.mcq_questions} سؤال`}
            </button>

            {/* Question list with answer selection */}
            <div className="mt-4 border-t pt-4 space-y-4">
              <p className="text-xs text-gray-500 font-medium">اضغط على الاختيار الصحيح لكل سؤال (اختياري):</p>
              {preview.questions.map((q, qi) => (
                <div
                  key={q.question_id || qi}
                  className={`p-3 rounded-lg border ${q.is_mcq ? "border-gray-200" : "border-gray-100 opacity-50"}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-xs text-gray-400 mt-0.5">{qi + 1}.</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{q.text || "[سؤال مصور]"}</p>
                      {!q.is_mcq && <span className="text-xs text-red-500">(غير مدعوم)</span>}
                    </div>
                  </div>

                  {/* Question image */}
                  {q.image_url && (
                    <div className="mb-2 mr-5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={q.image_url}
                        alt="صورة السؤال"
                        className="max-h-40 rounded border border-gray-200"
                      />
                    </div>
                  )}

                  {/* Choices with correct answer selection */}
                  {q.is_mcq && (
                    <div className="mr-5 space-y-1">
                      {q.choices.map((c, ci) => {
                        const isSelected = correctAnswers[q.question_id] === ci;
                        const isAutoCorrect = c.is_correct === true && correctAnswers[q.question_id] === undefined;
                        return (
                          <button
                            key={ci}
                            onClick={() => setCorrectAnswer(q.question_id, ci)}
                            className={`w-full text-right px-3 py-1.5 rounded text-xs border transition-colors flex items-center gap-2
                              ${isSelected
                                ? "border-green-500 bg-green-50 text-green-800"
                                : isAutoCorrect
                                  ? "border-green-300 bg-green-50/50 text-green-700"
                                  : "border-gray-200 hover:border-gray-400 text-gray-700"
                              }`}
                          >
                            {c.image_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={c.image_url} alt="" className="max-h-8 rounded" />
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
                  <div key={imp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{imp.form_title || imp.form_url}</p>
                      <p className="text-xs text-gray-500">
                        {imp.skill_category} • {imp.questions_imported} سؤال • {new Date(imp.imported_at).toLocaleDateString("ar")}
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
