create or replace function public.comment_parent_matches_recipe(parent_id uuid, target_recipe_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select parent_id is null
    or exists (
      select 1
      from public.recipe_comments parent
      where parent.id = parent_id
        and parent.recipe_id = target_recipe_id
    );
$$;

drop policy if exists recipe_comments_insert on public.recipe_comments;

create policy recipe_comments_insert on public.recipe_comments
for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and r.is_deleted = false
  )
  and public.comment_parent_matches_recipe(parent_comment_id, recipe_id)
);

grant execute on function public.comment_parent_matches_recipe(uuid, uuid) to authenticated;
