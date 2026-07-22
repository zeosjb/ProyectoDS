create or replace function public.create_board_with_owner(board_name text, board_description text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  new_board_id uuid;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.boards (owner_id, name, description)
  values (current_user_id, board_name, coalesce(board_description, ''))
  returning id into new_board_id;

  insert into public.board_members (board_id, user_id)
  values (new_board_id, current_user_id);

  return new_board_id;
end;
$$;

grant execute on function public.create_board_with_owner(text, text) to authenticated;
