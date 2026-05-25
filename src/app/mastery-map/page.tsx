"use client";

/**
 * Mastery Map Page: Displays the MasteryConstellation.
 * 
 * Auto-detects the logged-in user from localStorage.
 * Fetches constellation data ONCE on page load.
 */

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import MasteryConstellation from "@/components/MasteryConstellation";

interface ConstellationNode {
  id: number;
  skill_category: string;
  sub_skill: string;
  mastery_level: number;
  is_mastered: boolean;
  x: number;
  y: number;
}

interface ConstellationEdge {
  id: number;
  source_node_id: number;
  target_node_id: number;
  weight: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface ConstellationData {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
}

export default function MasteryMapPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ConstellationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetchConstellation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchConstellation() {
    if (!user) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/mastery/${user.profile.id}`);
      if (!res.ok) throw new Error("Failed to fetch constellation");
      const result: ConstellationData = await res.json();
      setData(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-indigo-300">جارٍ التحميل...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <main className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/10 rounded w-1/3 mx-auto" />
            <div className="h-64 bg-white/10 rounded-xl" />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <main className="max-w-3xl mx-auto text-center py-20">
          <span className="text-5xl block mb-4">🗺️</span>
          <h1 className="text-xl font-bold text-white mb-2">خريطة الإتقان</h1>
          <p className="text-indigo-300 text-sm mb-6">
            أكمل بعض الاختبارات لتظهر خريطة الإتقان الخاصة بك
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchConstellation}
              className="px-5 py-2.5 bg-white/10 text-indigo-300 rounded-xl font-bold hover:bg-white/15 transition-all"
            >
              إعادة المحاولة
            </button>
            <a
              href="/dashboard"
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all"
            >
              لوحة التحكم
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <main className="max-w-3xl mx-auto space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">🗺️ خريطة الإتقان</h1>
          <div className="flex gap-2">
            <a href="/brain-map" className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-indigo-300 rounded-lg text-xs transition-all">🧠 خريطة دماغية</a>
            <a href="/skill-tree" className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-indigo-300 rounded-lg text-xs transition-all">🌳 مهارات</a>
          </div>
        </div>

        <div className="text-center">
          <p className="text-indigo-300/60 text-xs">
            تتحدث هذه الخريطة فقط عند إكمال جلسة دراسية
          </p>
        </div>

        <MasteryConstellation
          nodes={data?.nodes || []}
          edges={data?.edges || []}
        />

        {data && data.nodes.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <div className="text-2xl font-bold text-white">
                {data.nodes.length}
              </div>
              <div className="text-xs text-indigo-300/70">مهارات مكتشفة</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <div className="text-2xl font-bold text-green-400">
                {data.nodes.filter((n) => n.is_mastered).length}
              </div>
              <div className="text-xs text-indigo-300/70">مهارات متقنة</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4 text-center border border-white/10">
              <div className="text-2xl font-bold text-indigo-400">
                {data.edges.length}
              </div>
              <div className="text-xs text-indigo-300/70">روابط</div>
            </div>
          </div>
        )}

        {(!data || data.nodes.length === 0) && (
          <div className="bg-white/5 rounded-2xl p-12 border border-white/10 text-center">
            <span className="text-5xl block mb-4">🗺️</span>
            <h2 className="text-xl font-bold text-white mb-2">لا توجد بيانات بعد</h2>
            <p className="text-indigo-300 mb-6">أكمل بعض الاختبارات لتظهر خريطة الإتقان هنا</p>
            <a href="/exam" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all">
              ابدأ اختبار
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
