"use client";

/**
 * ObservationalNudge: Delivers rare, clinical insights.
 * 
 * STRICT RULES:
 * - Maximum TWO per session (enforced server-side).
 * - Always observational, never interpretive.
 * - Fades in gently, disappears after 8 seconds.
 * - Never says "You are..." — always states data facts.
 */

import { useEffect, useState } from "react";

interface ObservationalNudgeProps {
  text: string;
  onDismiss: () => void;
}

export default function ObservationalNudge({
  text,
  onDismiss,
}: ObservationalNudgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 100);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 500);
    }, 8000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 left-6 right-6 max-w-md mx-auto transition-all duration-500 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-5 py-4 shadow-xl">
        <p className="text-neutral-300 text-sm leading-relaxed text-right">
          {text}
        </p>
        <div className="mt-2 flex justify-start">
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="text-neutral-600 text-xs hover:text-neutral-400 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
