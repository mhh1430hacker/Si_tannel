"use client";

export default function LoadingSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 animate-pulse">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-6 bg-white/10 rounded-lg w-32" />
        <div className="h-4 bg-white/5 rounded w-48" />
        <div className="bg-white/5 rounded-2xl p-6 border border-white/5 space-y-4">
          <div className="h-12 bg-white/10 rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-white/5 rounded-xl" />
            <div className="h-20 bg-white/5 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-20 bg-white/5 rounded-xl" />
          <div className="h-20 bg-white/5 rounded-xl" />
          <div className="h-20 bg-white/5 rounded-xl" />
        </div>
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
          <div className="h-3 bg-white/10 rounded w-full" />
        </div>
      </div>
    </div>
  );
}
