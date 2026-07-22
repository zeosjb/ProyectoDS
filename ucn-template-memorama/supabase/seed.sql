insert into public.game_themes (name, description) values
('Conceptos de software', 'Pares de terminos para practicar diseno de software.'),
('Base de datos', 'Pares sobre tablas, llaves y relaciones.')
on conflict do nothing;

do $$
declare
  v_software uuid;
  v_database uuid;
begin
  select id into v_software from public.game_themes where name = 'Conceptos de software' limit 1;
  select id into v_database from public.game_themes where name = 'Base de datos' limit 1;

  if v_software is not null then
    insert into public.cards (theme_id, pair_key, label)
    select v_software, pair_key, label
    from (values
      ('rls', 'RLS'), ('auth', 'Auth'), ('ui', 'UI'), ('zod', 'Zod'), ('sql', 'SQL'),
      ('build', 'Build'), ('router', 'Router'), ('server', 'Server'), ('client', 'Client'), ('tests', 'Tests')
    ) as source(pair_key, label)
    where not exists (
      select 1 from public.cards c where c.theme_id = v_software and c.pair_key = source.pair_key
    );
  end if;

  if v_database is not null then
    insert into public.cards (theme_id, pair_key, label)
    select v_database, pair_key, label
    from (values
      ('tabla', 'Tabla'), ('fila', 'Fila'), ('llave', 'Llave'), ('indice', 'Indice'), ('vista', 'Vista'),
      ('rol', 'Rol'), ('schema', 'Schema'), ('trigger', 'Trigger'), ('rpc', 'RPC'), ('backup', 'Backup')
    ) as source(pair_key, label)
    where not exists (
      select 1 from public.cards c where c.theme_id = v_database and c.pair_key = source.pair_key
    );
  end if;
end $$;
