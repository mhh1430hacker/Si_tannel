/**
 * Elo Rating System — Dynamic Difficulty Calibration
 *
 * Adapted from chess Elo for educational assessment.
 * Both students and questions have ratings that update after each interaction.
 *
 * Expected score: E = 1 / (1 + 10^((Rq - Rs) / 400))
 * Student update: Rs' = Rs + K * (S - E)
 * Question update: Rq' = Rq + Kq * (E - S)
 *
 * Where S = 1 (correct), 0 (incorrect)
 * K-factor adapts based on number of interactions (higher K = more volatile)
 */

export interface EloRating {
  rating: number;
  interactions: number;
  history: { rating: number; timestamp: number }[];
  volatility: number;
}

export interface EloMatchResult {
  studentNewRating: number;
  questionNewRating: number;
  expectedScore: number;
  surprise: number; // how unexpected the result was
  ratingChange: number;
}

const INITIAL_RATING = 1200;
const MIN_RATING = 400;
const MAX_RATING = 2400;

/**
 * Adaptive K-factor based on Glicko principles
 * Newer players/questions have higher K (more volatile ratings)
 */
function kFactor(interactions: number, volatility: number): number {
  const baseK = 32;
  const experienceFactor = Math.max(1, 1 + (30 - interactions) / 30);
  return baseK * experienceFactor * Math.max(0.5, volatility);
}

/**
 * Expected score using logistic function
 */
export function expectedScore(studentRating: number, questionRating: number): number {
  return 1 / (1 + Math.pow(10, (questionRating - studentRating) / 400));
}

/**
 * Compute rating update after a student answers a question
 */
export function computeEloUpdate(
  student: EloRating,
  question: EloRating,
  correct: boolean,
  responseTime?: number,
): EloMatchResult {
  const expected = expectedScore(student.rating, question.rating);
  const actual = correct ? 1 : 0;

  // Time bonus/penalty (fast correct = bonus, slow correct = less bonus)
  let timeFactor = 1;
  if (responseTime !== undefined) {
    if (correct && responseTime < 15) {
      timeFactor = 1.2; // fast correct answer bonus
    } else if (correct && responseTime > 90) {
      timeFactor = 0.8; // slow correct answer penalty
    } else if (!correct && responseTime < 5) {
      timeFactor = 1.3; // very fast wrong = likely guessing, bigger penalty
    }
  }

  const studentK = kFactor(student.interactions, student.volatility) * timeFactor;
  const questionK = kFactor(question.interactions, question.volatility) * 0.5; // questions update slower

  const studentChange = studentK * (actual - expected);
  const questionChange = questionK * (expected - actual);

  const studentNewRating = Math.max(MIN_RATING, Math.min(MAX_RATING, student.rating + studentChange));
  const questionNewRating = Math.max(MIN_RATING, Math.min(MAX_RATING, question.rating + questionChange));

  return {
    studentNewRating,
    questionNewRating,
    expectedScore: expected,
    surprise: Math.abs(actual - expected),
    ratingChange: studentChange,
  };
}

/**
 * Initialize a new Elo rating
 */
export function initEloRating(initial?: number): EloRating {
  return {
    rating: initial || INITIAL_RATING,
    interactions: 0,
    history: [{ rating: initial || INITIAL_RATING, timestamp: Date.now() }],
    volatility: 1.5,
  };
}

/**
 * Update an Elo rating after a match
 */
export function updateEloRating(rating: EloRating, newRatingValue: number): EloRating {
  const newHistory = [...rating.history.slice(-99), { rating: newRatingValue, timestamp: Date.now() }];

  // Update volatility based on recent rating changes
  let volatility = rating.volatility;
  if (newHistory.length >= 3) {
    const recentChanges = newHistory.slice(-5).map((h, i, arr) =>
      i > 0 ? Math.abs(h.rating - arr[i - 1].rating) : 0
    ).filter((c) => c > 0);
    const avgChange = recentChanges.reduce((s, c) => s + c, 0) / Math.max(1, recentChanges.length);
    volatility = 0.5 + (avgChange / 100); // normalize
    volatility = Math.max(0.3, Math.min(2, volatility));
  }

  return {
    rating: newRatingValue,
    interactions: rating.interactions + 1,
    history: newHistory,
    volatility,
  };
}

/**
 * Convert Elo rating to difficulty label
 */
export function eloToDifficulty(rating: number): "سهل" | "متوسط" | "صعب" {
  if (rating < 1000) return "سهل";
  if (rating < 1400) return "متوسط";
  return "صعب";
}

/**
 * Convert Elo rating to Qudrat score estimate
 */
export function eloToQudratScore(rating: number): number {
  // Linear map: 600 → 40, 1200 → 65, 1800 → 90, 2000 → 100
  const score = 40 + ((rating - 600) / 1400) * 60;
  return Math.round(Math.max(40, Math.min(100, score)));
}

/**
 * Match quality — how informative a question is for a student
 * Based on the principle that matches between similar-rated opponents
 * are most informative.
 * Returns 0-1, where 1 = perfect match (ratings are equal)
 */
export function matchQuality(studentRating: number, questionRating: number): number {
  const diff = Math.abs(studentRating - questionRating);
  return Math.exp(-(diff * diff) / (2 * 200 * 200));
}

/**
 * Select optimal question from pool based on Elo matching
 * Balances information gain with appropriate challenge level
 */
export function selectOptimalQuestion(
  studentRating: number,
  questions: { id: string; rating: number }[],
  answeredIds: Set<string>,
  targetDifficulty?: "easier" | "matched" | "harder",
): { id: string; rating: number } | null {
  const available = questions.filter((q) => !answeredIds.has(q.id));
  if (available.length === 0) return null;

  const targetOffset = targetDifficulty === "easier" ? -150 : targetDifficulty === "harder" ? 150 : 0;
  const targetRating = studentRating + targetOffset;

  // Sort by match quality with target
  const sorted = available
    .map((q) => ({ ...q, quality: matchQuality(targetRating, q.rating) }))
    .sort((a, b) => b.quality - a.quality);

  // Add some randomness to top candidates to avoid predictability
  const topN = Math.min(3, sorted.length);
  const idx = Math.floor(Math.random() * topN);
  return sorted[idx];
}

/**
 * Compute confidence interval for Elo rating
 * Based on Glicko-2 rating deviation concept
 */
export function ratingConfidence(rating: EloRating): { lower: number; upper: number; confidence: number } {
  const rd = Math.max(30, 350 / Math.sqrt(Math.max(1, rating.interactions)));
  return {
    lower: Math.max(MIN_RATING, rating.rating - 2 * rd),
    upper: Math.min(MAX_RATING, rating.rating + 2 * rd),
    confidence: Math.min(0.99, 1 - (rd / 350)),
  };
}
