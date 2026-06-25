import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
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

CREATE TABLE IF NOT EXISTS challenge_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id TEXT,
  player2_id TEXT,
  status TEXT DEFAULT 'waiting',
  section TEXT DEFAULT 'both',
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

CREATE TABLE IF NOT EXISTS challenge_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID,
  player_id TEXT,
  opponent_id TEXT,
  opponent_name TEXT,
  player_score INTEGER,
  opponent_score INTEGER,
  won BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🎁',
  type TEXT DEFAULT 'coupon',
  coupon_code TEXT,
  coupon_url TEXT,
  points_required INTEGER DEFAULT 0,
  league_required TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  max_claims INTEGER DEFAULT 100,
  current_claims INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  reward_id UUID,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, reward_id)
);

CREATE TABLE IF NOT EXISTS session_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  category TEXT,
  total_questions INTEGER,
  correct_count INTEGER,
  total_time_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crawled_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL UNIQUE,
  choices JSONB NOT NULL,
  correct_index INTEGER NOT NULL,
  section TEXT NOT NULL,
  difficulty TEXT DEFAULT 'متوسط',
  source_url TEXT,
  explanation TEXT,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Educational Platform Schema
CREATE TABLE IF NOT EXISTS public.profiles (
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

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id),
  title text not null,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  "order" int not null,
  content jsonb,
  created_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status text not null default 'not_started',
  percent int not null default 0,
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Published courses are readable" ON public.courses FOR SELECT TO authenticated USING (is_published = true);
CREATE POLICY "Authors can read own courses" ON public.courses FOR SELECT TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Authors can insert courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can update courses" ON public.courses FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can delete courses" ON public.courses FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE POLICY "Published lessons are readable" ON public.lessons FOR SELECT TO authenticated USING (exists (select 1 from public.courses c where c.id = lessons.course_id and c.is_published = true));
CREATE POLICY "Authors can manage lessons" ON public.lessons FOR ALL TO authenticated USING (exists (select 1 from public.courses c where c.id = lessons.course_id and c.author_id = auth.uid())) WITH CHECK (exists (select 1 from public.courses c where c.id = lessons.course_id and c.author_id = auth.uid()));

CREATE POLICY "Users can read own progress" ON public.progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can upsert own progress" ON public.progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own progress" ON public.progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own progress" ON public.progress FOR DELETE TO authenticated USING (user_id = auth.uid());
`;

export async function POST() {
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    // Execute schema SQL statements one by one
    const statements = SCHEMA_SQL.split(";").filter((s) => s.trim().length > 5);
    const errors: string[] = [];

    for (const stmt of statements) {
      const { error } = await supabase.rpc("exec_sql", { sql: stmt.trim() + ";" }).maybeSingle();
      if (error && !error.message.includes("already exists")) {
        errors.push(error.message);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        status: "partial",
        message: "بعض الجداول قد تحتاج إنشاء يدوي عبر Supabase SQL Editor",
        errors,
        hint: "انسخ محتوى supabase-schema.sql وشغّله في Supabase SQL Editor",
      });
    }

    return NextResponse.json({ status: "ok", message: "تم إنشاء جداول قاعدة البيانات بنجاح" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      status: "error",
      message: msg,
      hint: "انسخ محتوى supabase-schema.sql وشغّله في Supabase SQL Editor",
    }, { status: 500 });
  }
}

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ status: "not_configured", message: "Supabase غير مربوط" });
  }

  // Check if tables exist
  const { data, error } = await supabase.from("users").select("id").limit(1);
  if (error) {
    return NextResponse.json({
      status: "needs_setup",
      message: "الجداول غير موجودة — شغّل supabase-schema.sql في Supabase SQL Editor",
    });
  }

  return NextResponse.json({ status: "ok", message: "Supabase جاهز", user_count: data?.length ?? 0 });
}
