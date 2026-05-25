"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { generateChatResponse, analyzeUserPatterns } from "@/lib/ai-tutor";
import type { AiMessage } from "@/lib/ai-tutor";

export default function AiChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
      return;
    }
    if (user && messages.length === 0) {
      const name = user.profile.name.split(" ")[0];
      const insights = analyzeUserPatterns(user);
      let greeting = `أهلاً ${name}! 👋 أنا مساعدك الذكي في معمل القدرات.`;
      if (insights.length > 0) {
        greeting += `\n\n${insights[0].icon} ${insights[0].title}: ${insights[0].body}`;
      }
      greeting += "\n\nكيف أقدر أساعدك؟ اكتب 'مساعدة' لرؤية ما أستطيع فعله.";
      setMessages([{ role: "ai", text: greeting, timestamp: new Date().toISOString() }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!input.trim() || !user) return;
    const userMsg: AiMessage = { role: "user", text: input.trim(), timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = generateChatResponse(userMsg.text, user);
      const aiMsg: AiMessage = { role: "ai", text: response, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 400 + Math.random() * 600);
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-purple-950">
        <div className="animate-pulse text-purple-300">جارٍ التحميل...</div>
      </div>
    );
  }

  const quickActions = [
    { text: "📊 إحصائياتي", msg: "إحصائياتي" },
    { text: "📋 خطة دراسية", msg: "ماذا أدرس" },
    { text: "📐 نصائح الكمي", msg: "الكمي" },
    { text: "📖 نصائح اللفظي", msg: "اللفظي" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950 flex flex-col">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-indigo-300 hover:text-white transition-colors">→</a>
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center">
            <span className="text-sm">🤖</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm">المساعد الذكي</h1>
            <p className="text-green-400 text-xs">متصل</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === "user"
                ? "bg-indigo-600/30 border border-indigo-500/30 text-white"
                : "bg-white/10 border border-white/10 text-indigo-100"
            }`}>
              <p className="text-sm whitespace-pre-line leading-relaxed">{msg.text}</p>
              <p className="text-[10px] text-indigo-400 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-end">
            <div className="bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {quickActions.map((a, i) => (
            <button
              key={i}
              onClick={() => { setInput(a.msg); setTimeout(handleSend, 50); }}
              className="whitespace-nowrap px-3 py-1.5 bg-white/10 hover:bg-white/20 text-indigo-200 rounded-full text-xs border border-white/10 transition-colors"
            >
              {a.text}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="bg-black/20 backdrop-blur border-t border-white/10 p-4">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="اكتب رسالتك..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-indigo-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all"
          >
            إرسال
          </button>
        </div>
      </div>
    </div>
  );
}
