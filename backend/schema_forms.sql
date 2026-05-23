-- Schema additions for Google Form import functionality

-- Track imported forms
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

-- Add form source tracking to questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS form_import_id INT REFERENCES form_imports(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS form_question_id VARCHAR(50);

-- Add image support to choices
ALTER TABLE question_choices ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Index for form-sourced questions
CREATE INDEX IF NOT EXISTS idx_questions_form_import ON questions(form_import_id);
