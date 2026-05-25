/**
 * In-memory question store for when no database is available.
 * Serves built-in Qudrat questions and tracks session answers in memory.
 * Sessions are ephemeral (lost on serverless cold start), which is acceptable
 * for the no-DB mode — users get a working experience immediately.
 */

import { QUDRAT_SECTIONS } from "@/data/qudrat-questions";

interface MemQuestion {
  id: number;
  content: string;
  skill_category: string;
  difficulty: string;
  expected_time_seconds: number;
  image_url: string | null;
  choices: MemChoice[];
}

interface MemChoice {
  id: number;
  choice_text: string;
  is_correct: boolean;
  image_url: string | null;
}

interface SessionAnswer {
  question_id: number;
  chosen_choice_id: number;
  is_correct: boolean;
  time_taken_seconds: number;
}

// Build question bank from built-in data
const allQuestions: MemQuestion[] = [];
let nextId = 1;
let nextChoiceId = 1;

for (const section of QUDRAT_SECTIONS) {
  for (const q of section.questions) {
    const questionId = nextId++;
    const choices: MemChoice[] = q.choices.map((text, i) => ({
      id: nextChoiceId++,
      choice_text: text,
      is_correct: i === q.correct_index,
      image_url: null,
    }));
    allQuestions.push({
      id: questionId,
      content: q.text,
      skill_category: section.section_name,
      difficulty: "متوسط",
      expected_time_seconds: 60,
      image_url: q.image_url || null,
      choices,
    });
  }
}

// Session tracking (ephemeral — lost on cold start)
const sessionAnswers = new Map<string, SessionAnswer[]>();

export function getCategories(): string[] {
  const cats = new Set<string>();
  for (const q of allQuestions) {
    cats.add(q.skill_category);
  }
  return Array.from(cats).sort();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getFirstQuestion(category: string): MemQuestion | null {
  const candidates = allQuestions.filter((q) => q.skill_category === category);
  if (candidates.length === 0) return null;
  return shuffle(candidates)[0];
}

export function getQuestionById(id: number): MemQuestion | null {
  return allQuestions.find((q) => q.id === id) || null;
}

export function getChoiceById(choiceId: number): MemChoice | null {
  for (const q of allQuestions) {
    const c = q.choices.find((ch) => ch.id === choiceId);
    if (c) return c;
  }
  return null;
}

export function submitAnswer(
  sessionId: string,
  questionId: number,
  chosenChoiceId: number,
  timeTakenSeconds: number
): { is_correct: boolean; correct_choice_id: number } | null {
  const question = getQuestionById(questionId);
  if (!question) return null;

  const choice = question.choices.find((c) => c.id === chosenChoiceId);
  if (!choice) return null;

  const correctChoice = question.choices.find((c) => c.is_correct);
  const isCorrect = choice.is_correct;

  if (!sessionAnswers.has(sessionId)) {
    sessionAnswers.set(sessionId, []);
  }
  sessionAnswers.get(sessionId)!.push({
    question_id: questionId,
    chosen_choice_id: chosenChoiceId,
    is_correct: isCorrect,
    time_taken_seconds: timeTakenSeconds,
  });

  return {
    is_correct: isCorrect,
    correct_choice_id: correctChoice?.id || chosenChoiceId,
  };
}

export function getNextQuestion(
  sessionId: string,
  currentCategory: string,
  currentDifficulty: string,
  isCorrect: boolean
): MemQuestion | null {
  const answered = sessionAnswers.get(sessionId) || [];
  const answeredIds = new Set(answered.map((a) => a.question_id));

  const candidates = allQuestions.filter(
    (q) => q.skill_category === currentCategory && !answeredIds.has(q.id)
  );

  if (candidates.length === 0) return null;
  return shuffle(candidates)[0];
}

export function getSessionSummary(sessionId: string): {
  session_id: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  accuracy_percentage: number;
  total_time_seconds: number;
} | null {
  const answers = sessionAnswers.get(sessionId);
  if (!answers || answers.length === 0) return null;

  const correct = answers.filter((a) => a.is_correct).length;
  const total = answers.length;
  const totalTime = answers.reduce((sum, a) => sum + a.time_taken_seconds, 0);

  return {
    session_id: sessionId,
    total_questions: total,
    correct_count: correct,
    incorrect_count: total - correct,
    accuracy_percentage: Math.round((correct / total) * 100),
    total_time_seconds: totalTime,
  };
}

export function stripCorrectFlag(q: MemQuestion) {
  return {
    id: q.id,
    content: q.content,
    skill_category: q.skill_category,
    difficulty: q.difficulty,
    expected_time_seconds: q.expected_time_seconds,
    image_url: q.image_url,
    choices: q.choices.map((c) => ({
      id: c.id,
      choice_text: c.choice_text,
      image_url: c.image_url,
    })),
  };
}
