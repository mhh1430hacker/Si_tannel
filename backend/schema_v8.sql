-- Ainex Qudrat Lab V8: Cognitive Mirror Architecture Schema Extension
-- Adds: mastery nodes, edges, session nudges, psychometric telemetry

-- Mastery Constellation: Nodes represent skill sub-areas
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

-- Mastery Constellation: Edges connect related skill nodes
CREATE TABLE mastery_edges (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    source_node_id INT REFERENCES mastery_nodes(id) ON DELETE CASCADE,
    target_node_id INT REFERENCES mastery_nodes(id) ON DELETE CASCADE,
    weight FLOAT DEFAULT 0.5 CHECK (weight >= 0.0 AND weight <= 1.0),
    UNIQUE(user_id, source_node_id, target_node_id)
);

-- Session Nudge Tracker: Enforces max 2 nudges per session
CREATE TABLE session_nudges (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    nudge_text TEXT NOT NULL,
    nudge_type VARCHAR(50) NOT NULL DEFAULT 'observational',
    delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Psychometric Telemetry: Background-processed behavioral data
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

CREATE INDEX idx_mastery_nodes_user ON mastery_nodes(user_id);
CREATE INDEX idx_mastery_edges_user ON mastery_edges(user_id);
CREATE INDEX idx_session_nudges_session ON session_nudges(session_id);
CREATE INDEX idx_telemetry_session ON answer_telemetry(session_id);
