create or replace function public.soft_delete_recipe_with_related_data(target_recipe_id uuid)
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
    from public.recipes r
    where r.id = target_recipe_id
      and (
        r.owner_id = auth.uid()
        or public.is_admin()
      )
  )
  into can_delete;

  if not can_delete then
    raise exception 'No tienes permiso para eliminar esta receta.'
      using errcode = '42501';
  end if;

  delete from public.recipe_comments
  where recipe_id = target_recipe_id;

  delete from public.favorites
  where recipe_id = target_recipe_id;

  update public.recipes
  set is_deleted = true,
      updated_at = now()
  where id = target_recipe_id
    and is_deleted = false;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.soft_delete_recipe_with_related_data(uuid) to authenticated;
