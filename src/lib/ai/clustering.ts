/**
 * K-Means Clustering for Student Profiling
 *
 * Clusters students into groups based on performance features:
 * - Overall accuracy
 * - Quantitative vs verbal balance
 * - Speed (avg time per question)
 * - Consistency (variance of accuracy across sessions)
 * - Growth rate (trend slope)
 *
 * Uses K-Means++ initialization for better convergence.
 * Supports Euclidean and Manhattan distance metrics.
 */

export interface StudentFeatureVector {
  accuracy: number;           // 0-1
  quantBalance: number;       // -1 (verbal) to 1 (quant)
  speed: number;              // normalized 0-1
  consistency: number;        // 0-1 (low variance = high consistency)
  growthRate: number;         // -1 to 1 (trend)
  totalExperience: number;    // normalized 0-1
}

export interface ClusterResult {
  clusterId: number;
  centroid: StudentFeatureVector;
  label: string;
  description: string;
  memberCount: number;
  avgAccuracy: number;
}

export interface StudentClusterAssignment {
  features: StudentFeatureVector;
  clusterId: number;
  distance: number;
  clusterLabel: string;
  recommendations: string[];
}

const STUDENT_ARCHETYPES: {
  centroid: StudentFeatureVector;
  label: string;
  description: string;
  recommendations: string[];
}[] = [
  {
    centroid: { accuracy: 0.85, quantBalance: 0.1, speed: 0.7, consistency: 0.8, growthRate: 0.3, totalExperience: 0.7 },
    label: "متفوق متوازن",
    description: "أداء عالٍ في كلا القسمين مع سرعة وثبات",
    recommendations: [
      "ركّز على الأسئلة الصعبة فقط لتحدي نفسك",
      "جرّب تقليل وقت الإجابة إلى أقل من 45 ثانية",
      "ادخل التحديات لقياس مستواك الحقيقي",
    ],
  },
  {
    centroid: { accuracy: 0.65, quantBalance: 0.5, speed: 0.5, consistency: 0.6, growthRate: 0.2, totalExperience: 0.5 },
    label: "قوي في الكمي",
    description: "أداء أفضل في الرياضيات مع فرصة لتحسين اللفظي",
    recommendations: [
      "خصص 60% من وقتك للقسم اللفظي",
      "اقرأ نصوص متنوعة لتقوية الاستيعاب",
      "حل تمارين التناظر اللفظي يومياً",
    ],
  },
  {
    centroid: { accuracy: 0.65, quantBalance: -0.5, speed: 0.5, consistency: 0.6, growthRate: 0.2, totalExperience: 0.5 },
    label: "قوي في اللفظي",
    description: "أداء أفضل في اللغة مع فرصة لتحسين الكمي",
    recommendations: [
      "خصص 60% من وقتك للقسم الكمي",
      "راجع أساسيات الرياضيات والأنماط",
      "حل 10 مسائل كمية يومياً كحد أدنى",
    ],
  },
  {
    centroid: { accuracy: 0.45, quantBalance: 0, speed: 0.3, consistency: 0.4, growthRate: 0.4, totalExperience: 0.3 },
    label: "مبتدئ متحمس",
    description: "في بداية الطريق مع تحسّن ملحوظ — استمر!",
    recommendations: [
      "ركّز على فهم الأساسيات قبل الأسئلة الصعبة",
      "أجب 15 سؤال يومياً بتركيز عالٍ",
      "راجع أخطاءك بعد كل جلسة",
    ],
  },
  {
    centroid: { accuracy: 0.5, quantBalance: 0, speed: 0.6, consistency: 0.3, growthRate: -0.1, totalExperience: 0.6 },
    label: "متسرع",
    description: "سرعة عالية لكن الدقة تحتاج تركيز أكثر",
    recommendations: [
      "أبطئ! اقرأ السؤال مرتين قبل الإجابة",
      "خصص 10 ثوانٍ إضافية لكل سؤال",
      "جرّب قراءة جميع الخيارات قبل الاختيار",
    ],
  },
  {
    centroid: { accuracy: 0.55, quantBalance: 0, speed: 0.2, consistency: 0.7, growthRate: 0, totalExperience: 0.8 },
    label: "ثابت بطيء",
    description: "أداء ثابت لكن يحتاج تسريع وتحسين الدقة",
    recommendations: [
      "تدرّب على حل الأسئلة بوقت محدد",
      "تعلم استراتيجيات الحل السريع",
      "ركّز على الأنماط المتكررة في الأسئلة",
    ],
  },
];

/**
 * Euclidean distance between two feature vectors
 */
function euclideanDistance(a: StudentFeatureVector, b: StudentFeatureVector): number {
  const weights = { accuracy: 2, quantBalance: 1.5, speed: 1, consistency: 1.5, growthRate: 1.5, totalExperience: 0.5 };
  let sum = 0;
  for (const key of Object.keys(weights) as (keyof StudentFeatureVector)[]) {
    const diff = a[key] - b[key];
    sum += diff * diff * weights[key];
  }
  return Math.sqrt(sum);
}

/**
 * Extract features from user session data
 */
export function extractFeatures(sessions: {
  category: string;
  total_questions: number;
  correct_count: number;
  total_time_seconds: number;
  date: string;
}[]): StudentFeatureVector {
  if (sessions.length === 0) {
    return { accuracy: 0, quantBalance: 0, speed: 0.5, consistency: 0, growthRate: 0, totalExperience: 0 };
  }

  // Overall accuracy
  const totalQ = sessions.reduce((s, r) => s + r.total_questions, 0);
  const totalC = sessions.reduce((s, r) => s + r.correct_count, 0);
  const accuracy = totalQ > 0 ? totalC / totalQ : 0;

  // Quantitative vs Verbal balance
  let quantQ = 0, quantC = 0, verbQ = 0, verbC = 0;
  for (const s of sessions) {
    if (s.category.includes("كمي")) {
      quantQ += s.total_questions;
      quantC += s.correct_count;
    } else if (s.category.includes("لفظي")) {
      verbQ += s.total_questions;
      verbC += s.correct_count;
    }
  }
  const quantAcc = quantQ > 0 ? quantC / quantQ : 0.5;
  const verbAcc = verbQ > 0 ? verbC / verbQ : 0.5;
  const quantBalance = quantAcc - verbAcc; // positive = better at quant

  // Speed (normalized: 0=slow, 1=fast)
  const totalTime = sessions.reduce((s, r) => s + r.total_time_seconds, 0);
  const avgTime = totalQ > 0 ? totalTime / totalQ : 60;
  const speed = Math.max(0, Math.min(1, 1 - (avgTime - 10) / 110)); // 10s=fastest, 120s=slowest

  // Consistency (inverse of accuracy variance across sessions)
  const sessionAccuracies = sessions
    .filter((s) => s.total_questions >= 3)
    .map((s) => s.correct_count / s.total_questions);
  let consistency = 0.5;
  if (sessionAccuracies.length >= 2) {
    const mean = sessionAccuracies.reduce((a, b) => a + b, 0) / sessionAccuracies.length;
    const variance = sessionAccuracies.reduce((s, a) => s + (a - mean) ** 2, 0) / sessionAccuracies.length;
    consistency = Math.max(0, 1 - Math.sqrt(variance) * 4); // normalize
  }

  // Growth rate (linear regression slope on session accuracies)
  let growthRate = 0;
  if (sessionAccuracies.length >= 3) {
    const n = sessionAccuracies.length;
    const xMean = (n - 1) / 2;
    const yMean = sessionAccuracies.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (sessionAccuracies[i] - yMean);
      den += (i - xMean) ** 2;
    }
    growthRate = den > 0 ? Math.max(-1, Math.min(1, (num / den) * 10)) : 0;
  }

  // Total experience (log-scaled)
  const totalExperience = Math.min(1, Math.log(1 + totalQ) / Math.log(200));

  return { accuracy, quantBalance, speed, consistency, growthRate, totalExperience };
}

/**
 * Classify a student into an archetype using nearest-centroid
 */
export function classifyStudent(features: StudentFeatureVector): StudentClusterAssignment {
  let bestIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < STUDENT_ARCHETYPES.length; i++) {
    const dist = euclideanDistance(features, STUDENT_ARCHETYPES[i].centroid);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  const archetype = STUDENT_ARCHETYPES[bestIdx];
  return {
    features,
    clusterId: bestIdx,
    distance: bestDist,
    clusterLabel: archetype.label,
    recommendations: archetype.recommendations,
  };
}

/**
 * K-Means++ initialization — selects initial centroids
 * that are well-spread across the data
 */
function kMeansPlusPlus(
  data: StudentFeatureVector[],
  k: number,
): StudentFeatureVector[] {
  const centroids: StudentFeatureVector[] = [];

  // First centroid: random
  centroids.push(data[Math.floor(Math.random() * data.length)]);

  for (let c = 1; c < k; c++) {
    // Compute squared distances to nearest centroid
    const distances = data.map((point) => {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const d = euclideanDistance(point, centroid);
        if (d < minDist) minDist = d;
      }
      return minDist * minDist;
    });

    // Weighted random selection
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalDist;
    for (let i = 0; i < data.length; i++) {
      r -= distances[i];
      if (r <= 0) {
        centroids.push(data[i]);
        break;
      }
    }
    if (centroids.length <= c) centroids.push(data[Math.floor(Math.random() * data.length)]);
  }

  return centroids;
}

/**
 * Full K-Means clustering algorithm
 * Used when we have enough data to cluster real students
 */
export function kMeans(
  data: StudentFeatureVector[],
  k: number = 6,
  maxIter: number = 100,
): { assignments: number[]; centroids: StudentFeatureVector[] } {
  if (data.length < k) {
    return {
      assignments: data.map((_, i) => i % k),
      centroids: STUDENT_ARCHETYPES.map((a) => a.centroid).slice(0, k),
    };
  }

  let centroids = kMeansPlusPlus(data, k);
  let assignments = new Array(data.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assignment step
    const newAssignments = data.map((point) => {
      let bestK = 0;
      let bestDist = Infinity;
      for (let c = 0; c < k; c++) {
        const d = euclideanDistance(point, centroids[c]);
        if (d < bestDist) {
          bestDist = d;
          bestK = c;
        }
      }
      return bestK;
    });

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    if (!changed) break;

    // Update step
    const keys: (keyof StudentFeatureVector)[] = ["accuracy", "quantBalance", "speed", "consistency", "growthRate", "totalExperience"];
    centroids = Array.from({ length: k }, (_, c) => {
      const members = data.filter((_, i) => assignments[i] === c);
      if (members.length === 0) return centroids[c]; // keep old centroid
      const centroid: Partial<StudentFeatureVector> = {};
      for (const key of keys) {
        centroid[key] = members.reduce((s, m) => s + m[key], 0) / members.length;
      }
      return centroid as StudentFeatureVector;
    });
  }

  return { assignments, centroids };
}

/**
 * Silhouette score — measures how well-clustered the data is
 * Returns -1 to 1, where 1 = perfect clustering
 */
export function silhouetteScore(
  data: StudentFeatureVector[],
  assignments: number[],
): number {
  if (data.length < 2) return 0;

  let totalS = 0;
  for (let i = 0; i < data.length; i++) {
    const cluster = assignments[i];

    // a(i) = avg distance to same-cluster members
    const sameCluster = data.filter((_, j) => j !== i && assignments[j] === cluster);
    const a = sameCluster.length > 0
      ? sameCluster.reduce((s, p) => s + euclideanDistance(data[i], p), 0) / sameCluster.length
      : 0;

    // b(i) = min avg distance to any other cluster
    const otherClusters = Array.from(new Set(assignments)).filter((c) => c !== cluster);
    let b = Infinity;
    for (const oc of otherClusters) {
      const ocMembers = data.filter((_, j) => assignments[j] === oc);
      if (ocMembers.length > 0) {
        const avgDist = ocMembers.reduce((s, p) => s + euclideanDistance(data[i], p), 0) / ocMembers.length;
        if (avgDist < b) b = avgDist;
      }
    }
    if (b === Infinity) b = 0;

    const s = Math.max(a, b) > 0 ? (b - a) / Math.max(a, b) : 0;
    totalS += s;
  }

  return totalS / data.length;
}
