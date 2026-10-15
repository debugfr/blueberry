create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  banned_at timestamptz,
  ban_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant all on public.profiles to service_role;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can update their own display name" on public.profiles;
create policy "Users can update their own display name"
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.handle_new_blueberry_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_blueberry on auth.users;
create trigger on_auth_user_created_blueberry
  after insert on auth.users
  for each row execute function public.handle_new_blueberry_user();

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;
grant all on public.admin_users to service_role;

create table if not exists public.moderation_events (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  target_email text not null,
  action text not null check (action in ('warn', 'ban', 'unban', 'delete')),
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.moderation_events enable row level security;
revoke all on public.moderation_events from anon, authenticated;
grant select on public.moderation_events to authenticated;
grant all on public.moderation_events to service_role;

drop policy if exists "Users can read their own warnings" on public.moderation_events;
create policy "Users can read their own warnings"
  on public.moderation_events for select to authenticated
  using (
    target_user_id = (select auth.uid())
    and action = 'warn'
  );