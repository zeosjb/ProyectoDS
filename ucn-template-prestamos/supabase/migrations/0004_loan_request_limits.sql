create or replace function public.validate_loan_request_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available integer;
begin
  if new.starts_on < current_date then
    raise exception 'La fecha de solicitud no puede ser anterior a hoy.';
  end if;

  if new.ends_on < current_date then
    raise exception 'La fecha de devolucion no puede ser anterior a hoy.';
  end if;

  if new.ends_on < new.starts_on then
    raise exception 'La fecha de devolucion no puede ser anterior a la fecha de solicitud.';
  end if;

  select available_quantity
  into v_available
  from public.equipment
  where id = new.equipment_id;

  if not found then
    raise exception 'No encontramos el equipo solicitado.';
  end if;

  if new.quantity > v_available then
    raise exception 'La cantidad solicitada supera la disponibilidad del equipo.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_loan_request_limits_trigger on public.loan_requests;
create trigger validate_loan_request_limits_trigger
  before insert or update of equipment_id, quantity, starts_on, ends_on
  on public.loan_requests
  for each row
  execute function public.validate_loan_request_limits();
