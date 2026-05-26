/**
 * Collaborative Filtering — Question Recommendations
 *
 * Uses matrix factorization (SVD-like) to recommend questions
 * based on patterns from similar students.
 *
 * Since we don't have a large user base yet, we use:
 * 1. Synthetic student profiles as "ghost" users
 * 2. Content-based features as fallback
 * 3. Hybrid approach combining collaborative + content signals
 *
 * The recommendation engine considers:
 * - Question difficulty match (IRT-informed)
 * - Topic diversity (avoid repetition)
 * - Zone of proximal development (not too easy, not too hard)
 * - Weakness targeting (questions in weak areas)
 */

export interface QuestionProfile {
  id: string;
  section: string;
  difficulty: number; // 0-1
  topic: string;
  discriminationPower: number; // how well it separates students
}

export interface StudentInteraction {
  questionId: string;
  correct: boolean;
  timeSpent: number;
  timestamp: number;
}

export interface Recommendation {
  questionId: string;
  score: number; // 0-1, higher = more recommended
  reason: string;
  reasonType: "weakness" | "zpd" | "diversity" | "review" | "challenge";
}

// Synthetic student profiles for cold-start collaborative filtering
const SYNTHETIC_PROFILES = [
  { accuracy: 0.9, weakTopics: [] as string[], strongTopics: ["المتوسطات", "الأنماط", "التناظر"] },
  { accuracy: 0.7, weakTopics: ["الهندسة", "الإحصاء"], strongTopics: ["المعادلات"] },
  { accuracy: 0.5, weakTopics: ["المعادلات", "الهندسة", "الإحصاء"], strongTopics: ["التناظر"] },
  { accuracy: 0.6, weakTopics: ["التناظر", "إكمال الجمل"], strongTopics: ["المتوسطات", "الأنماط"] },
  { accuracy: 0.8, weakTopics: ["الخطأ السياقي"], strongTopics: ["المعادلات", "الأنماط", "الهندسة"] },
  { accuracy: 0.4, weakTopics: ["المتوسطات", "المعادلات", "التناظر"], strongTopics: [] },
];

/**
 * Matrix Factorization using Alternating Least Squares (ALS)
 *
 * Decomposes the user-question interaction matrix R ≈ U × V^T
 * where U = user factors, V = question factors
 *
 * Minimizes: Σ(r_ij - u_i · v_j)² + λ(||U||² + ||V||²)
 */
function matrixFactorization(
  interactions: Map<string, Map<string, number>>,
  k: number = 5, // latent factors
  lambda: number = 0.1, // regularization
  maxIter: number = 20,
): { userFactors: Map<string, number[]>; questionFactors: Map<string, number[]> } {
  const users = Array.from(interactions.keys());
  const questionsSet = new Set<string>();
  interactions.forEach((qi) => {
    qi.forEach((_val, q) => questionsSet.add(q));
  });
  const questions = Array.from(questionsSet);

  // Initialize random factors
  const userFactors = new Map<string, number[]>();
  const questionFactors = new Map<string, number[]>();

  const randVec = () => Array.from({ length: k }, () => (Math.random() - 0.5) * 0.1);

  for (const u of users) userFactors.set(u, randVec());
  for (const q of questions) questionFactors.set(q, randVec());

  // ALS iterations
  for (let iter = 0; iter < maxIter; iter++) {
    // Fix V, solve for U
    for (const u of users) {
      const uInteractions = interactions.get(u)!;
      const uf = userFactors.get(u)!;

      for (let f = 0; f < k; f++) {
        let num = 0;
        let den = lambda;

        uInteractions.forEach((rating, q) => {
          const vf = questionFactors.get(q);
          if (!vf) return;
          let pred = 0;
          for (let g = 0; g < k; g++) {
            if (g !== f) pred += uf[g] * vf[g];
          }
          num += vf[f] * (rating - pred);
          den += vf[f] * vf[f];
        });

        uf[f] = den > 0 ? num / den : 0;
      }
    }

    // Fix U, solve for V
    for (const q of questions) {
      const vf = questionFactors.get(q)!;

      for (let f = 0; f < k; f++) {
        let num = 0;
        let den = lambda;

        for (const u of users) {
          const uInteractions = interactions.get(u)!;
          const rating = uInteractions.get(q);
          if (rating === undefined) continue;
          const uf = userFactors.get(u)!;

          let pred = 0;
          for (let g = 0; g < k; g++) {
            if (g !== f) pred += uf[g] * vf[g];
          }
          num += uf[f] * (rating - pred);
          den += uf[f] * uf[f];
        }

        vf[f] = den > 0 ? num / den : 0;
      }
    }
  }

  return { userFactors, questionFactors };
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

/**
 * Build interaction matrix from student data + synthetic profiles
 */
function buildInteractionMatrix(
  studentInteractions: StudentInteraction[],
  studentAccuracy: number,
  questionProfiles: QuestionProfile[],
): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>();

  // Add real student interactions
  const realStudent = new Map<string, number>();
  for (const i of studentInteractions) {
    // Rating = 1 if correct, 0 if wrong, weighted by time efficiency
    const timeBonus = i.timeSpent < 30 ? 0.1 : i.timeSpent > 90 ? -0.1 : 0;
    realStudent.set(i.questionId, (i.correct ? 0.8 : 0.2) + timeBonus);
  }
  matrix.set("real_student", realStudent);

  // Add synthetic profiles
  for (let s = 0; s < SYNTHETIC_PROFILES.length; s++) {
    const profile = SYNTHETIC_PROFILES[s];
    const synthetic = new Map<string, number>();

    for (const q of questionProfiles) {
      // Simulate how this profile would perform on each question
      const isWeak = profile.weakTopics.includes(q.topic);
      const isStrong = profile.strongTopics.includes(q.topic);
      const difficultyMatch = 1 - Math.abs(profile.accuracy - q.difficulty);

      let expectedRating = profile.accuracy;
      if (isWeak) expectedRating -= 0.2;
      if (isStrong) expectedRating += 0.15;
      expectedRating *= difficultyMatch;
      expectedRating += (Math.random() - 0.5) * 0.1; // noise

      synthetic.set(q.id, Math.max(0, Math.min(1, expectedRating)));
    }

    matrix.set(`synthetic_${s}`, synthetic);
  }

  return matrix;
}

/**
 * Generate personalized question recommendations
 */
export function recommendQuestions(
  studentInteractions: StudentInteraction[],
  studentAccuracy: number,
  questionProfiles: QuestionProfile[],
  answeredIds: Set<string>,
  count: number = 10,
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const unanswered = questionProfiles.filter((q) => !answeredIds.has(q.id));
  if (unanswered.length === 0) return [];

  // Build interaction matrix and factorize
  const matrix = buildInteractionMatrix(studentInteractions, studentAccuracy, questionProfiles);
  const { userFactors, questionFactors } = matrixFactorization(matrix);

  const studentVector = userFactors.get("real_student") || Array(5).fill(0);

  // Identify weak topics from interactions
  const topicStats = new Map<string, { correct: number; total: number }>();
  for (const interaction of studentInteractions) {
    const q = questionProfiles.find((p) => p.id === interaction.questionId);
    if (!q) continue;
    const prev = topicStats.get(q.topic) || { correct: 0, total: 0 };
    topicStats.set(q.topic, {
      correct: prev.correct + (interaction.correct ? 1 : 0),
      total: prev.total + 1,
    });
  }

  const weakTopics = new Set<string>();
  topicStats.forEach((stats, topic) => {
    if (stats.total >= 2 && stats.correct / stats.total < 0.5) {
      weakTopics.add(topic);
    }
  });

  // Recent topics for diversity
  const recentTopics = new Set<string>();
  const recent = studentInteractions.slice(-5);
  for (const r of recent) {
    const q = questionProfiles.find((p) => p.id === r.questionId);
    if (q) recentTopics.add(q.topic);
  }

  // Score each unanswered question
  for (const q of unanswered) {
    let score = 0;
    let reason = "";
    let reasonType: Recommendation["reasonType"] = "zpd";

    // 1. Collaborative filtering score
    const qVector = questionFactors.get(q.id);
    if (qVector) {
      const cfScore = cosineSimilarity(studentVector, qVector);
      score += cfScore * 0.3;
    }

    // 2. Zone of Proximal Development (ZPD)
    // Best questions are slightly above current ability
    const targetDifficulty = Math.min(1, studentAccuracy + 0.1);
    const zpdScore = 1 - Math.abs(q.difficulty - targetDifficulty);
    score += zpdScore * 0.25;

    // 3. Weakness targeting
    if (weakTopics.has(q.topic)) {
      score += 0.25;
      reason = `تقوية نقطة ضعف: ${q.topic}`;
      reasonType = "weakness";
    }

    // 4. Topic diversity
    if (!recentTopics.has(q.topic)) {
      score += 0.1;
      if (!reason) {
        reason = `تنويع: ${q.topic}`;
        reasonType = "diversity";
      }
    }

    // 5. Discrimination power (prefer informative questions)
    score += q.discriminationPower * 0.1;

    if (!reason) {
      if (q.difficulty > studentAccuracy + 0.15) {
        reason = "تحدي لرفع مستواك";
        reasonType = "challenge";
      } else {
        reason = "مناسب لمستواك الحالي";
        reasonType = "zpd";
      }
    }

    recommendations.push({
      questionId: q.id,
      score: Math.max(0, Math.min(1, score)),
      reason,
      reasonType,
    });
  }

  // Sort by score and return top N
  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, count);
}

/**
 * Compute question difficulty from response history using Item Analysis
 */
export function analyzeQuestionDifficulty(
  questionId: string,
  interactions: StudentInteraction[],
): { difficulty: number; discrimination: number; reliability: number } {
  const responses = interactions.filter((i) => i.questionId === questionId);
  if (responses.length < 3) {
    return { difficulty: 0.5, discrimination: 0.5, reliability: 0 };
  }

  // Difficulty = proportion wrong
  const difficulty = 1 - responses.filter((r) => r.correct).length / responses.length;

  // Point-biserial correlation (discrimination)
  // Simplified: compare top/bottom 27% performers
  const sorted = [...responses].sort((a, b) => {
    const aScore = a.correct ? 1 : 0;
    const bScore = b.correct ? 1 : 0;
    return bScore - aScore;
  });
  const n27 = Math.max(1, Math.floor(responses.length * 0.27));
  const topGroup = sorted.slice(0, n27);
  const bottomGroup = sorted.slice(-n27);
  const topCorrect = topGroup.filter((r) => r.correct).length / topGroup.length;
  const bottomCorrect = bottomGroup.filter((r) => r.correct).length / bottomGroup.length;
  const discrimination = topCorrect - bottomCorrect;

  // Reliability based on sample size
  const reliability = Math.min(0.99, 1 - 1 / Math.sqrt(responses.length));

  return { difficulty, discrimination: Math.max(0, discrimination), reliability };
}
