/**
 * AI Engine — Unified interface for all AI systems
 *
 * Orchestrates:
 * - IRT (adaptive question selection)
 * - BKT (knowledge tracing)
 * - Elo (rating calibration)
 * - FSRS (spaced repetition)
 * - K-Means (student clustering)
 * - Neural Network (score prediction)
 * - HMM (learning state transitions)
 * - Collaborative Filtering (recommendations)
 *
 * All data persists in localStorage alongside user data.
 */

import {
  estimateAbility, assignIRTParams, itemInformation,
  thetaToQudratScore, scoreProbabilityDistribution,
  type IRTResponse, type IRTAbilityEstimate,
} from "./irt";
import {
  initSkillState, updateSkillState, traceKnowledge,
  getLearningCurve, isMastered, questionsToMastery,
  predictCorrect, recommendNextSkill,
  type BKTSkillState,
} from "./bkt";
import {
  initEloRating, computeEloUpdate, updateEloRating,
  eloToQudratScore, selectOptimalQuestion, matchQuality,
  type EloRating,
} from "./elo";
import {
  initCard, reviewCard, getDueCards, sortByUrgency,
  retentionStats, getScheduleOptions, predictWorkload,
  type FSRSCard, type FSRSRating,
} from "./fsrs";
import {
  extractFeatures, classifyStudent, type StudentClusterAssignment,
} from "./clustering";
import { predictScore, type NeuralPrediction } from "./neural-predictor";
import {
  estimateLearningState, STATE_LABELS,
  type HMMObservation, type HMMStateEstimate,
} from "./hmm";
import {
  recommendQuestions, type QuestionProfile, type StudentInteraction, type Recommendation,
} from "./collaborative-filtering";

const AI_STORAGE_KEY = "qudrat_ai_state";

export interface AIState {
  irtResponses: IRTResponse[];
  irtTheta: number;
  bktSkills: Record<string, BKTSkillState>;
  studentElo: EloRating;
  questionElos: Record<string, EloRating>;
  fsrsCards: Record<string, FSRSCard>;
  hmmObservations: HMMObservation[];
  interactions: StudentInteraction[];
  lastUpdated: number;
}

function getDefaultAIState(): AIState {
  return {
    irtResponses: [],
    irtTheta: 0,
    bktSkills: {},
    studentElo: initEloRating(),
    questionElos: {},
    fsrsCards: {},
    hmmObservations: [],
    interactions: [],
    lastUpdated: Date.now(),
  };
}

export function loadAIState(): AIState {
  if (typeof window === "undefined") return getDefaultAIState();
  const raw = localStorage.getItem(AI_STORAGE_KEY);
  if (!raw) return getDefaultAIState();
  try {
    return JSON.parse(raw);
  } catch {
    return getDefaultAIState();
  }
}

export function saveAIState(state: AIState): void {
  if (typeof window === "undefined") return;
  state.lastUpdated = Date.now();
  localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(state));
}

/**
 * Process a student's answer through all AI systems
 */
export function processAnswer(
  state: AIState,
  questionId: string,
  questionText: string,
  difficulty: string | undefined,
  section: string,
  correct: boolean,
  responseTime: number,
  questionIndex: number,
): AIState {
  const newState = { ...state };

  // 1. IRT — Update ability estimate
  const irtParams = assignIRTParams(difficulty, questionIndex);
  const irtResponse: IRTResponse = {
    questionId,
    params: irtParams,
    correct,
    responseTime,
  };
  newState.irtResponses = [...state.irtResponses, irtResponse];
  const abilityEstimate = estimateAbility(newState.irtResponses);
  newState.irtTheta = abilityEstimate.theta;

  // 2. BKT — Update skill mastery
  const skillId = inferSkill(questionText, section);
  const existingSkill = state.bktSkills[skillId] || initSkillState(skillId, skillId);
  newState.bktSkills = {
    ...state.bktSkills,
    [skillId]: updateSkillState(existingSkill, correct),
  };

  // 3. Elo — Update ratings
  const qElo = state.questionElos[questionId] || initEloRating(
    difficulty === "سهل" ? 900 : difficulty === "صعب" ? 1500 : 1200
  );
  const eloResult = computeEloUpdate(state.studentElo, qElo, correct, responseTime);
  newState.studentElo = updateEloRating(state.studentElo, eloResult.studentNewRating);
  newState.questionElos = {
    ...state.questionElos,
    [questionId]: updateEloRating(qElo, eloResult.questionNewRating),
  };

  // 4. FSRS — Update spaced repetition card
  if (!correct) {
    const card = state.fsrsCards[questionId] || initCard(questionId);
    const rating: FSRSRating = correct ? 3 : 1;
    newState.fsrsCards = {
      ...state.fsrsCards,
      [questionId]: reviewCard(card, rating),
    };
  }

  // 5. HMM — Record observation
  const fast = responseTime < 30;
  newState.hmmObservations = [
    ...state.hmmObservations,
    { correct, fast },
  ];

  // 6. Record interaction for collaborative filtering
  newState.interactions = [
    ...state.interactions,
    { questionId, correct, timeSpent: responseTime, timestamp: Date.now() },
  ];

  saveAIState(newState);
  return newState;
}

/**
 * Get comprehensive AI analysis for the analytics page
 */
export function getAIAnalysis(
  state: AIState,
  sessions: { category: string; total_questions: number; correct_count: number; total_time_seconds: number; date: string }[],
  streak: number,
): {
  irtAbility: IRTAbilityEstimate;
  predictedScore: number;
  eloRating: number;
  eloQudratScore: number;
  bktSkills: BKTSkillState[];
  masteredSkills: string[];
  weakestSkill: BKTSkillState | null;
  learningState: HMMStateEstimate;
  studentCluster: StudentClusterAssignment;
  neuralPrediction: NeuralPrediction;
  scoreDistribution: { score: number; probability: number }[];
  fsrsStats: { mature: number; learning: number; newCount: number; avgRetention: number };
  workloadForecast: number[];
} {
  // IRT
  const irtAbility = estimateAbility(state.irtResponses);
  const predictedScore = thetaToQudratScore(irtAbility.theta);
  const scoreDistribution = scoreProbabilityDistribution(irtAbility.theta);

  // Elo
  const eloRating = state.studentElo.rating;
  const eloQudratScore = eloToQudratScore(eloRating);

  // BKT
  const bktSkills = Object.values(state.bktSkills);
  const masteredSkills = bktSkills.filter((s) => isMastered(s)).map((s) => s.skillName);
  const weakestSkill = recommendNextSkill(bktSkills);

  // HMM
  const learningState = estimateLearningState(state.hmmObservations);

  // Clustering
  const features = extractFeatures(sessions);
  const studentCluster = classifyStudent(features);

  // Neural prediction
  const neuralPrediction = predictScore(sessions, streak);

  // FSRS
  const fsrsCards = Object.values(state.fsrsCards);
  const fsrsStats = retentionStats(fsrsCards);
  const workloadForecast = predictWorkload(fsrsCards, 7);

  return {
    irtAbility,
    predictedScore,
    eloRating,
    eloQudratScore,
    bktSkills,
    masteredSkills,
    weakestSkill,
    learningState,
    studentCluster,
    neuralPrediction,
    scoreDistribution,
    fsrsStats: {
      mature: fsrsStats.mature,
      learning: fsrsStats.learning,
      newCount: fsrsStats.newCount,
      avgRetention: fsrsStats.avgRetention,
    },
    workloadForecast,
  };
}

/**
 * Get adaptive question selection combining IRT + Elo + Collaborative Filtering
 */
export function selectAdaptiveQuestion(
  state: AIState,
  availableQuestions: { id: string; text: string; difficulty?: string; section: string; index: number }[],
  answeredIds: Set<string>,
): { questionIndex: number; reason: string } | null {
  if (availableQuestions.length === 0) return null;

  const unanswered = availableQuestions.filter((q) => !answeredIds.has(q.id));
  if (unanswered.length === 0) return null;

  // Build question profiles for collaborative filtering
  const profiles: QuestionProfile[] = unanswered.map((q) => ({
    id: q.id,
    section: q.section,
    difficulty: q.difficulty === "سهل" ? 0.3 : q.difficulty === "صعب" ? 0.8 : 0.5,
    topic: inferSkill(q.text, q.section),
    discriminationPower: 0.7,
  }));

  const totalQ = state.irtResponses.length;
  const totalCorrect = state.irtResponses.filter((r) => r.correct).length;
  const accuracy = totalQ > 0 ? totalCorrect / totalQ : 0.5;

  // Get collaborative filtering recommendations
  const cfRecs = recommendQuestions(
    state.interactions,
    accuracy,
    profiles,
    answeredIds,
    5,
  );

  // IRT: pick question with max information at current theta
  let bestIrtIdx = 0;
  let bestInfo = -Infinity;
  for (let i = 0; i < unanswered.length; i++) {
    const params = assignIRTParams(unanswered[i].difficulty, unanswered[i].index);
    const info = itemInformation(state.irtTheta, params);
    if (info > bestInfo) {
      bestInfo = info;
      bestIrtIdx = i;
    }
  }

  // Elo: pick question with best match quality
  let bestEloIdx = 0;
  let bestMatch = -Infinity;
  for (let i = 0; i < unanswered.length; i++) {
    const qElo = state.questionElos[unanswered[i].id]?.rating ||
      (unanswered[i].difficulty === "سهل" ? 900 : unanswered[i].difficulty === "صعب" ? 1500 : 1200);
    const quality = matchQuality(state.studentElo.rating, qElo);
    if (quality > bestMatch) {
      bestMatch = quality;
      bestEloIdx = i;
    }
  }

  // Combine signals with weighted voting
  const scores = new Map<number, { score: number; reasons: string[] }>();

  // IRT vote (weight: 0.35)
  const irtEntry = scores.get(bestIrtIdx) || { score: 0, reasons: [] };
  irtEntry.score += 0.35;
  irtEntry.reasons.push("IRT: أعلى معلومات عند مستواك");
  scores.set(bestIrtIdx, irtEntry);

  // Elo vote (weight: 0.25)
  const eloEntry = scores.get(bestEloIdx) || { score: 0, reasons: [] };
  eloEntry.score += 0.25;
  eloEntry.reasons.push("Elo: أفضل تطابق مع تصنيفك");
  scores.set(bestEloIdx, eloEntry);

  // CF votes (weight: 0.4 distributed)
  for (const rec of cfRecs) {
    const idx = unanswered.findIndex((q) => q.id === rec.questionId);
    if (idx >= 0) {
      const entry = scores.get(idx) || { score: 0, reasons: [] };
      entry.score += 0.08 * rec.score;
      entry.reasons.push(`CF: ${rec.reason}`);
      scores.set(idx, entry);
    }
  }

  // Find winner
  let bestIdx = 0;
  let bestScore = -Infinity;
  scores.forEach(({ score }, idx) => {
    if (score > bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  const winner = unanswered[bestIdx];
  const entry = scores.get(bestIdx);
  const originalIdx = availableQuestions.findIndex((q) => q.id === winner.id);
  const reason = entry?.reasons.join(" | ") || "سؤال مناسب لمستواك";

  return { questionIndex: originalIdx, reason };
}

/**
 * Get FSRS review queue (questions that need reviewing)
 */
export function getReviewQueue(state: AIState): FSRSCard[] {
  const cards = Object.values(state.fsrsCards);
  const due = getDueCards(cards);
  return sortByUrgency(due);
}

/**
 * Infer skill/topic from question text
 */
function inferSkill(text: string, section: string): string {
  if (section.includes("لفظي") || section === "lafzy") {
    if (text.includes("تناظر") || text.includes("يقابل") || text.includes("مثل")) return "التناظر اللفظي";
    if (text.includes("أكمل") || text.includes("الفراغ") || text.includes("يناسب")) return "إكمال الجمل";
    if (text.includes("خطأ") || text.includes("سياق") || text.includes("غير مناسب")) return "الخطأ السياقي";
    if (text.includes("نص") || text.includes("فقرة") || text.includes("مقروء") || text.includes("يُفهم")) return "استيعاب المقروء";
    return "إكمال الجمل";
  }

  // Quantitative
  if (text.includes("متوسط") || text.includes("معدل")) return "المتوسطات";
  if (text.includes("نسبة") || text.includes("تناسب") || text.includes("٪")) return "النسب والتناسب";
  if (text.includes("معادلة") || text.includes("س") || text.includes("قيمة")) return "المعادلات";
  if (text.includes("نمط") || text.includes("تسلسل") || text.includes("أكمل")) return "الأنماط";
  if (text.includes("مثلث") || text.includes("دائرة") || text.includes("مساحة") || text.includes("محيط")) return "الهندسة";
  if (text.includes("احتمال") || text.includes("إحصاء") || text.includes("وسيط")) return "الإحصاء";
  return "المعادلات";
}

export { STATE_LABELS };
export type { IRTAbilityEstimate, BKTSkillState, HMMStateEstimate, StudentClusterAssignment, NeuralPrediction, FSRSCard, FSRSRating, Recommendation };
