create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('user', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'game_difficulty') then
    create type public.game_difficulty as enum ('easy', 'medium', 'hard');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
for delete using (public.is_admin());

revoke update (role) on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant insert (id, email, full_name, avatar_url) on public.profiles to authenticated;
grant update (full_name, avatar_url, updated_at) on public.profiles to authenticated;

create table if not exists public.game_themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  is_active boolean not null default true,
  owner_id uuid references public.profiles(id) on delete set null
);

alter table public.game_themes add column if not exists owner_id uuid references public.profiles(id) on delete set null;

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid not null references public.game_themes(id) on delete cascade,
  pair_key text not null,
  label text not null,
  image_path text
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  theme_id uuid not null references public.game_themes(id),
  difficulty public.game_difficulty not null,
  moves integer not null check (moves > 0),
  duration_seconds integer not null check (duration_seconds > 0),
  pairs_found integer not null check (pairs_found > 0),
  score integer not null check (score >= 0),
  created_at timestamptz not null default now()
);

alter table public.game_themes enable row level security;
alter table public.cards enable row level security;
alter table public.game_sessions enable row level security;

drop policy if exists game_themes_select on public.game_themes;
create policy game_themes_select on public.game_themes
for select
using (auth.uid() is not null and is_active = true);

drop policy if exists game_themes_insert on public.game_themes;
create policy game_themes_insert on public.game_themes
for insert
with check (public.is_admin() or (auth.uid() is not null and owner_id = auth.uid()));

drop policy if exists game_themes_update on public.game_themes;
create policy game_themes_update on public.game_themes
for update
using (public.is_admin() or owner_id = auth.uid())
with check (public.is_admin() or owner_id = auth.uid());

drop policy if exists game_themes_delete on public.game_themes;
create policy game_themes_delete on public.game_themes
for delete
using (public.is_admin() or owner_id = auth.uid());

drop policy if exists cards_select on public.cards;
create policy cards_select on public.cards
for select
using (auth.uid() is not null);

drop policy if exists cards_insert on public.cards;
create policy cards_insert on public.cards
for insert
with check (
  public.is_admin()
  or exists (
    select 1
    from public.game_themes t
    where t.id = theme_id
      and t.owner_id = auth.uid()
  )
);

drop policy if exists cards_update on public.cards;
create policy cards_update on public.cards
for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.game_themes t
    where t.id = theme_id
      and t.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.game_themes t
    where t.id = theme_id
      and t.owner_id = auth.uid()
  )
);

drop policy if exists cards_delete on public.cards;
create policy cards_delete on public.cards
for delete
using (
  public.is_admin()
  or exists (
    select 1
    from public.game_themes t
    where t.id = theme_id
      and t.owner_id = auth.uid()
  )
);

drop policy if exists game_sessions_select on public.game_sessions;
create policy game_sessions_select on public.game_sessions
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists game_sessions_insert on public.game_sessions;
create policy game_sessions_insert on public.game_sessions
for insert
with check (user_id = auth.uid());

drop policy if exists game_sessions_update on public.game_sessions;
create policy game_sessions_update on public.game_sessions
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists game_sessions_delete on public.game_sessions;
create policy game_sessions_delete on public.game_sessions
for delete
using (user_id = auth.uid() or public.is_admin());

create or replace function public.save_game_session_safe(
  p_theme_id uuid,
  p_difficulty public.game_difficulty,
  p_moves integer,
  p_duration_seconds integer,
  p_pairs_found integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_required_pairs integer;
  v_score integer;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesion para guardar el resultado.';
  end if;

  v_required_pairs := case p_difficulty when 'easy' then 6 when 'medium' then 8 else 10 end;
  if p_pairs_found <> v_required_pairs or p_moves < v_required_pairs or p_duration_seconds <= 0 then
    raise exception 'El resultado no supera la validacion minima.';
  end if;

  v_score := greatest(0, (v_required_pairs * 1000) - (p_moves * 15) - (p_duration_seconds * 5));
  insert into public.game_sessions (user_id, theme_id, difficulty, moves, duration_seconds, pairs_found, score)
  values (v_user, p_theme_id, p_difficulty, p_moves, p_duration_seconds, p_pairs_found, v_score);
  return v_score;
end;
$$;

grant execute on function public.save_game_session_safe(uuid, public.game_difficulty, integer, integer, integer) to authenticated;

create or replace function public.get_game_ranking()
returns table (
  player_name text,
  score integer,
  difficulty public.game_difficulty,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(nullif(p.full_name, ''), 'Jugador') as player_name,
    s.score,
    s.difficulty,
    s.created_at
  from public.game_sessions s
  join public.profiles p on p.id = s.user_id
  where auth.uid() is not null
  order by s.score desc, s.created_at asc
  limit 20;
$$;

grant execute on function public.get_game_ranking() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('card-images', 'card-images', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists card_images_read on storage.objects;
create policy card_images_read on storage.objects
for select
using (bucket_id = 'card-images');

drop policy if exists card_images_insert on storage.objects;
create policy card_images_insert on storage.objects
for insert
with check (bucket_id = 'card-images' and public.is_admin());

drop policy if exists card_images_update on storage.objects;
create policy card_images_update on storage.objects
for update
using (bucket_id = 'card-images' and public.is_admin())
with check (bucket_id = 'card-images' and public.is_admin());

drop policy if exists card_images_delete on storage.objects;
create policy card_images_delete on storage.objects
for delete
using (bucket_id = 'card-images' and public.is_admin());

insert into public.game_themes (name, description) values
('Conceptos de software', 'Pares de terminos para practicar diseno de software.'),
('Base de datos', 'Pares sobre tablas, llaves y relaciones.')
on conflict do nothing;

do $$
declare
  v_software uuid;
  v_database uuid;
begin
  select id into v_software from public.game_themes where name = 'Conceptos de software' limit 1;
  select id into v_database from public.game_themes where name = 'Base de datos' limit 1;

  if v_software is not null then
    insert into public.cards (theme_id, pair_key, label)
    select v_software, pair_key, label
    from (values
      ('rls', 'RLS'), ('auth', 'Auth'), ('ui', 'UI'), ('zod', 'Zod'), ('sql', 'SQL'),
      ('build', 'Build'), ('router', 'Router'), ('server', 'Server'), ('client', 'Client'), ('tests', 'Tests')
    ) as source(pair_key, label)
    where not exists (
      select 1 from public.cards c where c.theme_id = v_software and c.pair_key = source.pair_key
    );
  end if;

  if v_database is not null then
    insert into public.cards (theme_id, pair_key, label)
    select v_database, pair_key, label
    from (values
      ('tabla', 'Tabla'), ('fila', 'Fila'), ('llave', 'Llave'), ('indice', 'Indice'), ('vista', 'Vista'),
      ('rol', 'Rol'), ('schema', 'Schema'), ('trigger', 'Trigger'), ('rpc', 'RPC'), ('backup', 'Backup')
    ) as source(pair_key, label)
    where not exists (
      select 1 from public.cards c where c.theme_id = v_database and c.pair_key = source.pair_key
    );
  end if;
end $$;
