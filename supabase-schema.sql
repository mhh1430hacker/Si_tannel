-- Supabase schema for Ainex Qudrat Lab
-- Run this in the Supabase SQL Editor after creating the project

-- Users table (syncs with localStorage profiles)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_color TEXT DEFAULT '#6366f1',
  total_points INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  accuracy REAL DEFAULT 0,
  league TEXT DEFAULT 'bronze',
  streak_current INTEGER DEFAULT 0,
  streak_longest INTEGER DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  learning_style TEXT,
  experience_level TEXT,
  target_score INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard view (auto-ranked)
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  id,
  name,
  avatar_color,
  total_points,
  accuracy,
  league,
  streak_current,
  last_active,
  ROW_NUMBER() OVER (ORDER BY total_points DESC) AS rank
FROM users
WHERE total_points > 0
ORDER BY total_points DESC;

-- Challenge rooms (for real-time peer matching)
CREATE TABLE IF NOT EXISTS challenge_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id TEXT REFERENCES users(id),
  player2_id TEXT REFERENCES users(id),
  status TEXT DEFAULT 'waiting', -- waiting, active, completed
  section TEXT DEFAULT 'both', -- kamy, lafzy, both
  question_count INTEGER DEFAULT 10,
  player1_score INTEGER DEFAULT 0,
  player2_score INTEGER DEFAULT 0,
  player1_answers JSONB DEFAULT '[]',
  player2_answers JSONB DEFAULT '[]',
  questions JSONB DEFAULT '[]',
  current_question INTEGER DEFAULT 0,
  winner_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Challenge history
CREATE TABLE IF NOT EXISTS challenge_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES challenge_rooms(id),
  player_id TEXT REFERENCES users(id),
  opponent_id TEXT,
  opponent_name TEXT,
  player_score INTEGER,
  opponent_score INTEGER,
  won BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rewards / Prizes
CREATE TABLE IF NOT EXISTS rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🎁',
  type TEXT DEFAULT 'coupon', -- coupon, badge, title
  coupon_code TEXT,
  coupon_url TEXT,
  points_required INTEGER DEFAULT 0,
  league_required TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  max_claims INTEGER DEFAULT 100,
  current_claims INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User claimed rewards (prevents duplicate claims)
CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  reward_id UUID REFERENCES rewards(id),
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reward_id)
);

-- Session records (shared for analytics)
CREATE TABLE IF NOT EXISTS session_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  category TEXT,
  total_questions INTEGER,
  correct_count INTEGER,
  total_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crawled questions bank (from web crawling and form imports)
CREATE TABLE IF NOT EXISTS crawled_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  choices JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  section TEXT NOT NULL, -- kamy, lafzy
  difficulty TEXT DEFAULT 'متوسط',
  source_url TEXT,
  explanation TEXT,
  image_url TEXT, -- question image URL (from form imports)
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(text)
);

-- Add image_url column if table already exists (migration)
ALTER TABLE crawled_questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Educational Platform Schema (Profiles, Courses, Lessons, Progress)
CREATE TABLE public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, null)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

CREATE TABLE public.courses (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id),
  title text not null,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE TABLE public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  "order" int not null,
  content jsonb,
  created_at timestamptz not null default now()
);

CREATE TABLE public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'not_started',
  percent int not null default 0,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawled_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

-- Profile Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Courses Policies
CREATE POLICY "Published courses are readable" ON public.courses FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "Authors can read own courses" ON public.courses FOR SELECT TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Authors can insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can update courses" ON public.courses FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can delete courses" ON public.courses FOR DELETE TO authenticated USING (author_id = auth.uid());

-- Lessons Policies
CREATE POLICY "Published lessons are readable" ON public.lessons FOR SELECT TO authenticated USING (exists (select 1 from public.courses c where c.id = lessons.course_id and c.is_published = true));
CREATE POLICY "Authors can manage lessons" ON public.lessons FOR ALL TO authenticated USING (exists (select 1 from public.courses c where c.id = lessons.course_id and c.author_id = auth.uid())) WITH CHECK (exists (select 1 from public.courses c where c.id = lessons.course_id and c.author_id = auth.uid()));

-- Progress Policies
CREATE POLICY "Users can read own progress" ON public.progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own progress" ON public.progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own progress" ON public.progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own progress" ON public.progress FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Policies: allow all operations for anon users (public app, no auth)
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on challenge_rooms" ON challenge_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on challenge_history" ON challenge_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow read on rewards" ON rewards FOR SELECT USING (true);
CREATE POLICY "Allow all on user_rewards" ON user_rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on session_records" ON session_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on crawled_questions" ON crawled_questions FOR ALL USING (true) WITH CHECK (true);

-- Index for fast leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_points ON users(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_rooms_status ON challenge_rooms(status);
CREATE INDEX IF NOT EXISTS idx_challenge_rooms_waiting ON challenge_rooms(status) WHERE status = 'waiting';
CREATE INDEX IF NOT EXISTS idx_crawled_questions_section ON crawled_questions(section);

-- Enable Realtime for challenge rooms
ALTER PUBLICATION supabase_realtime ADD TABLE challenge_rooms;
