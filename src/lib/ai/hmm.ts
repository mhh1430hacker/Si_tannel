/**
 * Hidden Markov Model (HMM) — Learning State Transitions
 *
 * Models student learning as a sequence of hidden states:
 *   S0: Novice (doesn't understand the concept)
 *   S1: Developing (partial understanding, inconsistent)
 *   S2: Proficient (solid understanding, occasional errors)
 *   S3: Expert (deep understanding, consistent accuracy)
 *
 * Observable emissions: correct/incorrect answers with timing
 *
 * Uses Forward-Backward algorithm for state inference
 * and Viterbi algorithm for most likely state sequence.
 */

export type LearningState = "novice" | "developing" | "proficient" | "expert";

export interface HMMParams {
  // Transition matrix A[i][j] = P(state j | state i)
  transition: number[][];
  // Emission probabilities B[state][observation]
  // observation 0=wrong_slow, 1=wrong_fast, 2=correct_slow, 3=correct_fast
  emission: number[][];
  // Initial state distribution
  initial: number[];
}

export interface HMMObservation {
  correct: boolean;
  fast: boolean; // < 30 seconds
}

export interface HMMStateEstimate {
  currentState: LearningState;
  stateProbabilities: Record<LearningState, number>;
  stateSequence: LearningState[];
  transitionLikely: { from: LearningState; to: LearningState; probability: number } | null;
  daysToNextLevel: number;
}

const STATE_NAMES: LearningState[] = ["novice", "developing", "proficient", "expert"];
const STATE_LABELS: Record<LearningState, string> = {
  novice: "مبتدئ",
  developing: "متطور",
  proficient: "ماهر",
  expert: "خبير",
};

// Default HMM parameters (based on educational research)
const DEFAULT_HMM: HMMParams = {
  // Transition probabilities (learning is mostly forward, but regression possible)
  transition: [
    // novice → [novice, developing, proficient, expert]
    [0.70, 0.25, 0.04, 0.01],
    // developing → [novice, developing, proficient, expert]
    [0.05, 0.65, 0.27, 0.03],
    // proficient → [novice, developing, proficient, expert]
    [0.01, 0.04, 0.70, 0.25],
    // expert → [novice, developing, proficient, expert]
    [0.00, 0.01, 0.09, 0.90],
  ],
  // Emission probabilities
  // [wrong_slow, wrong_fast, correct_slow, correct_fast]
  emission: [
    [0.40, 0.25, 0.25, 0.10], // novice: mostly wrong
    [0.20, 0.15, 0.40, 0.25], // developing: more correct
    [0.08, 0.07, 0.35, 0.50], // proficient: mostly correct
    [0.03, 0.02, 0.20, 0.75], // expert: fast and correct
  ],
  // Initial state: most likely novice or developing
  initial: [0.40, 0.35, 0.20, 0.05],
};

function observationIndex(obs: HMMObservation): number {
  if (!obs.correct && !obs.fast) return 0;
  if (!obs.correct && obs.fast) return 1;
  if (obs.correct && !obs.fast) return 2;
  return 3; // correct and fast
}

/**
 * Forward algorithm — compute P(observations | model)
 * Returns forward probabilities alpha[t][state]
 */
function forwardAlgorithm(
  observations: HMMObservation[],
  params: HMMParams = DEFAULT_HMM,
): number[][] {
  const T = observations.length;
  const N = params.initial.length;
  const alpha: number[][] = Array.from({ length: T }, () => new Array(N).fill(0));

  // Initialization
  const obs0 = observationIndex(observations[0]);
  for (let i = 0; i < N; i++) {
    alpha[0][i] = params.initial[i] * params.emission[i][obs0];
  }

  // Normalize to prevent underflow
  let sum = alpha[0].reduce((a, b) => a + b, 0);
  if (sum > 0) for (let i = 0; i < N; i++) alpha[0][i] /= sum;

  // Induction
  for (let t = 1; t < T; t++) {
    const obsT = observationIndex(observations[t]);
    for (let j = 0; j < N; j++) {
      let s = 0;
      for (let i = 0; i < N; i++) {
        s += alpha[t - 1][i] * params.transition[i][j];
      }
      alpha[t][j] = s * params.emission[j][obsT];
    }
    // Normalize
    sum = alpha[t].reduce((a, b) => a + b, 0);
    if (sum > 0) for (let j = 0; j < N; j++) alpha[t][j] /= sum;
  }

  return alpha;
}

/**
 * Backward algorithm
 */
function backwardAlgorithm(
  observations: HMMObservation[],
  params: HMMParams = DEFAULT_HMM,
): number[][] {
  const T = observations.length;
  const N = params.initial.length;
  const beta: number[][] = Array.from({ length: T }, () => new Array(N).fill(0));

  // Initialization
  for (let i = 0; i < N; i++) beta[T - 1][i] = 1;

  // Induction
  for (let t = T - 2; t >= 0; t--) {
    const obsNext = observationIndex(observations[t + 1]);
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let j = 0; j < N; j++) {
        s += params.transition[i][j] * params.emission[j][obsNext] * beta[t + 1][j];
      }
      beta[t][i] = s;
    }
    // Normalize
    const sum = beta[t].reduce((a, b) => a + b, 0);
    if (sum > 0) for (let i = 0; i < N; i++) beta[t][i] /= sum;
  }

  return beta;
}

/**
 * Viterbi algorithm — most likely state sequence
 */
function viterbi(
  observations: HMMObservation[],
  params: HMMParams = DEFAULT_HMM,
): number[] {
  const T = observations.length;
  const N = params.initial.length;
  const delta: number[][] = Array.from({ length: T }, () => new Array(N).fill(0));
  const psi: number[][] = Array.from({ length: T }, () => new Array(N).fill(0));

  // Initialization
  const obs0 = observationIndex(observations[0]);
  for (let i = 0; i < N; i++) {
    delta[0][i] = Math.log(Math.max(1e-10, params.initial[i])) +
      Math.log(Math.max(1e-10, params.emission[i][obs0]));
  }

  // Recursion
  for (let t = 1; t < T; t++) {
    const obsT = observationIndex(observations[t]);
    for (let j = 0; j < N; j++) {
      let maxVal = -Infinity;
      let maxIdx = 0;
      for (let i = 0; i < N; i++) {
        const val = delta[t - 1][i] + Math.log(Math.max(1e-10, params.transition[i][j]));
        if (val > maxVal) {
          maxVal = val;
          maxIdx = i;
        }
      }
      delta[t][j] = maxVal + Math.log(Math.max(1e-10, params.emission[j][obsT]));
      psi[t][j] = maxIdx;
    }
  }

  // Backtracking
  const path = new Array(T);
  let maxFinal = -Infinity;
  path[T - 1] = 0;
  for (let i = 0; i < N; i++) {
    if (delta[T - 1][i] > maxFinal) {
      maxFinal = delta[T - 1][i];
      path[T - 1] = i;
    }
  }
  for (let t = T - 2; t >= 0; t--) {
    path[t] = psi[t + 1][path[t + 1]];
  }

  return path;
}

/**
 * Estimate current learning state from observation sequence
 */
export function estimateLearningState(
  observations: HMMObservation[],
): HMMStateEstimate {
  if (observations.length === 0) {
    return {
      currentState: "novice",
      stateProbabilities: { novice: 0.4, developing: 0.35, proficient: 0.2, expert: 0.05 },
      stateSequence: [],
      transitionLikely: null,
      daysToNextLevel: 14,
    };
  }

  // Forward-backward for state probabilities
  const alpha = forwardAlgorithm(observations);
  const beta = backwardAlgorithm(observations);
  const T = observations.length;
  const N = STATE_NAMES.length;

  // Posterior probabilities at last time step
  const posterior = alpha[T - 1].map((a, i) => a * beta[T - 1][i]);
  const sum = posterior.reduce((a, b) => a + b, 0);
  if (sum > 0) for (let i = 0; i < N; i++) posterior[i] /= sum;

  // Current state = max posterior
  let maxIdx = 0;
  for (let i = 1; i < N; i++) {
    if (posterior[i] > posterior[maxIdx]) maxIdx = i;
  }
  const currentState = STATE_NAMES[maxIdx];

  // State probabilities
  const stateProbabilities: Record<LearningState, number> = {
    novice: posterior[0],
    developing: posterior[1],
    proficient: posterior[2],
    expert: posterior[3],
  };

  // Most likely state sequence (Viterbi)
  const path = viterbi(observations);
  const stateSequence = path.map((s) => STATE_NAMES[s]);

  // Most likely next transition
  let transitionLikely = null;
  if (maxIdx < N - 1) {
    const nextState = STATE_NAMES[maxIdx + 1];
    const prob = DEFAULT_HMM.transition[maxIdx][maxIdx + 1];
    transitionLikely = { from: currentState, to: nextState, probability: prob };
  }

  // Estimate days to next level based on current transition rate
  let daysToNextLevel = 30;
  if (maxIdx < N - 1) {
    const transProb = DEFAULT_HMM.transition[maxIdx][maxIdx + 1];
    // Expected number of steps = 1/p (geometric distribution)
    const expectedSteps = transProb > 0 ? 1 / transProb : 100;
    daysToNextLevel = Math.ceil(expectedSteps * 0.5); // assume ~2 sessions per day
  }

  return {
    currentState,
    stateProbabilities,
    stateSequence,
    transitionLikely,
    daysToNextLevel,
  };
}

/**
 * Baum-Welch algorithm for parameter re-estimation
 * Adapts HMM parameters to a specific student's data
 */
export function baumWelch(
  observations: HMMObservation[],
  maxIter: number = 50,
): HMMParams {
  const T = observations.length;
  const N = STATE_NAMES.length;
  const M = 4; // number of observation types

  if (T < 5) return { ...DEFAULT_HMM };

  let params: HMMParams = JSON.parse(JSON.stringify(DEFAULT_HMM));

  for (let iter = 0; iter < maxIter; iter++) {
    const alpha = forwardAlgorithm(observations, params);
    const beta = backwardAlgorithm(observations, params);

    // Compute gamma (state occupation probabilities)
    const gamma: number[][] = Array.from({ length: T }, () => new Array(N).fill(0));
    for (let t = 0; t < T; t++) {
      let sum = 0;
      for (let i = 0; i < N; i++) {
        gamma[t][i] = alpha[t][i] * beta[t][i];
        sum += gamma[t][i];
      }
      if (sum > 0) for (let i = 0; i < N; i++) gamma[t][i] /= sum;
    }

    // Compute xi (transition probabilities)
    const xi: number[][][] = Array.from({ length: T - 1 }, () =>
      Array.from({ length: N }, () => new Array(N).fill(0))
    );
    for (let t = 0; t < T - 1; t++) {
      const obsNext = observationIndex(observations[t + 1]);
      let sum = 0;
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
          xi[t][i][j] = alpha[t][i] * params.transition[i][j] *
            params.emission[j][obsNext] * beta[t + 1][j];
          sum += xi[t][i][j];
        }
      }
      if (sum > 0) {
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            xi[t][i][j] /= sum;
          }
        }
      }
    }

    // Re-estimate parameters
    const newParams: HMMParams = {
      initial: new Array(N).fill(0),
      transition: Array.from({ length: N }, () => new Array(N).fill(0)),
      emission: Array.from({ length: N }, () => new Array(M).fill(0)),
    };

    // Initial
    for (let i = 0; i < N; i++) newParams.initial[i] = gamma[0][i];

    // Transition
    for (let i = 0; i < N; i++) {
      let gammaSum = 0;
      for (let t = 0; t < T - 1; t++) gammaSum += gamma[t][i];
      for (let j = 0; j < N; j++) {
        let xiSum = 0;
        for (let t = 0; t < T - 1; t++) xiSum += xi[t][i][j];
        newParams.transition[i][j] = gammaSum > 0 ? xiSum / gammaSum : params.transition[i][j];
      }
      // Normalize row
      const rowSum = newParams.transition[i].reduce((a, b) => a + b, 0);
      if (rowSum > 0) for (let j = 0; j < N; j++) newParams.transition[i][j] /= rowSum;
    }

    // Emission
    for (let i = 0; i < N; i++) {
      let gammaSum = 0;
      for (let t = 0; t < T; t++) gammaSum += gamma[t][i];
      for (let k = 0; k < M; k++) {
        let obsSum = 0;
        for (let t = 0; t < T; t++) {
          if (observationIndex(observations[t]) === k) obsSum += gamma[t][i];
        }
        newParams.emission[i][k] = gammaSum > 0 ? obsSum / gammaSum : params.emission[i][k];
      }
      // Normalize row
      const rowSum = newParams.emission[i].reduce((a, b) => a + b, 0);
      if (rowSum > 0) for (let k = 0; k < M; k++) newParams.emission[i][k] /= rowSum;
    }

    // Check convergence
    let diff = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        diff += Math.abs(newParams.transition[i][j] - params.transition[i][j]);
      }
    }

    params = newParams;
    if (diff < 0.001) break;
  }

  return params;
}

export { STATE_LABELS };
