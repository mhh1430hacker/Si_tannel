/**
 * League & Ranking System
 * 5 leagues: Bronze → Silver → Gold → Diamond → Legendary
 * Points-based promotion/demotion with seasonal tracking.
 */

export interface League {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  color: string;
  minPoints: number;
  maxPoints: number;
  gradient: string;
  glow: string;
}

export const LEAGUES: League[] = [
  { id: "bronze", name: "Bronze", nameAr: "برونزي", icon: "🥉", color: "#cd7f32", minPoints: 0, maxPoints: 499, gradient: "from-amber-900/40 to-orange-800/20", glow: "shadow-amber-900/30" },
  { id: "silver", name: "Silver", nameAr: "فضي", icon: "🥈", color: "#c0c0c0", minPoints: 500, maxPoints: 1499, gradient: "from-gray-400/30 to-gray-600/20", glow: "shadow-gray-400/30" },
  { id: "gold", name: "Gold", nameAr: "ذهبي", icon: "🥇", color: "#ffd700", minPoints: 1500, maxPoints: 3499, gradient: "from-yellow-500/30 to-amber-600/20", glow: "shadow-yellow-500/30" },
  { id: "diamond", name: "Diamond", nameAr: "ماسي", icon: "💎", color: "#b9f2ff", minPoints: 3500, maxPoints: 6999, gradient: "from-cyan-400/30 to-blue-500/20", glow: "shadow-cyan-400/30" },
  { id: "legendary", name: "Legendary", nameAr: "أسطوري", icon: "👑", color: "#ff6b6b", minPoints: 7000, maxPoints: Infinity, gradient: "from-purple-500/30 via-pink-500/20 to-red-500/30", glow: "shadow-purple-500/40" },
];

export function getLeague(points: number): League {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (points >= LEAGUES[i].minPoints) return LEAGUES[i];
  }
  return LEAGUES[0];
}

export function getNextLeague(points: number): League | null {
  const current = getLeague(points);
  const idx = LEAGUES.findIndex((l) => l.id === current.id);
  return idx < LEAGUES.length - 1 ? LEAGUES[idx + 1] : null;
}

export function getLeagueProgress(points: number): number {
  const league = getLeague(points);
  const next = getNextLeague(points);
  if (!next) return 100;
  const range = next.minPoints - league.minPoints;
  const progress = points - league.minPoints;
  return Math.min(100, Math.round((progress / range) * 100));
}

// ===== AI Opponents for Challenges =====

export interface AiOpponent {
  id: string;
  name: string;
  avatar: string;
  personality: string;
  league: string;
  accuracy: number; // 0-1 — probability of getting correct
  speed: number; // avg seconds per question
  catchphrase: string;
  description: string;
}

export const AI_OPPONENTS: AiOpponent[] = [
  {
    id: "noura",
    name: "نورة",
    avatar: "👧",
    personality: "مجتهدة",
    league: "bronze",
    accuracy: 0.45,
    speed: 25,
    catchphrase: "أنا أتعلم كل يوم!",
    description: "طالبة مبتدئة — دقتها ٤٥٪ لكنها مثابرة",
  },
  {
    id: "fahad",
    name: "فهد",
    avatar: "🧑",
    personality: "سريع",
    league: "silver",
    accuracy: 0.55,
    speed: 15,
    catchphrase: "السرعة سلاحي!",
    description: "سريع جداً لكنه يخطئ أحياناً بسبب التسرع",
  },
  {
    id: "sara",
    name: "سارة",
    avatar: "👩",
    personality: "ذكية",
    league: "gold",
    accuracy: 0.7,
    speed: 20,
    catchphrase: "التركيز هو المفتاح",
    description: "متوازنة بين السرعة والدقة — منافسة قوية",
  },
  {
    id: "khaled",
    name: "خالد",
    avatar: "👨‍🎓",
    personality: "خبير",
    league: "diamond",
    accuracy: 0.82,
    speed: 18,
    catchphrase: "الاختبار لعبة استراتيجية",
    description: "خبير في القدرات — دقته ٨٢٪ وسريع",
  },
  {
    id: "reem",
    name: "ريم",
    avatar: "👩‍💼",
    personality: "أسطورية",
    league: "legendary",
    accuracy: 0.92,
    speed: 12,
    catchphrase: "لا شيء يستحيل",
    description: "أسطورة القدرات — تقريباً لا تخطئ أبداً",
  },
];

export function simulateOpponentAnswer(opponent: AiOpponent): { correct: boolean; timeSpent: number } {
  const correct = Math.random() < opponent.accuracy;
  const timeSpent = Math.max(5, opponent.speed + (Math.random() - 0.5) * 10);
  return { correct, timeSpent: Math.round(timeSpent) };
}

// ===== Leaderboard (simulated with AI + user) =====

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  points: number;
  league: string;
  accuracy: number;
  isUser: boolean;
}

export function generateLeaderboard(userName: string, userPoints: number, userAccuracy: number): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [];

  // Add AI players
  const aiPlayers = [
    { name: "محمد أ.", avatar: "👨", points: 8200, accuracy: 91 },
    { name: "ريم ع.", avatar: "👩‍💼", points: 7500, accuracy: 88 },
    { name: "خالد م.", avatar: "👨‍🎓", points: 5800, accuracy: 85 },
    { name: "سارة ح.", avatar: "👩", points: 4200, accuracy: 79 },
    { name: "عبدالله ف.", avatar: "🧑", points: 3800, accuracy: 76 },
    { name: "نورة س.", avatar: "👧", points: 2900, accuracy: 72 },
    { name: "فهد ر.", avatar: "🧑", points: 2100, accuracy: 68 },
    { name: "مريم ك.", avatar: "👩", points: 1600, accuracy: 65 },
    { name: "أحمد ت.", avatar: "👨", points: 900, accuracy: 58 },
    { name: "لينا ب.", avatar: "👧", points: 400, accuracy: 50 },
  ];

  for (const ai of aiPlayers) {
    entries.push({
      rank: 0,
      name: ai.name,
      avatar: ai.avatar,
      points: ai.points,
      league: getLeague(ai.points).id,
      accuracy: ai.accuracy,
      isUser: false,
    });
  }

  // Add user
  entries.push({
    rank: 0,
    name: userName,
    avatar: "⭐",
    points: userPoints,
    league: getLeague(userPoints).id,
    accuracy: userAccuracy,
    isUser: true,
  });

  // Sort by points
  entries.sort((a, b) => b.points - a.points);
  entries.forEach((e, i) => (e.rank = i + 1));

  return entries;
}

// ===== Fatigue Detection =====

export interface FatigueAnalysis {
  level: "fresh" | "normal" | "tired" | "exhausted";
  icon: string;
  message: string;
  suggestion: string;
  score: number; // 0-100, higher = more fatigued
}

export function detectFatigue(responseTimes: number[], accuracies: boolean[]): FatigueAnalysis {
  if (responseTimes.length < 5) {
    return { level: "fresh", icon: "🧠", message: "ذهنك صافٍ", suggestion: "استمر!", score: 0 };
  }

  // Check if response times are increasing (getting slower)
  const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
  const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));
  const avgFirst = firstHalf.reduce((s, v) => s + v, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, v) => s + v, 0) / secondHalf.length;
  const slowdownRatio = avgSecond / Math.max(1, avgFirst);

  // Check if accuracy is dropping
  const accFirst = accuracies.slice(0, Math.floor(accuracies.length / 2)).filter(Boolean).length / Math.max(1, firstHalf.length);
  const accSecond = accuracies.slice(Math.floor(accuracies.length / 2)).filter(Boolean).length / Math.max(1, secondHalf.length);
  const accDrop = accFirst - accSecond;

  const fatigueScore = Math.min(100, Math.round(
    (Math.max(0, slowdownRatio - 1) * 40) + // Slowdown contributes 0-40
    (Math.max(0, accDrop) * 60 * 100) // Accuracy drop contributes 0-60
  ));

  if (fatigueScore < 15) {
    return { level: "fresh", icon: "🧠", message: "ذهنك صافٍ — أداؤك مستقر", suggestion: "استمر بنفس الوتيرة!", score: fatigueScore };
  } else if (fatigueScore < 40) {
    return { level: "normal", icon: "😊", message: "أداء طبيعي", suggestion: "كل شيء على ما يرام", score: fatigueScore };
  } else if (fatigueScore < 70) {
    return { level: "tired", icon: "😓", message: "بوادر إرهاق ذهني — بدأت تبطئ وتخطئ أكثر", suggestion: "خذ استراحة ٥ دقائق ثم عد", score: fatigueScore };
  } else {
    return { level: "exhausted", icon: "😴", message: "إرهاق شديد — أداؤك تراجع كثيراً", suggestion: "توقف الآن وأكمل غداً. الراحة جزء من التعلم!", score: fatigueScore };
  }
}
