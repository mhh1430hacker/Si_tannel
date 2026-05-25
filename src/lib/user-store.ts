/**
 * Client-side user store using localStorage.
 * Persists user profile, session history, achievements, and study data.
 */

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  created_at: string;
  avatar_color: string;
}

export interface SessionRecord {
  session_id: string;
  category: string;
  total_questions: number;
  correct_count: number;
  total_time_seconds: number;
  date: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at?: string;
}

export interface FlashcardItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  next_review: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
}

export interface StudyStreak {
  current: number;
  longest: number;
  last_study_date: string;
}

export interface UserData {
  profile: UserProfile;
  sessions: SessionRecord[];
  achievements: Achievement[];
  flashcards: FlashcardItem[];
  streak: StudyStreak;
  total_points: number;
  study_minutes_today: number;
  last_active: string;
}

const STORAGE_KEY = "qudrat_user_data";
const AVATAR_COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: "first_test", title: "البداية", description: "أكمل أول اختبار", icon: "🎯", unlocked: false },
  { id: "five_tests", title: "مثابر", description: "أكمل ٥ اختبارات", icon: "💪", unlocked: false },
  { id: "ten_tests", title: "متقدم", description: "أكمل ١٠ اختبارات", icon: "🏆", unlocked: false },
  { id: "perfect_score", title: "إتقان", description: "احصل على ١٠٠٪ في اختبار", icon: "⭐", unlocked: false },
  { id: "speed_demon", title: "سريع البرق", description: "أجب على سؤال في أقل من ١٠ ثوانٍ", icon: "⚡", unlocked: false },
  { id: "streak_3", title: "ثلاثة أيام متتالية", description: "ادرس ٣ أيام متتالية", icon: "🔥", unlocked: false },
  { id: "streak_7", title: "أسبوع كامل", description: "ادرس ٧ أيام متتالية", icon: "🌟", unlocked: false },
  { id: "both_sections", title: "شامل", description: "اختبر في الكمي واللفظي", icon: "📚", unlocked: false },
  { id: "fifty_questions", title: "خمسون سؤالاً", description: "أجب على ٥٠ سؤالاً", icon: "🎓", unlocked: false },
  { id: "hundred_questions", title: "مئة سؤال", description: "أجب على ١٠٠ سؤال", icon: "👑", unlocked: false },
];

export function getUserData(): UserData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserData(data: UserData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createUser(name: string, email: string): UserData {
  const data: UserData = {
    profile: {
      id: generateId(),
      name,
      email,
      created_at: new Date().toISOString(),
      avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    },
    sessions: [],
    achievements: [...DEFAULT_ACHIEVEMENTS],
    flashcards: [],
    streak: { current: 0, longest: 0, last_study_date: "" },
    total_points: 0,
    study_minutes_today: 0,
    last_active: new Date().toISOString(),
  };
  saveUserData(data);
  return data;
}

export function logoutUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function addSessionRecord(session: SessionRecord): UserData | null {
  const data = getUserData();
  if (!data) return null;

  data.sessions.push(session);
  data.last_active = new Date().toISOString();

  // Points: 10 per correct answer + 5 bonus per question completed
  const points = session.correct_count * 10 + session.total_questions * 5;
  data.total_points += points;

  // Update study minutes
  data.study_minutes_today += Math.ceil(session.total_time_seconds / 60);

  // Update streak
  const today = new Date().toISOString().split("T")[0];
  const lastDate = data.streak.last_study_date;
  if (lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    if (lastDate === yesterday) {
      data.streak.current += 1;
    } else if (lastDate !== today) {
      data.streak.current = 1;
    }
    data.streak.last_study_date = today;
    if (data.streak.current > data.streak.longest) {
      data.streak.longest = data.streak.current;
    }
  }

  // Check achievements
  checkAchievements(data, session);

  saveUserData(data);
  return data;
}

function checkAchievements(data: UserData, session: SessionRecord): void {
  const totalSessions = data.sessions.length;
  const totalQuestions = data.sessions.reduce((s, r) => s + r.total_questions, 0);
  const accuracy = session.total_questions > 0 ? (session.correct_count / session.total_questions) * 100 : 0;
  const categories = new Set(data.sessions.map((s) => s.category));

  const unlock = (id: string) => {
    const a = data.achievements.find((x) => x.id === id);
    if (a && !a.unlocked) {
      a.unlocked = true;
      a.unlocked_at = new Date().toISOString();
    }
  };

  if (totalSessions >= 1) unlock("first_test");
  if (totalSessions >= 5) unlock("five_tests");
  if (totalSessions >= 10) unlock("ten_tests");
  if (accuracy === 100 && session.total_questions >= 3) unlock("perfect_score");
  if (session.total_time_seconds < 10 * session.total_questions && session.total_questions > 0) unlock("speed_demon");
  if (data.streak.current >= 3) unlock("streak_3");
  if (data.streak.current >= 7) unlock("streak_7");
  if (categories.size >= 2) unlock("both_sections");
  if (totalQuestions >= 50) unlock("fifty_questions");
  if (totalQuestions >= 100) unlock("hundred_questions");
}

export function getPerformanceAnalytics(data: UserData) {
  const sessions = data.sessions;
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      overallAccuracy: 0,
      avgTimePerQuestion: 0,
      categoryBreakdown: [],
      recentTrend: [],
      weakAreas: [],
      strongAreas: [],
      studyTimeTotal: 0,
    };
  }

  const totalQuestions = sessions.reduce((s, r) => s + r.total_questions, 0);
  const totalCorrect = sessions.reduce((s, r) => s + r.correct_count, 0);
  const totalTime = sessions.reduce((s, r) => s + r.total_time_seconds, 0);

  // Category breakdown
  const catMap = new Map<string, { questions: number; correct: number; time: number; sessions: number }>();
  for (const s of sessions) {
    const prev = catMap.get(s.category) || { questions: 0, correct: 0, time: 0, sessions: 0 };
    catMap.set(s.category, {
      questions: prev.questions + s.total_questions,
      correct: prev.correct + s.correct_count,
      time: prev.time + s.total_time_seconds,
      sessions: prev.sessions + 1,
    });
  }
  const categoryBreakdown = Array.from(catMap.entries()).map(([cat, d]) => ({
    category: cat,
    questions: d.questions,
    correct: d.correct,
    accuracy: d.questions > 0 ? Math.round((d.correct / d.questions) * 100) : 0,
    avgTime: d.questions > 0 ? Math.round(d.time / d.questions) : 0,
    sessions: d.sessions,
  }));

  // Weak and strong areas
  const weakAreas = categoryBreakdown
    .filter((c) => c.accuracy < 60 && c.questions >= 3)
    .sort((a, b) => a.accuracy - b.accuracy);
  const strongAreas = categoryBreakdown
    .filter((c) => c.accuracy >= 70 && c.questions >= 3)
    .sort((a, b) => b.accuracy - a.accuracy);

  // Recent trend (last 10 sessions)
  const recentTrend = sessions.slice(-10).map((s) => ({
    date: s.date,
    accuracy: s.total_questions > 0 ? Math.round((s.correct_count / s.total_questions) * 100) : 0,
    category: s.category,
  }));

  return {
    totalSessions: sessions.length,
    totalQuestions,
    totalCorrect,
    overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    avgTimePerQuestion: totalQuestions > 0 ? Math.round(totalTime / totalQuestions) : 0,
    categoryBreakdown,
    recentTrend,
    weakAreas,
    strongAreas,
    studyTimeTotal: totalTime,
  };
}

export function getSmartRecommendations(data: UserData): string[] {
  const analytics = getPerformanceAnalytics(data);
  const recs: string[] = [];

  if (analytics.totalSessions === 0) {
    recs.push("ابدأ أول اختبار لك! جرّب القسم الكمي أو اللفظي.");
    return recs;
  }

  if (analytics.weakAreas.length > 0) {
    const weakest = analytics.weakAreas[0];
    recs.push(`ركّز على "${weakest.category}" — دقتك فيه ${weakest.accuracy}٪ فقط. تدرّب أكثر لتحسين أدائك.`);
  }

  if (analytics.overallAccuracy < 50) {
    recs.push("حاول التركيز على فهم السؤال قبل الإجابة. خذ وقتك في القراءة.");
  } else if (analytics.overallAccuracy >= 80) {
    recs.push("أداؤك ممتاز! حاول تقليل وقت الإجابة للتدرب على السرعة.");
  }

  if (analytics.avgTimePerQuestion > 60) {
    recs.push("متوسط وقتك مرتفع. حاول حل المسائل بطريقة أسرع مع المحافظة على الدقة.");
  }

  const categories = new Set(data.sessions.map((s) => s.category));
  if (categories.size < 2) {
    recs.push("جرّب القسم الآخر أيضاً لتغطية جميع أجزاء اختبار القدرات.");
  }

  if (data.streak.current === 0) {
    recs.push("ادرس يومياً لبناء عادة التعلم! الاستمرارية مفتاح النجاح.");
  } else if (data.streak.current >= 3) {
    recs.push(`رائع! لديك سلسلة ${data.streak.current} أيام متتالية. استمر!`);
  }

  const totalQ = analytics.totalQuestions;
  if (totalQ < 50) {
    recs.push(`أجبت على ${totalQ} سؤال. هدفك القادم: ٥٠ سؤال للحصول على إنجاز!`);
  } else if (totalQ < 100) {
    recs.push(`أجبت على ${totalQ} سؤال. هدفك القادم: ١٠٠ سؤال!`);
  }

  return recs.slice(0, 4);
}

// ===== Wrong Answer Tracking =====

const WRONG_KEY = "qudrat_wrong_answers";

export interface WrongAnswer {
  questionText: string;
  sectionId: string;
  wrongCount: number;
  lastWrong: string;
}

export function getWrongAnswers(): WrongAnswer[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(WRONG_KEY) || "[]");
  } catch { return []; }
}

export function saveWrongAnswer(questionText: string, sectionId: string): void {
  const wrongs = getWrongAnswers();
  const existing = wrongs.find((w) => w.questionText === questionText);
  if (existing) {
    existing.wrongCount++;
    existing.lastWrong = new Date().toISOString();
  } else {
    wrongs.push({ questionText, sectionId, wrongCount: 1, lastWrong: new Date().toISOString() });
  }
  localStorage.setItem(WRONG_KEY, JSON.stringify(wrongs));
}

export function removeWrongAnswer(questionText: string): void {
  const wrongs = getWrongAnswers().filter((w) => w.questionText !== questionText);
  localStorage.setItem(WRONG_KEY, JSON.stringify(wrongs));
}
