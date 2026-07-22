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

grant execute on function public.create_match_with_venue(text, text, text, timestamptz, integer) to authenticated;
grant execute on function public.update_match_with_venue(uuid, text, text, text, timestamptz, integer) to authenticated;
