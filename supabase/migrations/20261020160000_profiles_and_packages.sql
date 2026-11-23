create table public.profiles (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create index profiles_user_id_idx on public.profiles (user_id);

create table public.packages (
  id text primary key default gen_random_uuid()::text,
  profile_id text not null references public.profiles (id) on delete cascade,
  courier text not null check (courier in ('blue-express', 'chilexpress', 'correos-chile', '17track')),
  tracking_number text not null check (char_length(trim(tracking_number)) between 1 and 160),
  alias text not null check (char_length(trim(alias)) between 1 and 120),
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index packages_profile_id_idx on public.packages (profile_id);

alter table public.profiles enable row level security;
alter table public.packages enable row level security;

create policy "Users can read their own profiles"
  on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own profiles"
  on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own profiles"
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own profiles"
  on public.profiles for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can read packages in their own profiles"
  on public.packages for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = packages.profile_id
        and profiles.user_id = (select auth.uid())
    )
  );

create policy "Users can create packages in their own profiles"
  on public.packages for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = packages.profile_id
        and profiles.user_id = (select auth.uid())
    )
  );

create policy "Users can update packages in their own profiles"
  on public.packages for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = packages.profile_id
        and profiles.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = packages.profile_id
        and profiles.user_id = (select auth.uid())
    )
  );

create policy "Users can delete packages in their own profiles"
  on public.packages for delete to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = packages.profile_id
        and profiles.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.packages to authenticated;
