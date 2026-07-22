create table if not exists public.recipe_comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  parent_comment_id uuid references public.recipe_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null default '',
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recipe_comments_body_length check (char_length(trim(body)) between 2 and 800)
);

create index if not exists recipe_comments_recipe_id_created_at_idx
on public.recipe_comments (recipe_id, created_at);

alter table public.recipe_comments enable row level security;

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

create policy recipe_comments_select on public.recipe_comments
for select using (
  auth.uid() is not null
  and exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and r.is_deleted = false
  )
);

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

create policy recipe_comments_delete on public.recipe_comments
for delete using (
  auth.uid() = user_id
  or public.is_admin()
  or exists (
    select 1 from public.recipes r
    where r.id = recipe_id
      and r.owner_id = auth.uid()
  )
);

grant select, insert, delete on public.recipe_comments to authenticated;
grant execute on function public.comment_parent_matches_recipe(uuid, uuid) to authenticated;
