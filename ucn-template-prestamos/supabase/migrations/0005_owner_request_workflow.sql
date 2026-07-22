create or replace function public.can_manage_loan_request(p_request_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.loan_requests lr
      join public.equipment e on e.id = lr.equipment_id
      where lr.id = p_request_id
        and e.owner_id = auth.uid()
    );
$$;

create or replace function public.approve_loan_request_safe(p_request_id uuid, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.loan_requests%rowtype;
begin
  if not public.can_manage_loan_request(p_request_id) then
    raise exception 'Solo el propietario del equipo o administracion puede aprobar solicitudes.';
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

create or replace function public.reject_loan_request_safe(p_request_id uuid, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.loan_requests%rowtype;
begin
  if not public.can_manage_loan_request(p_request_id) then
    raise exception 'Solo el propietario del equipo o administracion puede rechazar solicitudes.';
  end if;

  select * into v_request from public.loan_requests where id = p_request_id for update;
  if not found or v_request.status <> 'pending' then
    raise exception 'La solicitud no esta pendiente.';
  end if;

  update public.loan_requests
  set status = 'rejected',
      admin_comment = p_comment
  where id = p_request_id;

  insert into public.loan_events (loan_request_id, actor_id, event_type, comment)
  values (p_request_id, auth.uid(), 'rejected', p_comment);
end;
$$;

grant execute on function public.reject_loan_request_safe(uuid, text) to authenticated;

create or replace function public.return_loan_request_safe(p_request_id uuid, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.loan_requests%rowtype;
begin
  select * into v_request from public.loan_requests where id = p_request_id for update;
  if not found or v_request.status not in ('approved', 'delivered') then
    raise exception 'La solicitud no esta lista para devolucion.';
  end if;

  if not (v_request.requester_id = auth.uid() or public.can_manage_loan_request(p_request_id)) then
    raise exception 'Solo quien solicito, el propietario del equipo o administracion puede registrar la devolucion.';
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
