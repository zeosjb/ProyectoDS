create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  sport text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  venue_id uuid not null references public.venues(id),
  title text not null,
  sport text not null,
  starts_at timestamptz not null,
  capacity integer not null check (capacity between 2 and 100),
  status text not null default 'scheduled' check (status in ('scheduled','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','cancelled')),
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);

alter table public.venues enable row level security;
alter table public.matches enable row level security;
alter table public.registrations enable row level security;

create policy venues_select on public.venues for select using (auth.uid() is not null);
create policy venues_insert on public.venues for insert with check (public.is_admin());
create policy venues_update on public.venues for update using (public.is_admin()) with check (public.is_admin());
create policy venues_delete on public.venues for delete using (public.is_admin());

create policy matches_select on public.matches for select using (auth.uid() is not null);
create policy matches_insert on public.matches for insert with check (auth.uid() = creator_id);
create policy matches_update on public.matches for update using (auth.uid() = creator_id or public.is_admin()) with check (auth.uid() = creator_id or public.is_admin());
create policy matches_delete on public.matches for delete using (auth.uid() = creator_id or public.is_admin());

create policy registrations_select on public.registrations for select using (auth.uid() = user_id or public.is_admin());
create policy registrations_insert on public.registrations for insert with check (auth.uid() = user_id);
create policy registrations_update on public.registrations for update using (auth.uid() = user_id or public.is_admin()) with check (auth.uid() = user_id or public.is_admin());
create policy registrations_delete on public.registrations for delete using (auth.uid() = user_id or public.is_admin());

create or replace function public.join_match_safe(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_capacity integer;
  v_status text;
  v_count integer;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesion para inscribirte.';
  end if;

  select capacity, status into v_capacity, v_status
  from public.matches
  where id = p_match_id
  for update;

  if not found or v_status <> 'scheduled' then
    raise exception 'El partido no esta disponible.';
  end if;

  select count(*) into v_count
  from public.registrations
  where match_id = p_match_id and status = 'active';

  if v_count >= v_capacity then
    raise exception 'El partido esta completo.';
  end if;

  insert into public.registrations (match_id, user_id, status)
  values (p_match_id, v_user, 'active')
  on conflict (match_id, user_id) do update set status = 'active'
  where public.registrations.status = 'cancelled';
end;
$$;

grant execute on function public.join_match_safe(uuid) to authenticated;
