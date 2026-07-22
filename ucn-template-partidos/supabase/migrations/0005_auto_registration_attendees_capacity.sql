create or replace function public.create_match_with_venue(
  p_title text,
  p_sport text,
  p_venue_name text,
  p_starts_at timestamptz,
  p_capacity integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_venue_id uuid;
  v_match_id uuid;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesion.';
  end if;

  if p_capacity < 2 or p_capacity > 100 then
    raise exception 'El cupo debe estar entre 2 y 100.';
  end if;

  if p_starts_at < now() then
    raise exception 'La fecha y hora no puede ser anterior a la actual.';
  end if;

  select id into v_venue_id
  from public.venues
  where lower(name) = lower(trim(p_venue_name))
    and lower(sport) = lower(trim(p_sport))
  order by created_at asc
  limit 1;

  if v_venue_id is null then
    insert into public.venues (name, address, sport, is_active)
    values (trim(p_venue_name), 'Por definir', trim(p_sport), true)
    returning id into v_venue_id;
  end if;

  insert into public.matches (creator_id, title, sport, venue_id, starts_at, capacity, status)
  values (v_user, trim(p_title), trim(p_sport), v_venue_id, p_starts_at, p_capacity, 'scheduled')
  returning id into v_match_id;

  insert into public.registrations (match_id, user_id, status)
  values (v_match_id, v_user, 'active')
  on conflict (match_id, user_id) do update set status = 'active';

  return v_match_id;
end;
$$;

create or replace function public.update_match_with_venue(
  p_match_id uuid,
  p_title text,
  p_sport text,
  p_venue_name text,
  p_starts_at timestamptz,
  p_capacity integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_venue_id uuid;
  v_active_registrations integer;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesion.';
  end if;

  if p_capacity < 2 or p_capacity > 100 then
    raise exception 'El cupo debe estar entre 2 y 100.';
  end if;

  if p_starts_at < now() then
    raise exception 'La fecha y hora no puede ser anterior a la actual.';
  end if;

  select count(*) into v_active_registrations
  from public.registrations
  where match_id = p_match_id
    and status = 'active';

  if p_capacity < v_active_registrations then
    raise exception 'No puedes dejar menos cupos que inscritos activos.';
  end if;

  select id into v_venue_id
  from public.venues
  where lower(name) = lower(trim(p_venue_name))
    and lower(sport) = lower(trim(p_sport))
  order by created_at asc
  limit 1;

  if v_venue_id is null then
    insert into public.venues (name, address, sport, is_active)
    values (trim(p_venue_name), 'Por definir', trim(p_sport), true)
    returning id into v_venue_id;
  end if;

  update public.matches
  set
    title = trim(p_title),
    sport = trim(p_sport),
    venue_id = v_venue_id,
    starts_at = p_starts_at,
    capacity = p_capacity,
    updated_at = now()
  where id = p_match_id
    and (creator_id = v_user or public.is_admin());

  if not found then
    raise exception 'No pudimos actualizar el partido.';
  end if;
end;
$$;

create or replace function public.get_match_attendees(p_match_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_can_view boolean;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesion.';
  end if;

  select exists (
    select 1
    from public.matches
    where id = p_match_id
      and (creator_id = v_user or public.is_admin())
  ) into v_can_view;

  if not v_can_view then
    raise exception 'No puedes ver los inscritos de este partido.';
  end if;

  return query
  select
    profiles.id as user_id,
    coalesce(nullif(profiles.full_name, ''), profiles.email) as full_name,
    profiles.email
  from public.registrations
  join public.profiles on profiles.id = registrations.user_id
  where registrations.match_id = p_match_id
    and registrations.status = 'active'
  order by registrations.created_at asc;
end;
$$;

create or replace function public.get_active_registration_counts()
returns table (
  match_id uuid,
  registered integer
)
language sql
security definer
set search_path = public
stable
as $$
  select
    registrations.match_id,
    count(*)::integer as registered
  from public.registrations
  join public.matches on matches.id = registrations.match_id
  where registrations.status = 'active'
    and auth.uid() is not null
  group by registrations.match_id;
$$;

grant execute on function public.create_match_with_venue(text, text, text, timestamptz, integer) to authenticated;
grant execute on function public.update_match_with_venue(uuid, text, text, text, timestamptz, integer) to authenticated;
grant execute on function public.get_match_attendees(uuid) to authenticated;
grant execute on function public.get_active_registration_counts() to authenticated;
