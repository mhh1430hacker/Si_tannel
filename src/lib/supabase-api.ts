/**
 * Supabase API helpers for real-time leaderboard, challenges, and rewards.
 */
import { supabase, isSupabaseConfigured } from "./supabase";

// ===== USER SYNC =====

export async function syncUserToSupabase(user: {
  id: string;
  name: string;
  email: string;
  avatar_color: string;
  total_points: number;
  total_questions: number;
  total_correct: number;
  accuracy: number;
  streak_current: number;
  streak_longest: number;
  league: string;
  onboarding_completed?: boolean;
  learning_style?: string;
  experience_level?: string;
  target_score?: number;
}): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("users").upsert({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_color: user.avatar_color,
    total_points: user.total_points,
    total_questions: user.total_questions,
    total_correct: user.total_correct,
    accuracy: user.accuracy,
    league: user.league,
    streak_current: user.streak_current,
    streak_longest: user.streak_longest,
    onboarding_completed: user.onboarding_completed ?? false,
    learning_style: user.learning_style ?? null,
    experience_level: user.experience_level ?? null,
    target_score: user.target_score ?? 70,
    last_active: new Date().toISOString(),
  }, { onConflict: "id" });
  return !error;
}

// ===== LEADERBOARD =====

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar_color: string;
  total_points: number;
  accuracy: number;
  league: string;
  streak_current: number;
  rank: number;
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardUser[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("users")
    .select("id, name, avatar_color, total_points, accuracy, league, streak_current")
    .gt("total_points", 0)
    .order("total_points", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((u, i) => ({ ...u, rank: i + 1 }));
}

export async function getUserRank(userId: string): Promise<number> {
  if (!supabase) return 0;
  const { data } = await supabase
    .from("users")
    .select("id")
    .gt("total_points", 0)
    .order("total_points", { ascending: false });
  if (!data) return 0;
  const idx = data.findIndex((u) => u.id === userId);
  return idx >= 0 ? idx + 1 : 0;
}

// ===== CHALLENGES =====

export interface ChallengeRoom {
  id: string;
  player1_id: string;
  player2_id: string | null;
  status: string;
  section: string;
  question_count: number;
  player1_score: number;
  player2_score: number;
  player1_answers: unknown[];
  player2_answers: unknown[];
  questions: unknown[];
  current_question: number;
  winner_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export async function findWaitingRoom(userId: string, section: string): Promise<ChallengeRoom | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("challenge_rooms")
    .select("*")
    .eq("status", "waiting")
    .eq("section", section)
    .neq("player1_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as ChallengeRoom | null;
}

export async function createRoom(userId: string, section: string, questions: unknown[]): Promise<ChallengeRoom | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("challenge_rooms")
    .insert({
      player1_id: userId,
      status: "waiting",
      section,
      question_count: questions.length,
      questions,
    })
    .select()
    .single();
  if (error) return null;
  return data as ChallengeRoom;
}

export async function joinRoom(roomId: string, userId: string): Promise<ChallengeRoom | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("challenge_rooms")
    .update({
      player2_id: userId,
      status: "active",
      started_at: new Date().toISOString(),
    })
    .eq("id", roomId)
    .eq("status", "waiting")
    .select()
    .single();
  if (error) return null;
  return data as ChallengeRoom;
}

export async function submitAnswer(
  roomId: string,
  playerNum: 1 | 2,
  answerIdx: number,
  isCorrect: boolean
): Promise<boolean> {
  if (!supabase) return false;

  const scoreField = playerNum === 1 ? "player1_score" : "player2_score";
  const answersField = playerNum === 1 ? "player1_answers" : "player2_answers";

  // Get current room state
  const { data: room } = await supabase
    .from("challenge_rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  if (!room) return false;

  const currentAnswers = (room[answersField] as unknown[]) || [];
  const newAnswers = [...currentAnswers, { index: answerIdx, correct: isCorrect, time: Date.now() }];
  const newScore = isCorrect ? (room[scoreField] as number) + 1 : (room[scoreField] as number);

  const update: Record<string, unknown> = {
    [scoreField]: newScore,
    [answersField]: newAnswers,
  };

  // Check if both players finished all questions
  const otherAnswers = playerNum === 1
    ? (room.player2_answers as unknown[])
    : (room.player1_answers as unknown[]);
  const questionCount = room.question_count as number;

  if (newAnswers.length >= questionCount && (otherAnswers?.length ?? 0) >= questionCount) {
    const p1Score = playerNum === 1 ? newScore : (room.player1_score as number);
    const p2Score = playerNum === 2 ? newScore : (room.player2_score as number);
    update.status = "completed";
    update.completed_at = new Date().toISOString();
    update.winner_id = p1Score > p2Score ? room.player1_id : p2Score > p1Score ? room.player2_id : null;
  }

  const { error } = await supabase
    .from("challenge_rooms")
    .update(update)
    .eq("id", roomId);

  return !error;
}

export async function getRoom(roomId: string): Promise<ChallengeRoom | null> {
  if (!supabase) return null;
  const { data } = await supabase
    .from("challenge_rooms")
    .select("*")
    .eq("id", roomId)
    .single();
  return data as ChallengeRoom | null;
}

export function subscribeToRoom(roomId: string, callback: (room: ChallengeRoom) => void) {
  if (!supabase) return null;
  return supabase
    .channel(`room-${roomId}`)
    .on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "challenge_rooms",
      filter: `id=eq.${roomId}`,
    }, (payload) => {
      callback(payload.new as ChallengeRoom);
    })
    .subscribe();
}

export async function cancelRoom(roomId: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("challenge_rooms")
    .delete()
    .eq("id", roomId)
    .eq("status", "waiting");
  return !error;
}

// ===== REWARDS =====

export interface Reward {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: string;
  coupon_code: string | null;
  coupon_url: string | null;
  points_required: number;
  league_required: string | null;
  is_active: boolean;
  max_claims: number;
  current_claims: number;
}

export async function getAvailableRewards(): Promise<Reward[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("rewards")
    .select("*")
    .eq("is_active", true)
    .order("points_required", { ascending: true });
  return (data as Reward[]) || [];
}

export async function claimReward(userId: string, rewardId: string): Promise<{ success: boolean; message: string; coupon_code?: string }> {
  if (!supabase) return { success: false, message: "Supabase غير مربوط" };

  // Check if already claimed
  const { data: existing } = await supabase
    .from("user_rewards")
    .select("id")
    .eq("user_id", userId)
    .eq("reward_id", rewardId)
    .maybeSingle();

  if (existing) {
    return { success: false, message: "لقد حصلت على هذه الجائزة مسبقاً" };
  }

  // Get reward details
  const { data: reward } = await supabase
    .from("rewards")
    .select("*")
    .eq("id", rewardId)
    .single();

  if (!reward) return { success: false, message: "الجائزة غير موجودة" };
  if ((reward.current_claims as number) >= (reward.max_claims as number)) {
    return { success: false, message: "نفدت هذه الجائزة" };
  }

  // Claim it
  const { error: claimError } = await supabase
    .from("user_rewards")
    .insert({ user_id: userId, reward_id: rewardId });

  if (claimError) return { success: false, message: "حدث خطأ في المطالبة" };

  // Increment claims
  await supabase
    .from("rewards")
    .update({ current_claims: (reward.current_claims as number) + 1 })
    .eq("id", rewardId);

  return {
    success: true,
    message: "تم الحصول على الجائزة!",
    coupon_code: reward.coupon_code as string | undefined,
  };
}

export async function getUserClaimedRewards(userId: string): Promise<string[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from("user_rewards")
    .select("reward_id")
    .eq("user_id", userId);
  return data?.map((r) => r.reward_id as string) || [];
}

// ===== SESSION SYNC =====

export async function syncSessionRecord(userId: string, session: {
  category: string;
  total_questions: number;
  correct_count: number;
  total_time_seconds: number;
}): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase.from("session_records").insert({
    user_id: userId,
    ...session,
  });
  return !error;
}

// ===== CRAWLED QUESTIONS =====

export async function getCrawledQuestions(section?: string, limit = 50): Promise<unknown[]> {
  if (!supabase) return [];
  let query = supabase
    .from("crawled_questions")
    .select("*")
    .eq("is_approved", true)
    .limit(limit);
  if (section) query = query.eq("section", section);
  const { data } = await query;
  return data || [];
}

export async function addCrawledQuestions(questions: Array<{
  text: string;
  choices: string[];
  correct_index: number;
  section: string;
  difficulty?: string;
  source_url?: string;
  explanation?: string;
}>): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase
    .from("crawled_questions")
    .upsert(
      questions.map((q) => ({
        text: q.text,
        choices: q.choices,
        correct_index: q.correct_index,
        section: q.section,
        difficulty: q.difficulty || "متوسط",
        source_url: q.source_url || null,
        explanation: q.explanation || null,
      })),
      { onConflict: "text", ignoreDuplicates: true }
    )
    .select("id");

  if (error) return 0;
  return data?.length || 0;
}

export { isSupabaseConfigured };
