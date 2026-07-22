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
