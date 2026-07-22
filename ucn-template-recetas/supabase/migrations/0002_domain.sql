create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null,
  instructions text[] not null default '{}',
  image_path text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.recipe_ingredients (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity text not null,
  primary key (recipe_id, ingredient_id)
);

create table if not exists public.favorites (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

alter table public.recipes enable row level security;
alter table public.ingredients enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.favorites enable row level security;

create policy recipes_select on public.recipes for select using (auth.uid() is not null and is_deleted = false);
create policy recipes_insert on public.recipes for insert with check (auth.uid() = owner_id);
create policy recipes_update on public.recipes for update using (auth.uid() = owner_id or public.is_admin()) with check (auth.uid() = owner_id or public.is_admin());
create policy recipes_delete on public.recipes for delete using (auth.uid() = owner_id or public.is_admin());

create policy ingredients_select on public.ingredients for select using (auth.uid() is not null);
create policy ingredients_insert on public.ingredients for insert with check (auth.uid() is not null);
create policy ingredients_update on public.ingredients for update using (public.is_admin()) with check (public.is_admin());
create policy ingredients_delete on public.ingredients for delete using (public.is_admin());

create policy recipe_ingredients_select on public.recipe_ingredients for select using (auth.uid() is not null);
create policy recipe_ingredients_insert on public.recipe_ingredients for insert with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid()));
create policy recipe_ingredients_update on public.recipe_ingredients for update using (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid())) with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid()));
create policy recipe_ingredients_delete on public.recipe_ingredients for delete using (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid()));

create policy favorites_select on public.favorites for select using (auth.uid() = user_id);
create policy favorites_insert on public.favorites for insert with check (auth.uid() = user_id);
create policy favorites_update on public.favorites for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy favorites_delete on public.favorites for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy recipe_images_read on storage.objects for select using (bucket_id = 'recipe-images');
create policy recipe_images_insert on storage.objects for insert with check (bucket_id = 'recipe-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy recipe_images_update on storage.objects for update using (bucket_id = 'recipe-images' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id = 'recipe-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy recipe_images_delete on storage.objects for delete using (bucket_id = 'recipe-images' and auth.uid()::text = (storage.foldername(name))[1]);
