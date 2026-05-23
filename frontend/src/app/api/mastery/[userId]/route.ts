import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;
  try {
    const nodes = await sql`
      SELECT id, skill_category, sub_skill, mastery_level, total_attempts, correct_attempts
      FROM mastery_nodes WHERE user_id = ${userId}::uuid
    `;
    const edges = await sql`
      SELECT id, source_node_id, target_node_id, weight
      FROM mastery_edges WHERE user_id = ${userId}::uuid
    `;
    return NextResponse.json({
      user_id: userId,
      nodes: nodes.rows,
      edges: edges.rows,
    });
  } catch {
    return NextResponse.json({ user_id: userId, nodes: [], edges: [] });
  }
}
