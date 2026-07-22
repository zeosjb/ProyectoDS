alter table public.game_themes
add column if not exists owner_id uuid references public.profiles(id) on delete set null;

drop policy if exists game_themes_select on public.game_themes;
drop policy if exists game_themes_insert on public.game_themes;
drop policy if exists game_themes_update on public.game_themes;
drop policy if exists game_themes_delete on public.game_themes;

create policy game_themes_select on public.game_themes
for select
using (auth.uid() is not null and is_active = true);

create policy game_themes_insert on public.game_themes
for insert
with check (public.is_admin() or (auth.uid() is not null and owner_id = auth.uid()));

create policy game_themes_update on public.game_themes
for update
using (public.is_admin() or owner_id = auth.uid())
with check (public.is_admin() or owner_id = auth.uid());

create policy game_themes_delete on public.game_themes
for delete
using (public.is_admin() or owner_id = auth.uid());

drop policy if exists cards_insert on public.cards;
drop policy if exists cards_update on public.cards;
drop policy if exists cards_delete on public.cards;

create policy cards_insert on public.cards
for insert
with check (
  public.is_admin()
  or exists (
    select 1
    from public.game_themes t
    where t.id = theme_id
      and t.owner_id = auth.uid()
  )
);

create policy cards_update on public.cards
for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.game_themes t
    where t.id = theme_id
      and t.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.game_themes t
    where t.id = theme_id
      and t.owner_id = auth.uid()
  )
);

create policy cards_delete on public.cards
for delete
using (
  public.is_admin()
  or exists (
    select 1
    from public.game_themes t
    where t.id = theme_id
      and t.owner_id = auth.uid()
  )
);
