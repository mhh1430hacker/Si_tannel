"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PreviewChoice {
  text: string;
  image_url: string | null;
}

interface PreviewQuestion {
  question_id: string;
  text: string;
  image_url: string | null;
  question_type: number;
  choices: PreviewChoice[];
  is_mcq: boolean;
}

interface PreviewData {
  title: string;
  description: string;
  total_questions: number;
  mcq_questions: number;
  questions: PreviewQuestion[];
}

interface ImportResult {
  form_title: string;
  total_extracted: number;
  questions_imported: number;
  skipped_non_mcq: number;
}

interface FormImportItem {
  id: number;
  form_url: string;
  form_title: string | null;
  skill_category: string;
  difficulty: string;
  questions_imported: number;
  imported_at: string;
}

const DIFFICULTY_OPTIONS = [
  { value: "سهل", label: "سهل (Easy)" },
  { value: "متوسط", label: "متوسط (Medium)" },
  { value: "صعب", label: "صعب (Hard)" },
];

export default function ImportPage() {
  const [formUrl, setFormUrl] = useState("");
  const [skillCategory, setSkillCategory] = useState("");
  const [difficulty, setDifficulty] = useState("متوسط");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [imports, setImports] = useState<FormImportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImports, setShowImports] = useState(false);

  async function handlePreview() {
    if (!formUrl.trim()) {
      setError("الرجاء إدخال رابط النموذج");
      return;
    }
    setError(null);
    setLoading(true);
    setPreview(null);
    setImportResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/forms/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_url: formUrl,
          skill_category: skillCategory || "عام",
          difficulty,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "فشل في جلب النموذج");
        return;
      }

      const data: PreviewData = await res.json();
      setPreview(data);
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!formUrl.trim() || !skillCategory.trim()) {
      setError("الرجاء إدخال رابط النموذج والتصنيف");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/forms/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_url: formUrl,
          skill_category: skillCategory,
          difficulty,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "فشل في استيراد الأسئلة");
        return;
      }

      const data: ImportResult = await res.json();
      setImportResult(data);
      setPreview(null);
    } catch {
      setError("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  }

  async function loadImports() {
    try {
      const res = await fetch(`${API_BASE}/api/forms/imports`);
      if (res.ok) {
        const data: FormImportItem[] = await res.json();
        setImports(data);
        setShowImports(true);
      }
    } catch {
      // Graceful degradation
    }
  }

  async function deleteImport(importId: number) {
    try {
      const res = await fetch(`${API_BASE}/api/forms/imports/${importId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setImports((prev) => prev.filter((i) => i.id !== importId));
      }
    } catch {
      // Graceful degradation
    }
  }

  return (
    <main className="flex flex-col items-center min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">استيراد من Google Forms</h1>
          <p className="text-gray-600">
            الصق رابط نموذج Google لاستخراج الأسئلة والخيارات تلقائياً
          </p>
        </div>

        {/* Form Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="space-y-4">
            {/* URL Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                رابط النموذج
              </label>
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://docs.google.com/forms/d/e/.../viewform"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-left dir-ltr focus:border-blue-500 focus:outline-none transition-colors"
                dir="ltr"
              />
            </div>

            {/* Category Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                التصنيف (المادة)
              </label>
              <input
                type="text"
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value)}
                placeholder="مثال: الجبر، الهندسة، استيعاب المقروء"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-right focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Difficulty Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
                مستوى الصعوبة
              </label>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDifficulty(opt.value)}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      difficulty === opt.value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePreview}
                disabled={loading || !formUrl.trim()}
                className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && !preview ? "جاري المعاينة..." : "معاينة"}
              </button>
              <button
                onClick={handleImport}
                disabled={loading || !formUrl.trim() || !skillCategory.trim()}
                className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading && !importResult ? "جاري الاستيراد..." : "استيراد الأسئلة"}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-right">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Import Result */}
        {importResult && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-bold text-green-800 mb-3 text-right">
              تم الاستيراد بنجاح
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-700">
                  {importResult.questions_imported}
                </div>
                <div className="text-xs text-green-600">أسئلة مستوردة</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-600">
                  {importResult.total_extracted}
                </div>
                <div className="text-xs text-gray-500">إجمالي الأسئلة</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">
                  {importResult.skipped_non_mcq}
                </div>
                <div className="text-xs text-amber-500">تم تخطيها</div>
              </div>
            </div>
            <p className="text-sm text-green-700 mt-4 text-right">
              النموذج: {importResult.form_title}
            </p>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {preview.mcq_questions} سؤال قابل للاستيراد
              </span>
              <h3 className="text-lg font-bold text-right">{preview.title}</h3>
            </div>
            {preview.description && (
              <p className="text-sm text-gray-500 mb-4 text-right">
                {preview.description}
              </p>
            )}
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {preview.questions.map((q, idx) => (
                <div
                  key={q.question_id}
                  className={`p-4 rounded-xl border ${
                    q.is_mcq
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-mono text-gray-400 mt-1">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-right">
                        {q.text || "[سؤال مصور]"}
                      </p>
                      {q.image_url && (
                        <img
                          src={q.image_url}
                          alt=""
                          className="mt-2 max-h-32 rounded border border-gray-200"
                        />
                      )}
                      {q.choices.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {q.choices.map((c, ci) => (
                            <div
                              key={ci}
                              className="text-xs text-gray-600 flex items-center gap-1"
                            >
                              <span className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0" />
                              <span>{c.text}</span>
                              {c.image_url && (
                                <img
                                  src={c.image_url}
                                  alt=""
                                  className="h-8 rounded"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {!q.is_mcq && (
                        <span className="text-xs text-amber-600 mt-1 block">
                          سيتم تخطيه (ليس اختياراً من متعدد)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous Imports */}
        <div className="mt-8 text-center">
          <button
            onClick={loadImports}
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            {showImports ? "إخفاء عمليات الاستيراد السابقة" : "عرض عمليات الاستيراد السابقة"}
          </button>
        </div>

        {showImports && imports.length > 0 && (
          <div className="mt-4 space-y-3">
            {imports.map((imp) => (
              <div
                key={imp.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between"
              >
                <button
                  onClick={() => deleteImport(imp.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  حذف
                </button>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {imp.form_title || "بدون عنوان"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {imp.skill_category} • {imp.difficulty} •{" "}
                    {imp.questions_imported} أسئلة
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {showImports && imports.length === 0 && (
          <p className="text-center text-sm text-gray-400 mt-4">
            لا توجد عمليات استيراد سابقة
          </p>
        )}

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            العودة للرئيسية ←
          </a>
        </div>
      </div>
    </main>
  );
}
