-- Ainex Qudrat Lab: Phase 1 Production Schema
-- Supports Phase 2 (telemetry, redis cache) and Phase 3 (graph analytics) without migrations

CREATE TYPE q_difficulty AS ENUM ('سهل', 'متوسط', 'صعب');

CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    skill_category VARCHAR(100) NOT NULL,
    difficulty q_difficulty NOT NULL,
    expected_time_seconds INT NOT NULL
);

CREATE TABLE question_choices (
    id SERIAL PRIMARY KEY,
    question_id INT REFERENCES questions(id) ON DELETE CASCADE,
    choice_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE
);

CREATE TABLE user_answers (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    session_id UUID NOT NULL,
    question_id INT REFERENCES questions(id),
    chosen_choice_id INT REFERENCES question_choices(id),
    time_taken_seconds INT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_answers_session ON user_answers(session_id);
CREATE INDEX idx_answers_user ON user_answers(user_id);
CREATE INDEX idx_questions_category_difficulty ON questions(skill_category, difficulty);
