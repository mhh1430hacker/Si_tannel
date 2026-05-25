/**
 * Database access layer with graceful fallback.
 * When POSTGRES_URL is not set, `hasDatabase` is false and
 * callers should use the in-memory question store instead.
 */

const hasPostgres = !!(
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING
);

let sqlFn: typeof import("@vercel/postgres").sql | null = null;

if (hasPostgres) {
  try {
    // Dynamic import so the module isn't evaluated (and doesn't throw)
    // when the env var is missing.
    const pg = require("@vercel/postgres");
    sqlFn = pg.sql;
  } catch {
    // library not available — stay in fallback mode
  }
}

export const hasDatabase = hasPostgres && sqlFn !== null;

/**
 * Tagged-template SQL function.
 * Throws if called when no database is configured — callers must
 * check `hasDatabase` first.
 */
export function sql(strings: TemplateStringsArray, ...values: any[]) {
  if (!sqlFn) {
    throw new Error("Database not configured (POSTGRES_URL missing)");
  }
  return sqlFn(strings, ...values);
}

export async function initializeDatabase() {
  if (!hasDatabase) {
    throw new Error("Database not configured");
  }

  await sql`
    DO $$ BEGIN
      CREATE TYPE q_difficulty AS ENUM ('سهل', 'متوسط', 'صعب');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      skill_category VARCHAR(100) NOT NULL,
      difficulty q_difficulty NOT NULL,
      expected_time_seconds INT NOT NULL,
      image_url TEXT,
      form_import_id INT,
      form_question_id VARCHAR(50)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS question_choices (
      id SERIAL PRIMARY KEY,
      question_id INT REFERENCES questions(id) ON DELETE CASCADE,
      choice_text TEXT NOT NULL,
      is_correct BOOLEAN DEFAULT FALSE,
      image_url TEXT
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_answers (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      session_id UUID NOT NULL,
      question_id INT REFERENCES questions(id),
      chosen_choice_id INT REFERENCES question_choices(id),
      time_taken_seconds INT NOT NULL,
      is_correct BOOLEAN NOT NULL,
      answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_answers_session ON user_answers(session_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS form_imports (
      id SERIAL PRIMARY KEY,
      form_url TEXT NOT NULL UNIQUE,
      form_title VARCHAR(500),
      skill_category VARCHAR(100) NOT NULL,
      difficulty q_difficulty NOT NULL DEFAULT 'متوسط',
      questions_imported INT DEFAULT 0,
      imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS mastery_nodes (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      skill_category VARCHAR(100) NOT NULL,
      sub_skill VARCHAR(150) NOT NULL,
      mastery_level FLOAT DEFAULT 0.0,
      total_attempts INT DEFAULT 0,
      correct_attempts INT DEFAULT 0,
      last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, skill_category, sub_skill)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS mastery_edges (
      id SERIAL PRIMARY KEY,
      user_id UUID NOT NULL,
      source_node_id INT REFERENCES mastery_nodes(id) ON DELETE CASCADE,
      target_node_id INT REFERENCES mastery_nodes(id) ON DELETE CASCADE,
      weight FLOAT DEFAULT 0.5,
      UNIQUE(user_id, source_node_id, target_node_id)
    );
  `;
}
