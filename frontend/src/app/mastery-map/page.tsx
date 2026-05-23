"use client";

/**
 * Mastery Map Page: Displays the MasteryConstellation.
 * 
 * STRICT RULES:
 * - Fetches constellation data ONCE on page load.
 * - No real-time updates, no polling, no WebSocket.
 * - Updates only when user manually refreshes or completes a session.
 * - A slow, meditative view of cognitive growth.
 */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MasteryConstellation from "@/components/MasteryConstellation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

export default function MasteryMapPageWrapper() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-neutral-950">
          <div className="w-full max-w-3xl animate-pulse">
            <div className="h-64 bg-neutral-900 rounded-xl" />
          </div>
        </main>
      }
    >
      <MasteryMapPage />
    </Suspense>
  );
}

function MasteryMapPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("user_id") || "";

  const [data, setData] = useState<ConstellationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchConstellation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function fetchConstellation() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${API_BASE}/api/mastery/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch constellation");
      const result: ConstellationData = await res.json();
      setData(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  if (!userId) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-neutral-950">
        <div className="text-center">
          <h1 className="text-xl font-medium text-neutral-300 mb-4">
            خريطة الإتقان
          </h1>
          <p className="text-neutral-600 text-sm">
            يرجى تحديد معرف المستخدم لعرض خريطة الإتقان
          </p>
          <a
            href="/"
            className="inline-block mt-6 text-emerald-500 text-sm hover:underline"
          >
            العودة للرئيسية
          </a>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-neutral-950">
        <div className="w-full max-w-3xl animate-pulse">
          <div className="h-64 bg-neutral-900 rounded-xl" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-neutral-950">
        <div className="text-center">
          <p className="text-neutral-500 text-sm mb-4">
            تعذر تحميل خريطة الإتقان
          </p>
          <button
            onClick={fetchConstellation}
            className="text-emerald-500 text-sm hover:underline"
          >
            إعادة المحاولة
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-neutral-950">
      <div className="w-full max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-medium text-neutral-300">
            خريطة الإتقان
          </h1>
          <p className="text-neutral-600 text-xs mt-1">
            تتحدث هذه الخريطة فقط عند إكمال جلسة دراسية
          </p>
        </div>

        <MasteryConstellation
          nodes={data?.nodes || []}
          edges={data?.edges || []}
        />

        {/* Stats summary below constellation */}
        {data && data.nodes.length > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="bg-neutral-900 rounded-lg p-4 text-center border border-neutral-800">
              <div className="text-2xl font-bold text-neutral-200">
                {data.nodes.length}
              </div>
              <div className="text-xs text-neutral-600">مهارات مكتشفة</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-4 text-center border border-neutral-800">
              <div className="text-2xl font-bold text-emerald-400">
                {data.nodes.filter((n) => n.is_mastered).length}
              </div>
              <div className="text-xs text-neutral-600">مهارات متقنة</div>
            </div>
            <div className="bg-neutral-900 rounded-lg p-4 text-center border border-neutral-800">
              <div className="text-2xl font-bold text-neutral-400">
                {data.edges.length}
              </div>
              <div className="text-xs text-neutral-600">روابط</div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-neutral-600 text-sm hover:text-neutral-400 transition-colors"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    </main>
  );
}
