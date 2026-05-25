"use client";

import { useState, useEffect } from "react";

const DONATION_URL = "https://buymeacoffee.com/khalas";

const MESSAGES = [
  { text: "لو استفدت، قهوتك تسعدنا", emoji: "☕" },
  { text: "دعمك يصنع الفرق", emoji: "💜" },
  { text: "ساعدنا نطوّر المنصة أكثر", emoji: "🚀" },
  { text: "قهوة صغيرة = تحديث كبير", emoji: "✨" },
  { text: "شكراً لأنك هنا — دعمك يحفزنا", emoji: "🙏" },
  { text: "كل تبرع يقرّبنا من منصة أفضل", emoji: "🌟" },
  { text: "المنصة مجانية بفضل دعمكم", emoji: "❤️" },
  { text: "لو عجبتك التجربة، ادعمنا بقهوة", emoji: "🎯" },
  { text: "تبرعك = ميزات جديدة قريباً", emoji: "⚡" },
  { text: "ساهم في تعليم أفضل للجميع", emoji: "📚" },
];

function getRandomMessage() {
  return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

interface DonationCTAProps {
  variant?: "sidebar" | "card" | "inline" | "banner";
}

export default function DonationCTA({ variant = "card" }: DonationCTAProps) {
  const [msg, setMsg] = useState(MESSAGES[0]);

  useEffect(() => {
    setMsg(getRandomMessage());
  }, []);

  if (variant === "sidebar") {
    return (
      <a
        href={DONATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 px-3 py-2 text-amber-400/80 hover:text-amber-300 text-sm rounded-lg hover:bg-amber-600/10 transition-all group"
      >
        <span className="text-base group-hover:scale-110 transition-transform">☕</span>
        <span className="text-xs">ادعم المطور</span>
      </a>
    );
  }

  if (variant === "inline") {
    return (
      <a
        href={DONATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-amber-400/70 hover:text-amber-300 text-xs transition-all group"
      >
        <span className="group-hover:scale-110 transition-transform">{msg.emoji}</span>
        <span>{msg.text}</span>
      </a>
    );
  }

  if (variant === "banner") {
    return (
      <div className="bg-gradient-to-l from-amber-600/10 to-orange-600/10 rounded-xl p-3 border border-amber-500/15 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{msg.emoji}</span>
          <p className="text-amber-200/80 text-xs truncate">{msg.text}</p>
        </div>
        <a
          href={DONATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-lg text-xs font-bold transition-all border border-amber-500/20"
        >
          ☕ ادعمنا
        </a>
      </div>
    );
  }

  // card variant (default)
  return (
    <div className="bg-gradient-to-bl from-amber-600/10 via-orange-600/5 to-transparent rounded-2xl p-5 border border-amber-500/15 text-center">
      <span className="text-3xl block mb-2">{msg.emoji}</span>
      <p className="text-amber-200/90 text-sm mb-3">{msg.text}</p>
      <a
        href={DONATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-xl text-sm font-bold transition-all border border-amber-500/20 hover:border-amber-500/40"
      >
        <span>☕</span>
        <span>Buy me a coffee</span>
      </a>
    </div>
  );
}
