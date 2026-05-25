"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [loading, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950">
      <div className="text-center">
        <span className="text-5xl block mb-4">🧠</span>
        <h1 className="text-2xl font-bold text-white mb-2">معمل قدرات</h1>
        <p className="text-indigo-300 animate-pulse">جارٍ التحميل...</p>
      </div>
    </div>
  );
}
