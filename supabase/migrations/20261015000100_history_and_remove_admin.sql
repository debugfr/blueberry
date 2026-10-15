alter table public.profiles
  add column if not exists history_enabled boolean not null default true;

alter table public.profiles
  drop column if exists banned_at,
  drop column if exists ban_reason;

grant update (display_name, history_enabled) on public.profiles to authenticated;

create table if not exists public.browser_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  url text not null check (length(url) <= 4096),
  title text not null default '',
  visited_at timestamptz not null default now()
);

create index if not exists browser_history_user_visited_idx
  on public.browser_history (user_id, visited_at desc);

alter table public.browser_history enable row level security;
revoke all on public.browser_history from anon, authenticated;
grant select, insert, delete on public.browser_history to authenticated;
grant all on public.browser_history to service_role;

drop policy if exists "Users can read their own browser history" on public.browser_history;
create policy "Users can read their own browser history"
  on public.browser_history for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can record their own browser history" on public.browser_history;
create policy "Users can record their own browser history"
  on public.browser_history for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can clear their own browser history" on public.browser_history;
create policy "Users can clear their own browser history"
  on public.browser_history for delete to authenticated
  using (user_id = (select auth.uid()));

drop table if exists public.moderation_events;
drop table if exists public.admin_users;