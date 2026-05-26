/**
 * Bayesian Knowledge Tracing (BKT)
 *
 * Hidden Markov Model that estimates the probability a student
 * has "mastered" a skill based on their response sequence.
 *
 * Four parameters per skill:
 *   P(L₀) — prior probability of knowing the skill
 *   P(T)  — probability of learning (transitioning from unknown → known)
 *   P(G)  — probability of guessing correctly when not knowing
 *   P(S)  — probability of slipping (wrong answer despite knowing)
 *
 * Bayes update:
 *   P(Lₙ | correct) = P(Lₙ₋₁)(1-P(S)) / [P(Lₙ₋₁)(1-P(S)) + (1-P(Lₙ₋₁))P(G)]
 *   P(Lₙ | wrong)   = P(Lₙ₋₁)P(S) / [P(Lₙ₋₁)P(S) + (1-P(Lₙ₋₁))(1-P(G))]
 *
 * After observation update, apply learning transition:
 *   P(Lₙ) = P(Lₙ|obs) + (1 - P(Lₙ|obs)) * P(T)
 */

export interface BKTSkillParams {
  pL0: number; // prior knowledge [0.01, 0.99]
  pT: number;  // learn rate [0.01, 0.5]
  pG: number;  // guess rate [0.01, 0.4]
  pS: number;  // slip rate [0.01, 0.3]
}

export interface BKTSkillState {
  skillId: string;
  skillName: string;
  pMastery: number;
  totalAttempts: number;
  correctAttempts: number;
  history: boolean[]; // recent correct/incorrect sequence
  params: BKTSkillParams;
}

export interface BKTLearningCurve {
  attempt: number;
  pMastery: number;
}

const MASTERY_THRESHOLD = 0.95;

const DEFAULT_PARAMS: Record<string, BKTSkillParams> = {
  "المتوسطات": { pL0: 0.3, pT: 0.1, pG: 0.25, pS: 0.1 },
  "النسب والتناسب": { pL0: 0.25, pT: 0.08, pG: 0.2, pS: 0.12 },
  "المعادلات": { pL0: 0.2, pT: 0.09, pG: 0.22, pS: 0.1 },
  "الأنماط": { pL0: 0.35, pT: 0.12, pG: 0.25, pS: 0.08 },
  "الهندسة": { pL0: 0.2, pT: 0.07, pG: 0.2, pS: 0.15 },
  "الإحصاء": { pL0: 0.25, pT: 0.08, pG: 0.2, pS: 0.12 },
  "التناظر اللفظي": { pL0: 0.3, pT: 0.1, pG: 0.25, pS: 0.1 },
  "إكمال الجمل": { pL0: 0.35, pT: 0.11, pG: 0.3, pS: 0.08 },
  "الخطأ السياقي": { pL0: 0.25, pT: 0.09, pG: 0.25, pS: 0.12 },
  "استيعاب المقروء": { pL0: 0.3, pT: 0.08, pG: 0.25, pS: 0.1 },
};

function getDefaultParams(skillId: string): BKTSkillParams {
  return DEFAULT_PARAMS[skillId] || { pL0: 0.3, pT: 0.09, pG: 0.25, pS: 0.1 };
}

/**
 * Single Bayesian update step
 */
function bayesUpdate(pL: number, correct: boolean, params: BKTSkillParams): number {
  const { pG, pS, pT } = params;

  // Observation update
  let pLGivenObs: number;
  if (correct) {
    const numerator = pL * (1 - pS);
    const denominator = pL * (1 - pS) + (1 - pL) * pG;
    pLGivenObs = denominator > 0 ? numerator / denominator : pL;
  } else {
    const numerator = pL * pS;
    const denominator = pL * pS + (1 - pL) * (1 - pG);
    pLGivenObs = denominator > 0 ? numerator / denominator : pL;
  }

  // Learning transition
  const pLNew = pLGivenObs + (1 - pLGivenObs) * pT;

  return Math.max(0.001, Math.min(0.999, pLNew));
}

/**
 * Initialize a new skill state
 */
export function initSkillState(skillId: string, skillName: string): BKTSkillState {
  const params = getDefaultParams(skillId);
  return {
    skillId,
    skillName,
    pMastery: params.pL0,
    totalAttempts: 0,
    correctAttempts: 0,
    history: [],
    params,
  };
}

/**
 * Update skill state with a new observation
 */
export function updateSkillState(state: BKTSkillState, correct: boolean): BKTSkillState {
  const newPMastery = bayesUpdate(state.pMastery, correct, state.params);

  return {
    ...state,
    pMastery: newPMastery,
    totalAttempts: state.totalAttempts + 1,
    correctAttempts: state.correctAttempts + (correct ? 1 : 0),
    history: [...state.history.slice(-49), correct],
  };
}

/**
 * Process an entire response sequence for a skill
 */
export function traceKnowledge(
  skillId: string,
  skillName: string,
  responses: boolean[],
): BKTSkillState {
  let state = initSkillState(skillId, skillName);
  for (const correct of responses) {
    state = updateSkillState(state, correct);
  }
  return state;
}

/**
 * Get the full learning curve for a skill
 */
export function getLearningCurve(
  skillId: string,
  responses: boolean[],
): BKTLearningCurve[] {
  const params = getDefaultParams(skillId);
  let pL = params.pL0;
  const curve: BKTLearningCurve[] = [{ attempt: 0, pMastery: pL }];

  for (let i = 0; i < responses.length; i++) {
    pL = bayesUpdate(pL, responses[i], params);
    curve.push({ attempt: i + 1, pMastery: pL });
  }

  return curve;
}

/**
 * Check if a skill is considered mastered
 */
export function isMastered(state: BKTSkillState): boolean {
  return state.pMastery >= MASTERY_THRESHOLD;
}

/**
 * Estimate how many more correct answers needed to reach mastery
 */
export function questionsToMastery(state: BKTSkillState): number {
  if (isMastered(state)) return 0;

  let pL = state.pMastery;
  let count = 0;
  const maxIter = 100;

  while (pL < MASTERY_THRESHOLD && count < maxIter) {
    pL = bayesUpdate(pL, true, state.params);
    count++;
  }

  return count;
}

/**
 * Predict probability of correct answer for a skill
 */
export function predictCorrect(state: BKTSkillState): number {
  const { pG, pS } = state.params;
  return state.pMastery * (1 - pS) + (1 - state.pMastery) * pG;
}

/**
 * Expectation-Maximization for parameter estimation
 * Fits BKT parameters to observed response data using EM.
 */
export function fitBKTParameters(
  responses: boolean[],
  initialParams?: BKTSkillParams,
  maxIter: number = 100,
): BKTSkillParams {
  let params = initialParams || { pL0: 0.3, pT: 0.09, pG: 0.25, pS: 0.1 };
  const n = responses.length;
  if (n < 5) return params;

  for (let iter = 0; iter < maxIter; iter++) {
    // E-step: compute forward-backward probabilities
    const alpha: number[] = new Array(n);
    const beta: number[] = new Array(n);
    const pCorrectGivenKnow = 1 - params.pS;
    const pCorrectGivenNotKnow = params.pG;

    // Forward pass
    let pL = params.pL0;
    for (let t = 0; t < n; t++) {
      const pObs = responses[t]
        ? pL * pCorrectGivenKnow + (1 - pL) * pCorrectGivenNotKnow
        : pL * params.pS + (1 - pL) * (1 - params.pG);
      alpha[t] = pObs > 0 ? (responses[t]
        ? pL * pCorrectGivenKnow / pObs
        : pL * params.pS / pObs) : pL;
      pL = alpha[t] + (1 - alpha[t]) * params.pT;
    }

    // Backward pass
    beta[n - 1] = alpha[n - 1];
    for (let t = n - 2; t >= 0; t--) {
      beta[t] = alpha[t];
    }

    // M-step: re-estimate parameters
    let sumPL0 = alpha[0] > 0 ? alpha[0] : params.pL0;
    let learnCount = 0;
    let learnOpp = 0;
    let guessCount = 0;
    let guessOpp = 0;
    let slipCount = 0;
    let slipOpp = 0;

    for (let t = 0; t < n; t++) {
      const pKnow = alpha[t];
      const pNotKnow = 1 - pKnow;

      if (responses[t]) {
        slipOpp += pKnow;
        guessCount += pNotKnow;
        guessOpp += pNotKnow;
      } else {
        slipCount += pKnow;
        slipOpp += pKnow;
        guessOpp += pNotKnow;
      }

      if (t < n - 1) {
        learnOpp += pNotKnow;
        const nextPKnow = alpha[t + 1];
        learnCount += Math.max(0, nextPKnow - pKnow);
      }
    }

    const newParams: BKTSkillParams = {
      pL0: Math.max(0.01, Math.min(0.99, sumPL0)),
      pT: learnOpp > 0 ? Math.max(0.01, Math.min(0.5, learnCount / learnOpp)) : params.pT,
      pG: guessOpp > 0 ? Math.max(0.01, Math.min(0.4, guessCount / guessOpp)) : params.pG,
      pS: slipOpp > 0 ? Math.max(0.01, Math.min(0.3, slipCount / slipOpp)) : params.pS,
    };

    // Check convergence
    const diff = Math.abs(newParams.pL0 - params.pL0) +
      Math.abs(newParams.pT - params.pT) +
      Math.abs(newParams.pG - params.pG) +
      Math.abs(newParams.pS - params.pS);

    params = newParams;
    if (diff < 0.0001) break;
  }

  return params;
}

/**
 * Recommend which skill to practice next
 * Uses "zone of proximal development" — skills that are close to mastery
 * but not yet mastered, prioritized by expected learning gain.
 */
export function recommendNextSkill(states: BKTSkillState[]): BKTSkillState | null {
  const unmastered = states.filter((s) => !isMastered(s));
  if (unmastered.length === 0) return null;

  // Sort by expected learning gain: skills closest to mastery but not there yet
  // Weighted by: how quickly they can reach mastery (fewest questions)
  return unmastered.sort((a, b) => {
    const costA = questionsToMastery(a);
    const costB = questionsToMastery(b);
    // Prefer skills that are almost mastered (lower cost)
    // But also consider that very low mastery skills need attention
    const urgencyA = a.pMastery < 0.3 ? 0.5 : 1;
    const urgencyB = b.pMastery < 0.3 ? 0.5 : 1;
    return (costA * urgencyA) - (costB * urgencyB);
  })[0];
}
