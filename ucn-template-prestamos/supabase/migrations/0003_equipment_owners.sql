alter table public.equipment
  add column if not exists owner_id uuid references public.profiles(id) on delete set null;

create index if not exists equipment_owner_id_idx on public.equipment(owner_id);

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories
  for insert
  with check (auth.uid() is not null);

drop policy if exists equipment_insert on public.equipment;
drop policy if exists equipment_update on public.equipment;
drop policy if exists equipment_delete on public.equipment;

create policy equipment_insert on public.equipment
  for insert
  with check (owner_id = auth.uid() or public.is_admin());

create policy equipment_update on public.equipment
  for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy equipment_delete on public.equipment
  for delete
  using (owner_id = auth.uid() or public.is_admin());

drop policy if exists loan_requests_select on public.loan_requests;
create policy loan_requests_select on public.loan_requests
  for select
  using (
    requester_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
      from public.equipment e
      where e.id = equipment_id
        and e.owner_id = auth.uid()
    )
  );

drop policy if exists loan_requests_insert on public.loan_requests;

create policy loan_requests_insert on public.loan_requests
  for insert
  with check (
    requester_id = auth.uid()
    and status = 'pending'
    and not exists (
      select 1
      from public.equipment e
      where e.id = equipment_id
        and e.owner_id = auth.uid()
    )
  );

create or replace function public.prevent_self_loan_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.equipment e
    where e.id = new.equipment_id
      and e.owner_id = new.requester_id
  ) then
    raise exception 'No puedes solicitar un equipo que publicaste tu mismo.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_self_loan_request_trigger on public.loan_requests;
create trigger prevent_self_loan_request_trigger
  before insert or update of equipment_id, requester_id
  on public.loan_requests
  for each row
  execute function public.prevent_self_loan_request();

drop policy if exists equipment_images_insert on storage.objects;
create policy equipment_images_insert on storage.objects
  for insert
  with check (bucket_id = 'equipment-images' and auth.uid() is not null);

drop policy if exists profiles_select_equipment_requesters on public.profiles;
create policy profiles_select_equipment_requesters on public.profiles
  for select
  using (
    exists (
      select 1
      from public.loan_requests lr
      join public.equipment e on e.id = lr.equipment_id
      where lr.requester_id = profiles.id
        and e.owner_id = auth.uid()
    )
  );
