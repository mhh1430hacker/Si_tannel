"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold mb-2">معمل قدرات</h1>
        <p className="text-gray-600 mb-8">اختر التصنيف لبدء الاختبار التكيفي</p>

        {loading ? (
          <div className="animate-pulse h-32 bg-gray-200 rounded-xl" />
        ) : categories.length === 0 ? (
          <p className="text-gray-500">لا توجد تصنيفات متاحة حالياً</p>
        ) : (
          <div className="grid gap-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  router.push(
                    `/test-lab?category=${encodeURIComponent(cat)}`
                  )
                }
                className="w-full py-4 px-6 bg-white border-2 border-gray-200 rounded-xl text-lg font-medium hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-gray-100 flex gap-6 justify-center">
          <a
            href="/import"
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
          >
            استيراد أسئلة ←
          </a>
          <a
            href="/mastery-map"
            className="text-sm text-gray-500 hover:text-emerald-600 transition-colors"
          >
            خريطة الإتقان ←
          </a>
        </div>
      </div>
    </main>
  );
}
