-- Ainex Qudrat Lab: Seed Data for Phase 1 Testing
-- Categories: الجبر (Algebra), الهندسة (Geometry), استيعاب المقروء (Reading Comprehension)

-- === الجبر (Algebra) ===

-- Easy
INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('ما ناتج: 3 + 5 × 2 ؟', 'الجبر', 'سهل', 30);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(1, '16', FALSE),
(1, '13', TRUE),
(1, '10', FALSE),
(1, '11', FALSE);

INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('حل المعادلة: x + 7 = 12', 'الجبر', 'سهل', 30);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(2, 'x = 5', TRUE),
(2, 'x = 7', FALSE),
(2, 'x = 19', FALSE),
(2, 'x = 4', FALSE);

-- Medium
INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('حل المعادلة: 2x - 4 = 10', 'الجبر', 'متوسط', 45);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(3, 'x = 7', TRUE),
(3, 'x = 3', FALSE),
(3, 'x = 5', FALSE),
(3, 'x = 14', FALSE);

INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('ما قيمة x في: 3x + 6 = 21 ؟', 'الجبر', 'متوسط', 45);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(4, 'x = 5', TRUE),
(4, 'x = 9', FALSE),
(4, 'x = 7', FALSE),
(4, 'x = 3', FALSE);

-- Hard
INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('حل المعادلة التربيعية: x² - 5x + 6 = 0', 'الجبر', 'صعب', 60);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(5, 'x = 2, x = 3', TRUE),
(5, 'x = 1, x = 6', FALSE),
(5, 'x = -2, x = -3', FALSE),
(5, 'x = 5, x = 1', FALSE);

INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('إذا كان f(x) = x² + 3x - 10، ما هي قيم x التي تجعل f(x) = 0 ؟', 'الجبر', 'صعب', 60);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(6, 'x = 2, x = -5', TRUE),
(6, 'x = 5, x = -2', FALSE),
(6, 'x = 10, x = -1', FALSE),
(6, 'x = -10, x = 1', FALSE);

-- === الهندسة (Geometry) ===

-- Easy
INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('ما مساحة مربع طول ضلعه 4 سم ؟', 'الهندسة', 'سهل', 25);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(7, '16 سم²', TRUE),
(7, '8 سم²', FALSE),
(7, '12 سم²', FALSE),
(7, '20 سم²', FALSE);

INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('ما محيط مستطيل طوله 6 سم وعرضه 4 سم ؟', 'الهندسة', 'سهل', 25);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(8, '20 سم', TRUE),
(8, '24 سم', FALSE),
(8, '10 سم', FALSE),
(8, '14 سم', FALSE);

-- Medium
INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('ما مساحة دائرة نصف قطرها 7 سم ؟ (π ≈ 22/7)', 'الهندسة', 'متوسط', 40);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(9, '154 سم²', TRUE),
(9, '44 سم²', FALSE),
(9, '88 سم²', FALSE),
(9, '196 سم²', FALSE);

INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('مثلث قائم الزاوية، طول ضلعيه القائمين 3 و 4. ما طول الوتر ؟', 'الهندسة', 'متوسط', 40);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(10, '5', TRUE),
(10, '7', FALSE),
(10, '6', FALSE),
(10, '12', FALSE);

-- Hard
INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('ما حجم كرة نصف قطرها 3 سم ؟ (π ≈ 3.14)', 'الهندسة', 'صعب', 60);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(11, '113.04 سم³', TRUE),
(11, '84.78 سم³', FALSE),
(11, '28.26 سم³', FALSE),
(11, '150.72 سم³', FALSE);

-- === استيعاب المقروء (Reading Comprehension) ===

-- Easy
INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('النص: "ذهب أحمد إلى المكتبة واستعار كتاباً عن الفضاء." — ماذا فعل أحمد ؟', 'استيعاب المقروء', 'سهل', 20);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(12, 'استعار كتاباً من المكتبة', TRUE),
(12, 'اشترى كتاباً', FALSE),
(12, 'ذهب إلى المدرسة', FALSE),
(12, 'كتب قصة', FALSE);

INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('النص: "الشمس تشرق من الشرق وتغرب في الغرب." — من أين تشرق الشمس ؟', 'استيعاب المقروء', 'سهل', 20);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(13, 'من الشرق', TRUE),
(13, 'من الغرب', FALSE),
(13, 'من الشمال', FALSE),
(13, 'من الجنوب', FALSE);

-- Medium
INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('النص: "يُعد التلوث البيئي من أخطر المشكلات التي تواجه العالم، إذ يؤثر سلباً على صحة الإنسان والحيوان." — ما الفكرة الرئيسية ؟', 'استيعاب المقروء', 'متوسط', 45);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(14, 'خطورة التلوث البيئي على الكائنات الحية', TRUE),
(14, 'فوائد البيئة النظيفة', FALSE),
(14, 'طرق مكافحة التلوث', FALSE),
(14, 'أنواع الحيوانات المهددة', FALSE);

-- Hard
INSERT INTO questions (content, skill_category, difficulty, expected_time_seconds)
VALUES ('النص: "لا يمكن فصل التقدم العلمي عن التطور الأخلاقي للمجتمعات؛ فالعلم بلا ضمير هدم لا بناء." — ما الذي يستنتجه الكاتب ؟', 'استيعاب المقروء', 'صعب', 60);
INSERT INTO question_choices (question_id, choice_text, is_correct) VALUES
(15, 'العلم يحتاج إلى أخلاق ليكون نافعاً', TRUE),
(15, 'التقدم العلمي مستقل عن الأخلاق', FALSE),
(15, 'المجتمعات لا تحتاج للعلم', FALSE),
(15, 'الضمير يعيق التطور', FALSE);
