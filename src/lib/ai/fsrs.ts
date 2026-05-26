/**
 * FSRS (Free Spaced Repetition Scheduler) — v4
 *
 * Advanced spaced repetition algorithm based on the DSR model
 * (Difficulty, Stability, Retrievability). Successor to SM-2.
 *
 * Core concepts:
 *   Stability (S) — how long a memory will last (in days)
 *   Difficulty (D) — how hard the material is [1-10]
 *   Retrievability (R) — probability of recall at time t
 *     R(t, S) = (1 + t/(9*S))^(-1)  (power forgetting curve)
 *
 * Rating scale: 1=Again, 2=Hard, 3=Good, 4=Easy
 */

export type FSRSRating = 1 | 2 | 3 | 4;

export interface FSRSCard {
  id: string;
  difficulty: number;     // D ∈ [1, 10]
  stability: number;      // S in days
  retrievability: number; // R ∈ [0, 1]
  lastReview: number;     // timestamp ms
  scheduledDay: number;   // next review in days
  state: "new" | "learning" | "review" | "relearning";
  reps: number;
  lapses: number;
  history: { rating: FSRSRating; timestamp: number; stability: number }[];
}

export interface FSRSSchedule {
  again: number; // days until review if rated Again
  hard: number;
  good: number;
  easy: number;
}

// FSRS v4 default weights (from open-source FSRS research)
const W = [
  0.4072, 1.1829, 3.1262, 15.4722, // initial stability for ratings 1-4
  7.2102,                            // initial difficulty
  0.5316, 1.0651,                    // difficulty update
  0.0046,                            // stability decay
  1.5071, 0.1607, 1.0048,           // stability after success
  1.9395, 0.1097,                    // stability after failure
  0.0444, 0.3013, 2.1214, 0.2053,  // short-term factors
];

/**
 * Initialize a new FSRS card
 */
export function initCard(id: string): FSRSCard {
  return {
    id,
    difficulty: W[4],
    stability: 0,
    retrievability: 1,
    lastReview: Date.now(),
    scheduledDay: 0,
    state: "new",
    reps: 0,
    lapses: 0,
    history: [],
  };
}

/**
 * Retrievability — probability of recall at elapsed time
 * Power forgetting curve: R = (1 + t/(9S))^(-1)
 */
export function retrievability(elapsedDays: number, stability: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + elapsedDays / (9 * stability), -1);
}

/**
 * Initial difficulty based on first rating
 */
function initDifficulty(rating: FSRSRating): number {
  return clamp(W[4] - Math.exp(W[5] * (rating - 1)) + 1, 1, 10);
}

/**
 * Update difficulty after review
 */
function nextDifficulty(d: number, rating: FSRSRating): number {
  const meanReversion = W[7] * (W[4] - d);
  const delta = -(W[6] * (rating - 3));
  return clamp(d + delta + meanReversion, 1, 10);
}

/**
 * Initial stability based on first rating
 */
function initStability(rating: FSRSRating): number {
  return Math.max(0.1, W[rating - 1]);
}

/**
 * Next stability after successful recall
 */
function nextStabilitySuccess(d: number, s: number, r: number, rating: FSRSRating): number {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;

  return s * (
    1 +
    Math.exp(W[8]) *
    (11 - d) *
    Math.pow(s, -W[9]) *
    (Math.exp((1 - r) * W[10]) - 1) *
    hardPenalty *
    easyBonus
  );
}

/**
 * Next stability after failed recall (lapse)
 */
function nextStabilityFail(d: number, s: number, r: number): number {
  return Math.max(
    0.1,
    W[11] *
    Math.pow(d, -W[12]) *
    (Math.pow(s + 1, W[13]) - 1) *
    Math.exp((1 - r) * W[14])
  );
}

function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

/**
 * Process a review and return updated card
 */
export function reviewCard(card: FSRSCard, rating: FSRSRating): FSRSCard {
  const now = Date.now();
  const elapsedDays = Math.max(0, (now - card.lastReview) / (1000 * 60 * 60 * 24));

  let newD: number;
  let newS: number;
  let newState: FSRSCard["state"];
  let newLapses = card.lapses;
  let newReps = card.reps + 1;

  if (card.state === "new") {
    // First review
    newD = initDifficulty(rating);
    newS = initStability(rating);
    newState = rating === 1 ? "learning" : "review";
    if (rating === 1) newLapses++;
  } else {
    // Subsequent reviews
    const r = retrievability(elapsedDays, card.stability);
    newD = nextDifficulty(card.difficulty, rating);

    if (rating === 1) {
      // Failed recall
      newS = nextStabilityFail(newD, card.stability, r);
      newState = "relearning";
      newLapses++;
    } else {
      // Successful recall
      newS = nextStabilitySuccess(newD, card.stability, r, rating);
      newState = "review";
    }
  }

  // Schedule next review
  const scheduledDay = computeScheduledDay(newS, rating);

  return {
    ...card,
    difficulty: newD,
    stability: newS,
    retrievability: 1, // just reviewed
    lastReview: now,
    scheduledDay,
    state: newState,
    reps: newReps,
    lapses: newLapses,
    history: [...card.history.slice(-49), { rating, timestamp: now, stability: newS }],
  };
}

function computeScheduledDay(stability: number, rating: FSRSRating): number {
  if (rating === 1) return 0; // review immediately
  // Next review when retrievability drops to 90%
  // R = (1 + t/(9S))^(-1) = 0.9
  // t = 9S * (0.9^(-1) - 1) = 9S * (1/9) = S
  // So next review ≈ S days (when R drops to ~90%)
  const desiredR = 0.9;
  const interval = 9 * stability * (Math.pow(desiredR, -1) - 1);
  return Math.max(rating === 2 ? 0.5 : 1, Math.round(interval * 10) / 10);
}

/**
 * Compute all possible schedules for a card
 */
export function getScheduleOptions(card: FSRSCard): FSRSSchedule {
  const options: FSRSSchedule = { again: 0, hard: 0, good: 0, easy: 0 };

  for (const rating of [1, 2, 3, 4] as FSRSRating[]) {
    const updated = reviewCard(card, rating);
    const key = rating === 1 ? "again" : rating === 2 ? "hard" : rating === 3 ? "good" : "easy";
    options[key] = updated.scheduledDay;
  }

  return options;
}

/**
 * Sort cards by urgency (most overdue first)
 * Cards past their scheduled review date are prioritized
 */
export function sortByUrgency(cards: FSRSCard[]): FSRSCard[] {
  const now = Date.now();
  return [...cards].sort((a, b) => {
    const aOverdue = (now - a.lastReview) / (1000 * 60 * 60 * 24) - a.scheduledDay;
    const bOverdue = (now - b.lastReview) / (1000 * 60 * 60 * 24) - b.scheduledDay;
    return bOverdue - aOverdue; // most overdue first
  });
}

/**
 * Get cards due for review today
 */
export function getDueCards(cards: FSRSCard[]): FSRSCard[] {
  const now = Date.now();
  return cards.filter((c) => {
    const elapsed = (now - c.lastReview) / (1000 * 60 * 60 * 24);
    return elapsed >= c.scheduledDay || c.state === "new";
  });
}

/**
 * Compute retention statistics
 */
export function retentionStats(cards: FSRSCard[]): {
  mature: number;
  learning: number;
  newCount: number;
  avgRetention: number;
  avgStability: number;
} {
  const now = Date.now();
  let totalR = 0;
  let totalS = 0;
  let mature = 0;
  let learning = 0;
  let newCount = 0;

  for (const c of cards) {
    if (c.state === "new") {
      newCount++;
      continue;
    }

    const elapsed = (now - c.lastReview) / (1000 * 60 * 60 * 24);
    const r = retrievability(elapsed, c.stability);
    totalR += r;
    totalS += c.stability;

    if (c.stability >= 21) {
      mature++;
    } else {
      learning++;
    }
  }

  const reviewedCount = cards.length - newCount;
  return {
    mature,
    learning,
    newCount,
    avgRetention: reviewedCount > 0 ? totalR / reviewedCount : 0,
    avgStability: reviewedCount > 0 ? totalS / reviewedCount : 0,
  };
}

/**
 * Predict workload for next N days
 */
export function predictWorkload(cards: FSRSCard[], days: number): number[] {
  const now = Date.now();
  const workload: number[] = new Array(days).fill(0);

  for (const c of cards) {
    if (c.state === "new") {
      workload[0]++;
      continue;
    }
    const elapsed = (now - c.lastReview) / (1000 * 60 * 60 * 24);
    const dueIn = Math.max(0, c.scheduledDay - elapsed);
    const dayIdx = Math.floor(dueIn);
    if (dayIdx < days) {
      workload[dayIdx]++;
    }
  }

  return workload;
}
