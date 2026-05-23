-- Ainex Qudrat Lab V8: Cognitive Mirror Architecture
-- Full production schema supporting Phase 1-3

CREATE TYPE q_difficulty AS ENUM ('سهل', 'متوسط', 'صعب');

-- Form Import Tracking
CREATE TABLE form_imports (
    id SERIAL PRIMARY KEY,
    form_url TEXT NOT NULL UNIQUE,
    form_title VARCHAR(500),
    skill_category VARCHAR(100) NOT NULL,
    difficulty q_difficulty NOT NULL DEFAULT 'متوسط',
    questions_imported INT DEFAULT 0,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Core Test Engine Tables
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    skill_category VARCHAR(100) NOT NULL,
    difficulty q_difficulty NOT NULL,
    expected_time_seconds INT NOT NULL,
    image_url TEXT,
    form_import_id INT REFERENCES form_imports(id) ON DELETE SET NULL,
    form_question_id VARCHAR(50)
);

CREATE TABLE question_choices (
    id SERIAL PRIMARY KEY,
    question_id INT REFERENCES questions(id) ON DELETE CASCADE,
    choice_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    image_url TEXT
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

-- V8: Mastery Constellation Tables
CREATE TABLE mastery_nodes (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    skill_category VARCHAR(100) NOT NULL,
    sub_skill VARCHAR(150) NOT NULL,
    mastery_level FLOAT DEFAULT 0.0 CHECK (mastery_level >= 0.0 AND mastery_level <= 1.0),
    total_attempts INT DEFAULT 0,
    correct_attempts INT DEFAULT 0,
    last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, skill_category, sub_skill)
);

CREATE TABLE mastery_edges (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    source_node_id INT REFERENCES mastery_nodes(id) ON DELETE CASCADE,
    target_node_id INT REFERENCES mastery_nodes(id) ON DELETE CASCADE,
    weight FLOAT DEFAULT 0.5 CHECK (weight >= 0.0 AND weight <= 1.0),
    UNIQUE(user_id, source_node_id, target_node_id)
);

-- V8: NudgeLimiter Session Tracking
CREATE TABLE session_nudges (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    nudge_text TEXT NOT NULL,
    nudge_type VARCHAR(50) NOT NULL DEFAULT 'observational',
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- V8: Shadow Engine Telemetry
CREATE TABLE answer_telemetry (
    id SERIAL PRIMARY KEY,
    user_answer_id INT REFERENCES user_answers(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    response_velocity FLOAT,
    time_deviation_from_expected FLOAT,
    difficulty_at_time VARCHAR(10),
    streak_count INT DEFAULT 0,
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX idx_answers_session ON user_answers(session_id);
CREATE INDEX idx_answers_user ON user_answers(user_id);
CREATE INDEX idx_questions_category_difficulty ON questions(skill_category, difficulty);
CREATE INDEX idx_questions_form_import ON questions(form_import_id);
CREATE INDEX idx_mastery_nodes_user ON mastery_nodes(user_id);
CREATE INDEX idx_mastery_edges_user ON mastery_edges(user_id);
CREATE INDEX idx_session_nudges_session ON session_nudges(session_id);
CREATE INDEX idx_telemetry_session ON answer_telemetry(session_id);
