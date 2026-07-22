create or replace function public.delete_recipe_comment_thread(target_comment_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
  can_delete boolean := false;
begin
  select exists (
    select 1
    from public.recipe_comments c
    join public.recipes r on r.id = c.recipe_id
    where c.id = target_comment_id
      and (
        c.user_id = auth.uid()
        or r.owner_id = auth.uid()
        or public.is_admin()
      )
  )
  into can_delete;

  if not can_delete then
    raise exception 'No tienes permiso para eliminar este comentario.'
      using errcode = '42501';
  end if;

  with recursive thread as (
    select id, parent_comment_id, 0 as depth
    from public.recipe_comments
    where id = target_comment_id

    union all

    select child.id, child.parent_comment_id, thread.depth + 1
    from public.recipe_comments child
    join thread on child.parent_comment_id = thread.id
  ),
  deleted as (
    delete from public.recipe_comments c
    using thread
    where c.id = thread.id
    returning c.id
  )
  select count(*) into deleted_count from deleted;

  return deleted_count;
end;
$$;

grant execute on function public.delete_recipe_comment_thread(uuid) to authenticated;
