do $$
begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('pending', 'in_progress', 'completed');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type public.task_priority as enum ('low', 'medium', 'high');
  end if;
end $$;

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.board_members (
  board_id uuid not null references public.boards(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  assignee_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null default '',
  status public.task_status not null default 'pending',
  priority public.task_priority not null default 'medium',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.tasks enable row level security;

create policy boards_select on public.boards for select using (exists (select 1 from public.board_members m where m.board_id = id and m.user_id = auth.uid()) or public.is_admin());
create policy boards_insert on public.boards for insert with check (auth.uid() = owner_id);
create policy boards_update on public.boards for update using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy boards_delete on public.boards for delete using (owner_id = auth.uid() or public.is_admin());

create policy board_members_select on public.board_members for select using (user_id = auth.uid() or exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid()) or public.is_admin());
create policy board_members_insert on public.board_members for insert with check (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid()) or user_id = auth.uid());
create policy board_members_update on public.board_members for update using (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid()) or public.is_admin()) with check (exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid()) or public.is_admin());
create policy board_members_delete on public.board_members for delete using (user_id = auth.uid() or exists (select 1 from public.boards b where b.id = board_id and b.owner_id = auth.uid()) or public.is_admin());

create policy tasks_select on public.tasks for select using (exists (select 1 from public.board_members m where m.board_id = board_id and m.user_id = auth.uid()) or public.is_admin());
create policy tasks_insert on public.tasks for insert with check (creator_id = auth.uid() and exists (select 1 from public.board_members m where m.board_id = board_id and m.user_id = auth.uid()));
create policy tasks_update on public.tasks for update using (exists (select 1 from public.board_members m where m.board_id = board_id and m.user_id = auth.uid()) or public.is_admin()) with check (exists (select 1 from public.board_members m where m.board_id = board_id and m.user_id = auth.uid()) or public.is_admin());
create policy tasks_delete on public.tasks for delete using (creator_id = auth.uid() or public.is_admin());
