/**
 * Edge Adaptive Engine — IRT/Elo at Edge runtime for near-zero latency
 *
 * Runs the adaptive algorithm at the Edge (closest PoP to the student),
 * computing the next difficulty level and feedback in sub-millisecond time
 * without hitting a central database for every question.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface StudentProgress {
  studentId: string;
  currentTheta: number;
  currentElo: number;
  questionDifficulty: number;
  isCorrect: boolean;
  responseTimeMs: number;
  sessionQuestionsAnswered: number;
  section: "kamy" | "lafzy";
}

interface IRTParams {
  a: number; // discrimination
  b: number; // difficulty
  c: number; // guessing
}

/**
 * IRT 3PL probability of correct response
 */
function irtProbability(theta: number, params: IRTParams): number {
  const exponent = -params.a * (theta - params.b);
  return params.c + (1 - params.c) / (1 + Math.exp(exponent));
}

/**
 * Fisher Information at theta for optimal question selection
 */
function fisherInformation(theta: number, params: IRTParams): number {
  const p = irtProbability(theta, params);
  const q = 1 - p;
  const pMinusC = p - params.c;
  if (pMinusC <= 0 || q <= 0) return 0;
  return (params.a ** 2 * (pMinusC ** 2) * q) / ((1 - params.c) ** 2 * p);
}

/**
 * Newton-Raphson single step for theta update (MLE)
 */
function updateTheta(
  currentTheta: number,
  params: IRTParams,
  correct: boolean,
): number {
  const p = irtProbability(currentTheta, params);
  const u = correct ? 1 : 0;
  const info = fisherInformation(currentTheta, params);
  if (info === 0) return currentTheta;
  const gradient = params.a * (u - p) * (p - params.c) / (p * (1 - params.c));
  const step = gradient / Math.max(info, 0.01);
  const newTheta = currentTheta + step;
  return Math.max(-4, Math.min(4, newTheta));
}

/**
 * Elo update with K-factor adaptive to match count
 */
function updateElo(
  studentElo: number,
  questionDifficulty: number,
  correct: boolean,
  gamesPlayed: number,
): { studentNew: number; kFactor: number } {
  const kFactor = gamesPlayed < 10 ? 40 : gamesPlayed < 30 ? 24 : 16;
  const expected = 1 / (1 + Math.pow(10, (questionDifficulty - studentElo) / 400));
  const score = correct ? 1 : 0;
  const studentNew = Math.round(studentElo + kFactor * (score - expected));
  return { studentNew, kFactor };
}

/**
 * Map theta to Qudrat score (40-100 scale)
 */
function thetaToScore(theta: number): number {
  const score = Math.round(70 + theta * 15);
  return Math.max(40, Math.min(100, score));
}

/**
 * Generate optimal next difficulty range based on current theta
 */
function optimalDifficultyRange(theta: number): { min: number; target: number; max: number } {
  return {
    min: theta - 0.8,
    target: theta + 0.2,
    max: theta + 1.2,
  };
}

/**
 * Generate motivational feedback based on performance context
 */
function generateFeedback(
  correct: boolean,
  sessionCount: number,
  theta: number,
  responseTimeMs: number,
): string {
  if (correct) {
    if (responseTimeMs < 15000) return "سرعة ودقة ممتازة! مستواك يتقدم.";
    if (theta > 1) return "إجابة صحيحة على سؤال صعب — أداء متميز!";
    return "إجابة ممتازة! إليك تحدٍ أقوى.";
  }
  if (sessionCount <= 3) return "بداية طبيعية — أغلب الطلاب يحتاجون عدة محاولات.";
  if (theta < -0.5) return "لا بأس، لنعد خطوة لترسيخ المفهوم.";
  return "المحاولة أساس التعلم. لنركّز على نقطة الضعف.";
}

export async function POST(req: NextRequest) {
  try {
    const progress: StudentProgress = await req.json();

    if (!progress.studentId || progress.currentTheta === undefined) {
      return NextResponse.json(
        { error: "بيانات الطالب غير مكتملة" },
        { status: 400 },
      );
    }

    // IRT params based on question difficulty
    const irtParams: IRTParams = {
      a: 1.2,
      b: progress.questionDifficulty,
      c: 0.25,
    };

    // 1. IRT theta update (Newton-Raphson)
    const newTheta = updateTheta(progress.currentTheta, irtParams, progress.isCorrect);
    const info = fisherInformation(newTheta, irtParams);

    // 2. Elo update
    const eloResult = updateElo(
      progress.currentElo,
      800 + progress.questionDifficulty * 400,
      progress.isCorrect,
      progress.sessionQuestionsAnswered,
    );

    // 3. Predicted Qudrat score
    const predictedScore = thetaToScore(newTheta);

    // 4. Optimal next question difficulty
    const nextDifficulty = optimalDifficultyRange(newTheta);

    // 5. Feedback
    const feedback = generateFeedback(
      progress.isCorrect,
      progress.sessionQuestionsAnswered,
      newTheta,
      progress.responseTimeMs,
    );

    // 6. Ability label
    const abilityLabel = newTheta > 1.5 ? "متقدم جداً" :
      newTheta > 0.5 ? "متقدم" :
      newTheta > -0.5 ? "متوسط" :
      newTheta > -1.5 ? "مبتدئ" : "مبتدئ";

    return NextResponse.json({
      success: true,
      theta: newTheta,
      elo: eloResult.studentNew,
      predictedScore,
      abilityLabel,
      informationGain: info,
      nextDifficulty,
      feedback,
      meta: {
        engine: "Ainex Edge Adaptive Core",
        runtime: "edge",
        kFactor: eloResult.kFactor,
      },
    }, {
      headers: {
        "Cache-Control": "no-store, must-revalidate",
        "X-Platform-Architecture": "Edge-Serverless-Hybrid",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "فشل في معالجة البيانات التكيفية", details: message },
      { status: 500 },
    );
  }
}
