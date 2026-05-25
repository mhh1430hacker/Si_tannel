"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics } from "@/lib/user-store";

interface BrainNode {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  strength: number;
  r: number; g: number; b: number;
  connections: string[];
  category: "kamy" | "lafzy" | "meta";
}

const SKILL_NODES: Omit<BrainNode, "strength" | "r" | "g" | "b">[] = [
  { id: "core", label: "القدرات", x: 0.5, y: 0.5, radius: 30, connections: ["kamy", "lafzy"], category: "meta" },
  { id: "kamy", label: "كمي", x: 0.3, y: 0.35, radius: 24, connections: ["core", "algebra", "geometry", "stats", "speed_math"], category: "kamy" },
  { id: "algebra", label: "الجبر", x: 0.12, y: 0.2, radius: 18, connections: ["kamy", "equations"], category: "kamy" },
  { id: "equations", label: "المعادلات", x: 0.05, y: 0.35, radius: 14, connections: ["algebra"], category: "kamy" },
  { id: "geometry", label: "الهندسة", x: 0.2, y: 0.55, radius: 18, connections: ["kamy", "area_calc"], category: "kamy" },
  { id: "area_calc", label: "المساحات", x: 0.08, y: 0.65, radius: 14, connections: ["geometry"], category: "kamy" },
  { id: "stats", label: "الإحصاء", x: 0.35, y: 0.15, radius: 16, connections: ["kamy", "averages"], category: "kamy" },
  { id: "averages", label: "المتوسطات", x: 0.42, y: 0.05, radius: 13, connections: ["stats"], category: "kamy" },
  { id: "speed_math", label: "الحساب السريع", x: 0.15, y: 0.45, radius: 15, connections: ["kamy"], category: "kamy" },
  { id: "lafzy", label: "لفظي", x: 0.7, y: 0.35, radius: 24, connections: ["core", "analogy", "completion", "context_err", "comprehension"], category: "lafzy" },
  { id: "analogy", label: "التناظر", x: 0.85, y: 0.2, radius: 18, connections: ["lafzy", "relations"], category: "lafzy" },
  { id: "relations", label: "العلاقات", x: 0.95, y: 0.1, radius: 13, connections: ["analogy"], category: "lafzy" },
  { id: "completion", label: "إكمال الجمل", x: 0.88, y: 0.45, radius: 17, connections: ["lafzy", "proverbs"], category: "lafzy" },
  { id: "proverbs", label: "الأمثال", x: 0.95, y: 0.55, radius: 13, connections: ["completion"], category: "lafzy" },
  { id: "context_err", label: "الخطأ السياقي", x: 0.75, y: 0.55, radius: 16, connections: ["lafzy"], category: "lafzy" },
  { id: "comprehension", label: "استيعاب المقروء", x: 0.6, y: 0.2, radius: 17, connections: ["lafzy", "main_idea"], category: "lafzy" },
  { id: "main_idea", label: "الفكرة الرئيسية", x: 0.55, y: 0.08, radius: 13, connections: ["comprehension"], category: "lafzy" },
  { id: "speed", label: "السرعة", x: 0.5, y: 0.7, radius: 16, connections: ["core", "focus"], category: "meta" },
  { id: "focus", label: "التركيز", x: 0.4, y: 0.82, radius: 15, connections: ["speed", "endurance"], category: "meta" },
  { id: "endurance", label: "التحمل", x: 0.6, y: 0.82, radius: 15, connections: ["speed", "focus"], category: "meta" },
  { id: "accuracy_skill", label: "الدقة", x: 0.5, y: 0.9, radius: 16, connections: ["focus", "endurance"], category: "meta" },
];

function getCategoryColor(cat: "kamy" | "lafzy" | "meta", strength: number): { r: number; g: number; b: number } {
  const s = 0.4 + strength * 0.6;
  if (cat === "kamy") return { r: Math.round(80 * s), g: Math.round(90 * s), b: Math.round(230 * s) };
  if (cat === "lafzy") return { r: Math.round(160 * s), g: Math.round(80 * s), b: Math.round(220 * s) };
  return { r: Math.round(60 * s), g: Math.round(150 * s), b: Math.round(220 * s) };
}

export default function BrainMapPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const hoveredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const startAnimation = useCallback(() => {
    if (!user || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const a = getPerformanceAnalytics(user);
    const kamyAcc = a.categoryBreakdown.find((c) => c.category.includes("كمي"))?.accuracy ?? 50;
    const lafzyAcc = a.categoryBreakdown.find((c) => c.category.includes("لفظي"))?.accuracy ?? 50;
    const overallAcc = a.overallAccuracy || 50;
    const speedScore = a.avgTimePerQuestion > 0 ? Math.max(0, 100 - a.avgTimePerQuestion) : 50;

    function getStrength(id: string): number {
      const base = 0.3;
      switch (id) {
        case "core": return Math.min(1, base + overallAcc / 150);
        case "kamy": case "algebra": case "equations": case "geometry": case "area_calc": case "stats": case "averages": case "speed_math":
          return Math.min(1, base + kamyAcc / 150);
        case "lafzy": case "analogy": case "relations": case "completion": case "proverbs": case "context_err": case "comprehension": case "main_idea":
          return Math.min(1, base + lafzyAcc / 150);
        case "speed": return Math.min(1, base + speedScore / 150);
        case "focus": case "endurance": return Math.min(1, base + (overallAcc + speedScore) / 300);
        case "accuracy_skill": return Math.min(1, base + overallAcc / 130);
        default: return base;
      }
    }

    const nodes: BrainNode[] = SKILL_NODES.map((n) => {
      const strength = getStrength(n.id);
      const { r, g, b } = getCategoryColor(n.category, strength);
      return { ...n, strength, r, g, b };
    });

    // Resize canvas
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";
    }

    function draw() {
      timeRef.current += 0.01;
      const t = timeRef.current;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Draw connections
      for (const node of nodes) {
        for (const connId of node.connections) {
          const conn = nodes.find((nd) => nd.id === connId);
          if (!conn) continue;
          const x1 = node.x * w, y1 = node.y * h;
          const x2 = conn.x * w, y2 = conn.y * h;
          const str = (node.strength + conn.strength) / 2;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(99, 102, 241, ${str * 0.4})`;
          ctx.lineWidth = 1 + str * 2;
          ctx.stroke();

          const pulsePos = (Math.sin(t * 2 + node.x * 10) + 1) / 2;
          const px = x1 + (x2 - x1) * pulsePos;
          const py = y1 + (y2 - y1) * pulsePos;
          ctx.beginPath();
          ctx.arc(px, py, 2 + str * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(139, 92, 246, ${str * 0.6})`;
          ctx.fill();
        }
      }

      // Draw nodes
      const hovered = hoveredRef.current;
      for (const node of nodes) {
        const x = node.x * w, y = node.y * h;
        const rd = node.radius * 2;
        const pulse = 1 + Math.sin(t * 3 + node.x * 5) * 0.05;
        const isHov = hovered === node.id;
        const outerR = rd * pulse * (isHov ? 1.5 : 1.2);

        // Glow
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, outerR);
        gradient.addColorStop(0, `rgba(${node.r}, ${node.g}, ${node.b}, 1)`);
        gradient.addColorStop(0.7, `rgba(${node.r}, ${node.g}, ${node.b}, 0.35)`);
        gradient.addColorStop(1, `rgba(${node.r}, ${node.g}, ${node.b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, outerR, 0, Math.PI * 2);
        ctx.fill();

        // Core circle
        ctx.beginPath();
        ctx.arc(x, y, rd * pulse * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${node.r}, ${node.g}, ${node.b}, 1)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${node.strength * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.fillStyle = `rgba(255,255,255,${0.6 + node.strength * 0.4})`;
        ctx.font = `${isHov ? "bold " : ""}${rd * 0.5}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.label, x, y);

        if (isHov) {
          ctx.fillStyle = "rgba(255,255,255,0.8)";
          ctx.font = `${rd * 0.35}px sans-serif`;
          ctx.fillText(`${Math.round(node.strength * 100)}%`, x, y + rd * 0.6);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    function handleMouseMove(e: MouseEvent) {
      const r = canvas.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width;
      const my = (e.clientY - r.top) / r.height;
      let found: string | null = null;
      for (const node of nodes) {
        const dx = mx - node.x, dy = my - node.y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.05) { found = node.id; break; }
      }
      hoveredRef.current = found;
    }
    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [user]);

  useEffect(() => {
    return startAnimation();
  }, [startAnimation]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const analytics = getPerformanceAnalytics(user);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
      <div className="max-w-4xl mx-auto pt-6">
        <div className="flex items-center justify-between mb-4">
          <a href="/dashboard" className="text-indigo-300 hover:text-white text-sm">→ العودة</a>
          <h1 className="text-xl font-bold text-white">🧠 الخريطة الدماغية</h1>
          <span className="text-indigo-400 text-xs">تفاعلية</span>
        </div>

        <p className="text-indigo-300 text-sm text-center mb-4">
          شبكة عصبية تعرض مهاراتك — كلما زاد الإتقان زاد السطوع والحجم
        </p>

        <div className="bg-black/30 rounded-3xl border border-white/10 overflow-hidden" style={{ height: "500px" }}>
          <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />
        </div>

        <div className="flex gap-4 justify-center mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-indigo-300 text-xs">كمي</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-indigo-300 text-xs">لفظي</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-500" />
            <span className="text-indigo-300 text-xs">مهارات أساسية</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <p className="text-2xl font-bold text-white">{analytics.totalQuestions}</p>
            <p className="text-indigo-300 text-xs">إجمالي الأسئلة</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <p className="text-2xl font-bold text-white">{analytics.overallAccuracy}٪</p>
            <p className="text-indigo-300 text-xs">الدقة الكلية</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <p className="text-2xl font-bold text-white">{analytics.categoryBreakdown.length}</p>
            <p className="text-indigo-300 text-xs">أقسام مُختبرة</p>
          </div>
        </div>
      </div>
    </div>
  );
}
