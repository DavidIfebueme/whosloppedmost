-- whosloppedmost core tables.
-- locked down with rls and no public policies.
-- all access goes through the server with the service role key.

create table if not exists public.handles (
  handle text primary key,
  source text not null default 'seed',
  created_at timestamptz not null default now()
);

create table if not exists public.score_cache (
  handle text primary key references public.handles (handle) on delete cascade,
  merged_prs integer not null default 0,
  fetched_at timestamptz not null default now()
);

create table if not exists public.quarantine (
  handle text primary key references public.handles (handle) on delete cascade,
  reason text not null default 'unverified',
  flagged_at timestamptz not null default now()
);

alter table public.handles enable row level security;
alter table public.score_cache enable row level security;
alter table public.quarantine enable row level security;
