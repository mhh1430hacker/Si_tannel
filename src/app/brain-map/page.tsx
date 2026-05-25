"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getPerformanceAnalytics } from "@/lib/user-store";

interface BrainNode {
  id: string;
  label: string;
  x: number;
  y: number;
  radius: number;
  strength: number; // 0-1
  color: string;
  connections: string[];
  category: "kamy" | "lafzy" | "meta";
}

const SKILL_NODES: Omit<BrainNode, "strength" | "color">[] = [
  // Core
  { id: "core", label: "القدرات", x: 0.5, y: 0.5, radius: 30, connections: ["kamy", "lafzy"], category: "meta" },
  // Kamy branch
  { id: "kamy", label: "كمي", x: 0.3, y: 0.35, radius: 24, connections: ["core", "algebra", "geometry", "stats", "speed_math"], category: "kamy" },
  { id: "algebra", label: "الجبر", x: 0.12, y: 0.2, radius: 18, connections: ["kamy", "equations"], category: "kamy" },
  { id: "equations", label: "المعادلات", x: 0.05, y: 0.35, radius: 14, connections: ["algebra"], category: "kamy" },
  { id: "geometry", label: "الهندسة", x: 0.2, y: 0.55, radius: 18, connections: ["kamy", "area_calc"], category: "kamy" },
  { id: "area_calc", label: "المساحات", x: 0.08, y: 0.65, radius: 14, connections: ["geometry"], category: "kamy" },
  { id: "stats", label: "الإحصاء", x: 0.35, y: 0.15, radius: 16, connections: ["kamy", "averages"], category: "kamy" },
  { id: "averages", label: "المتوسطات", x: 0.42, y: 0.05, radius: 13, connections: ["stats"], category: "kamy" },
  { id: "speed_math", label: "الحساب السريع", x: 0.15, y: 0.45, radius: 15, connections: ["kamy"], category: "kamy" },
  // Lafzy branch
  { id: "lafzy", label: "لفظي", x: 0.7, y: 0.35, radius: 24, connections: ["core", "analogy", "completion", "context_err", "comprehension"], category: "lafzy" },
  { id: "analogy", label: "التناظر", x: 0.85, y: 0.2, radius: 18, connections: ["lafzy", "relations"], category: "lafzy" },
  { id: "relations", label: "العلاقات", x: 0.95, y: 0.1, radius: 13, connections: ["analogy"], category: "lafzy" },
  { id: "completion", label: "إكمال الجمل", x: 0.88, y: 0.45, radius: 17, connections: ["lafzy", "proverbs"], category: "lafzy" },
  { id: "proverbs", label: "الأمثال", x: 0.95, y: 0.55, radius: 13, connections: ["completion"], category: "lafzy" },
  { id: "context_err", label: "الخطأ السياقي", x: 0.75, y: 0.55, radius: 16, connections: ["lafzy"], category: "lafzy" },
  { id: "comprehension", label: "استيعاب المقروء", x: 0.6, y: 0.2, radius: 17, connections: ["lafzy", "main_idea"], category: "lafzy" },
  { id: "main_idea", label: "الفكرة الرئيسية", x: 0.55, y: 0.08, radius: 13, connections: ["comprehension"], category: "lafzy" },
  // Meta skills
  { id: "speed", label: "السرعة", x: 0.5, y: 0.7, radius: 16, connections: ["core", "focus"], category: "meta" },
  { id: "focus", label: "التركيز", x: 0.4, y: 0.82, radius: 15, connections: ["speed", "endurance"], category: "meta" },
  { id: "endurance", label: "التحمل", x: 0.6, y: 0.82, radius: 15, connections: ["speed", "focus"], category: "meta" },
  { id: "accuracy_skill", label: "الدقة", x: 0.5, y: 0.9, radius: 16, connections: ["focus", "endurance"], category: "meta" },
];

export default function BrainMapPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const a = getPerformanceAnalytics(user);

    // Compute strengths based on user data
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
      const hue = n.category === "kamy" ? 240 : n.category === "lafzy" ? 280 : 200;
      const lightness = 40 + strength * 30;
      return { ...n, strength, color: `${hue}, 70%, ${lightness}%` };
    });

    function resize() {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";
      }
    }
    resize();

    function draw() {
      timeRef.current += 0.01;
      const t = timeRef.current;
      const w = canvas.width;
      const h = canvas.height;
      ctx!.clearRect(0, 0, w, h);

      // Draw connections
      for (const node of nodes) {
        for (const connId of node.connections) {
          const conn = nodes.find((n) => n.id === connId);
          if (!conn) continue;
          const x1 = node.x * w;
          const y1 = node.y * h;
          const x2 = conn.x * w;
          const y2 = conn.y * h;
          const strength = (node.strength + conn.strength) / 2;

          ctx!.beginPath();
          ctx!.moveTo(x1, y1);
          ctx!.lineTo(x2, y2);
          ctx!.strokeStyle = `rgba(99, 102, 241, ${strength * 0.4})`;
          ctx!.lineWidth = 1 + strength * 2;
          ctx!.stroke();

          // Animated pulse along connection
          const pulsePos = (Math.sin(t * 2 + node.x * 10) + 1) / 2;
          const px = x1 + (x2 - x1) * pulsePos;
          const py = y1 + (y2 - y1) * pulsePos;
          ctx!.beginPath();
          ctx!.arc(px, py, 2 + strength * 2, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(139, 92, 246, ${strength * 0.6})`;
          ctx!.fill();
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const x = node.x * w;
        const y = node.y * h;
        const r = node.radius * 2;
        const pulse = 1 + Math.sin(t * 3 + node.x * 5) * 0.05;
        const isHovered = hoveredNode === node.id;

        // Glow
        const gradient = ctx!.createRadialGradient(x, y, 0, x, y, r * pulse * (isHovered ? 1.5 : 1.2));
        gradient.addColorStop(0, `hsl(${node.color})`);
        gradient.addColorStop(0.7, `hsla(${node.color}, 0.38)`);
        gradient.addColorStop(1, "transparent");
        ctx!.fillStyle = gradient;
        ctx!.beginPath();
        ctx!.arc(x, y, r * pulse * (isHovered ? 1.5 : 1.2), 0, Math.PI * 2);
        ctx!.fill();

        // Core circle
        ctx!.beginPath();
        ctx!.arc(x, y, r * pulse * 0.6, 0, Math.PI * 2);
        ctx!.fillStyle = `hsl(${node.color})`;
        ctx!.fill();
        ctx!.strokeStyle = `rgba(255,255,255,${node.strength * 0.5})`;
        ctx!.lineWidth = 1;
        ctx!.stroke();

        // Label
        ctx!.fillStyle = `rgba(255,255,255,${0.6 + node.strength * 0.4})`;
        ctx!.font = `${isHovered ? "bold " : ""}${r * 0.5}px sans-serif`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(node.label, x, y);

        // Strength percentage
        if (isHovered) {
          ctx!.fillStyle = "rgba(255,255,255,0.8)";
          ctx!.font = `${r * 0.35}px sans-serif`;
          ctx!.fillText(`${Math.round(node.strength * 100)}٪`, x, y + r * 0.6);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();

    // Mouse tracking
    function handleMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      let found: string | null = null;
      for (const node of nodes) {
        const dx = mx - node.x;
        const dy = my - node.y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.05) {
          found = node.id;
          break;
        }
      }
      setHoveredNode(found);
    }
    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [user, hoveredNode, loading]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const a = getPerformanceAnalytics(user);

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

        {/* Canvas */}
        <div className="bg-black/30 rounded-3xl border border-white/10 overflow-hidden" style={{ height: "500px" }}>
          <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />
        </div>

        {/* Legend */}
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

        {/* Stats underneath */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <p className="text-2xl font-bold text-white">{a.totalQuestions}</p>
            <p className="text-indigo-300 text-xs">إجمالي الأسئلة</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <p className="text-2xl font-bold text-white">{a.overallAccuracy}٪</p>
            <p className="text-indigo-300 text-xs">الدقة الكلية</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
            <p className="text-2xl font-bold text-white">{a.categoryBreakdown.length}</p>
            <p className="text-indigo-300 text-xs">أقسام مُختبرة</p>
          </div>
        </div>
      </div>
    </div>
  );
}
