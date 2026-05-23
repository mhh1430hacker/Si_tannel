"use client";

/**
 * MasteryConstellation: A static, slow-evolving SVG map.
 * 
 * STRICT RULES:
 * - State updates ONLY on session completion or nightly CRON.
 * - Never animate mid-session. No particle effects.
 * - Subtle opacities: 0.4 for unmastered, 0.9 for mastered.
 * - Dark, meditative aesthetic. A reason to return daily.
 */

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

interface MasteryConstellationProps {
  nodes: ConstellationNode[];
  edges: ConstellationEdge[];
}

export default function MasteryConstellation({
  nodes,
  edges,
}: MasteryConstellationProps) {
  if (nodes.length === 0) {
    return (
      <div className="w-full h-64 bg-neutral-950 rounded-xl border border-neutral-900 flex items-center justify-center p-4">
        <p className="text-neutral-600 text-sm">
          ابدأ جلسة دراسية لبناء خريطة الإتقان الخاصة بك
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 bg-neutral-950 rounded-xl border border-neutral-900 flex items-center justify-center p-4 relative overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet">
        {/* Edges: subtle connections */}
        {edges.map((edge) => (
          <line
            key={edge.id}
            x1={edge.x1}
            y1={edge.y1}
            x2={edge.x2}
            y2={edge.y2}
            className="stroke-neutral-800"
            strokeWidth="1"
            opacity={0.3 + edge.weight * 0.4}
          />
        ))}

        {/* Nodes: skill mastery points */}
        {nodes.map((node) => (
          <g key={node.id}>
            {/* Glow effect for mastered nodes */}
            {node.is_mastered && (
              <circle
                cx={node.x}
                cy={node.y}
                r="8"
                className="fill-emerald-500"
                opacity={0.15}
              />
            )}
            {/* Core node */}
            <circle
              cx={node.x}
              cy={node.y}
              r="4"
              className={
                node.is_mastered ? "fill-emerald-500" : "fill-neutral-700"
              }
              opacity={node.is_mastered ? 0.9 : 0.4}
            />
            {/* Label — only for mastered nodes */}
            {node.is_mastered && (
              <text
                x={node.x}
                y={node.y - 12}
                textAnchor="middle"
                className="fill-neutral-500"
                fontSize="10"
              >
                {node.sub_skill}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Title overlay */}
      <div className="absolute top-3 right-4">
        <span className="text-neutral-600 text-xs">خريطة الإتقان</span>
      </div>
    </div>
  );
}
