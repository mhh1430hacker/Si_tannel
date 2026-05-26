/**
 * Local-First Bulk Sync — Compressed sync from browser to Neon Postgres
 *
 * Students' progress is stored locally in the browser (IndexedDB/localStorage).
 * When a unit or session is completed, a single bulk sync writes everything
 * to the cloud database, maximizing the 200K write budget.
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

interface SyncPayload {
  studentId: string;
  profile: {
    name: string;
    email: string;
    avatarColor: string;
  };
  stats: {
    totalPoints: number;
    totalQuestions: number;
    totalCorrect: number;
    accuracy: number;
    streakCurrent: number;
    streakLongest: number;
    league: string;
  };
  sessions: {
    sessionId: string;
    category: string;
    totalQuestions: number;
    correctCount: number;
    totalTimeSeconds: number;
    date: string;
  }[];
  aiState: {
    irtTheta: number;
    eloRating: number;
    hmmState: string;
    clusterType: string;
    masteredSkills: string[];
  };
  timestamp: number;
}

type SqlFn = ReturnType<typeof neon>;

function getSql(): SqlFn | null {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  return neon(url);
}

async function ensureTablesExist(sql: SqlFn) {
  await sql`
    CREATE TABLE IF NOT EXISTS student_progress (
      student_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      avatar_color TEXT DEFAULT '#6366f1',
      total_points INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      total_correct INTEGER DEFAULT 0,
      accuracy REAL DEFAULT 0,
      streak_current INTEGER DEFAULT 0,
      streak_longest INTEGER DEFAULT 0,
      league TEXT DEFAULT 'bronze',
      irt_theta REAL DEFAULT 0,
      elo_rating REAL DEFAULT 1200,
      hmm_state TEXT DEFAULT 'exploring',
      cluster_type TEXT DEFAULT 'balanced',
      mastered_skills TEXT[] DEFAULT '{}',
      last_synced_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS session_records (
      id SERIAL PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES student_progress(student_id) ON DELETE CASCADE,
      session_id TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      total_questions INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      total_time_seconds INTEGER NOT NULL,
      session_date TIMESTAMPTZ NOT NULL,
      synced_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

export async function POST(req: NextRequest) {
  try {
    const payload: SyncPayload = await req.json();

    if (!payload.studentId || !payload.profile) {
      return NextResponse.json(
        { error: "بيانات المزامنة غير مكتملة" },
        { status: 400 },
      );
    }

    const sql = getSql();
    if (!sql) {
      return NextResponse.json({
        synced: false,
        reason: "no-database",
        message: "قاعدة البيانات غير مُعدّة — البيانات محفوظة محلياً",
      });
    }

    // Ensure tables exist
    await ensureTablesExist(sql);

    // Upsert student profile + stats (1 write)
    await sql`
      INSERT INTO student_progress (
        student_id, name, email, avatar_color,
        total_points, total_questions, total_correct, accuracy,
        streak_current, streak_longest, league,
        irt_theta, elo_rating, hmm_state, cluster_type, mastered_skills,
        last_synced_at
      ) VALUES (
        ${payload.studentId}, ${payload.profile.name}, ${payload.profile.email}, ${payload.profile.avatarColor},
        ${payload.stats.totalPoints}, ${payload.stats.totalQuestions}, ${payload.stats.totalCorrect}, ${payload.stats.accuracy},
        ${payload.stats.streakCurrent}, ${payload.stats.streakLongest}, ${payload.stats.league},
        ${payload.aiState.irtTheta}, ${payload.aiState.eloRating}, ${payload.aiState.hmmState}, ${payload.aiState.clusterType}, ${payload.aiState.masteredSkills},
        NOW()
      )
      ON CONFLICT (student_id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        total_points = EXCLUDED.total_points,
        total_questions = EXCLUDED.total_questions,
        total_correct = EXCLUDED.total_correct,
        accuracy = EXCLUDED.accuracy,
        streak_current = EXCLUDED.streak_current,
        streak_longest = EXCLUDED.streak_longest,
        league = EXCLUDED.league,
        irt_theta = EXCLUDED.irt_theta,
        elo_rating = EXCLUDED.elo_rating,
        hmm_state = EXCLUDED.hmm_state,
        cluster_type = EXCLUDED.cluster_type,
        mastered_skills = EXCLUDED.mastered_skills,
        last_synced_at = NOW()
    `;

    // Bulk insert sessions (skipping duplicates)
    let sessionsSynced = 0;
    for (const session of payload.sessions) {
      try {
        await sql`
          INSERT INTO session_records (student_id, session_id, category, total_questions, correct_count, total_time_seconds, session_date)
          VALUES (${payload.studentId}, ${session.sessionId}, ${session.category}, ${session.totalQuestions}, ${session.correctCount}, ${session.totalTimeSeconds}, ${session.date})
          ON CONFLICT (session_id) DO NOTHING
        `;
        sessionsSynced++;
      } catch {
        // Skip duplicate sessions
      }
    }

    return NextResponse.json({
      synced: true,
      studentId: payload.studentId,
      sessionsSynced,
      totalSessions: payload.sessions.length,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "فشل في المزامنة", details: message },
      { status: 500 },
    );
  }
}

/**
 * GET — Fetch student progress from cloud (for login on new device)
 */
export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId مطلوب" }, { status: 400 });
  }

  const sql = getSql();
  if (!sql) {
    return NextResponse.json({ available: false, reason: "no-database" });
  }

  try {
    const rows = await sql`
      SELECT * FROM student_progress WHERE student_id = ${studentId}
    ` as Record<string, unknown>[];

    if (!rows || rows.length === 0) {
      return NextResponse.json({ available: false, reason: "not-found" });
    }

    const sessions = await sql`
      SELECT * FROM session_records WHERE student_id = ${studentId} ORDER BY session_date DESC LIMIT 50
    ` as Record<string, unknown>[];

    return NextResponse.json({
      available: true,
      profile: rows[0],
      sessions: sessions || [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "فشل في جلب البيانات", details: message },
      { status: 500 },
    );
  }
}
