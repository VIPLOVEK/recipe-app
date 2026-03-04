-- Run this in your Supabase SQL Editor

create table if not exists recipes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null default 'Other',
  ingredients text[] default '{}',
  steps text[] default '{}',
  source_url text,
  notes text,
  image_url text,
  servings text,
  cook_time text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (open read/write for now — add auth later if needed)
alter table recipes enable row level security;

create policy "Allow all" on recipes for all using (true) with check (true);

-- Full text search index
create index recipes_title_idx on recipes using gin(to_tsvector('english', title));

-- ── Meal Plans ───────────────────────────────────────────────────────────────
-- Run this in your Supabase SQL Editor to enable the Meal Planner feature

create table if not exists meal_plans (
  id          uuid        primary key default gen_random_uuid(),
  week_start  date        unique not null,  -- always a Sunday (YYYY-MM-DD)
  plan        jsonb       not null default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table meal_plans enable row level security;

create policy "Allow all meal_plans" on meal_plans for all using (true) with check (true);
