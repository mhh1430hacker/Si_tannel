/**
 * Item Response Theory (IRT) — 3-Parameter Logistic Model
 * Used in real standardized tests (GRE, GMAT, SAT).
 *
 * P(θ) = c + (1 - c) / (1 + exp(-a(θ - b)))
 *
 * Parameters:
 *   θ (theta) — student ability (latent trait)
 *   a — discrimination (how well the item differentiates)
 *   b — difficulty (where on the ability scale the item is most informative)
 *   c — guessing parameter (probability of correct answer by chance)
 *
 * Uses Maximum Likelihood Estimation (MLE) for ability estimation
 * and Fisher Information for adaptive item selection.
 */

export interface IRTParameters {
  a: number; // discrimination [0.2, 2.5]
  b: number; // difficulty [-3, 3]
  c: number; // guessing [0, 0.35]
}

export interface IRTResponse {
  questionId: string;
  params: IRTParameters;
  correct: boolean;
  responseTime: number;
}

export interface IRTAbilityEstimate {
  theta: number;
  standardError: number;
  confidence95: [number, number];
  reliability: number;
}

const THETA_MIN = -4;
const THETA_MAX = 4;
const THETA_STEP = 0.01;
const MAX_NEWTON_ITER = 50;
const CONVERGENCE_THRESHOLD = 0.001;

function probability3PL(theta: number, params: IRTParameters): number {
  const { a, b, c } = params;
  const exponent = -a * (theta - b);
  const logistic = 1 / (1 + Math.exp(Math.max(-500, Math.min(500, exponent))));
  return c + (1 - c) * logistic;
}

function logLikelihood(theta: number, responses: IRTResponse[]): number {
  let ll = 0;
  for (const r of responses) {
    const p = probability3PL(theta, r.params);
    const pClamped = Math.max(1e-10, Math.min(1 - 1e-10, p));
    ll += r.correct ? Math.log(pClamped) : Math.log(1 - pClamped);
  }
  // Standard normal prior (regularization)
  ll -= (theta * theta) / 2;
  return ll;
}

function logLikelihoodDerivative(theta: number, responses: IRTResponse[]): number {
  let d = 0;
  for (const r of responses) {
    const { a, b, c } = r.params;
    const p = probability3PL(theta, r.params);
    const pStar = 1 / (1 + Math.exp(Math.max(-500, Math.min(500, -a * (theta - b)))));
    const w = a * pStar * (1 - pStar) / Math.max(1e-10, p * (1 - p));
    const residual = (r.correct ? 1 : 0) - p;
    d += w * residual * (p - c) / Math.max(1e-10, 1 - c);
  }
  // Prior derivative
  d -= theta;
  return d;
}

function logLikelihoodSecondDerivative(theta: number, responses: IRTResponse[]): number {
  let d2 = 0;
  for (const r of responses) {
    const { a } = r.params;
    const p = probability3PL(theta, r.params);
    const pClamped = Math.max(1e-10, Math.min(1 - 1e-10, p));
    d2 -= a * a * pClamped * (1 - pClamped);
  }
  d2 -= 1; // Prior second derivative
  return d2;
}

/**
 * Maximum A Posteriori (MAP) estimation using Newton-Raphson
 */
export function estimateAbility(responses: IRTResponse[]): IRTAbilityEstimate {
  if (responses.length === 0) {
    return { theta: 0, standardError: 1, confidence95: [-1.96, 1.96], reliability: 0 };
  }

  // Initialize with weighted proportion correct
  const propCorrect = responses.filter((r) => r.correct).length / responses.length;
  let theta = Math.log(Math.max(0.01, propCorrect) / Math.max(0.01, 1 - propCorrect));
  theta = Math.max(THETA_MIN, Math.min(THETA_MAX, theta));

  // Newton-Raphson iteration
  for (let i = 0; i < MAX_NEWTON_ITER; i++) {
    const d1 = logLikelihoodDerivative(theta, responses);
    const d2 = logLikelihoodSecondDerivative(theta, responses);

    if (Math.abs(d2) < 1e-10) break;

    const delta = d1 / d2;
    theta -= delta;
    theta = Math.max(THETA_MIN, Math.min(THETA_MAX, theta));

    if (Math.abs(delta) < CONVERGENCE_THRESHOLD) break;
  }

  // Fisher Information for standard error
  const info = fisherInformation(theta, responses);
  const se = info > 0 ? 1 / Math.sqrt(info) : 1;
  const reliability = 1 - (se * se);

  return {
    theta,
    standardError: se,
    confidence95: [theta - 1.96 * se, theta + 1.96 * se],
    reliability: Math.max(0, Math.min(1, reliability)),
  };
}

function fisherInformation(theta: number, responses: IRTResponse[]): number {
  let info = 0;
  for (const r of responses) {
    info += itemInformation(theta, r.params);
  }
  return info;
}

/**
 * Item Information Function — measures how much information
 * a question provides at a given ability level
 */
export function itemInformation(theta: number, params: IRTParameters): number {
  const { a, c } = params;
  const p = probability3PL(theta, params);
  const pStar = (p - c) / Math.max(1e-10, 1 - c);
  const q = 1 - p;
  if (p < 1e-10 || q < 1e-10) return 0;
  return a * a * q / p * pStar * pStar;
}

/**
 * Select the next optimal question using Maximum Fisher Information criterion.
 * This picks the question that provides the most information at the current ability estimate.
 */
export function selectNextQuestion(
  theta: number,
  availableQuestions: { id: string; params: IRTParameters }[],
  answeredIds: Set<string>,
): { id: string; params: IRTParameters } | null {
  let bestQuestion: { id: string; params: IRTParameters } | null = null;
  let bestInfo = -Infinity;

  for (const q of availableQuestions) {
    if (answeredIds.has(q.id)) continue;
    const info = itemInformation(theta, q.params);
    if (info > bestInfo) {
      bestInfo = info;
      bestQuestion = q;
    }
  }
  return bestQuestion;
}

/**
 * Assign IRT parameters to questions based on their difficulty labels.
 * In production, these would be calibrated from real response data.
 * We use reasonable priors based on psychometric literature.
 */
export function assignIRTParams(difficulty: string | undefined, questionIndex: number): IRTParameters {
  // Use question index for reproducible pseudo-random variation
  const seed = (questionIndex * 2654435761) >>> 0;
  const noise = (n: number) => ((seed * (n + 1) * 16807) % 2147483647) / 2147483647 - 0.5;

  switch (difficulty) {
    case "سهل":
      return {
        a: 0.8 + noise(1) * 0.3,   // low discrimination
        b: -1.5 + noise(2) * 0.5,  // easy
        c: 0.2 + noise(3) * 0.05,  // moderate guessing (4 choices)
      };
    case "صعب":
      return {
        a: 1.5 + noise(1) * 0.4,   // high discrimination
        b: 1.5 + noise(2) * 0.5,   // hard
        c: 0.15 + noise(3) * 0.05, // lower guessing (harder to guess)
      };
    default: // متوسط
      return {
        a: 1.0 + noise(1) * 0.3,   // moderate discrimination
        b: 0.0 + noise(2) * 0.5,   // medium
        c: 0.2 + noise(3) * 0.05,  // standard guessing
      };
  }
}

/**
 * Convert theta to Qudrat score scale (40-100)
 */
export function thetaToQudratScore(theta: number): number {
  // Linear mapping: theta -3 → 40, theta 3 → 100
  const score = 70 + (theta / 3) * 30;
  return Math.round(Math.max(40, Math.min(100, score)));
}

/**
 * Expected score distribution given current ability
 */
export function scoreProbabilityDistribution(theta: number): { score: number; probability: number }[] {
  const dist: { score: number; probability: number }[] = [];
  const mean = thetaToQudratScore(theta);
  const se = 5; // typical standard error in Qudrat scale

  for (let score = 40; score <= 100; score += 5) {
    const z = (score - mean) / se;
    const prob = Math.exp(-z * z / 2) / (se * Math.sqrt(2 * Math.PI));
    dist.push({ score, probability: prob });
  }

  // Normalize
  const total = dist.reduce((s, d) => s + d.probability, 0);
  for (const d of dist) d.probability = d.probability / total;

  return dist;
}

/**
 * Compute test reliability (Cronbach's-alpha-like measure from IRT)
 */
export function testReliability(responses: IRTResponse[], theta: number): number {
  const totalInfo = responses.reduce((sum, r) => sum + itemInformation(theta, r.params), 0);
  return totalInfo / (1 + totalInfo);
}

/**
 * Marginal Maximum Likelihood estimate of theta over a grid
 * (used as fallback when Newton-Raphson doesn't converge)
 */
export function gridSearchTheta(responses: IRTResponse[]): number {
  let bestTheta = 0;
  let bestLL = -Infinity;

  for (let t = THETA_MIN; t <= THETA_MAX; t += THETA_STEP) {
    const ll = logLikelihood(t, responses);
    if (ll > bestLL) {
      bestLL = ll;
      bestTheta = t;
    }
  }
  return bestTheta;
}
