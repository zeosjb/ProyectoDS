create or replace function public.is_board_member(target_board_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.board_members
    where board_id = target_board_id
      and user_id = target_user_id
  );
$$;

create or replace function public.is_board_owner(target_board_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.boards
    where id = target_board_id
      and owner_id = target_user_id
  );
$$;

grant execute on function public.is_board_member(uuid, uuid) to authenticated;
grant execute on function public.is_board_owner(uuid, uuid) to authenticated;

drop policy if exists boards_select on public.boards;
drop policy if exists boards_insert on public.boards;
drop policy if exists boards_update on public.boards;
drop policy if exists boards_delete on public.boards;

create policy boards_select on public.boards
for select using (
  owner_id = auth.uid()
  or public.is_board_member(id, auth.uid())
  or public.is_admin()
);

create policy boards_insert on public.boards
for insert with check (owner_id = auth.uid());

create policy boards_update on public.boards
for update using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

create policy boards_delete on public.boards
for delete using (owner_id = auth.uid() or public.is_admin());

drop policy if exists board_members_select on public.board_members;
drop policy if exists board_members_insert on public.board_members;
drop policy if exists board_members_update on public.board_members;
drop policy if exists board_members_delete on public.board_members;

create policy board_members_select on public.board_members
for select using (
  user_id = auth.uid()
  or public.is_board_owner(board_id, auth.uid())
  or public.is_admin()
);

create policy board_members_insert on public.board_members
for insert with check (
  public.is_board_owner(board_id, auth.uid())
  or public.is_admin()
);

create policy board_members_update on public.board_members
for update using (
  public.is_board_owner(board_id, auth.uid())
  or public.is_admin()
)
with check (
  public.is_board_owner(board_id, auth.uid())
  or public.is_admin()
);

create policy board_members_delete on public.board_members
for delete using (
  user_id = auth.uid()
  or public.is_board_owner(board_id, auth.uid())
  or public.is_admin()
);

drop policy if exists tasks_select on public.tasks;
drop policy if exists tasks_insert on public.tasks;
drop policy if exists tasks_update on public.tasks;
drop policy if exists tasks_delete on public.tasks;

create policy tasks_select on public.tasks
for select using (public.is_board_member(board_id, auth.uid()) or public.is_admin());

create policy tasks_insert on public.tasks
for insert with check (
  creator_id = auth.uid()
  and public.is_board_member(board_id, auth.uid())
);

create policy tasks_update on public.tasks
for update using (public.is_board_member(board_id, auth.uid()) or public.is_admin())
with check (public.is_board_member(board_id, auth.uid()) or public.is_admin());

create policy tasks_delete on public.tasks
for delete using (creator_id = auth.uid() or public.is_admin());
