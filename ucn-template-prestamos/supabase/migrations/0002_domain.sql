do $$
begin
  if not exists (select 1 from pg_type where typname = 'loan_status') then
    create type public.loan_status as enum ('pending','approved','rejected','delivered','returned','overdue','cancelled');
  end if;
end $$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id),
  name text not null,
  description text not null default '',
  total_quantity integer not null check (total_quantity >= 0),
  available_quantity integer not null check (available_quantity >= 0),
  image_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_requests (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  status public.loan_status not null default 'pending',
  starts_on date not null,
  ends_on date not null,
  admin_comment text,
  created_at timestamptz not null default now()
);

create table if not exists public.loan_events (
  id uuid primary key default gen_random_uuid(),
  loan_request_id uuid not null references public.loan_requests(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  comment text,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
alter table public.equipment enable row level security;
alter table public.loan_requests enable row level security;
alter table public.loan_events enable row level security;

create policy categories_select on public.categories for select using (auth.uid() is not null);
create policy categories_insert on public.categories for insert with check (public.is_admin());
create policy categories_update on public.categories for update using (public.is_admin()) with check (public.is_admin());
create policy categories_delete on public.categories for delete using (public.is_admin());

create policy equipment_select on public.equipment for select using (auth.uid() is not null);
create policy equipment_insert on public.equipment for insert with check (public.is_admin());
create policy equipment_update on public.equipment for update using (public.is_admin()) with check (public.is_admin());
create policy equipment_delete on public.equipment for delete using (public.is_admin());

create policy loan_requests_select on public.loan_requests for select using (requester_id = auth.uid() or public.is_admin());
create policy loan_requests_insert on public.loan_requests for insert with check (requester_id = auth.uid() and status = 'pending');
create policy loan_requests_update on public.loan_requests for update using (requester_id = auth.uid() or public.is_admin()) with check (requester_id = auth.uid() or public.is_admin());
create policy loan_requests_delete on public.loan_requests for delete using (requester_id = auth.uid() or public.is_admin());

create policy loan_events_select on public.loan_events for select using (public.is_admin() or exists (select 1 from public.loan_requests r where r.id = loan_request_id and r.requester_id = auth.uid()));
create policy loan_events_insert on public.loan_events for insert with check (public.is_admin());
create policy loan_events_update on public.loan_events for update using (public.is_admin()) with check (public.is_admin());
create policy loan_events_delete on public.loan_events for delete using (public.is_admin());

create or replace function public.approve_loan_request_safe(p_request_id uuid, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.loan_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Solo administracion puede aprobar solicitudes.';
  end if;

  select * into v_request from public.loan_requests where id = p_request_id for update;
  if not found or v_request.status <> 'pending' then
    raise exception 'La solicitud no esta pendiente.';
  end if;

  update public.equipment
  set available_quantity = available_quantity - v_request.quantity
  where id = v_request.equipment_id
    and available_quantity >= v_request.quantity;

  if not found then
    raise exception 'No hay unidades disponibles.';
  end if;

  update public.loan_requests set status = 'approved', admin_comment = p_comment where id = p_request_id;
  insert into public.loan_events (loan_request_id, actor_id, event_type, comment)
  values (p_request_id, auth.uid(), 'approved', p_comment);
end;
$$;

grant execute on function public.approve_loan_request_safe(uuid, text) to authenticated;

create or replace function public.return_loan_request_safe(p_request_id uuid, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.loan_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Solo administracion puede registrar devoluciones.';
  end if;

  select * into v_request from public.loan_requests where id = p_request_id for update;
  if not found or v_request.status <> 'delivered' then
    raise exception 'La solicitud no esta marcada como entregada.';
  end if;

  update public.equipment
  set available_quantity = least(total_quantity, available_quantity + v_request.quantity)
  where id = v_request.equipment_id;

  update public.loan_requests
  set status = 'returned',
      admin_comment = coalesce(p_comment, admin_comment)
  where id = p_request_id;

  insert into public.loan_events (loan_request_id, actor_id, event_type, comment)
  values (p_request_id, auth.uid(), 'returned', p_comment);
end;
$$;

grant execute on function public.return_loan_request_safe(uuid, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipment-images', 'equipment-images', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy equipment_images_read on storage.objects for select using (bucket_id = 'equipment-images');
create policy equipment_images_insert on storage.objects for insert with check (bucket_id = 'equipment-images' and public.is_admin());
create policy equipment_images_update on storage.objects for update using (bucket_id = 'equipment-images' and public.is_admin()) with check (bucket_id = 'equipment-images' and public.is_admin());
create policy equipment_images_delete on storage.objects for delete using (bucket_id = 'equipment-images' and public.is_admin());
