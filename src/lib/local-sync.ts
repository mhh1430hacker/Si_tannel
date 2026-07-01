/**
 * Local-First Sync Manager
 *
 * Stores student progress locally (localStorage/IndexedDB) and
 * periodically performs bulk sync to the cloud database.
 *
 * Strategy:
 * - All reads/writes go to localStorage first (instant)
 * - After session completion or every 5 minutes, bulk sync to cloud
 * - On login from new device, pull from cloud if local is empty
 */

import { getUserData, getPerformanceAnalytics } from "./user-store";
import { getLeague } from "./league-system";

const SYNC_KEY = "qudrat_last_sync";
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface SyncResult {
  synced: boolean;
  sessionsSynced?: number;
  reason?: string;
}

/**
 * Check if sync is needed (debounce)
 */
export function isSyncNeeded(): boolean {
  if (typeof window === "undefined") return false;
  const lastSync = localStorage.getItem(SYNC_KEY);
  if (!lastSync) return true;
  const elapsed = Date.now() - parseInt(lastSync, 10);
  return elapsed >= SYNC_INTERVAL_MS;
}

/**
 * Perform bulk sync to cloud
 */
export async function syncToCloud(): Promise<SyncResult> {
  const user = getUserData();
  if (!user) return { synced: false, reason: "no-user" };

  const analytics = getPerformanceAnalytics(user);
  const league = getLeague(user.total_points);

  // Load AI state for sync
  let aiState = { irtTheta: 0, eloRating: 1200, hmmState: "exploring", clusterType: "balanced", masteredSkills: [] as string[] };
  try {
    const raw = localStorage.getItem("qudrat_ai_state");
    if (raw) {
      const parsed = JSON.parse(raw);
      aiState = {
        irtTheta: parsed.irtTheta || 0,
        eloRating: parsed.studentElo?.rating || 1200,
        hmmState: "learning",
        clusterType: "balanced",
        masteredSkills: Object.entries(parsed.bktSkills || {})
          .filter(([, v]: [string, unknown]) => {
            const skill = v as { pMastery?: number };
            return (skill.pMastery || 0) > 0.8;
          })
          .map(([k]) => k),
      };
    }
  } catch {
    // Use defaults
  }

  const payload = {
    studentId: user.profile.id,
    profile: {
      name: user.profile.name,
      email: user.profile.email,
      avatarColor: user.profile.avatar_color,
    },
    stats: {
      totalPoints: user.total_points,
      totalQuestions: analytics.totalQuestions,
      totalCorrect: analytics.totalCorrect,
      accuracy: analytics.overallAccuracy,
      streakCurrent: user.streak.current,
      streakLongest: user.streak.longest,
      league: league.id,
    },
    sessions: user.sessions.map((s) => ({
      sessionId: s.session_id,
      category: s.category,
      totalQuestions: s.total_questions,
      correctCount: s.correct_count,
      totalTimeSeconds: s.total_time_seconds,
      date: s.date,
    })),
    aiState,
    timestamp: Date.now(),
  };

  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.synced) {
      localStorage.setItem(SYNC_KEY, Date.now().toString());
    }

    return {
      synced: data.synced,
      sessionsSynced: data.sessionsSynced,
      reason: data.reason,
    };
  } catch {
    return { synced: false, reason: "network-error" };
  }
}

/**
 * Pull student data from cloud (for new device login)
 */
export async function pullFromCloud(studentId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/sync?studentId=${encodeURIComponent(studentId)}`);
    const data = await res.json();
    return data.available === true;
  } catch {
    return false;
  }
}

/**
 * Auto-sync: call this after session completion or on interval
 */
export function startAutoSync(): () => void {
  if (typeof window === "undefined") return () => {};

  const interval = setInterval(() => {
    if (isSyncNeeded()) {
      syncToCloud().catch(() => {});
    }
  }, 60_000); // Check every minute

  return () => clearInterval(interval);
}
